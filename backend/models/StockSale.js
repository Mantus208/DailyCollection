const mongoose = require("mongoose");

const stockSaleSchema = new mongoose.Schema(
  {
    consumerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumer",
      required: true,
    },

    stockItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockItem",
      required: true,
    },

    qty: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["paid", "due"],
      default: "paid",
    },

    remark: {
      type: String,
      trim: true,
      default: "",
    },

    date: {
      type: Date,
      default: Date.now,
    },

    soldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("StockSale", stockSaleSchema);
