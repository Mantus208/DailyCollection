const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    consumerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumer",
      required: true,
    },
    areaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Area",
      required: true,
    },
    complaintText: { type: String, required: true, trim: true },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Complaint", complaintSchema);
