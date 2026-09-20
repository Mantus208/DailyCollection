const express = require("express");
const {
  getStockItems,
  createStockItem,
  addStockPurchase,
  getStockReport,
} = require("../controllers/stockController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/items", protect, getStockItems);
router.post("/items", protect, restrictTo("admin"), createStockItem);
router.post("/purchase", protect, restrictTo("admin"), addStockPurchase);
router.get("/report", protect, getStockReport);

module.exports = router;
