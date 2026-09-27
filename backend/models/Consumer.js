const mongoose = require("mongoose");

/*
 * Live PayTV package
 */
const paytvPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },

    // PayTV visible type:
    // Package / Channel
    type: {
      type: String,
      trim: true,
      default: "",
    },

    // PayTV classification:
    // Basic / Addon
    packType: {
      type: String,
      trim: true,
      default: "",
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    plan: {
      type: String,
      trim: true,
      default: "",
    },

    price: {
      type: Number,
      default: 0,
    },

    channelCount: {
      type: Number,
      default: 0,
    },

    custPackId: {
      type: Number,
      default: null,
    },
  },
  { _id: false },
);

/*
 * Live PayTV subscriber information
 */
const paytvSchema = new mongoose.Schema(
  {
    // PayTV internal subscriber/customer ID
    customerId: {
      type: Number,
      default: null,
    },

    // Encoded ID used in:
    // /EditGeneralInfo/...
    // /EditAddress/...
    // /ManageHadware/...
    encodedId: {
      type: String,
      trim: true,
      default: "",
    },

    companyId: {
      type: Number,
      default: null,
    },

    franchiseeId: {
      type: Number,
      default: null,
    },

    areaId: {
      type: Number,
      default: null,
    },

    name: {
      type: String,
      trim: true,
      default: "",
    },

    mobile: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      trim: true,
      default: "",
    },

    customerType: {
      type: String,
      trim: true,
      default: "",
    },

    casProvider: {
      type: String,
      trim: true,
      default: "",
    },

    // Live PayTV address
    address1: {
      type: String,
      trim: true,
      default: "",
    },

    address2: {
      type: String,
      trim: true,
      default: "",
    },

    address3: {
      type: String,
      trim: true,
      default: "",
    },

    areaName: {
      type: String,
      trim: true,
      default: "",
    },

    postCode: {
      type: String,
      trim: true,
      default: "",
    },

    // Live hardware
    stbNo: {
      type: String,
      trim: true,
      default: "",
    },

    vcNo: {
      type: String,
      trim: true,
      default: "",
    },

    // Current basic package
    basicPackage: {
      type: paytvPackageSchema,
      default: null,
    },

    // Addon packages
    addons: {
      type: [paytvPackageSchema],
      default: [],
    },
    // All active PayTV package/channel rows
    packages: {
      type: [paytvPackageSchema],
      default: [],
    },
    // Last successful live fetch
    lastFetchedAt: {
      type: Date,
      default: null,
    },

    // Useful when PayTV is temporarily unavailable
    fetchStatus: {
      type: String,
      enum: ["live", "cache", "error", "never"],
      default: "never",
    },

    fetchError: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const consumerSchema = new mongoose.Schema(
  {
    // =========================
    // EXISTING LOCAL DATA
    // =========================

    consumerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      trim: true,
      default: "",
    },

    // Local/master Area
    areaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Area",
      default: null,
    },

    // Local/master Franchisee
    franchiseeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Franchisee",
      default: null,
    },

    // Excel/master raw area information
    areaNameRaw: {
      type: String,
      trim: true,
      default: "",
    },

    // IMPORTANT:
    // This remains our LOCAL / MASTER address.
    // PayTV address will stay inside paytv.address1/2/3.
    address: {
      type: String,
      trim: true,
      default: "",
    },

    // Existing cached hardware fields kept
    // for compatibility with current app code.
    stbNo: {
      type: String,
      trim: true,
      default: "",
    },

    vcNo: {
      type: String,
      trim: true,
      default: "",
    },

    // Existing cached expiry/package fields
    // kept for compatibility.
    expiryDate: {
      type: Date,
      default: null,
    },

    packageType: {
      type: String,
      trim: true,
      default: "",
    },

    packageName: {
      type: String,
      trim: true,
      default: "",
    },

    franchisee: {
      type: String,
      trim: true,
      default: "",
    },

    lastPackageDate: {
      type: Date,
      default: null,
    },

    monthlyAmount: {
      type: Number,
      default: 0,
    },

    // =========================
    // OUR COLLECTION DATA
    // =========================

    previousDue: {
      type: Number,
      default: 0,
      min: 0,
    },

    advanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =========================
    // CURRENT LOCAL STATUS
    // =========================

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    // =========================
    // PAYTV LIVE DATA
    // =========================

    paytv: {
      type: paytvSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

// Helpful search/index
consumerSchema.index({ areaId: 1, consumerId: 1 });
consumerSchema.index({ franchiseeId: 1, consumerId: 1 });
consumerSchema.index({ "paytv.customerId": 1 });
consumerSchema.index({ "paytv.franchiseeId": 1 });
consumerSchema.index({ "paytv.areaId": 1 });

module.exports = mongoose.model("Consumer", consumerSchema);
