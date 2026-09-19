const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendOtpEmail, sendPasswordResetOtp } = require("../utils/sendEmail");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Generates a random 6-digit OTP
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// @route  POST /api/auth/register
// @desc   BOOTSTRAP ONLY — create the very first admin account directly (no OTP needed).
//         Once your first admin exists, protect this route (protect + restrictTo("admin"))
//         so nobody can create accounts this way anymore. Normal staff should use /signup.
// @access Public FOR NOW
const registerUser = async (req, res) => {
  try {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password) {
      return res
        .status(400)
        .json({ message: "Name, username aur password zaroori hai" });
    }

    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Ye username pehle se use ho raha hai" });
    }

    const user = await User.create({
      name,
      username,
      password,
      role: role === "admin" ? "admin" : "collector",
      isVerified: true, // bootstrap accounts don't need OTP approval
    });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("registerUser error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/auth/signup
// @desc   Step 1 — new staff requests an account. Password comes pre-generated from the
//         frontend. Account is created as unverified + OTP is emailed to the admin.
// @access Public
const signupUser = async (req, res) => {
  try {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
      return res
        .status(400)
        .json({ message: "Name, username aur password zaroori hai" });
    }

    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res
          .status(400)
          .json({ message: "Ye username pehle se use ho raha hai" });
      }
      // Existing but never verified (e.g. they never entered the OTP) — regenerate a fresh OTP
      const otp = generateOtp();
      existingUser.otp = otp;
      existingUser.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      existingUser.password = password; // in case they changed the generated password
      await existingUser.save();

      await sendOtpEmail({
        requesterName: name,
        requesterUsername: username,
        otp,
      });

      return res.status(200).json({
        message: "Naya OTP bhej diya gaya hai, admin se maang lijiye",
        username: existingUser.username,
      });
    }

    const otp = generateOtp();

    const user = await User.create({
      name,
      username,
      password,
      role: "collector",
      isVerified: false,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    await sendOtpEmail({
      requesterName: name,
      requesterUsername: username,
      otp,
    });

    return res.status(201).json({
      message:
        "Signup request bhej di gayi hai. Admin se OTP maang kar yahan daaliye.",
      username: user.username,
    });
  } catch (error) {
    console.error("signupUser error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/auth/verify-otp
// @desc   Step 2 — new staff enters the OTP the admin gave them. Activates the account.
// @access Public
const verifyOtp = async (req, res) => {
  try {
    const { username, otp } = req.body;

    if (!username || !otp) {
      return res.status(400).json({ message: "Username aur OTP daaliye" });
    }

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user || !user.otp) {
      return res
        .status(400)
        .json({ message: "Koi pending signup nahi mila is username ke liye" });
    }

    if (user.otpExpires < Date.now()) {
      return res
        .status(400)
        .json({ message: "OTP expire ho gaya, dobara signup try karein" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Galat OTP" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.json({
      message: "Account activate ho gaya! Ab login kar sakte hain.",
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("verifyOtp error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/auth/forgot-password
// @desc   Step 1 — staff requests a password reset. OTP is emailed to the admin.
// @access Public
const forgotPassword = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username daaliye" });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "Ye username nahi mila" });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        message:
          "Ye account abhi tak signup verify nahi hua hai, pehle signup complete karein",
      });
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendPasswordResetOtp({
      name: user.name,
      username: user.username,
      otp,
    });

    return res.json({
      message:
        "OTP admin ke Gmail pe bhej diya gaya hai, admin se maang lijiye",
    });
  } catch (error) {
    console.error("forgotPassword error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/auth/reset-password
// @desc   Step 2 — staff enters the OTP + a new password. Password gets updated.
// @access Public
const resetPassword = async (req, res) => {
  try {
    const { username, otp, newPassword } = req.body;

    if (!username || !otp || !newPassword) {
      return res
        .status(400)
        .json({ message: "Username, OTP aur naya password daaliye" });
    }

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user || !user.otp) {
      return res
        .status(400)
        .json({
          message: "Koi pending reset request nahi mila is username ke liye",
        });
    }

    if (user.otpExpires < Date.now()) {
      return res
        .status(400)
        .json({ message: "OTP expire ho gaya, dobara try karein" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Galat OTP" });
    }

    user.password = newPassword; // pre-save hook hashes it
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.json({
      message: "Password reset ho gaya! Ab naye password se login karein.",
    });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/auth/login
// @desc   Login staff user, returns JWT
// @access Public
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username aur password daaliye" });
    }

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Galat username ya password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message:
          "Signup abhi complete nahi hua — admin se OTP le kar verify karein",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Galat username ya password" });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("loginUser error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/auth/me
// @desc   Get currently logged-in user's profile
// @access Private
const getMe = async (req, res) => {
  return res.json(req.user);
};

module.exports = {
  registerUser,
  signupUser,
  verifyOtp,
  forgotPassword,
  resetPassword,
  loginUser,
  getMe,
};
