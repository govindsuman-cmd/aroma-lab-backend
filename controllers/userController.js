const User = require("../models/User");

exports.addAddress = async (req, res) => {
  try {
    const { street, city, state, postalCode, country } = req.body;

    if (!street || !city || !state || !postalCode || !country) {
      return res.status(400).json({ message: "All address fields required" });
    }

    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.address.push({ street, city, state, postalCode, country });
    await user.save();

    res.status(201).json({
      message: "Address added successfully",
      addresses: user.address,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to add address" });
  }
};

exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("address");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user.address);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { street, city, state, postalCode, country } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    const address = user.address.id(addressId);
    if (!address) return res.status(404).json({ message: "Address not found" });

    address.street = street || address.street;
    address.city = city || address.city;
    address.state = state || address.state;
    address.postalCode = postalCode || address.postalCode;
    address.country = country || address.country;

    await user.save();

    res.status(200).json({
      message: "Address updated",
      addresses: user.address,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update address" });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.address.pull({ _id: addressId });

    await user.save();

    res.status(200).json({
      message: "Address deleted",
      addresses: user.address,
    });
  } catch (err) {
    console.error(err); // ADD THIS for debugging
    res.status(500).json({ message: "Failed to delete address" });
  }
};
