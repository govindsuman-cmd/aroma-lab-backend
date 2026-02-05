const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const Order = require("../models/Order");

// ➤ CREATE RAZORPAY ORDER
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const options = {
      amount: order.totalAmount * 100, // paise
      currency: "INR",
      receipt: order._id.toString(),
    };

    const razorpayOrder = await razorpay.orders.create(options);

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.json(razorpayOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature)
      return res.status(400).json({ message: "Payment verification failed" });

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });

    order.isPaid = true;
    order.paidAt = Date.now();
    order.razorpayPaymentId = razorpay_payment_id;
    order.status = "paid";

    await order.save();

    res.json({ message: "Payment successful", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
