const mongoose = require("mongoose");

const monthlyBillSchema = new mongoose.Schema(
  {
    consumerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumer",
      required: true,
    },
    month: { type: String, required: true },
    billNo: { type: String, trim: true, default: "" },
    amount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    billDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["unpaid", "paid", "due", "not_packaged", "box_issue"],
      default: "unpaid",
    },
    paidDate: { type: Date, default: null },
    dueRemark: { type: String, trim: true, default: "" },
    followUpDate: { type: Date, default: null }, // "kab denge bole the" — reminder ke liye
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastEditedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

monthlyBillSchema.index({ consumerId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("MonthlyBill", monthlyBillSchema);
