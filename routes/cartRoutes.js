const express = require("express");
const router = express.Router();
const controller = require("../controllers/cartController");

const { verifyToken } = require("../middleware/authMiddleware");
const { isCustomer } = require("../middleware/roleMiddleware");

router.use(verifyToken, isCustomer);

router.get("/", controller.getCart);
router.post("/add", controller.addToCart);
router.put("/update", controller.updateQuantity);
router.delete("/remove", controller.removeItem);
router.delete("/clear", controller.clearCart);

module.exports = router;
