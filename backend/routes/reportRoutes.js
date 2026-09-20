const express = require("express");
const {
  todayCollection,
  statusList,
  getReminders,
  defaulters,
  recentActivity,
} = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/today-collection", protect, todayCollection);
router.get("/status-list", protect, statusList);
router.get("/reminders", protect, getReminders);
router.get("/defaulters", protect, defaulters);
router.get("/recent-activity", protect, recentActivity);

module.exports = router;
