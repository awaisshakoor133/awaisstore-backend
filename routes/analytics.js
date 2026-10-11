const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Review = require("../models/Review");

// ============================================================
// GET /api/analytics/overview — Dashboard stats
// ============================================================
router.get("/overview", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));
    const monthStart = new Date(now.setDate(1));

    const orders = await Order.find();

    // Revenue calculations
    const todayRevenue = orders
      .filter((o) => new Date(o.createdAt) >= todayStart)
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const weekRevenue = orders
      .filter((o) => new Date(o.createdAt) >= weekStart)
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const monthRevenue = orders
      .filter((o) => new Date(o.createdAt) >= monthStart)
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Counts
    const totalOrders = orders.length;
    const totalProducts = await Product.countDocuments();
    const totalCustomers = await User.countDocuments({ role: "user" });
    const totalReviews = await Review.countDocuments();

    // Order status breakdown
    const statusBreakdown = {
      Confirmed: orders.filter((o) => o.status === "Confirmed").length,
      Shipped: orders.filter((o) => o.status === "Shipped").length,
      "Out for Delivery": orders.filter((o) => o.status === "Out for Delivery").length,
      Delivered: orders.filter((o) => o.status === "Delivered").length,
      Cancelled: orders.filter((o) => o.status === "Cancelled").length,
    };

    res.json({
      revenue: {
        today: todayRevenue,
        week: weekRevenue,
        month: monthRevenue,
        total: totalRevenue,
      },
      counts: {
        orders: totalOrders,
        products: totalProducts,
        customers: totalCustomers,
        reviews: totalReviews,
      },
      statusBreakdown,
    });
  } catch (err) {
    console.error("Analytics overview error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/analytics/sales-trend?days=30 — Last N days sales
// ============================================================
router.get("/sales-trend", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      createdAt: { $gte: startDate },
    });

    // Group by day
    const dailyData = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split("T")[0];
      dailyData[key] = { revenue: 0, orders: 0 };
    }

    orders.forEach((order) => {
      const key = new Date(order.createdAt).toISOString().split("T")[0];
      if (dailyData[key]) {
        dailyData[key].revenue += order.total || 0;
        dailyData[key].orders += 1;
      }
    });

    // Convert to arrays
    const labels = Object.keys(dailyData).map((date) => {
      const d = new Date(date);
      return d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
    });

    const revenue = Object.values(dailyData).map((d) => d.revenue);
    const orderCounts = Object.values(dailyData).map((d) => d.orders);

    res.json({ labels, revenue, orderCounts });
  } catch (err) {
    console.error("Sales trend error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/analytics/top-products — Best selling products
// ============================================================
router.get("/top-products", async (req, res) => {
  try {
    const orders = await Order.find();

    const productStats = {};

    orders.forEach((order) => {
      order.products?.forEach((item) => {
        const key = item.id;
        if (!productStats[key]) {
          productStats[key] = {
            id: item.id,
            name: item.name,
            icon: item.icon,
            sold: 0,
            revenue: 0,
          };
        }
        productStats[key].sold += item.quantity || 1;
        productStats[key].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });

    // Top 10 by sold
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10);

    res.json(topProducts);
  } catch (err) {
    console.error("Top products error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/analytics/customers — Customer insights
// ============================================================
router.get("/customers", async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalCustomers = await User.countDocuments({ role: "user" });
    const newThisMonth = await User.countDocuments({
      role: "user",
      createdAt: { $gte: monthStart },
    });

    const orders = await Order.find();
    const uniqueCustomers = new Set();
    orders.forEach((o) => {
      if (o.customer?.email) uniqueCustomers.add(o.customer.email);
      else if (o.customer?.phone) uniqueCustomers.add(o.customer.phone);
    });

    res.json({
      total: totalCustomers,
      newThisMonth,
      active: uniqueCustomers.size,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/analytics/customer-growth?days=30 — New signups per day
// ============================================================
router.get("/customer-growth", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const users = await User.find({
      role: "user",
      createdAt: { $gte: startDate },
    });

    // Group by day
    const dailyData = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split("T")[0];
      dailyData[key] = 0;
    }

    users.forEach((user) => {
      const key = new Date(user.createdAt).toISOString().split("T")[0];
      if (dailyData[key] !== undefined) {
        dailyData[key] += 1;
      }
    });

    const labels = Object.keys(dailyData).map((date) => {
      const d = new Date(date);
      return d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
    });

    const counts = Object.values(dailyData);

    // Growth % (first half vs second half)
    const half = Math.floor(days / 2);
    const firstHalf = counts.slice(0, half).reduce((s, n) => s + n, 0);
    const secondHalf = counts.slice(half).reduce((s, n) => s + n, 0);
    const growth =
      firstHalf > 0
        ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100)
        : 0;

    res.json({
      labels,
      counts,
      growth,
      totalNew: users.length,
    });
  } catch (err) {
    console.error("Customer growth error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/analytics/best-times — Best day/time analysis
// ============================================================
router.get("/best-times", async (req, res) => {
  try {
    const orders = await Order.find();

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const dayStats = {};
    const hourStats = {};
    days.forEach((d) => (dayStats[d] = 0));
    hours.forEach((h) => (hourStats[h] = 0));

    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      const day = days[date.getDay()];
      const hour = date.getHours();

      dayStats[day] += order.total || 0;
      hourStats[hour] += order.total || 0;
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
    // Best day
    const bestDay = Object.entries(dayStats).sort((a, b) => b[1] - a[1])[0];

    // Best time slot
    const timeSlots = {
      Morning: { hours: [6, 7, 8, 9, 10, 11], total: 0 },
      Afternoon: { hours: [12, 13, 14, 15, 16, 17], total: 0 },
      Evening: { hours: [18, 19, 20, 21, 22, 23], total: 0 },
      Night: { hours: [0, 1, 2, 3, 4, 5], total: 0 },
    };

    Object.values(timeSlots).forEach((slot) => {
      slot.total = slot.hours.reduce((sum, h) => sum + hourStats[h], 0);
    });

    const bestTimeSlot = Object.entries(timeSlots).sort(
      (a, b) => b[1].total - a[1].total
    )[0];

    res.json({
      dayStats,
      hourStats,
      bestDay: { name: bestDay[0], revenue: bestDay[1] },
      bestTimeSlot: { name: bestTimeSlot[0], revenue: bestTimeSlot[1].total },
    });
  } catch (err) {
    console.error("Best times error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;