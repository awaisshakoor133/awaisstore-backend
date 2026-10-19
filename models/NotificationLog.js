const mongoose = require("mongoose");

const notificationLogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    url: {
      type: String,
      default: "/",
    },
    icon: {
      type: String,
      default: "/icon-192.png",
    },
    badge: {
      type: String,
      default: "/icon-192.png",
    },
    // Target
    targetType: {
      type: String,
      enum: ["all", "specific"],
      default: "all",
    },
    targetEmail: {
      type: String,
      default: null,
    },
    // Status
    status: {
      type: String,
      enum: ["sent", "failed", "test"],
      default: "sent",
    },
    sent: {
      type: Number,
      default: 0,
    },
    failed: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    // Admin info
    sentBy: {
      type: String,
      default: "admin",
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

notificationLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("NotificationLog", notificationLogSchema);