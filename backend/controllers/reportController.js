const Consumer = require("../models/Consumer");
const MonthlyBill = require("../models/MonthlyBill");
const VisitLog = require("../models/VisitLog");
const { getCurrentMonth } = require("../utils/dateHelpers");

const todayCollection = async (req, res) => {
  try {
    const { areaId, date } = req.query;
    const target = date ? new Date(date) : new Date();
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);
    const end = new Date(target);
    end.setHours(23, 59, 59, 999);

    const visits = await VisitLog.find({
      outcome: "paid",
      createdAt: { $gte: start, $lte: end },
    })
      .populate({
        path: "consumerId",
        select: "name consumerId areaId",
        match: areaId ? { areaId } : {},
      })
      .populate("visitedBy", "name")
      .sort({ createdAt: -1 });

    const filtered = visits.filter((v) => v.consumerId);
    const total = filtered.reduce(
      (sum, v) => sum + (v.amountCollected || 0),
      0,
    );

    return res.json({ total, count: filtered.length, visits: filtered });
  } catch (error) {
    console.error("todayCollection error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const statusList = async (req, res) => {
  try {
    const { areaId, status } = req.query;
    if (!areaId || !status)
      return res.status(400).json({ message: "areaId aur status zaroori hai" });

    const consumers = await Consumer.find({ areaId });
    const month = getCurrentMonth();
    const bills = await MonthlyBill.find({
      consumerId: { $in: consumers.map((c) => c._id) },
      month,
      status,
    }).populate("consumerId", "name consumerId address mobile");

    return res.json(bills);
  } catch (error) {
    console.error("statusList error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/reports/reminders?areaId=
// Jinka followUpDate aa gaya hai (aaj ya usse pehle) aur abhi bhi "due" hain
const getReminders = async (req, res) => {
  try {
    const { areaId } = req.query;
    if (!areaId) return res.status(400).json({ message: "areaId zaroori hai" });

    const consumers = await Consumer.find({ areaId });
    const consumerIds = consumers.map((c) => c._id);
    const month = getCurrentMonth();

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const bills = await MonthlyBill.find({
      consumerId: { $in: consumerIds },
      month,
      status: "due",
      followUpDate: { $ne: null, $lte: today },
    })
      .populate("consumerId", "name consumerId address mobile")
      .sort({ followUpDate: 1 });

    return res.json(bills);
  } catch (error) {
    console.error("getReminders error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const defaulters = async (req, res) => {
  try {
    const { areaId } = req.query;
    if (!areaId) return res.status(400).json({ message: "areaId zaroori hai" });

    const consumers = await Consumer.find({ areaId });
    const consumerIds = consumers.map((c) => c._id);
    const month = getCurrentMonth();

    const prevMonthDate = new Date();
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonth = prevMonthDate.toISOString().slice(0, 7);

    const thisMonthBills = await MonthlyBill.find({
      consumerId: { $in: consumerIds },
      month,
    });
    const prevMonthBills = await MonthlyBill.find({
      consumerId: { $in: consumerIds },
      month: prevMonth,
      status: "paid",
    });

    const thisMonthMap = {};
    thisMonthBills.forEach((b) => (thisMonthMap[b.consumerId.toString()] = b));
    const prevPaidSet = new Set(
      prevMonthBills.map((b) => b.consumerId.toString()),
    );

    const today = new Date();
    const result = [];

    for (const c of consumers) {
      const bill = thisMonthMap[c._id.toString()];
      if (bill && bill.status === "paid") continue;

      const expired = c.expiryDate && new Date(c.expiryDate) < today;
      const lapsedFromLastMonth = prevPaidSet.has(c._id.toString());

      if (expired || lapsedFromLastMonth) {
        result.push({
          consumer: c,
          bill: bill || null,
          reason: expired
            ? "Expiry date nikal chuki hai"
            : "Pichle mahine paid tha, is mahine nahi",
        });
      }
    }

    return res.json(result);
  } catch (error) {
    console.error("defaulters error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const recentActivity = async (req, res) => {
  try {
    const { areaId, limit } = req.query;
    const visits = await VisitLog.find({})
      .populate({
        path: "consumerId",
        select: "name consumerId areaId",
        match: areaId ? { areaId } : {},
      })
      .populate("visitedBy", "name")
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 20);
    const filtered = visits.filter((v) => v.consumerId);
    return res.json(filtered);
  } catch (error) {
    console.error("recentActivity error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  todayCollection,
  statusList,
  getReminders,
  defaulters,
  recentActivity,
};
