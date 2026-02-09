const express = require("express");
const router = express.Router();
const controller = require("../controllers/categoryController");
const upload = require("../middleware/uploadMiddleware");
const { verifyToken } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");

router.post(
  "/",
  verifyToken,
  isAdmin,
  upload.single("image"),
  controller.createCategory,
);
router.get("/", controller.getCategories);
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  upload.single("image"), // 🔥 REQUIRED
  controller.updateCategory,
);

router.delete("/:id", verifyToken, isAdmin, controller.deleteCategory);

module.exports = router;
