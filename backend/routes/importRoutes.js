const express = require("express");
const multer = require("multer");
const {
  importAreasFile,
  importMasterCustomers,
  importExpiry,
  importBills,
} = require("../controllers/importController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/areas",
  protect,
  restrictTo("admin"),
  upload.single("file"),
  importAreasFile,
);
router.post(
  "/master-customers",
  protect,
  restrictTo("admin"),
  upload.single("file"),
  importMasterCustomers,
);
router.post(
  "/expiry",
  protect,
  restrictTo("admin"),
  upload.single("file"),
  importExpiry,
);
router.post(
  "/bills",
  protect,
  restrictTo("admin"),
  upload.single("file"),
  importBills,
);

module.exports = router;
