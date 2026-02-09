const mongoose = require("mongoose");
const slugify = require("slugify");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    slug: {
      type: String,
      unique: true,
      sparse: true,
    },

    description: { type: String, required: true },

    price: { type: Number, required: true },

    stock: { type: Number, default: 10 },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    size: { type: String, default: "50ml" },

    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],

    notes: {
      top: [String],
      heart: [String],
      base: [String],
    },

    inStock: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

productSchema.pre("save", async function () {
  if (this.isModified("name") || !this.slug) {
    const baseSlug = slugify(this.name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await this.constructor.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    this.slug = slug;
  }
});

module.exports = mongoose.model("Product", productSchema);
