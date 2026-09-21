const mongoose = require("mongoose");

const visitLogSchema = new mongoose.Schema(
  {
    consumerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumer",
      required: true,
    },

    visitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    purpose: {
      type: String,
      enum: ["collection", "service", "other"],
      default: "collection",
    },

    serviceNote: {
      type: String,
      trim: true,
      default: "",
    },

    outcome: {
      type: String,
      enum: ["paid", "not_paid", "promised_later"],
      required: true,
    },

    amountCollected: {
      type: Number,
      default: 0,
    },
    reversed: {
      type: Boolean,
      default: false,
    },
    customerRemark: {
      type: String,
      trim: true,
      default: "",
    },

    // IMPORTANT:
    // Customer ne jis date ko payment ka promise kiya
    followUpDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("VisitLog", visitLogSchema);
