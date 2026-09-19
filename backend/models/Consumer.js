const mongoose = require("mongoose");

const consumerSchema = new mongoose.Schema(
  {
    consumerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, trim: true, default: "" },
    areaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Area",
      default: null,
    },
    areaNameRaw: { type: String, trim: true, default: "" }, // Excel me jo likha tha, agar Area match na hua ho
    address: { type: String, trim: true, default: "" },
    stbNo: { type: String, trim: true, default: "" },
    vcNo: { type: String, trim: true, default: "" },
    expiryDate: { type: Date, default: null },
    packageType: { type: String, trim: true, default: "" },
    packageName: { type: String, trim: true, default: "" },
    franchisee: { type: String, trim: true, default: "" },
    lastPackageDate: { type: Date, default: null }, // Bill file se set hota hai
    monthlyAmount: { type: Number, default: 0 }, // Bill file ke Net Amount se
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Consumer", consumerSchema);
