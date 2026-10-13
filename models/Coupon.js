const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // ============ DISCOUNT TYPE ============
    discountType: {
      type: String,
      enum: ["percentage", "flat", "bogo", "free_shipping"],
      required: true,
    },
    discountValue: {
      type: Number,
      default: 0, // Not needed for bogo/free_shipping
    },

    // ============ BASIC RULES ============
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number,
      default: 0, // Max discount cap for percentage
    },

    // ============ ADVANCED RULES ============
    applicableCategories: {
      type: [String],
      default: [], // Empty = all categories
    },
    applicableProducts: {
      type: [String],
      default: [], // Product IDs
    },
    firstOrderOnly: {
      type: Boolean,
      default: false,
    },
    perUserLimit: {
      type: Number,
      default: 0, // 0 = unlimited per user
    },

    // ============ BOGO CONFIG ============
    bogoConfig: {
      buyQuantity: { type: Number, default: 1 },
      getQuantity: { type: Number, default: 1 },
    },

    // ============ USAGE TRACKING ============
    expiryDate: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      default: 0, // 0 = unlimited total
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    usedBy: [
      {
        email: String,
        usedAt: { type: Date, default: Date.now },
      },
    ],

    // ============ DISPLAY ============
    badge: {
      type: String,
      default: "", // "HOT", "NEW", "LIMITED"
    },
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Auto-deactivate expired coupons
couponSchema.index({ isActive: 1, expiryDate: 1 });

module.exports = mongoose.model("Coupon", couponSchema);