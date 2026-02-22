const express = require("express");
const router = express.Router();
const controller = require("../controllers/orderController");
const { verifyToken } = require("../middleware/authMiddleware");
const { isAdmin, isCustomer } = require("../middleware/roleMiddleware");

// Customer
router.post("/", verifyToken, isCustomer, controller.placeOrder);
router.get("/my", verifyToken, isCustomer, controller.getMyOrders);
router.put("/:id/cancel", verifyToken, isCustomer, controller.cancelOrder);

// Admin
router.get("/admin", verifyToken, isAdmin, controller.getAllOrders);
router.put(
  "/admin/:id/status",
  verifyToken,
  isAdmin,
  controller.updateOrderStatus,
);

module.exports = router;
