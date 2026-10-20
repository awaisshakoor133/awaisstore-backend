const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");
const Product = require("../models/Product");

// ============================================================
// GEMINI SETUP
// ============================================================
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ============================================================
// POST /api/ai/search — Smart search with AI intent
// Body: { query }
// ============================================================
router.post("/search", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: "Query too short" });
    }

    // 1. Get all products (for AI to choose from)
    const products = await Product.find().select(
      "_id name price category description"
    );

    if (products.length === 0) {
      return res.json({ products: [], intent: "No products available" });
    }

    // 2. Build product list for AI
    const productList = products
      .map(
        (p) =>
          `ID: ${p._id}, Name: ${p.name}, Price: Rs. ${p.price}, Category: ${p.category}, Desc: ${p.description?.slice(0, 50)}`
      )
      .join("\n");

        // 3. Ask AI to match intent (with fallback)
    const prompt = `...`;

    let matchedIds = [];
    let aiError = null;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
      });

      const aiText = response.text.trim();

      try {
        const jsonMatch = aiText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          matchedIds = JSON.parse(jsonMatch[0]);
        }
      } catch (parseErr) {
        console.error("AI parse error:", parseErr);
      }
    } catch (err) {
      console.error("AI API error (falling back to text search):", err.message);
      aiError = err.message;
    }

    // ✅ FALLBACK: If AI failed, use text search
        if (aiError || matchedIds.length === 0) {
      console.log("Using smart fallback search...");

      // 1. Extract price constraint
      const priceMatch = query.match(/(?:under|below|less than|<|rs\.?\s*)(\d{3,})/i);
      const maxPrice = priceMatch ? parseInt(priceMatch[1]) : null;

      // 2. Extract category/brand keywords
      const keywords = [];
      if (/phone|mobile|smartphone/i.test(query)) keywords.push("phone", "mobile", "smartphone");
      if (/iphone/i.test(query)) keywords.push("iPhone");
      if (/samsung/i.test(query)) keywords.push("Samsung");
      if (/oneplus/i.test(query)) keywords.push("OnePlus");
      if (/earbud|headphone|audio/i.test(query)) keywords.push("earbud", "headphone", "audio");
      if (/watch/i.test(query)) keywords.push("watch");
      if (/camera/i.test(query)) keywords.push("camera");

      // 3. Build query
      let mongoQuery = {};

      // Price filter
      if (maxPrice) {
        mongoQuery.price = { $lte: maxPrice };
      }

      // Category/keyword filter
      if (keywords.length > 0) {
        mongoQuery.$or = keywords.flatMap((kw) => [
          { name: { $regex: kw, $options: "i" } },
          { description: { $regex: kw, $options: "i" } },
          { category: { $regex: kw, $options: "i" } },
        ]);
      } else {
        // No keywords → use raw text search
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        mongoQuery.$or = [
          { name: { $regex: escaped, $options: "i" } },
          { description: { $regex: escaped, $options: "i" } },
        ];
      }

      const fallbackProducts = await Product.find(mongoQuery).limit(6);

      // 4. If still empty, just show affordable products
      let finalProducts = fallbackProducts;
      if (finalProducts.length === 0 && maxPrice) {
        finalProducts = await Product.find({ price: { $lte: maxPrice } }).limit(6);
      }
      if (finalProducts.length === 0) {
        finalProducts = await Product.find().limit(6);
      }

      return res.json({
        products: finalProducts,
        intent: aiError
          ? "Smart search (AI busy, using filters)"
          : "Smart text search",
        query,
        filters: {
          maxPrice,
          keywords,
        },
      });
    }


    // 4. Get full products for matched IDs
    const matchedProducts = await Product.find({
      _id: { $in: matchedIds },
    });

        //  POST-FILTER: Extract price constraint from query
    const priceMatch = query.match(/(?:under|below|less than|<|rs\.?\s*)(\d{3,})/i);
    const maxPrice = priceMatch ? parseInt(priceMatch[1]) : null;

    //  POST-FILTER: Extract category keywords
    const isPhoneSearch = /phone|mobile|smartphone|iphone|samsung|oneplus/i.test(query);
    const isEarbudSearch = /earbud|headphone|earphone|audio|music/i.test(query);

    // Filter matched products
    let filteredProducts = matchedProducts.filter((p) => {
      // Price filter
      if (maxPrice && p.price >= maxPrice) return false;

      // Category filter (if user asked for phone, exclude non-phones)
      if (isPhoneSearch && !isEarbudSearch) {
        const isPhoneProduct = /phone|iphone|samsung|oneplus/i.test(
          p.name + " " + p.category
        );
        if (!isPhoneProduct) return false;
      }

      return true;
    });

    // If filtering removed everything, use matched products as fallback
    if (filteredProducts.length === 0) {
      filteredProducts = matchedProducts;
    }

    // If AI failed, fallback to text search
    if (matchedProducts.length === 0) {
      const fallback = await Product.find({
        $or: [
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { category: { $regex: query, $options: "i" } },
        ],
      }).limit(4);
      return res.json({
        products: fallback,
        intent: "Text search (AI fallback)",
      });
    }

        res.json({
      products: filteredProducts,
      intent: "AI matched + filtered",
      query,
      filters: {
        maxPrice,
        category: isPhoneSearch ? "phone" : null,
      },
    });
  } catch (err) {
    console.error("AI search error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;