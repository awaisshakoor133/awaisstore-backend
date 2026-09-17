const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dns = require("dns");
require("dotenv").config();

console.log("🚀 Starting server...");

// DNS fix
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// Import routes
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test Route
app.get("/", (req, res) => {
  res.json({ message: "Awais Mobile-Zone Backend is Running 🚀" });
});

// API Routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// ✅ Start server FIRST (Railway ke liye zaroori)
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// ✅ THEN connect to MongoDB
console.log("🔌 Connecting to MongoDB...");
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((error) => {
    console.log("❌ MongoDB Connection Error");
    console.log("Error:", error.message);
    // Note: Server is already running, so app won't crash
  });