const Category = require("../models/Category");
const Product = require("../models/Product");
const streamifier = require("streamifier");
const { cloudinary } = require("../config/cloudinary");

const uploadFromBuffer = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// ➤ CREATE CATEGORY
exports.createCategory = async (req, res) => {
  try {
    const name = String(req.body.name).trim();

    const exists = await Category.findOne({ name });
    if (exists) return res.status(400).json({ message: "Category exists" });

    let imageData = {};

    if (req.file) {
      const result = await uploadFromBuffer(req.file.buffer, "categories");
      imageData = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

    const category = await Category.create({
      name,
      image: imageData,
    });

    res.status(201).json(category);
  } catch (err) {
    console.log("CATEGORY CREATE ERROR:", err);
    res.status(400).json({ message: err.message });
  }
};

// ➤ GET ALL CATEGORIES
exports.getCategories = async (req, res) => {
  const categories = await Category.find().sort({ createdAt: -1 });

  res.json(categories);
};

// ➤ UPDATE CATEGORY
exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Not found" });

    if (req.body.name) category.name = req.body.name;

    if (req.file) {
      if (category.image?.public_id) {
        await cloudinary.uploader.destroy(category.image.public_id);
      }

      const result = await uploadFromBuffer(req.file.buffer, "categories");
      category.image = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

    await category.save();
    res.json(category);
  } catch (err) {
    console.log("CATEGORY UPDATE ERROR:", err);
    res.status(400).json({ message: err.message });
  }
};

// ➤ DELETE CATEGORY
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Not found" });

    if (category.image?.public_id) {
      await cloudinary.uploader.destroy(category.image.public_id);
    }

    await category.deleteOne();

    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
