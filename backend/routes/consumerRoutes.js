const express = require("express");
const {
  createConsumer,
  getUnmatchedAreaGroups,
  assignAreaByAddress,
  searchConsumers,
  getConsumerDetail,
  getLivePaytv,
  collectPayment,
  recordAdvancePayment,
  editBillAmount,
  resetPreStartBilling,
  mergeSeptemberCollectionHistory,
  markUnpaid,
  markDue,
  logVisit,
  getHistory,
  applyConcession,
  setPreviousDue,
  getConsumerPaytvLive,
} = require("../controllers/consumerController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, restrictTo("admin"), createConsumer);

router.put(
  "/assign-area-by-address",
  protect,
  restrictTo("admin"),
  assignAreaByAddress,
);
router.put(
  "/:id/reset-prestart-billing",
  protect,
  restrictTo("admin"),
  resetPreStartBilling,
);
router.put("/:id/concession", protect, applyConcession);
router.put("/:id/previous-due", protect, setPreviousDue);
router.put(
  "/:id/merge-september-collection-history",
  protect,
  restrictTo("admin"),
  mergeSeptemberCollectionHistory,
);
router.get(
  "/unmatched-areas",
  protect,
  restrictTo("admin"),
  getUnmatchedAreaGroups,
);
router.get("/:id/paytv-live", protect, getConsumerPaytvLive);
router.get("/search", protect, searchConsumers);
router.get("/:id/live", protect, getLivePaytv);
router.get("/:id/live", protect, getLivePaytv);
router.get("/:id", protect, getConsumerDetail);
router.put("/:id/collect", protect, collectPayment);
router.put("/:id/advance", protect, recordAdvancePayment);
router.put("/:id/edit-amount", protect, editBillAmount);
router.put("/:id/unpaid", protect, markUnpaid);
router.put("/:id/due", protect, markDue);
router.post("/:id/visit", protect, logVisit);
router.get("/:id/history", protect, getHistory);

module.exports = router;
