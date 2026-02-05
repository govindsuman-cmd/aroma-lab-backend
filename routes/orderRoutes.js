const express = require("express");
const router = express.Router();
const controller = require("../controllers/orderController");

const { verifyToken } = require("../middleware/authMiddleware");
const { isAdmin, isCustomer } = require("../middleware/roleMiddleware");

router.post("/", verifyToken, isCustomer, controller.placeOrder);
router.get("/my", verifyToken, isCustomer, controller.getMyOrders);

router.get("/", verifyToken, isAdmin, controller.getAllOrders);
router.put("/:id", verifyToken, isAdmin, controller.updateOrderStatus);

module.exports = router;
