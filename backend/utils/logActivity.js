const ActivityLog = require("../models/ActivityLog");

// Kisi bhi user aur action ka ek ActivityLog entry bana deta hai.
// Agar ye fail ho jaye to poori request crash nahi honi chahiye — bas console warning.
const logActivity = async (user, action, details = "") => {
  try {
    await ActivityLog.create({
      userId: user?._id || null,
      userName: user?.name || "System",
      action,
      details,
    });
  } catch (error) {
    console.error("logActivity failed:", error.message);
  }
};

module.exports = { logActivity };
