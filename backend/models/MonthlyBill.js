const mongoose = require("mongoose");

const monthlyBillSchema = new mongoose.Schema(
  {
    consumerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumer",
      required: true,
    },
    month: { type: String, required: true }, // "2026-08" format
    billNo: { type: String, trim: true, default: "" },
    amount: { type: Number, required: true },
    billDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["unpaid", "paid", "due", "not_packaged", "box_issue"],
      default: "unpaid",
    },
    paidDate: { type: Date, default: null },
    dueRemark: { type: String, trim: true, default: "" },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastEditedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Ek consumer ka ek month me sirf ek hi bill record hoga
monthlyBillSchema.index({ consumerId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("MonthlyBill", monthlyBillSchema);
