const ActivityLog = require("../models/ActivityLog");

const getActivityLog = async (req, res) => {
  try {
    const { limit } = req.query;
    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 100);
    return res.json(logs);
  } catch (error) {
    console.error("getActivityLog error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

module.exports = { getActivityLog };
