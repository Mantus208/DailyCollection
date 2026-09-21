const express = require("express");

const {
  getStockItems,
  createStockItem,
  addStockPurchase,
  getStockReport,
  sellStockToConsumer,
} = require("../controllers/stockController");

const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/items", protect, getStockItems);
router.post("/items", protect, restrictTo("admin"), createStockItem);
router.post("/purchase", protect, restrictTo("admin"), addStockPurchase);

// Customer ko stock sale
router.post("/sale", protect, sellStockToConsumer);

router.get("/report", protect, getStockReport);

module.exports = router;
