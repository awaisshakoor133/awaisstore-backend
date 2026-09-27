const express = require("express");
const router = express.Router();
const Blog = require("../models/Blog");

// ============================================================
// GET /api/blogs — Get all published blogs (public)
// ============================================================
router.get("/", async (req, res) => {
  try {
    const { category, limit } = req.query;

    const query = { isPublished: true };
    if (category && category !== "All") {
      query.category = category;
    }

    let blogsQuery = Blog.find(query).sort({ createdAt: -1 });

    if (limit) {
      blogsQuery = blogsQuery.limit(Number(limit));
    }

    const blogs = await blogsQuery;
    res.json(blogs);
  } catch (err) {
    console.error("Get blogs error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/blogs/:slug — Get single blog by slug
// ============================================================
router.get("/:slug", async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug },
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!blog) return res.status(404).json({ error: "Blog not found" });

    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Admin Routes
// ============================================================

// GET /api/blogs/admin/all — All blogs (admin)
router.get("/admin/all", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/blogs — Create blog (admin)
router.post("/", async (req, res) => {
  try {
    const blog = new Blog(req.body);
    await blog.save();
    res.status(201).json(blog);
  } catch (err) {
    console.error("Create blog error:", err);
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/blogs/:id — Update blog (admin)
router.put("/:id", async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.json(blog);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/blogs/:id — Delete blog (admin)
router.delete("/:id", async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.json({ message: "Blog deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;