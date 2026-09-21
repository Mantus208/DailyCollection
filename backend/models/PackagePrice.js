const mongoose = require("mongoose");

const areaOverrideSchema = new mongoose.Schema(
  {
    areaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Area",
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const packagePriceSchema = new mongoose.Schema(
  {
    packageName: {
      type: String,
      required: true,
      trim: true,
    },

    packageType: {
      type: String,
      trim: true,
      default: "Package",
    },

    defaultPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    areaOverrides: {
      type: [areaOverrideSchema],
      default: [],
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

packagePriceSchema.index({ packageName: 1, packageType: 1 }, { unique: true });

module.exports = mongoose.model("PackagePrice", packagePriceSchema);
