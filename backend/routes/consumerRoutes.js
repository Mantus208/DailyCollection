const express = require("express");
const {
  createConsumer,
  getUnmatchedAreaGroups,
  assignAreaByAddress,
  searchConsumers,
  getConsumerDetail,
  collectPayment,
  markUnpaid,
  markDue,
  logVisit,
  getHistory,
} = require("../controllers/consumerController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

// Admin-only (data management)
router.post("/", protect, restrictTo("admin"), createConsumer);
router.get(
  "/unmatched-areas",
  protect,
  restrictTo("admin"),
  getUnmatchedAreaGroups,
);
router.put(
  "/assign-area-by-address",
  protect,
  restrictTo("admin"),
  assignAreaByAddress,
);

// Any logged-in staff (field work)
router.get("/search", protect, searchConsumers);
router.get("/:id", protect, getConsumerDetail);
router.put("/:id/collect", protect, collectPayment);
router.put("/:id/unpaid", protect, markUnpaid);
router.put("/:id/due", protect, markDue);
router.post("/:id/visit", protect, logVisit);
router.get("/:id/history", protect, getHistory);

module.exports = router;
