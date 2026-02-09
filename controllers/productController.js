const Product = require("../models/Product");

const streamifier = require("streamifier");

const { cloudinary } = require("../config/cloudinary");
const Category = require("../models/Category");

const uploadFromBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "perfume_products" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// ➤ CREATE PRODUCT
exports.createProduct = async (req, res) => {
  try {
    let imageUrls = [];

    /* ---------------- IMAGE UPLOAD ---------------- */
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadFromBuffer(file.buffer);
        imageUrls.push({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    }

    /* ---------------- NOTES PARSING ---------------- */
    const parseNotes = (val) =>
      val
        ? val
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    /* ---------------- PRODUCT CREATE ---------------- */
    const product = await Product.create({
      name: req.body.name,
      description: req.body.description,
      price: Number(req.body.price),
      stock: Number(req.body.stock),
      size: req.body.size,
      category: req.body.category,
      featured: req.body.featured === "true",
      inStock: Number(req.body.stock) > 0,

      notes: {
        top: parseNotes(req.body.topNotes),
        heart: parseNotes(req.body.heartNotes),
        base: parseNotes(req.body.baseNotes),
      },

      images: imageUrls,
    });

    res.status(201).json(product);
  } catch (err) {
    console.log("CREATE PRODUCT ERROR:", err);
    res.status(400).json({ message: err.message });
  }
};

// ➤ GET ALL PRODUCTS
exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const category = req.query.category;
    const status = req.query.status; // inStock / outOfStock
    const sort = req.query.sort || "-createdAt";

    const query = {};

    // 🔎 Search by name
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // 📂 Filter category
    if (category && category !== "All") {
      query.category = category;
    }

    // 📦 Stock filter
    if (status === "inStock") query.stock = { $gt: 0 };
    if (status === "outOfStock") query.stock = { $lte: 0 };

    const totalProducts = await Product.countDocuments(query);

    const products = await Product.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    console.log("Fetched products:", products);
    console.log("Status code:", res.statusCode);

    res.json({
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      products,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProductStats = async (req, res) => {
  try {
    const total = await Product.countDocuments();
    const inStock = await Product.countDocuments({ stock: { $gt: 0 } });
    const outOfStock = await Product.countDocuments({ stock: { $lte: 0 } });
    const featured = await Product.countDocuments({ featured: true });
    console.log("Product stats:", { total, inStock, outOfStock, featured });
    console.log("Status code:", res.statusCode);
    res.json({ total, inStock, outOfStock, featured });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ➤ GET SINGLE PRODUCT
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ➤ UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    /* ------------------ BASIC FIELDS ------------------ */
    product.name = req.body.name ?? product.name;
    product.description = req.body.description ?? product.description;
    product.price = req.body.price ? Number(req.body.price) : product.price;
    product.stock = req.body.stock ? Number(req.body.stock) : product.stock;
    product.size = req.body.size ?? product.size;
    product.category = req.body.category ?? product.category;

    product.inStock =
      req.body.inStock !== undefined
        ? req.body.inStock === "true" || req.body.inStock === true
        : product.inStock;

    product.featured = req.body.featured === "true";

    /* ------------------ NOTES PARSING ------------------ */
    const parseNotes = (val) =>
      val
        ? val
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    product.notes = {
      top: parseNotes(req.body.topNotes),
      heart: parseNotes(req.body.heartNotes),
      base: parseNotes(req.body.baseNotes),
    };

    /* ------------------ IMAGE MANAGEMENT ------------------ */

    // IDs of images admin wants to keep
    const existingImages = JSON.parse(req.body.existingImages || "[]");

    // Delete removed images from Cloudinary
    const removedImages = product.images.filter(
      (img) => !existingImages.includes(img.public_id),
    );
    for (const img of removedImages) {
      await cloudinary.uploader.destroy(img.public_id);
    }

    // Keep only selected old images
    let updatedImages = product.images.filter((img) =>
      existingImages.includes(img.public_id),
    );

    // Upload new images if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadFromBuffer(file.buffer);
        updatedImages.push({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    }

    product.images = updatedImages;

    /* ------------------ SAVE (slug auto updates) ------------------ */
    await product.save();

    res.json(product);
  } catch (err) {
    console.log("UPDATE PRODUCT ERROR:", err);
    res.status(400).json({ message: err.message });
  }
};

// ➤ DELETE PRODUCT
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    for (const img of product.images) {
      await cloudinary.uploader.destroy(img.public_id);
    }

    await product.deleteOne();

    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ➤ FILTER BY CATEGORY
exports.getByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    // "All" = return everything
    if (category === "All") {
      const products = await Product.find()
        .populate("category", "name")
        .sort({ createdAt: -1 });

      return res.json({ products });
    }

    const categoryDoc = await Category.findOne({ name: category });
    if (!categoryDoc)
      return res.status(404).json({ message: "Category not found" });

    const products = await Product.find({ category: categoryDoc._id })
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json({ products });
  } catch (err) {
    console.log("CATEGORY FETCH ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ➤ FEATURED PRODUCTS
exports.getFeatured = async (req, res) => {
  try {
    const products = await Product.find({ featured: true });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAdminProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json({ products });
  } catch (err) {
    console.log("ADMIN FETCH ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};
