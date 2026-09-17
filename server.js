const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dns = require("dns");
require("dotenv").config();

console.log("🚀 Starting server...");

// ✅ CRITICAL: DNS fix — MongoDB SRV ke liye
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

// Import routes
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const { router: authRoutes } = require("./routes/auth");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Awais Mobile Zone Backend is Running 🚀" });
});

// API Routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);

// ✅ MongoDB connect
console.log("🔌 Connecting to MongoDB...");

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,    // 30 second timeout
    socketTimeoutMS: 45000,             // 45 second socket timeout
    bufferCommands: false,              // Disable buffering
  })
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("❌ MongoDB Connection Error");
    console.log("Error:", error.message);
    process.exit(1);
  });