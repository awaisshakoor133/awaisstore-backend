const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");

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
      // Advanced
      applicableCategories,
      applicableProducts,
      firstOrderOnly,
      perUserLimit,
      bogoConfig,
      badge,
    } = req.body;

    if (!code || !discountType || !expiryDate) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    // Validate discount value for applicable types
    if (
      ["percentage", "flat"].includes(discountType) &&
      (!discountValue || discountValue <= 0)
    ) {
      return res.status(400).json({
        error: "Discount value required for this type",
      });
    }

    // Check code exists
    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ error: "Coupon code already exists" });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      discountType,
      discountValue: discountValue || 0,
      minOrderAmount: minOrderAmount || 0,
      maxDiscount: maxDiscount || 0,
      expiryDate,
      usageLimit: usageLimit || 0,
      description: description || "",
      applicableCategories: applicableCategories || [],
      applicableProducts: applicableProducts || [],
      firstOrderOnly: firstOrderOnly || false,
      perUserLimit: perUserLimit || 0,
      bogoConfig: bogoConfig || { buyQuantity: 1, getQuantity: 1 },
      badge: badge || "",
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
// Body: { code, cartTotal, cartItems, userEmail }
// ============================================================
router.post("/validate", async (req, res) => {
  try {
    const { code, cartTotal, cartItems = [], userEmail } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Coupon code required" });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    // ============ BASIC CHECKS ============
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
      return res
        .status(400)
        .json({ error: "Coupon usage limit reached" });
    }

    if (cartTotal < coupon.minOrderAmount) {
      return res.status(400).json({
        error: `Minimum order amount is Rs. ${coupon.minOrderAmount.toLocaleString()}`,
      });
    }

    // ============ FIRST ORDER ONLY ============
    if (coupon.firstOrderOnly && userEmail) {
      const previousOrders = await Order.countDocuments({
        "customer.email": userEmail,
      });
      if (previousOrders > 0) {
        return res.status(400).json({
          error: "This coupon is for first-time customers only",
        });
      }
    }

    // ============ PER USER LIMIT ============
    if (coupon.perUserLimit > 0 && userEmail) {
      const userUsageCount = coupon.usedBy.filter(
        (u) => u.email === userEmail
      ).length;
      if (userUsageCount >= coupon.perUserLimit) {
        return res.status(400).json({
          error: `You have already used this coupon ${userUsageCount} time(s)`,
        });
      }
    }

    // ============ CATEGORY FILTER ============
    let applicableTotal = cartTotal;
    let hasApplicableItems = true;

    if (coupon.applicableCategories?.length > 0) {
      // Filter cart items by category
      const applicableItems = cartItems.filter((item) =>
        coupon.applicableCategories.includes(item.category)
      );
      if (applicableItems.length === 0) {
        return res.status(400).json({
          error: `This coupon is only valid for: ${coupon.applicableCategories.join(", ")}`,
        });
      }
      applicableTotal = applicableItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
    }

    // ============ CALCULATE DISCOUNT ============
    let discount = 0;
    let freeShipping = false;
    let bogoDetails = null;

    switch (coupon.discountType) {
      case "percentage":
        discount = (applicableTotal * coupon.discountValue) / 100;
        if (coupon.maxDiscount > 0 && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
        break;

      case "flat":
        discount = coupon.discountValue;
        // Don't exceed applicable total
        if (discount > applicableTotal) discount = applicableTotal;
        break;

      case "free_shipping":
        freeShipping = true;
        discount = 0;
        break;

      case "bogo": {
        // BOGO calculation
        const buyQty = coupon.bogoConfig?.buyQuantity || 1;
        const getQty = coupon.bogoConfig?.getQuantity || 1;

        // Find cheapest items to discount
        const sortedItems = [...cartItems].sort(
          (a, b) => a.price - b.price
        );

        let totalQty = sortedItems.reduce((s, i) => s + i.quantity, 0);
        let sets = Math.floor(totalQty / (buyQty + getQty));
        let freeItems = sets * getQty;

        // Get free items (cheapest first)
        let remaining = freeItems;
        for (const item of sortedItems) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, item.quantity);
          discount += take * item.price;
          remaining -= take;
        }

        bogoDetails = {
          buyQuantity: buyQty,
          getQuantity: getQty,
          freeItemsCount: freeItems,
        };
        break;
      }

      default:
        return res.status(400).json({ error: "Invalid discount type" });
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
        badge: coupon.badge,
        applicableCategories: coupon.applicableCategories,
      },
      discount: Math.round(discount),
      freeShipping,
      bogoDetails,
      newTotal: Math.round(cartTotal - discount),
    });
  } catch (err) {
    console.error("Coupon validate error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/coupons/:code/use — Mark coupon as used
// ============================================================
router.post("/:code/use", async (req, res) => {
  try {
    const { userEmail } = req.body;
    const coupon = await Coupon.findOne({
      code: req.params.code.toUpperCase(),
    });

    if (!coupon) return res.status(404).json({ error: "Coupon not found" });

    coupon.usedCount += 1;
    if (userEmail) {
      coupon.usedBy.push({ email: userEmail, usedAt: new Date() });
    }
    await coupon.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/coupons/public — Active coupons for display
// ============================================================
router.get("/public/active", async (req, res) => {
  try {
    const coupons = await Coupon.find({
      isActive: true,
      expiryDate: { $gte: new Date() },
    }).select("code discountType discountValue badge description expiryDate");

    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;