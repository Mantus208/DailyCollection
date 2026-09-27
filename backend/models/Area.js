const mongoose = require("mongoose");

const areaSchema = new mongoose.Schema(
  {
    // Our local/master area name
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    // Our local area code
    // Example: SIK, MRO, PAT
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: undefined,
      unique: true,
      sparse: true,
    },

    // Local Franchisee mapping
    franchiseeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Franchisee",
      default: null,
    },

    // PayTV mapping
    paytvCompanyId: {
      type: Number,
      default: null,
    },

    paytvFranchiseeId: {
      type: Number,
      default: null,
    },

    paytvAreaId: {
      type: Number,
      default: null,
    },

    // PayTV may use slightly different spelling
    // Example: SIKHARAPUR / SIKHARAPAURA
    paytvNames: {
      type: [String],
      default: [],
    },

    active: {
      type: Boolean,
      default: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

// Same PayTV area can only map once
// inside the same Company + Franchisee.
areaSchema.index(
  {
    paytvCompanyId: 1,
    paytvFranchiseeId: 1,
    paytvAreaId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      paytvCompanyId: { $type: "number" },
      paytvFranchiseeId: { $type: "number" },
      paytvAreaId: { $type: "number" },
    },
  },
);

module.exports = mongoose.model("Area", areaSchema);
