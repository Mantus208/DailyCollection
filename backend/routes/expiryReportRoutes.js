const express = require("express");

const { getExpiryReport } = require("../controllers/expiryReportController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getExpiryReport);

module.exports = router;
