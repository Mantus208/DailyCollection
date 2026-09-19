const User = require("../models/User");

// @route  GET /api/users
// @desc   List all staff (name, username, role, assignedAreas) — for the Manage Staff screen
// @access Private (admin only)
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ isVerified: true })
      .select("name username role assignedAreas isActive")
      .populate("assignedAreas", "name")
      .sort({ name: 1 });
    return res.json(users);
  } catch (error) {
    console.error("getUsers error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/users/:id/areas
// @desc   Set (replace) the list of areas assigned to a staff member
// @access Private (admin only)
const updateUserAreas = async (req, res) => {
  try {
    const { areaIds } = req.body; // expects an array of Area _id strings

    if (!Array.isArray(areaIds)) {
      return res.status(400).json({ message: "areaIds ek array hona chahiye" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User nahi mila" });
    }

    user.assignedAreas = areaIds;
    await user.save();

    const updated = await User.findById(user._id)
      .select("name username role assignedAreas isActive")
      .populate("assignedAreas", "name");

    return res.json(updated);
  } catch (error) {
    console.error("updateUserAreas error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

module.exports = { getUsers, updateUserAreas };
