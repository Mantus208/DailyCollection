const express = require("express");
const {
  registerUser,
  signupUser,
  verifyOtp,
  forgotPassword,
  resetPassword,
  loginUser,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/signup", signupUser);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/login", loginUser);
router.get("/me", protect, getMe);

module.exports = router;
