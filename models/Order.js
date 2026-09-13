const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customer: {
      name:    { type: String, required: true },
      phone:   { type: String, required: true },
      address: { type: String, required: true },
      city:    { type: String, required: true },
      payment: { type: String, default: "Cash on Delivery" },
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