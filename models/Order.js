const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: Number,
        price: Number,
      },
    ],

    totalAmount: Number,

    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    shippingAddress: {
      address: String,
      city: String,
      postalCode: String,
      country: String,
    },

    paymentMethod: {
      type: String,
      default: "COD",
    },
    razorpayOrderId: String,
razorpayPaymentId: String,
isPaid: {
  type: Boolean,
  default: false,
},
paidAt: Date,

  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
