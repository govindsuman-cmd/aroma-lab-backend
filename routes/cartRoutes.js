const express = require("express");
const router = express.Router();
const controller = require("../controllers/cartController");

const { verifyToken } = require("../middleware/authMiddleware");
const { isCustomer } = require("../middleware/roleMiddleware");

router.use(verifyToken, isCustomer);

router.get("/", verifyToken, controller.getCart);
router.post("/add", verifyToken, controller.addToCart);
router.put("/update", verifyToken, controller.updateQuantity);
router.delete("/remove", verifyToken, controller.removeItem);
router.delete("/clear", verifyToken, controller.clearCart);

module.exports = router;
