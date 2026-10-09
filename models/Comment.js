const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    comment: {
      type: String,
      required: [true, "Comment is required"],
      trim: true,
      maxlength: 1000,
    },
    // Reply to another comment
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    // Admin approval
    isApproved: {
      type: Boolean,
      default: true,
    },
    // Like counter
    likes: {
      type: Number,
      default: 0,
    },
    // Track who liked (to prevent duplicate likes)
    likedBy: [String],
  },
  { timestamps: true }
);

// Index for fast queries
commentSchema.index({ blog: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);