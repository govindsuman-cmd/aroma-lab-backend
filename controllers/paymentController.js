const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature)
      return res.status(400).json({ message: "Payment verification failed" });

    const order = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
    }).populate("items.product");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.isPaid)
      return res.status(400).json({ message: "Order already paid" });

    // 🔥 NOW reduce stock
    for (const item of order.items) {
      if (item.product.stock < item.quantity)
        return res.status(400).json({ message: "Stock error" });

      item.product.stock -= item.quantity;
      await item.product.save();
    }

    // Mark paid
    order.isPaid = true;
    order.paidAt = Date.now();
    order.razorpayPaymentId = razorpay_payment_id;
    order.status = "paid";
    order.statusHistory.push({ status: "paid" });

    await order.save();

    // 🔥 Send purchase confirmation email
    const user = await User.findById(order.user);
    if (user?.email) {
      const itemsList = order.items
        .map(
          (item) =>
            `<li>${item.product.name} × ${item.quantity} - ₹${item.price}</li>`,
        )
        .join("");

      const html = `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="color:#b38b59;">Order Confirmed 🎉</h2>
    <p>Hi ${user.name || "Customer"},</p>
    <p>Thank you for shopping with us.</p>

    <table width="100%" cellpadding="8" cellspacing="0" border="1">
      <thead>
        <tr>
          <th align="left">Product</th>
          <th align="left">Qty</th>
          <th align="left">Price</th>
        </tr>
      </thead>
      <tbody>
        ${order.items
          .map(
            (item) => `
          <tr>
            <td>${item.product.name}</td>
            <td>${item.quantity}</td>
            <td>₹${item.price}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <h3>Total Paid: ₹${order.totalAmount}</h3>

    <p>We’ll ship your order soon 🚚</p>
  </div>
`;

      try {
        await sendEmail(user.email, "Order Confirmation - Aroma Store", html);
      } catch (emailErr) {
        console.error("Email failed:", emailErr.message);
      }
    }

    // 🔥 Clear cart only after success
    await Cart.findOneAndDelete({ user: order.user });

    res.json({ message: "Payment successful", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
