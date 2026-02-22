const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");

/**
 * ADDRESS ROUTES
 */

// Add new address
router.post("/address", verifyToken, userController.addAddress);

// Get all user addresses
router.get("/address", verifyToken, userController.getAddresses);

// Update address
router.put("/address/:addressId", verifyToken, userController.updateAddress);

// Delete address
router.delete("/address/:addressId", verifyToken, userController.deleteAddress);

module.exports = router;
