const express = require("express");
const router = express.Router();
const controller = require("../controllers/productController");
const { verifyToken } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");
const multer = require("multer");
const path = require("path");
const upload = require("../middleware/uploadMiddleware");

router.post(
  "/",
  verifyToken,
  isAdmin,
  upload.array("images", 5),
  controller.createProduct,
);

router.put(
  "/:id",
  verifyToken,
  isAdmin,
  upload.array("images", 5),
  controller.updateProduct,
);

router.get("/get-products", controller.getProducts);
router.get("/featured", controller.getFeatured);
router.get("/category/:category", controller.getByCategory);
router.get("/:id", controller.getProductById);
router.delete("/:id", controller.deleteProduct);
router.get("/admin/stats", verifyToken, isAdmin, controller.getProductStats);
router.get(
  "/admin/dashboard",
  verifyToken,
  isAdmin,
  controller.getAdminProducts,
);

module.exports = router;
