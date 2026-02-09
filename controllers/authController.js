const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🔑 Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// 🔑 SIGNUP
exports.signup = async (req, res) => {
  try {
    // Force string type to prevent NoSQL injection
    const name = String(req.body.name).trim();
    const email = String(req.body.email).toLowerCase().trim();
    const password = String(req.body.password);

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    if (password.length < 6)
      return res.status(400).json({ message: "Password too short" });

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    // ⚠️ DO NOT accept role from frontend
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "customer", // Force safe role
    });

    res.status(201).json({
      token: generateToken(user),
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Signup failed" });
  }
};

// 🔐 LOGIN
exports.login = async (req, res) => {
  try {
    const email = String(req.body.email).toLowerCase().trim();
    const password = String(req.body.password);

    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    if (user.isBlocked)
      return res.status(403).json({ message: "Account blocked" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
};

exports.forgotPassword = async (req, res) => {
  const email = String(req.body.email).toLowerCase();

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const resetToken = crypto.randomBytes(32).toString("hex");

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min

  await user.save();

  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  await sendEmail(
    user.email,
    "Password Reset",
    `<h2>Password Reset</h2>
     <p>Click to reset your password:</p>
     <a href="${resetURL}">${resetURL}</a>`,
  );

  res.json({ message: "Reset email sent" });
};

exports.resetPassword = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: "Token expired" });

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.json({ message: "Password reset successful" });
};

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;
    const googleId = payload.sub;

    let user = await User.findOne({ email });

    // Existing user
    if (user) {
      user.isVerified = true;
      user.authProvider = "google";
      await user.save();
    } else {
      // New user
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture,
        isVerified: true,
        role: "customer",
        authProvider: "google",
        password: Math.random().toString(36), // dummy
      });
    }

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    res.status(401).json({ message: "Google login failed" });
  }
};
