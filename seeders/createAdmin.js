require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);

    const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (existing) {
      console.log("⚠️ Admin already exists");
      process.exit();
    }

    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

    await User.create({
      name: "Super Admin",
      email: process.env.ADMIN_EMAIL,
      password: hashed,
      role: "admin",
      isVerified: true,
    });

    console.log("✅ Admin created successfully");
    process.exit();
  } catch (err) {
    console.error("❌ Seeder error:", err);
    process.exit(1);
  }
};

createAdmin();
