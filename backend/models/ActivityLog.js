const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    userName: { type: String, trim: true, default: "" },
    action: { type: String, required: true, trim: true },
    details: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
