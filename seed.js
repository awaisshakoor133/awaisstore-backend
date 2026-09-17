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
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&h=600&fit=crop",
    category: "Electronics",
  },
  {
    name: "Apple Watch Ultra",
    description: "Rugged smartwatch for adventurers",
    price: 189999,
    oldPrice: 219999,
    icon: "⌚",
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=600&fit=crop",
    category: "Watches",
  },
  {
    name: "Leather Backpack",
    description: "Premium handcrafted leather bag",
    price: 12999,
    oldPrice: 17999,
    icon: "🎒",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop",
    category: "Accessories",
  },
  {
    name: "Notebook Set",
    description: "Set of 3 premium notebooks",
    price: 1499,
    oldPrice: 1999,
    icon: "📚",
    image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&h=600&fit=crop",
    category: "Stationery",
  },
  {
    name: "Wireless Earbuds",
    description: "Noise-cancelling earbuds with 30h battery",
    price: 24999,
    oldPrice: 34999,
    icon: "🎧",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop",
    category: "Electronics",
  },
  {
    name: "Minimalist Watch",
    description: "Elegant quartz watch for daily wear",
    price: 8999,
    oldPrice: 12999,
    icon: "⌚",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
    category: "Watches",
  },
];

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected. Seeding products...");
    await Product.deleteMany({});
    await Product.insertMany(seedProducts);
    console.log(`✅ ${seedProducts.length} products added with images!`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed error:", err.message);
    process.exit(1);
  });
  const seedProducts = [
  // ... purane 6 products
  
  {
    name: "Samsung Galaxy S24 Ultra",
    description: "Latest Samsung flagship with S Pen and 200MP camera",
    price: 319999,
    oldPrice: 349999,
    icon: "📱",
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&h=600&fit=crop",
    category: "Electronics",
  },
  {
    name: "AirPods Pro 2",
    description: "Active noise cancellation with 6h battery",
    price: 59999,
    oldPrice: 69999,
    icon: "🎧",
    image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&h=600&fit=crop",
    category: "Electronics",
  },
  {
    name: "MacBook Air M3",
    description: "Ultra-thin laptop with M3 chip and 18h battery",
    price: 449999,
    oldPrice: 499999,
    icon: "💻",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=600&fit=crop",
    category: "Electronics",
  },
  {
    name: "Samsung Galaxy Watch 6",
    description: "Advanced health tracking with AMOLED display",
    price: 89999,
    oldPrice: 109999,
    icon: "⌚",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
    category: "Watches",
  },
  // ... aur products
];