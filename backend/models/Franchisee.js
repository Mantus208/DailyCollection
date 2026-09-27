const mongoose = require("mongoose");

const franchiseeSchema = new mongoose.Schema(
  {
    // Our local/master name
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    // Our local code
    // Example: NCV
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: undefined,
      unique: true,
      sparse: true,
    },

    // PayTV company
    paytvCompanyId: {
      type: Number,
      default: null,
    },

    // PayTV internal franchisee ID
    paytvFranchiseeId: {
      type: Number,
      default: null,
    },

    // Parent franchisee in PayTV hierarchy
    paytvParentFranchiseeId: {
      type: Number,
      default: null,
    },

    // Original PayTV name
    paytvName: {
      type: String,
      trim: true,
      default: "",
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

// Prevent duplicate PayTV franchisee mapping
franchiseeSchema.index(
  {
    paytvCompanyId: 1,
    paytvFranchiseeId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      paytvCompanyId: { $type: "number" },
      paytvFranchiseeId: { $type: "number" },
    },
  },
);

module.exports = mongoose.model("Franchisee", franchiseeSchema);
