const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customer: {
  name: { type: String, required: true },
  email: { type: String, default: "" },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  payment: { type: String, default: "Cash on Delivery" },
  coupon: { type: String, default: null },
  discount: { type: Number, default: 0 },
},
    products: [
      {
        id:       String,
        name:     String,
        price:    Number,
        quantity: Number,
        icon:     String,
      },
    ],
    total:  { type: Number, required: true },
    status: { type: String, default: "Confirmed" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);