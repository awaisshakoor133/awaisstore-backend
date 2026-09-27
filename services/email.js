const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error.message);
  } else {
    console.log("✅ Email server ready");
  }
});

/**
 * Send email
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text: text || "",
      html: html || "",
    });

    console.log(`✅ Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email send error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * ============================================================
 * EMAIL TEMPLATES
 * ============================================================
 */

/**
 * Base template wrapper
 */
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f4f1ec;
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(30, 27, 75, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #1e1b4b, #312e81);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      text-decoration: none;
      font-family: Georgia, serif;
    }
    .logo-mark {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #c8a04b, #e0bb6a);
      color: #1e1b4b;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
    }
    .logo em {
      color: #e0bb6a;
      font-style: normal;
      font-weight: 800;
    }
    .body {
      padding: 40px 30px;
      color: #14162b;
    }
    h1 {
      font-family: Georgia, serif;
      font-size: 28px;
      color: #1e1b4b;
      margin-bottom: 16px;
      line-height: 1.3;
    }
    h2 {
      font-family: Georgia, serif;
      font-size: 22px;
      color: #1e1b4b;
      margin: 24px 0 12px;
    }
    p {
      color: #4a4d68;
      font-size: 15px;
      margin-bottom: 14px;
    }
    .highlight {
      background: linear-gradient(135deg, rgba(200,160,75,0.12), rgba(200,160,75,0.04));
      border: 1px solid rgba(200,160,75,0.3);
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .order-details {
      background: #fbfaf8;
      border: 1px solid #e8e5df;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .order-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px dashed #e8e5df;
      font-size: 14px;
    }
    .order-row:last-child {
      border-bottom: none;
      padding-top: 16px;
      margin-top: 8px;
      border-top: 2px solid #e8e5df;
      font-weight: 700;
      font-size: 16px;
    }
    .order-row span:first-child {
      color: #8a8fa3;
    }
    .order-row strong {
      color: #14162b;
    }
    .order-row:last-child strong {
      color: #1e1b4b;
      font-size: 20px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #1e1b4b, #312e81);
      color: #ffffff !important;
      padding: 14px 28px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      margin: 10px 0;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .footer {
      background: #fbfaf8;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e8e5df;
    }
    .footer p {
      font-size: 13px;
      color: #8a8fa3;
      margin-bottom: 8px;
    }
    .footer a {
      color: #c8a04b;
      text-decoration: none;
      font-weight: 600;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #c8a04b, transparent);
      opacity: 0.3;
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <span class="logo-mark">AM</span>
        Awais<em> Mobile-Zone</em>
      </div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>© 2026 <strong>Awais Mobile-Zone</strong>. All rights reserved.</p>
      <p>📍 Badin, Pakistan · 📞 0335-2494258</p>
      <p style="margin-top: 16px;">
        <a href="https://awaisstore-frontend.vercel.app">Visit Store</a> ·
        <a href="mailto:awaisshakoor133@gmail.com">Contact Us</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Order Confirmation Email
 */
const orderConfirmationTemplate = (order) => {
  const productsHtml = order.products
    .map(
      (p) => `
    <div class="order-row">
      <span>${p.icon || "📦"} ${p.name} × ${p.quantity}</span>
      <strong>Rs. ${(p.price * p.quantity).toLocaleString()}</strong>
    </div>
  `
    )
    .join("");

  const content = `
    <h1>Order Confirmed! 🎉</h1>
    <p>Hi <strong>${order.customer.name}</strong>,</p>
    <p>Thank you for your order! We've received your order and it's being processed.</p>

    <div class="highlight">
      <p style="margin: 0; font-size: 13px; color: #8a8fa3; text-transform: uppercase; letter-spacing: 1px;">Order Number</p>
      <p style="margin: 4px 0 0; font-size: 24px; font-weight: 800; color: #1e1b4b; font-family: Georgia, serif;">
        #${order._id.toString().slice(-6).toUpperCase()}
      </p>
    </div>

    <h2>Order Details</h2>
    <div class="order-details">
      ${productsHtml}
      <div class="order-row">
        <span>Subtotal</span>
        <strong>Rs. ${order.total.toLocaleString()}</strong>
      </div>
      ${
        order.discount > 0
          ? `
      <div class="order-row" style="color: #15803d;">
        <span style="color: #15803d;">Discount</span>
        <strong style="color: #15803d;">- Rs. ${order.discount.toLocaleString()}</strong>
      </div>
      `
          : ""
      }
      <div class="order-row">
        <span>Shipping</span>
        <strong style="color: #15803d;">Free</strong>
      </div>
      <div class="order-row">
        <span>Total</span>
        <strong>Rs. ${order.total.toLocaleString()}</strong>
      </div>
    </div>

    <h2>Delivery Address</h2>
    <p>
      <strong>${order.customer.name}</strong><br>
      ${order.customer.address}<br>
      ${order.customer.city}<br>
      📞 ${order.customer.phone}
    </p>

    <div class="divider"></div>

    <p style="text-align: center;">
      <a href="https://awaisstore-frontend.vercel.app/orders" class="btn">
        Track Your Order →
      </a>
    </p>

    <p style="text-align: center; margin-top: 20px; font-size: 13px; color: #8a8fa3;">
      Expected delivery: <strong>3-5 business days</strong>
    </p>
  `;

  return baseTemplate(content);
};

/**
 * Welcome Email
 */
const welcomeTemplate = (user) => {
  const content = `
    <h1>Welcome to Awais Mobile-Zone! 🎉</h1>
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>Thank you for creating an account with us! We're excited to have you on board.</p>

    <div class="highlight">
      <p style="margin: 0; font-size: 15px; color: #1e1b4b;">
        <strong>Here's what you can do:</strong>
      </p>
      <ul style="margin: 12px 0 0; padding-left: 20px; color: #4a4d68; font-size: 14px; line-height: 2;">
        <li>🛍️ Browse our premium products</li>
        <li>❤️ Save your favorites to wishlist</li>
        <li>📦 Track your orders in real-time</li>
        <li>🎟️ Apply coupons and save money</li>
        <li>📍 Save addresses for faster checkout</li>
      </ul>
    </div>

    <div class="divider"></div>

    <p style="text-align: center;">
      <a href="https://awaisstore-frontend.vercel.app/products" class="btn">
        Start Shopping →
      </a>
    </p>

    <p style="text-align: center; margin-top: 20px; font-size: 13px; color: #8a8fa3;">
      Questions? Reply to this email or WhatsApp us at <strong>0335-2494258</strong>
    </p>
  `;

  return baseTemplate(content);
};

/**
 * Order Status Update Email
 */
const orderStatusTemplate = (order, newStatus) => {
  const statusMessages = {
    Shipped: {
      title: "Your Order is on the Way! 🚚",
      message: "Great news! Your order has been shipped and is on its way to you.",
      emoji: "🚚",
    },
    "Out for Delivery": {
      title: "Your Order is Out for Delivery! 📦",
      message: "Your order is out for delivery. It will reach you soon!",
      emoji: "📦",
    },
    Delivered: {
      title: "Your Order has been Delivered! 🎉",
      message: "Your order has been successfully delivered. We hope you love it!",
      emoji: "🎉",
    },
    Cancelled: {
      title: "Order Cancelled",
      message: "Your order has been cancelled. If this was a mistake, please contact us.",
      emoji: "❌",
    },
  };

  const statusInfo = statusMessages[newStatus] || {
    title: `Order Status Updated: ${newStatus}`,
    message: `Your order status has been updated to ${newStatus}.`,
    emoji: "📋",
  };

  const content = `
    <h1>${statusInfo.title}</h1>
    <p>Hi <strong>${order.customer.name}</strong>,</p>
    <p>${statusInfo.message}</p>

    <div class="highlight">
      <p style="margin: 0; font-size: 13px; color: #8a8fa3; text-transform: uppercase; letter-spacing: 1px;">Order Number</p>
      <p style="margin: 4px 0 0; font-size: 24px; font-weight: 800; color: #1e1b4b; font-family: Georgia, serif;">
        #${order._id.toString().slice(-6).toUpperCase()}
      </p>
      <p style="margin: 12px 0 0; font-size: 15px; color: #1e1b4b;">
        <strong>New Status:</strong> ${statusInfo.emoji} ${newStatus}
      </p>
    </div>

    <p><strong>Delivery Address:</strong><br>
      ${order.customer.address}<br>
      ${order.customer.city}
    </p>

    <div class="divider"></div>

    <p style="text-align: center;">
      <a href="https://awaisstore-frontend.vercel.app/orders" class="btn">
        View Order Details →
      </a>
    </p>
  `;

  return baseTemplate(content);
};

/**
 * Admin New Order Notification
 */
const adminNewOrderTemplate = (order) => {
  const content = `
    <h1>🔔 New Order Received</h1>
    <p>A new order has been placed on AwaisStore!</p>

    <div class="highlight">
      <p style="margin: 0; font-size: 13px; color: #8a8fa3; text-transform: uppercase; letter-spacing: 1px;">Order Number</p>
      <p style="margin: 4px 0 0; font-size: 24px; font-weight: 800; color: #1e1b4b; font-family: Georgia, serif;">
        #${order._id.toString().slice(-6).toUpperCase()}
      </p>
      <p style="margin: 12px 0 0; font-size: 22px; color: #15803d; font-weight: 700;">
        Rs. ${order.total.toLocaleString()}
      </p>
    </div>

    <h2>Customer Details</h2>
    <p>
      <strong>${order.customer.name}</strong><br>
      📞 ${order.customer.phone}<br>
      ✉️ ${order.customer.email || "N/A"}<br>
      📍 ${order.customer.address}, ${order.customer.city}
    </p>

    <h2>Products (${order.products.length})</h2>
    <div class="order-details">
      ${order.products
        .map(
          (p) => `
        <div class="order-row">
          <span>${p.icon || "📦"} ${p.name} × ${p.quantity}</span>
          <strong>Rs. ${(p.price * p.quantity).toLocaleString()}</strong>
        </div>
      `
        )
        .join("")}
    </div>

    <p><strong>Payment Method:</strong> ${order.customer.payment}</p>

    <div class="divider"></div>

    <p style="text-align: center;">
      <a href="https://awaisstore-frontend.vercel.app/admin/orders" class="btn">
        Manage Order →
      </a>
    </p>
  `;

  return baseTemplate(content);
};

module.exports = {
  sendEmail,
  orderConfirmationTemplate,
  welcomeTemplate,
  orderStatusTemplate,
  adminNewOrderTemplate,
};