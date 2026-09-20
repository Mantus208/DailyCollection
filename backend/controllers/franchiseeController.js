const Franchisee = require("../models/Franchisee");
const { logActivity } = require("../utils/logActivity");

const getFranchisees = async (req, res) => {
  try {
    const franchisees = await Franchisee.find().sort({ name: 1 });
    return res.json(franchisees);
  } catch (error) {
    console.error("getFranchisees error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const createFranchisee = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ message: "Franchisee ka naam zaroori hai" });

    const existing = await Franchisee.findOne({ name: name.trim() });
    if (existing)
      return res.status(400).json({ message: "Ye franchisee pehle se hai" });

    const franchisee = await Franchisee.create({
      name: name.trim(),
      description,
    });
    await logActivity(
      req.user,
      "franchisee_add",
      `Naya franchisee: ${franchisee.name}`,
    );
    return res.status(201).json(franchisee);
  } catch (error) {
    console.error("createFranchisee error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

module.exports = { getFranchisees, createFranchisee };
