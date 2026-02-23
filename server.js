const express = require("express");
const cors = require("cors");
require("dotenv").config();
const helmet = require("helmet");
const mongoSanitize = require("mongo-sanitize");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const { cloudinaryConnect } = require("./config/cloudinary");

const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const userRoutes = require("./routes/userRoutes");
const app = express();
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Enable CORS
app.use(
  cors({
    origin: "https://www.thearomalab.shop",
    credentials: true, // if using cookies/auth
  }),
);

// ========================
// 🔐 SECURITY MIDDLEWARES
// ========================

// Security headers
app.use(helmet());
cloudinaryConnect();
// Prevent NoSQL Injection
app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize(req.body);
  if (req.params) req.params = mongoSanitize(req.params);
  if (req.query) req.query = mongoSanitize(req.query);
  next();
});

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Rate Limiting (API Abuse Protection)
// app.use(
//   rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 mins
//     max: 100, // limit each IP
//     message: "Too many requests, try again later",
//   }),
// );

// Parse JSON bodies
app.use((req, res, next) => {
  if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
    next(); // let multer handle it
  } else {
    express.json({ limit: "50mb" })(req, res, next);
  }
});

app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ========================
// 🗄 DATABASE CONNECTION
// ========================
require("./config/database").connect();

// ========================
// 🚏 ROUTES
// ========================
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/user", userRoutes);
// ========================
// 🚀 SERVER START
// ========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
