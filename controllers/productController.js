const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const uploadFromBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "perfume_products" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// ➤ CREATE PRODUCT
exports.createProduct = async (req, res) => {
  try {
    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadFromBuffer(file.buffer);
        imageUrls.push({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    }

    const product = await Product.create({
      ...req.body,
      images: imageUrls,
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ➤ GET ALL PRODUCTS
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
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

    // If new images uploaded
    if (req.files && req.files.length > 0) {
      // Delete old images from Cloudinary
      for (const img of product.images) {
        await cloudinary.uploader.destroy(img.public_id);
      }

      // Upload new images
      let newImages = [];
      for (const file of req.files) {
        const result = await uploadFromBuffer(file.buffer);
        newImages.push({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
      product.images = newImages;
    }

    Object.assign(product, req.body);
    await product.save();

    res.json(product);
  } catch (err) {
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
    const products = await Product.find({ category: req.params.category });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
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

