const Area = require("../models/Area");
const User = require("../models/User");
const { logActivity } = require("../utils/logActivity");

const getAreas = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      const areas = await Area.find().sort({ name: 1 });
      return res.json(areas);
    }
    const user = await User.findById(req.user._id).populate("assignedAreas");
    return res.json(user.assignedAreas || []);
  } catch (error) {
    console.error("getAreas error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const getAreaById = async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    if (!area) return res.status(404).json({ message: "Area nahi mila" });
    return res.json(area);
  } catch (error) {
    console.error("getAreaById error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const createArea = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name)
      return res.status(400).json({ message: "Area ka naam zaroori hai" });
    const existing = await Area.findOne({ name: name.trim() });
    if (existing)
      return res
        .status(400)
        .json({ message: "Ye area pehle se ban chuka hai" });
    const area = await Area.create({ name: name.trim(), description });
    await logActivity(req.user, "area_add", `Naya area: ${area.name}`);
    return res.status(201).json(area);
  } catch (error) {
    console.error("createArea error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

module.exports = { getAreas, getAreaById, createArea };
