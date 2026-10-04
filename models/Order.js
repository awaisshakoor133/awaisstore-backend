const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customer: {
      name: { type: String, required: true },
      email: { type: String, default: "" },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      payment: { type: String, default: "Cash on Delivery" },
    },

    products: [
      {
        id: String,
        name: String,
        price: Number,
        quantity: Number,
        icon: String,
      },
    ],

    total: { type: Number, required: true },

    coupon: { type: String, default: null },
    discount: { type: Number, default: 0 },

    // ============ ORDER STATUS ============
    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Shipped",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Pending",
    },

    // ============ STATUS HISTORY (for tracking timeline) ============
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: "" },
      },
    ],

    // ============ PAYMENT ============
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      default: "cod",
    },

    paymentDetails: {
      transactionId: String,
      paidAt: Date,
      amount: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);