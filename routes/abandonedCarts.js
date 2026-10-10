const express = require("express");
const router = express.Router();
const AbandonedCart = require("../models/AbandonedCart");
const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");
require("dotenv").config();

// ============================================================
// HELPER: Send push notification
// ============================================================
async function sendPush({ title, body, url, userEmail }) {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.log("⚠️ VAPID missing");
      return { sent: 0 };
    }

    try {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:awaisshakoor133@gmail.com",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    } catch {}

    const subscriptions = await PushSubscription.find({
      isActive: true,
      userEmail,
    });

    if (subscriptions.length === 0) {
      return { sent: 0 };
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || "/cart",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
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
    return { sent };
  } catch (err) {
    console.error("Push error:", err.message);
    return { sent: 0, error: err.message };
  }
}

// ============================================================
// POST /api/abandoned-carts — Save/update abandoned cart
// ============================================================
router.post("/", async (req, res) => {
  try {
    const { userEmail, userName, userPhone, items, total } = req.body;

    if (!userEmail || !items || items.length === 0) {
      return res.status(400).json({ error: "Email and items required" });
    }

    const itemCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

    // Check if already exists (unrecovered)
    const existing = await AbandonedCart.findOne({
      userEmail: userEmail.toLowerCase(),
      isRecovered: false,
    });

    if (existing) {
      // Update existing
      existing.items = items;
      existing.total = total;
      existing.itemCount = itemCount;
      existing.userName = userName || existing.userName;
      existing.userPhone = userPhone || existing.userPhone;
      await existing.save();
    } else {
      // Create new
      await AbandonedCart.create({
        userEmail: userEmail.toLowerCase(),
        userName: userName || "",
        userPhone: userPhone || "",
        items,
        total,
        itemCount,
      });
    }

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Save abandoned cart error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /api/abandoned-carts — Mark as recovered
// ============================================================
router.delete("/recover", async (req, res) => {
  try {
    const { userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: "Email required" });
    }

    await AbandonedCart.updateMany(
      { userEmail: userEmail.toLowerCase(), isRecovered: false },
      {
        isRecovered: true,
        recoveredAt: new Date(),
      }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/abandoned-carts — Admin list
// ============================================================
router.get("/", async (req, res) => {
  try {
    const { recovered, limit = 50 } = req.query;

    const query = {};
    if (recovered === "true") query.isRecovered = true;
    if (recovered === "false") query.isRecovered = false;

    const carts = await AbandonedCart.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    const stats = {
      total: await AbandonedCart.countDocuments(),
      active: await AbandonedCart.countDocuments({ isRecovered: false }),
      recovered: await AbandonedCart.countDocuments({ isRecovered: true }),
      notified: await AbandonedCart.countDocuments({
        notifiedAt: { $ne: null },
        isRecovered: false,
      }),
    };

    // Total value at risk
    const activeCarts = await AbandonedCart.find({ isRecovered: false });
    stats.valueAtRisk = activeCarts.reduce((sum, c) => sum + (c.total || 0), 0);

    res.json({ carts, stats });
  } catch (err) {
    console.error("Get abandoned carts error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/abandoned-carts/send-reminders — Send reminders
// ============================================================
router.post("/send-reminders", async (req, res) => {
  try {
    // Find carts older than 1 hour, not recovered, not notified in last 24h
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const carts = await AbandonedCart.find({
      isRecovered: false,
      createdAt: { $lt: oneHourAgo },
      $or: [
        { notifiedAt: null },
        { notifiedAt: { $lt: twentyFourHoursAgo } },
      ],
      reminderCount: { $lt: 3 }, // Max 3 reminders
    });

    const results = [];

    for (const cart of carts) {
      const itemNames = cart.items
        .slice(0, 2)
        .map((i) => i.name)
        .join(", ");
      const extra = cart.items.length > 2 ? ` +${cart.items.length - 2} more` : "";

      const pushResult = await sendPush({
        title: "🛒 Your cart is waiting!",
        body: `${itemNames}${extra} — Rs. ${cart.total.toLocaleString()}`,
        url: "/cart",
        userEmail: cart.userEmail,
      });

      cart.notifiedAt = new Date();
      cart.reminderCount += 1;
      await cart.save();

      results.push({
        email: cart.userEmail,
        sent: pushResult.sent,
      });
    }

    res.json({
      success: true,
      total: carts.length,
      results,
    });
  } catch (err) {
    console.error("Send reminders error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /api/abandoned-carts/:id — Admin delete
// ============================================================
router.delete("/:id", async (req, res) => {
  try {
    await AbandonedCart.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;