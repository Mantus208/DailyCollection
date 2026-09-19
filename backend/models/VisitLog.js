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
    serviceNote: { type: String, trim: true, default: "" }, // kisliye gaye the (agar service ho)
    outcome: {
      type: String,
      enum: ["paid", "not_paid", "promised_later"],
      required: true,
    },
    amountCollected: { type: Number, default: 0 },
    customerRemark: { type: String, trim: true, default: "" }, // customer ne kya bola
  },
  { timestamps: true }, // createdAt hi visit ka exact time/date hai — kabhi edit nahi hota
);

module.exports = mongoose.model("VisitLog", visitLogSchema);
