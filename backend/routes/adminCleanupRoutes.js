const express = require("express");
const {
  previewCleanup,
  backupCleanupData,
  executeCleanup,
} = require("../controllers/accountCleanupController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/preview", protect, restrictTo("admin"), previewCleanup);
router.get("/backup", protect, restrictTo("admin"), backupCleanupData);
router.post("/execute", protect, restrictTo("admin"), executeCleanup);

module.exports = router;
