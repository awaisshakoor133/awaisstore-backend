const express = require("express");
const router = express.Router();
const Newsletter = require("../models/Newsletter");
const { sendEmail } = require("../services/email");

// ============================================================
// POST /api/newsletter/subscribe — New signup
// ============================================================
router.post("/subscribe", async (req, res) => {
  try {
    const { email, name, source } = req.body;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: "Valid email required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already exists
    let subscriber = await Newsletter.findOne({ email: normalizedEmail });

    if (subscriber) {
      // Reactivate if unsubscribed
      if (!subscriber.isActive) {
        subscriber.isActive = true;
        subscriber.unsubscribedAt = null;
        subscriber.source = source || subscriber.source;
        await subscriber.save();
        return res.json({ success: true, message: "Welcome back!" });
      }
      return res.json({ success: true, message: "Already subscribed" });
    }

    // Create new
    subscriber = await Newsletter.create({
      email: normalizedEmail,
      name: name || "",
      source: source || "homepage",
    });

    res.status(201).json({
      success: true,
      message: "Subscribed successfully!",
      subscriber: { email: subscriber.email },
    });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/newsletter/unsubscribe — Opt out
// ============================================================
router.post("/unsubscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Email required" });

    const subscriber = await Newsletter.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!subscriber) {
      return res.status(404).json({ error: "Email not found" });
    }

    subscriber.isActive = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    res.json({ success: true, message: "Unsubscribed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/newsletter/subscribers — Admin list
// ============================================================
router.get("/subscribers", async (req, res) => {
  try {
    const { active, limit = 200 } = req.query;

    const query = {};
    if (active === "true") query.isActive = true;
    if (active === "false") query.isActive = false;

    const subscribers = await Newsletter.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    // Stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: await Newsletter.countDocuments(),
      active: await Newsletter.countDocuments({ isActive: true }),
      unsubscribed: await Newsletter.countDocuments({ isActive: false }),
      thisMonth: await Newsletter.countDocuments({
        createdAt: { $gte: monthStart },
      }),
    };

    res.json({ subscribers, stats });
  } catch (err) {
    console.error("Get subscribers error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /api/newsletter/:id — Delete subscriber (admin)
// ============================================================
router.delete("/:id", async (req, res) => {
  try {
    await Newsletter.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/newsletter/send — Send campaign
// Body: { subject, html, testEmail? }
// ============================================================
router.post("/send", async (req, res) => {
  try {
    const { subject, html, testEmail } = req.body;

    if (!subject || !html) {
      return res.status(400).json({ error: "Subject and content required" });
    }

    // Test mode — send to single email
    if (testEmail) {
      const result = await sendEmail({
        to: testEmail,
        subject: `[TEST] ${subject}`,
        html,
      });

      if (result.success) {
        return res.json({
          success: true,
          mode: "test",
          message: `Test email sent to ${testEmail}`,
        });
      }
      return res.status(500).json({ error: result.error });
    }

    // Bulk mode — send to all active subscribers
    const subscribers = await Newsletter.find({ isActive: true });

    if (subscribers.length === 0) {
      return res.status(400).json({ error: "No active subscribers" });
    }

    let sent = 0;
    let failed = 0;

    // Send emails (sequential to avoid rate limit)
    for (const sub of subscribers) {
      try {
        const result = await sendEmail({
          to: sub.email,
          subject,
          html,
        });

        if (result.success) {
          sent++;
          sub.lastEmailSentAt = new Date();
          sub.emailsReceived += 1;
          await sub.save();
        } else {
          failed++;
        }

        // Rate limit — 200ms between emails
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`Send to ${sub.email} failed:`, err.message);
        failed++;
      }
    }

    res.json({
      success: true,
      mode: "bulk",
      total: subscribers.length,
      sent,
      failed,
    });
  } catch (err) {
    console.error("Send campaign error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/newsletter/stats — Quick stats
// ============================================================
router.get("/stats", async (req, res) => {
  try {
    const total = await Newsletter.countDocuments();
    const active = await Newsletter.countDocuments({ isActive: true });
    const unsubscribed = await Newsletter.countDocuments({ isActive: false });

    res.json({ total, active, unsubscribed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;