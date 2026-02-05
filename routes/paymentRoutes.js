const express = require("express");
const router = express.Router();
const controller = require("../controllers/paymentController");

const { verifyToken } = require("../middleware/authMiddleware");

router.post("/create-order", verifyToken, controller.createRazorpayOrder);
router.post("/verify", verifyToken, controller.verifyPayment);

module.exports = router;
