const express = require("express");

const {
  getPackagePrices,
  getPackageCatalog,
  createPackagePrice,
  updatePackagePrice,
  deletePackagePrice,
  applyPackagePrice,
} = require("../controllers/packagePriceController");

const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

// Get configured package prices
router.get("/", protect, restrictTo("admin"), getPackagePrices);

// Get package list from existing consumers
router.get("/catalog", protect, restrictTo("admin"), getPackageCatalog);

// Create package pricing
router.post("/", protect, restrictTo("admin"), createPackagePrice);

// Update package pricing
router.put("/:id", protect, restrictTo("admin"), updatePackagePrice);

// Deactivate package pricing
router.delete("/:id", protect, restrictTo("admin"), deletePackagePrice);

// Apply pricing to existing consumers
router.post("/:id/apply", protect, restrictTo("admin"), applyPackagePrice);

module.exports = router;
