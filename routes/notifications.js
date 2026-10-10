const express = require("express");
const router = express.Router();
const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");
require("dotenv").config();   // ← YEH ADD KARO

// Setup VAPID (lazy — only when needed)
let vapidSetup = false;

function setupVapid() {
  if (vapidSetup) return;

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.error("⚠️  VAPID keys missing in .env");
    return;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:awaisshakoor133@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  vapidSetup = true;
}

// ============================================================
// GET /api/notifications/vapid-public-key
// ============================================================
router.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// ============================================================
// POST /api/notifications/subscribe
// ============================================================
router.post("/subscribe", async (req, res) => {
  try {
    setupVapid();
    const { endpoint, keys, userEmail, userAgent } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Invalid subscription" });
    }

    const existing = await PushSubscription.findOne({ endpoint });

    if (existing) {
      existing.isActive = true;
      existing.userEmail = userEmail || existing.userEmail;
      await existing.save();
    } else {
      await PushSubscription.create({
        endpoint,
        keys,
        userEmail: userEmail || null,
        userAgent: userAgent || null,
      });
    }

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/notifications/unsubscribe
// ============================================================
router.post("/unsubscribe", async (req, res) => {
  try {
    setupVapid();
    const { endpoint } = req.body;
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { isActive: false }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/notifications/send
// Body: { title, body, url, icon, userEmail }
// ============================================================
router.post("/send", async (req, res) => {
  try {
    setupVapid();
    const { title, body, url, icon, userEmail } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "Title and body required" });
    }

    const query = { isActive: true };
    if (userEmail) query.userEmail = userEmail;

    const subscriptions = await PushSubscription.find(query);

    const payload = JSON.stringify({
      title,
      body,
      url: url || "/",
      icon: icon || "/icon-192.png",
      badge: "/icon-192.png",
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payload
          )
          .catch(async (err) => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              sub.isActive = false;
              await sub.save();
            }
            throw err;
          })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    res.json({
      success: true,
      total: subscriptions.length,
      sent,
      failed,
    });
  } catch (err) {
    console.error("Send notification error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/notifications/stats
// ============================================================
router.get("/stats", async (req, res) => {
  try {
    const total = await PushSubscription.countDocuments({ isActive: true });
    res.json({ activeSubscriptions: total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;