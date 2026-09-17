const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "awais-mobile-zone-secret-2026";
const JWT_EXPIRE = "7d";

// Helper: Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

// Helper: Send user (without password)
const sendUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  city: user.city,
  addresses: user.addresses || [],     // ✅ NAYA
  role: user.role,
});

// ============================================================
// POST /api/auth/signup
// ============================================================
router.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Email already registered. Please login." });
    }

    // Create user
    const user = new User({ name, email, phone, password });
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      token,
      user: sendUser(user),
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/auth/login
// ============================================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "Login successful!",
      token,
      user: sendUser(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Middleware: Verify Token
// ============================================================
const protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "Not authorized. Please login." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ============================================================
// GET /api/auth/me — Get current user
// ============================================================
router.get("/me", protect, async (req, res) => {
  res.json({
    success: true,
    user: sendUser(req.user),
  });
});

// ============================================================
// PUT /api/auth/profile — Update profile
// ============================================================
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, phone, address, city } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (city !== undefined) user.city = city;

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: sendUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// ADDRESS ROUTES
// ============================================================

// POST /api/auth/addresses — Add new address
router.post("/addresses", protect, async (req, res) => {
  try {
    const { label, name, phone, address, city, isDefault } = req.body;

    if (!name || !phone || !address || !city) {
      return res.status(400).json({ error: "All fields required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Agar isDefault true hai → baaki sab false karo
    if (isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // Agar pehla address hai → default banao
    const isFirst = user.addresses.length === 0;

    user.addresses.push({
      label: label || "Home",
      name,
      phone,
      address,
      city,
      isDefault: isDefault || isFirst,
    });

    await user.save();

    res.json({
      success: true,
      message: "Address added successfully",
      addresses: user.addresses,
    });
  } catch (err) {
    console.error("Add address error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/addresses/:id — Update address
router.put("/addresses/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const address = user.addresses.id(req.params.id);
    if (!address) return res.status(404).json({ error: "Address not found" });

    const { label, name, phone, address: addr, city, isDefault } = req.body;

    if (label !== undefined) address.label = label;
    if (name !== undefined) address.name = name;
    if (phone !== undefined) address.phone = phone;
    if (addr !== undefined) address.address = addr;
    if (city !== undefined) address.city = city;

    if (isDefault) {
      user.addresses.forEach((a) => {
        a.isDefault = false;
      });
      address.isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      message: "Address updated",
      addresses: user.addresses,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/addresses/:id — Delete address
router.delete("/addresses/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.addresses = user.addresses.filter(
      (a) => a._id.toString() !== req.params.id
    );

    // Agar default address delete hua → pehla address default banao
    if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      message: "Address deleted",
      addresses: user.addresses,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, protect };