const express = require("express");
const {
  syncExpiryFromPaytv,
  syncBillsFromPaytv,
  syncAllSubscribersFromPaytv,
} = require("../controllers/externalSyncController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/expiry", protect, restrictTo("admin"), syncExpiryFromPaytv);
router.post("/bills", protect, restrictTo("admin"), syncBillsFromPaytv);
router.post(
  "/all-subscribers",
  protect,
  restrictTo("admin"),
  syncAllSubscribersFromPaytv,
);

module.exports = router;
