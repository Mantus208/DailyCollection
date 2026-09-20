const StockItem = require("../models/StockItem");
const StockPurchase = require("../models/StockPurchase");
const { logActivity } = require("../utils/logActivity");

const getStockItems = async (req, res) => {
  try {
    const items = await StockItem.find().sort({ name: 1 });
    return res.json(items);
  } catch (error) {
    console.error("getStockItems error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const createStockItem = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name)
      return res.status(400).json({ message: "Item ka naam zaroori hai" });

    const existing = await StockItem.findOne({ name: name.trim() });
    if (existing)
      return res.status(400).json({ message: "Ye item pehle se hai" });

    const item = await StockItem.create({ name: name.trim() });
    await logActivity(
      req.user,
      "stock_item_add",
      `Naya stock item: ${item.name}`,
    );
    return res.status(201).json(item);
  } catch (error) {
    console.error("createStockItem error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const addStockPurchase = async (req, res) => {
  try {
    const { stockItemId, qty, totalCost } = req.body;
    if (!stockItemId || !qty || !totalCost) {
      return res
        .status(400)
        .json({ message: "Item, quantity aur total cost zaroori hai" });
    }

    const item = await StockItem.findById(stockItemId);
    if (!item) return res.status(404).json({ message: "Stock item nahi mila" });

    const costPerUnit = Number(totalCost) / Number(qty);

    const purchase = await StockPurchase.create({
      stockItemId,
      qty: Number(qty),
      totalCost: Number(totalCost),
      costPerUnit,
      purchasedBy: req.user._id,
    });

    item.currentStock += Number(qty);
    item.lastCostPerUnit = costPerUnit;
    await item.save();

    await logActivity(
      req.user,
      "stock_purchase",
      `${qty} x ${item.name} khareeda, ₹${totalCost}`,
    );

    return res.status(201).json({ purchase, item });
  } catch (error) {
    console.error("addStockPurchase error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const getStockReport = async (req, res) => {
  try {
    const items = await StockItem.find().sort({ name: 1 });
    const purchases = await StockPurchase.find()
      .populate("stockItemId", "name")
      .populate("purchasedBy", "name")
      .sort({ date: -1 })
      .limit(50);

    const totalPurchaseCost = purchases.reduce(
      (sum, p) => sum + p.totalCost,
      0,
    );

    return res.json({ items, purchases, totalPurchaseCost });
  } catch (error) {
    console.error("getStockReport error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getStockItems,
  createStockItem,
  addStockPurchase,
  getStockReport,
};
