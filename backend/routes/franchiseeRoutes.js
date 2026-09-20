const express = require("express");
const {
  getFranchisees,
  createFranchisee,
} = require("../controllers/franchiseeController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getFranchisees);
router.post("/", protect, restrictTo("admin"), createFranchisee);

module.exports = router;
