const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Blog = require("../models/Blog");

const BASE_URL = "https://awaisstore-frontend.vercel.app";

// ============================================================
// GET /sitemap.xml — Dynamic sitemap
// ============================================================
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().select("_id updatedAt");
    const blogs = await Blog.find({ isPublished: true }).select("slug updatedAt");

    const staticPages = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/products", priority: "0.9", changefreq: "daily" },
      { url: "/categories", priority: "0.8", changefreq: "weekly" },
      { url: "/blog", priority: "0.8", changefreq: "weekly" },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    staticPages.forEach((page) => {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}${page.url}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    // Product pages
    products.forEach((p) => {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/products/${p._id}</loc>\n`;
      xml += `    <lastmod>${new Date(p.updatedAt).toISOString()}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });

    // Blog pages
    blogs.forEach((b) => {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/blog/${b.slug}</loc>\n`;
      xml += `    <lastmod>${new Date(b.updatedAt).toISOString()}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error("Sitemap error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;