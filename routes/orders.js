const {
  sendEmail,
  orderConfirmationTemplate,
  adminNewOrderTemplate,
  orderStatusTemplate,
} = require("../services/email");
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

// POST new order
router.post("/", async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();

    // Send confirmation email (don't wait, fire and forget)
    if (order.customer?.email) {
      sendEmail({
        to: order.customer.email,
        subject: `Order Confirmed - #${order._id.toString().slice(-6).toUpperCase()}`,
        html: orderConfirmationTemplate(order),
      }).catch((err) =>
        console.error("Order confirmation email failed:", err)
      );
    }

    // Send admin notification
    if (process.env.EMAIL_USER) {
      sendEmail({
        to: process.env.EMAIL_USER,
        subject: `🔔 New Order - Rs. ${order.total.toLocaleString()}`,
        html: adminNewOrderTemplate(order),
      }).catch((err) =>
        console.error("Admin notification email failed:", err)
      );
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// GET orders (filter by email/phone for user-specific)
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

// PUT update order (status, note, etc)
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

    // Send status update email if status changed
    if (statusChanged && order.customer?.email) {
      sendEmail({
        to: order.customer.email,
        subject: `Order #${order._id.toString().slice(-6).toUpperCase()} - ${req.body.status}`,
        html: orderStatusTemplate(order, req.body.status),
      }).catch((err) =>
        console.error("Status update email failed:", err)
      );
    }

    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ✅ NEW: DELETE order
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