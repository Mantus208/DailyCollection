const express = require("express");

const {
  todayCollection,
  statusList,
  getReminders,
  defaulters,
  recentActivity,
  billingSummary,
  monthlyCashCollection,
} = require("../controllers/reportController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/today-collection", protect, todayCollection);

router.get("/status-list", protect, statusList);

router.get("/reminders", protect, getReminders);

router.get("/defaulters", protect, defaulters);

router.get("/recent-activity", protect, recentActivity);

// Billing summary for selected month
router.get("/billing-summary", protect, billingSummary);
router.get("/monthly-cash-collection", protect, monthlyCashCollection);

module.exports = router;
