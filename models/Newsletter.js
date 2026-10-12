const mongoose = require("mongoose");

const newsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    source: {
      type: String,
      default: "homepage",
      enum: ["homepage", "checkout", "popup", "footer", "admin"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    unsubscribedAt: {
      type: Date,
      default: null,
    },
    // Campaign history
    lastEmailSentAt: {
      type: Date,
      default: null,
    },
    emailsReceived: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

newsletterSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model("Newsletter", newsletterSchema);