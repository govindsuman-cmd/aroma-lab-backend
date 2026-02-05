const express = require("express");
const router = express.Router();
const controller = require("../controllers/productController");

router.post(
  "/",
  verifyToken,
  isAdmin,
  upload.array("images", 5),
  controller.createProduct
);

router.put(
  "/:id",
  verifyToken,
  isAdmin,
  upload.array("images", 5),
  controller.updateProduct
);

router.get("/", controller.getProducts);
router.get("/featured", controller.getFeatured);
router.get("/category/:category", controller.getByCategory);
router.get("/:id", controller.getProductById);
router.delete("/:id", controller.deleteProduct);

module.exports = router;
