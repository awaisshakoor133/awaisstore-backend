const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dns = require("dns");
require("dotenv").config();

// DNS fix for MongoDB SRV
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// Import routes
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully ✅"))
  .catch((error) => {
    console.log("MongoDB Connection Error ❌");
    console.log(error.message);
  });

// Test Route
app.get("/", (req, res) => {
  res.json({ message: "AwaisStore Backend is Running 🚀" });
});

// API Routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});