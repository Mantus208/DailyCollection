const mongoose = require("mongoose");

const stockItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    currentStock: { type: Number, default: 0 },
    lastCostPerUnit: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StockItem", stockItemSchema);
