const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

// ➤ PLACE ORDER (CHECKOUT)
exports.placeOrder = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.email)
      return res.status(400).json({ message: "User email not found" });

    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product",
    );

    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Cart is empty" });

    let total = 0;
    const orderItems = [];

    for (const item of cart.items) {
      if (item.product.stock < item.quantity)
        return res
          .status(400)
          .json({ message: `${item.product.name} out of stock` });

      total += item.product.price * item.quantity;

      orderItems.push({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
      });
    }

    // 🔥 Sanitize & map shipping address
    const {
      fullName,
      phone,
      address,
      street,
      city,
      state,
      postalCode,
      country,
    } = req.body.shippingAddress || {};

    if (!city || !postalCode)
      return res.status(400).json({ message: "Incomplete shipping address" });

    const shippingAddress = {
      fullName: fullName || "",
      phone: phone || "",
      address: address || street || "", // map street → address
      city,
      state,
      postalCode,
      country,
    };

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      totalAmount: total,
      shippingAddress,
      status: "pending",
      statusHistory: [{ status: "pending" }],
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ➤ GET USER ORDERS
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product", "name images price")
      .sort("-createdAt");

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ➤ UPDATE ORDER STATUS (ADMIN)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber, courier } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order.isPaid)
      return res.status(400).json({ message: "Cannot ship unpaid order" });

    order.status = status;

    order.statusHistory.push({
      status,
      note: `Order marked as ${status}`,
    });

    if (status === "shipped") {
      order.trackingNumber = trackingNumber;
      order.courier = courier;
    }

    await order.save();

    res.json({ message: "Order updated", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user.id })
    .populate("items.product", "name images")
    .sort("-createdAt");

  res.json(orders);
};

exports.getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const status = req.query.status;
    const search = req.query.search;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { "shippingAddress.fullName": { $regex: search, $options: "i" } },
      ];
    }

    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate("user", "name email")
      .populate("items.product", "name price images")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      total,
      page,
      pages: Math.ceil(total / limit),
      orders,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note, trackingNumber, courier } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const validStatuses = [
      "pending",
      "paid",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(status))
      return res.status(400).json({ message: "Invalid status" });

    order.status = status;
    order.statusHistory.push({ status, note: note || "" });

    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (courier) order.courier = courier;

    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order || order.user.toString() !== req.user.id)
      return res.status(404).json({ message: "Order not found" });

    if (["shipped", "out_for_delivery", "delivered"].includes(order.status))
      return res.status(400).json({ message: "Cannot cancel this order" });

    order.status = "cancelled";
    order.statusHistory.push({
      status: "cancelled",
      note: "Cancelled by customer",
    });

    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
