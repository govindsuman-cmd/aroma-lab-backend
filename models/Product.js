const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    stock: {
      type: Number,
      default: 10,
    },

    category: {
      type: String,
      required: true,
    },

    size: {
      type: String,
      default: "50ml",
    },

    // ⭐ MULTIPLE IMAGES LIKE AMAZON/FLIPKART
    images: [
      {
        type: String, // URL of image
        required: true,
      },
    ],

    notes: {
      top: [String],
      heart: [String],
      base: [String],
    },

    inStock: {
      type: Boolean,
      default: true,
    },

    featured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
