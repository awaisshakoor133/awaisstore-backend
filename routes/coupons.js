const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");

// ============================================================
// GET /api/coupons — Get all coupons (admin)
// ============================================================
router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/coupons — Create coupon (admin)
// ============================================================
router.post("/", async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      expiryDate,
      usageLimit,
      description,
    } = req.body;

    if (!code || !discountType || !discountValue || !expiryDate) {
      return res.status(400).json({ error: "All required fields missing" });
    }

    // Check if code already exists
    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ error: "Coupon code already exists" });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscount: maxDiscount || 0,
      expiryDate,
      usageLimit: usageLimit || 0,
      description: description || "",
    });

    await coupon.save();
    res.status(201).json(coupon);
  } catch (err) {
    console.error("Coupon create error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /api/coupons/:id — Update coupon (admin)
// ============================================================
router.put("/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json(coupon);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// DELETE /api/coupons/:id — Delete coupon (admin)
// ============================================================
router.delete("/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json({ message: "Coupon deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/coupons/validate — Validate coupon (user)
// ============================================================
router.post("/validate", async (req, res) => {
  try {
    const { code, cartTotal } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Coupon code required" });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ error: "Invalid coupon code" });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ error: "Coupon is not active" });
    }

    if (new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ error: "Coupon has expired" });
    }

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: "Coupon usage limit reached" });
    }

    if (cartTotal < coupon.minOrderAmount) {
      return res.status(400).json({
        error: `Minimum order amount is Rs. ${coupon.minOrderAmount.toLocaleString()}`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (cartTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount > 0 && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed cart total
    if (discount > cartTotal) discount = cartTotal;

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description,
      },
      discount: Math.round(discount),
      newTotal: Math.round(cartTotal - discount),
    });
  } catch (err) {
    console.error("Coupon validate error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;