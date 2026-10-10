const {
  sendEmail,
  orderConfirmationTemplate,
  adminNewOrderTemplate,
  orderStatusTemplate,
} = require("../services/email");
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");
require("dotenv").config();

// ============================================================
// HELPER: Send push notification
// ============================================================
async function sendPushNotification({ title, body, url, userEmail = null }) {
  try {
    // Check VAPID setup
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.log("⚠️  VAPID keys missing — skipping push");
      return;
    }

    // Setup VAPID (lazy)
    try {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:awaisshakoor133@gmail.com",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    } catch (err) {
      // Already set — ignore
    }

    // Find subscriptions
    const query = { isActive: true };
    if (userEmail) query.userEmail = userEmail;

    const subscriptions = await PushSubscription.find(query);

    if (subscriptions.length === 0) {
      console.log(`📭 No subscriptions for: ${userEmail || "all"}`);
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || "/",
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
            // Invalid subscription — deactivate
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

    console.log(`✅ Push sent: "${title}" — ${sent} sent, ${failed} failed`);
  } catch (err) {
    console.error("❌ Push notification error:", err.message);
  }
}

// ============================================================
// POST new order
// ============================================================
router.post("/", async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();

    // 1. Send confirmation email (fire and forget)
    if (order.customer?.email) {
      sendEmail({
        to: order.customer.email,
        subject: `Order Confirmed - #${order._id.toString().slice(-6).toUpperCase()}`,
        html: orderConfirmationTemplate(order),
      }).catch((err) =>
        console.error("Order confirmation email failed:", err)
      );
    }

    // 2. Send admin notification email
    if (process.env.EMAIL_USER) {
      sendEmail({
        to: process.env.EMAIL_USER,
        subject: `🔔 New Order - Rs. ${order.total.toLocaleString()}`,
        html: adminNewOrderTemplate(order),
      }).catch((err) =>
        console.error("Admin notification email failed:", err)
      );
    }

    // 3. ✅ Push notification to ADMIN
    await sendPushNotification({
      title: "🔔 New Order Received!",
      body: `Order #${order._id.slice(-6).toUpperCase()} — Rs. ${order.total.toLocaleString()}`,
      url: "/admin/orders",
    });

    // 4. ✅ Push notification to CUSTOMER (if subscribed)
    if (order.customer?.email) {
      await sendPushNotification({
        title: "✅ Order Placed!",
        body: `Your order #${order._id.slice(-6).toUpperCase()} has been confirmed.`,
        url: `/orders/${order._id}`,
        userEmail: order.customer.email,
      });
    }

    res.status(201).json(order);
  } catch (err) {
    console.error("Create order error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// GET orders (filter by email/phone for user-specific)
// ============================================================
router.get("/", async (req, res) => {
  try {
    const { email, phone } = req.query;
    let query = {};

    if (email) query["customer.email"] = email;
    if (phone) query["customer.phone"] = phone;

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT update order (status, note, etc)
// ============================================================
router.put("/:id", async (req, res) => {
  try {
    const oldOrder = await Order.findById(req.params.id);
    if (!oldOrder) return res.status(404).json({ error: "Order not found" });

    const statusChanged =
      req.body.status && req.body.status !== oldOrder.status;

    const updateData = { ...req.body };

    // Push to status history if status changed
    if (statusChanged) {
      updateData.$push = {
        statusHistory: {
          status: req.body.status,
          timestamp: new Date(),
          note: req.body.note || "",
        },
      };
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // 1. Send status update email (existing)
    if (statusChanged && order.customer?.email) {
      sendEmail({
        to: order.customer.email,
        subject: `Order #${order._id.toString().slice(-6).toUpperCase()} - ${req.body.status}`,
        html: orderStatusTemplate(order, req.body.status),
      }).catch((err) =>
        console.error("Status update email failed:", err)
      );
    }

    // 2. ✅ Send push notification to CUSTOMER on status change
    if (statusChanged && order.customer?.email) {
      const statusMessages = {
        Pending: {
          title: "📋 Order Received",
          body: `We've received your order #${order._id
            .slice(-6)
            .toUpperCase()}. Confirming shortly.`,
        },
        Confirmed: {
          title: "✅ Order Confirmed!",
          body: `Your order #${order._id
            .slice(-6)
            .toUpperCase()} has been confirmed.`,
        },
        Shipped: {
          title: "🚚 Order Shipped!",
          body: `Your order #${order._id
            .slice(-6)
            .toUpperCase()} is on the way!`,
        },
        "Out for Delivery": {
          title: "📦 Out for Delivery!",
          body: `Your order #${order._id
            .slice(-6)
            .toUpperCase()} will arrive today!`,
        },
        Delivered: {
          title: "🎉 Order Delivered!",
          body: `Order #${order._id
            .slice(-6)
            .toUpperCase()} delivered. Thanks for shopping!`,
        },
        Cancelled: {
          title: "❌ Order Cancelled",
          body: `Order #${order._id
            .slice(-6)
            .toUpperCase()} has been cancelled.`,
        },
      };

      const msg = statusMessages[req.body.status];
      if (msg) {
        await sendPushNotification({
          title: msg.title,
          body: msg.body,
          url: `/orders/${order._id}`,
          userEmail: order.customer.email,
        });
      }
    }

    res.json(order);
  } catch (err) {
    console.error("Update order error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// DELETE order
// ============================================================
router.delete("/:id", async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;