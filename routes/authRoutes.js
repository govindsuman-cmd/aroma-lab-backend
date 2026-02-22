const express = require("express");
const router = express.Router();
const controller = require("../controllers/authController");

router.post("/signup", controller.signup);
router.post("/login", controller.login);
router.post("/google", controller.googleLogin);
router.post("/refresh", controller.refreshToken);
router.get("/verify-email/:token", controller.verifyEmail);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password/:token", controller.resetPassword);

module.exports = router;
