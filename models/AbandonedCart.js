const mongoose = require("mongoose");

const abandonedCartSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    userName: {
      type: String,
      default: "",
    },
    userPhone: {
      type: String,
      default: "",
    },
    items: [
      {
        id: String,
        name: String,
        price: Number,
        quantity: Number,
        image: String,
        icon: String,
      },
    ],
    total: {
      type: Number,
      default: 0,
    },
    itemCount: {
      type: Number,
      default: 0,
    },

    // ============ RECOVERY TRACKING ============
    notifiedAt: {
      type: Date,
      default: null,
    },
    recoveredAt: {
      type: Date,
      default: null,
    },
    isRecovered: {
      type: Boolean,
      default: false,
    },
    reminderCount: {
      type: Number,
      default: 0,
    },

    // ============ ADMIN ============
    recoveredOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  { timestamps: true }
);

// Index for queries
abandonedCartSchema.index({ isRecovered: 1, createdAt: -1 });

module.exports = mongoose.model("AbandonedCart", abandonedCartSchema);