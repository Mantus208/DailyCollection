const express = require("express");

const router = express.Router();

const { getExpiryReport } = require("../controllers/expiryReportController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getExpiryReport);

module.exports = router;
