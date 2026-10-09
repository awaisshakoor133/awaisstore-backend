const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const Blog = require("../models/Blog");

// ============================================================
// GET /api/comments/blog/:blogId — Get all comments for a blog
// ============================================================
router.get("/blog/:blogId", async (req, res) => {
  try {
    const comments = await Comment.find({
      blog: req.params.blogId,
      isApproved: true,
    }).sort({ createdAt: -1 });

    res.json(comments);
  } catch (err) {
    console.error("Get comments error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/comments — Create new comment
// ============================================================
router.post("/", async (req, res) => {
  try {
    const { blog, name, email, comment, parentComment } = req.body;

    // Validate blog exists
    const blogExists = await Blog.findById(blog);
    if (!blogExists) {
      return res.status(404).json({ error: "Blog not found" });
    }

    const newComment = new Comment({
      blog,
      name,
      email,
      comment,
      parentComment: parentComment || null,
    });

    await newComment.save();

    res.status(201).json(newComment);
  } catch (err) {
    console.error("Create comment error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// POST /api/comments/:id/like — Like a comment
// ============================================================
router.post("/:id/like", async (req, res) => {
  try {
    const { userIdentifier } = req.body;

    if (!userIdentifier) {
      return res.status(400).json({ error: "User identifier required" });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if already liked
    if (comment.likedBy.includes(userIdentifier)) {
      // Unlike
      comment.likedBy = comment.likedBy.filter(
        (id) => id !== userIdentifier
      );
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      // Like
      comment.likedBy.push(userIdentifier);
      comment.likes += 1;
    }

    await comment.save();
    res.json(comment);
  } catch (err) {
    console.error("Like comment error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Admin Routes
// ============================================================

// GET /api/comments/admin/all — Get all comments (admin)
router.get("/admin/all", async (req, res) => {
  try {
    const { blogId } = req.query;
    const query = blogId ? { blog: blogId } : {};

    const comments = await Comment.find(query)
      .populate("blog", "title slug")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (err) {
    console.error("Get admin comments error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/comments/:id/approve — Toggle approval (admin)
router.put("/:id/approve", async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    comment.isApproved = !comment.isApproved;
    await comment.save();

    res.json(comment);
  } catch (err) {
    console.error("Approve comment error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/comments/:id — Delete comment (admin)
router.delete("/:id", async (req, res) => {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/comments/stats/:blogId — Get comment count for blog
router.get("/stats/:blogId", async (req, res) => {
  try {
    const count = await Comment.countDocuments({
      blog: req.params.blogId,
      isApproved: true,
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;