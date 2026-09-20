const express = require("express");
const { getActivityLog } = require("../controllers/activityLogController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, restrictTo("admin"), getActivityLog);

module.exports = router;
