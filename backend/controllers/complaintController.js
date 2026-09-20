const Complaint = require("../models/Complaint");
const Consumer = require("../models/Consumer");
const { logActivity } = require("../utils/logActivity");

const createComplaint = async (req, res) => {
  try {
    const { consumerId, complaintText } = req.body;
    if (!consumerId || !complaintText) {
      return res
        .status(400)
        .json({ message: "Consumer aur complaint likhna zaroori hai" });
    }
    const consumer = await Consumer.findById(consumerId);
    if (!consumer)
      return res.status(404).json({ message: "Consumer nahi mila" });

    const complaint = await Complaint.create({
      consumerId,
      areaId: consumer.areaId,
      complaintText,
      raisedBy: req.user._id,
    });

    await logActivity(
      req.user,
      "complaint_add",
      `${consumer.name} (${consumer.consumerId}) — ${complaintText}`,
    );

    return res.status(201).json(complaint);
  } catch (error) {
    console.error("createComplaint error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const listComplaints = async (req, res) => {
  try {
    const { areaId, status } = req.query;
    const filter = { status: status || "open" };
    if (areaId) filter.areaId = areaId;
    const complaints = await Complaint.find(filter)
      .populate("consumerId", "name consumerId address")
      .sort({ createdAt: 1 });
    return res.json(complaints);
  } catch (error) {
    console.error("listComplaints error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const resolveComplaint = async (req, res) => {
  try {
    const { resolutionNote } = req.body;
    const complaint = await Complaint.findById(req.params.id).populate(
      "consumerId",
      "name consumerId",
    );
    if (!complaint)
      return res.status(404).json({ message: "Complaint nahi mila" });

    complaint.status = "resolved";
    complaint.resolvedBy = req.user._id;
    complaint.resolvedAt = new Date();
    complaint.resolutionNote = resolutionNote || "";
    await complaint.save();

    await logActivity(
      req.user,
      "complaint_resolve",
      `${complaint.consumerId?.name} ki complaint resolve ki`,
    );

    return res.json(complaint);
  } catch (error) {
    console.error("resolveComplaint error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

module.exports = { createComplaint, listComplaints, resolveComplaint };
