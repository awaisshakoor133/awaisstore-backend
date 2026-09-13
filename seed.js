require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Product = require("./models/Product");

const seedProducts = [
  {
    name: "iPhone 15 Pro",
    description: "Latest Apple flagship with titanium body",
    price: 349999,
    oldPrice: 399999,
    icon: "📱",
    category: "Electronics",
  },
  {
    name: "Apple Watch Ultra",
    description: "Rugged smartwatch for adventurers",
    price: 189999,
    oldPrice: 219999,
    icon: "⌚",
    category: "Watches",
  },
  {
    name: "Leather Backpack",
    description: "Premium handcrafted leather bag",
    price: 12999,
    oldPrice: 17999,
    icon: "🎒",
    category: "Accessories",
  },
  {
    name: "Notebook Set",
    description: "Set of 3 premium notebooks",
    price: 1499,
    oldPrice: 1999,
    icon: "📚",
    category: "Stationery",
  },
  {
    name: "Wireless Earbuds",
    description: "Noise-cancelling earbuds with 30h battery",
    price: 24999,
    oldPrice: 34999,
    icon: "🎧",
    category: "Electronics",
  },
  {
    name: "Minimalist Watch",
    description: "Elegant quartz watch for daily wear",
    price: 8999,
    oldPrice: 12999,
    icon: "⌚",
    category: "Watches",
  },
];

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected. Seeding products...");
    await Product.deleteMany({});
    await Product.insertMany(seedProducts);
    console.log(`✅ ${seedProducts.length} products added!`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed error:", err.message);
    process.exit(1);
  });