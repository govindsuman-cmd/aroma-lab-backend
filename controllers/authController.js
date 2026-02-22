const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🔑 Helper to generate JWT
const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "30d" }, // default max
  );
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
};

// 🔐 LOGIN
exports.login = async (req, res) => {
  try {
    const email = String(req.body.email).toLowerCase().trim();
    const password = String(req.body.password);
    const rememberMe = req.body.rememberMe;

    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    if (user.isBlocked)
      return res.status(403).json({ message: "Account blocked" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    if (!user.isVerified)
      return res
        .status(403)
        .json({ message: "Please verify your email first" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: rememberMe
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 24 * 60 * 60 * 1000, // 1 day
    });

    res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: `Login failed: ${err.message}` });
  }
};

exports.refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const accessToken = generateAccessToken(user);

    res.json({ accessToken });
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// 🔑 SIGNUP
exports.signup = async (req, res) => {
  try {
    console.log("Signup request:", req.body);
    const name = String(req.body.name).trim();
    const email = String(req.body.email).toLowerCase().trim();
    const password = String(req.body.password);

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    if (password.length < 6)
      return res.status(400).json({ message: "Password too short" });

    const userExists = await User.findOne({ email });

    // 👇 If user exists
    if (userExists) {
      // ✅ If already verified → block signup
      if (userExists.isVerified) {
        return res.status(400).json({ message: "User already exists" });
      }

      // ❗ If exists but NOT verified → resend verification email
      const verificationToken = crypto.randomBytes(32).toString("hex");

      userExists.emailVerificationToken = verificationToken;
      userExists.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

      await userExists.save();

      const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

      await sendEmail(
        email,
        "Verify Your Email",
        `<h3>Welcome back to Aroma Store</h3>
         <p>Please verify your account:</p>
         <a href="${verifyUrl}">Verify Email</a>`,
      );

      return res.status(200).json({
        message: "Verification email resent. Please check your inbox.",
      });
    }

    // 🔥 If user does NOT exist → create new user
    const hashedPassword = await bcrypt.hash(password, 12);

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "customer",
      isVerified: false, // make sure this exists in schema
      emailVerificationToken: verificationToken,
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    await sendEmail(
      email,
      "Verify Your Email",
      `<h3>Welcome to Aroma Store</h3>
       <p>Click below to verify your account:</p>
       <a href="${verifyUrl}">Verify Email</a>`,
    );

    res.status(201).json({
      message: "Signup successful. Please check your email to verify account.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed" });
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
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Token expired or invalid" });

    // 🔐 HASH THE NEW PASSWORD
    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    user.password = hashedPassword;

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Reset failed" });
  }
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

    if (user) {
      user.isVerified = true;
      user.authProvider = "google";
      await user.save();
    } else {
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

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("GOOGLE LOGIN ERROR:", err);
    res.status(401).json({ message: "Google login failed" });
  }
};
