const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");

// ============================================================
// CLOUDINARY CONFIG
// ============================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============================================================
// MULTER SETUP (Max 3 images, 5 MB each)
// ============================================================
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "awais-mobile-zone/reviews",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 1000, height: 1000, crop: "limit" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 3, // Max 3 images
  },
});

// ============================================================
// GET /api/reviews/product/:productId — Get all reviews for a product
// ============================================================
router.get("/product/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({
      product: req.params.productId,
      isApproved: true,
    }).sort({ createdAt: -1 });

    // Calculate stats
    const total = reviews.length;
    const avgRating =
      total > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
        : 0;

    // Rating breakdown
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
    });

    res.json({
      reviews,
      stats: {
        total,
        avgRating: Math.round(avgRating * 10) / 10,
        breakdown,
      },
    });
  } catch (err) {
    console.error("Get reviews error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/reviews/stats/:productId — Quick stats only
// ============================================================
router.get("/stats/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({
      product: req.params.productId,
      isApproved: true,
    });

    const total = reviews.length;
    const avgRating =
      total > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
        : 0;

    res.json({
      total,
      avgRating: Math.round(avgRating * 10) / 10,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/reviews — Create review
// ============================================================
router.post("/", async (req, res) => {
  try {
    const {
      product,
      user,
      userName,
      userEmail,
      rating,
      title,
      comment,
    } = req.body;

    if (!product || !userName || !rating || !comment) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be 1-5" });
    }

    // Check if user already reviewed this product
    if (userEmail) {
      const existing = await Review.findOne({
        product,
        userEmail: userEmail.toLowerCase(),
      });

      if (existing) {
        return res.status(400).json({
          error: "You have already reviewed this product",
        });
      }
    }

    // Check verified purchase
    let isVerifiedPurchase = false;
    if (userEmail) {
      const order = await Order.findOne({
        "customer.email": userEmail.toLowerCase(),
        "products.id": product,
      });
      isVerifiedPurchase = !!order;
    }

    const review = new Review({
      product,
      user: user || null,
      userName,
      userEmail: userEmail?.toLowerCase() || "",
      rating,
      title: title || "",
      comment,
      isVerifiedPurchase,
      isApproved: true, // Auto-approve
    });

    await review.save();
    res.status(201).json(review);
  } catch (err) {
    console.error("Create review error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/reviews/:id/helpful — Mark review as helpful
// ============================================================
router.post("/:id/helpful", async (req, res) => {
  try {
    const { userIdentifier } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) return res.status(404).json({ error: "Review not found" });

    if (!userIdentifier) {
      return res.status(400).json({ error: "User identifier required" });
    }

    // Check if already voted
    if (review.helpfulBy.includes(userIdentifier)) {
      // Remove vote
      review.helpfulBy = review.helpfulBy.filter(
        (id) => id !== userIdentifier
      );
      review.helpfulCount = Math.max(0, review.helpfulCount - 1);
    } else {
      // Add vote
      review.helpfulBy.push(userIdentifier);
      review.helpfulCount += 1;
    }

    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Admin Routes
// ============================================================

// GET /api/reviews — Get all reviews (admin)
router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("product", "name image icon")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reviews/:id — Update review (admin — approve/reject)
router.put("/:id", async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!review) return res.status(404).json({ error: "Review not found" });
    res.json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/reviews/:id — Delete review (admin)
router.delete("/:id", async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found" });
    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/analytics/categories — Category performance
// ============================================================
router.get("/categories", async (req, res) => {
  try {
    const products = await Product.find();
    const productMap = {};
    products.forEach((p) => {
      productMap[p._id.toString()] = p.category;
    });

    const orders = await Order.find();

    const categoryStats = {};

    orders.forEach((order) => {
      order.products?.forEach((item) => {
        const category = productMap[item.id] || "Other";
        if (!categoryStats[category]) {
          categoryStats[category] = { category, sold: 0, revenue: 0 };
        }
        categoryStats[category].sold += item.quantity || 1;
        categoryStats[category].revenue +=
          (item.price || 0) * (item.quantity || 1);
      });
    });

    res.json(Object.values(categoryStats));
  } catch (err) {
    console.error("Category stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/reviews/upload — Upload review images (max 3)
// ============================================================
router.post("/upload", upload.array("images", 3), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No images uploaded" });
    }

    const images = req.files.map((file) => ({
      url: file.path,
      publicId: file.filename,
    }));

    res.json({ success: true, images });
  } catch (err) {
    console.error("Image upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;