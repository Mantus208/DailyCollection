const mongoose = require("mongoose");

const stockPurchaseSchema = new mongoose.Schema(
  {
    stockItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockItem",
      required: true,
    },
    qty: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    costPerUnit: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    purchasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StockPurchase", stockPurchaseSchema);
