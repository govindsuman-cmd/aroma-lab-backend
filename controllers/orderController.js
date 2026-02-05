const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");


// ➤ PLACE ORDER (CHECKOUT)
exports.placeOrder = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Cart is empty" });

    let total = 0;
    const orderItems = [];

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({ message: `${item.product.name} out of stock` });
      }

      item.product.stock -= item.quantity;
      await item.product.save();

      total += item.product.price * item.quantity;

      orderItems.push({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
      });
    }

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      totalAmount: total,
      shippingAddress: req.body.shippingAddress,
    });

    await Cart.findOneAndDelete({ user: req.user.id });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ➤ GET USER ORDERS
exports.getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).populate("items.product");
  res.json(orders);
};


// ➤ ADMIN: GET ALL ORDERS
exports.getAllOrders = async (req, res) => {
  const orders = await Order.find().populate("user items.product");
  res.json(orders);
};


// ➤ UPDATE ORDER STATUS (ADMIN)
exports.updateOrderStatus = async (req, res) => {
  const order = await Order.findById(req.params.id);
  order.status = req.body.status;
  await order.save();
  res.json(order);
};
