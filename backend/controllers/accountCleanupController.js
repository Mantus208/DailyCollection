const MonthlyBill = require("../models/MonthlyBill");
const VisitLog = require("../models/VisitLog");
const Consumer = require("../models/Consumer");
const { getCurrentMonth } = require("../utils/dateHelpers");
const { logActivity } = require("../utils/logActivity");

const isValidMonth = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || ""));

// beforeMonth = "2026-09" => "2026-09" se PEHLE ke sab mahine (August, July, ...)
// Current month ya future kabhi delete nahi hoga.
const validateBeforeMonth = (beforeMonth) => {
  if (!isValidMonth(beforeMonth)) {
    return "Month format galat hai. YYYY-MM me dijiye (jaise 2026-09).";
  }
  if (beforeMonth > getCurrentMonth()) {
    return "Future month ke pehle ka cleanup allowed nahi hai.";
  }
  return null;
};

const monthStart = (beforeMonth) => {
  const [y, m] = beforeMonth.split("-").map(Number);
  return new Date(y, m - 1, 1, 0, 0, 0, 0);
};

const billBalance = (b) =>
  Math.max(
    Number(b.amount || 0) -
      Number(b.amountPaid || 0) -
      Number(b.concessionAmount || 0),
    0,
  );

// GET /api/admin/cleanup/preview?beforeMonth=2026-09
const previewCleanup = async (req, res) => {
  try {
    const { beforeMonth } = req.query;
    const err = validateBeforeMonth(beforeMonth);
    if (err) return res.status(400).json({ message: err });

    const bills = await MonthlyBill.find({ month: { $lt: beforeMonth } })
      .select("month amount amountPaid concessionAmount")
      .lean();

    const byMonth = {};
    let totalOutstanding = 0;
    let totalCollected = 0;

    for (const b of bills) {
      if (!byMonth[b.month]) {
        byMonth[b.month] = {
          month: b.month,
          bills: 0,
          outstanding: 0,
          collected: 0,
        };
      }
      const bal = billBalance(b);
      byMonth[b.month].bills += 1;
      byMonth[b.month].outstanding += bal;
      byMonth[b.month].collected += Number(b.amountPaid || 0);
      totalOutstanding += bal;
      totalCollected += Number(b.amountPaid || 0);
    }

    const visitAgg = await VisitLog.aggregate([
      { $match: { createdAt: { $lt: monthStart(beforeMonth) } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          collected: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$reversed", true] },
                    { $gt: ["$amountCollected", 0] },
                  ],
                },
                "$amountCollected",
                0,
              ],
            },
          },
        },
      },
    ]);

    const prevAgg = await Consumer.aggregate([
      { $match: { previousDue: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: "$previousDue" },
        },
      },
    ]);

    return res.json({
      beforeMonth,
      bills: {
        count: bills.length,
        outstanding: totalOutstanding,
        collected: totalCollected,
        byMonth: Object.values(byMonth).sort((a, b) =>
          a.month.localeCompare(b.month),
        ),
      },
      visitLogs: {
        count: visitAgg[0]?.count || 0,
        collected: visitAgg[0]?.collected || 0,
      },
      previousDue: {
        consumers: prevAgg[0]?.count || 0,
        total: prevAgg[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("previewCleanup error:", error);
    return res
      .status(500)
      .json({ message: "Preview nahi bana", error: error.message });
  }
};

// GET /api/admin/cleanup/backup?beforeMonth=2026-09&deleteVisitLogs=true
// Delete hone wala saara data JSON me deta hai (frontend download karata hai)
const backupCleanupData = async (req, res) => {
  try {
    const { beforeMonth } = req.query;
    const includeVisitLogs = req.query.deleteVisitLogs === "true";
    const err = validateBeforeMonth(beforeMonth);
    if (err) return res.status(400).json({ message: err });

    const bills = await MonthlyBill.find({
      month: { $lt: beforeMonth },
    }).lean();

    const visitLogs = includeVisitLogs
      ? await VisitLog.find({
          createdAt: { $lt: monthStart(beforeMonth) },
        }).lean()
      : [];

    const previousDueList = await Consumer.find({ previousDue: { $gt: 0 } })
      .select("consumerId name previousDue")
      .lean();

    return res.json({
      generatedAt: new Date(),
      beforeMonth,
      bills,
      visitLogs,
      previousDueList,
    });
  } catch (error) {
    console.error("backupCleanupData error:", error);
    return res
      .status(500)
      .json({ message: "Backup nahi bana", error: error.message });
  }
};

// POST /api/admin/cleanup/execute
// body: { beforeMonth, deleteVisitLogs, resetPreviousDue, confirmText }
const executeCleanup = async (req, res) => {
  try {
    const {
      beforeMonth,
      deleteVisitLogs = false,
      resetPreviousDue = false,
      confirmText,
    } = req.body;

    const err = validateBeforeMonth(beforeMonth);
    if (err) return res.status(400).json({ message: err });

    if (confirmText !== `DELETE ${beforeMonth}`) {
      return res.status(400).json({
        message: `Confirm text galat hai. Exactly "DELETE ${beforeMonth}" likhein.`,
      });
    }

    const billsResult = await MonthlyBill.deleteMany({
      month: { $lt: beforeMonth },
    });

    let visitLogsDeleted = 0;
    if (deleteVisitLogs) {
      const r = await VisitLog.deleteMany({
        createdAt: { $lt: monthStart(beforeMonth) },
      });
      visitLogsDeleted = r.deletedCount || 0;
    }

    let previousDueReset = 0;
    if (resetPreviousDue) {
      const r = await Consumer.updateMany(
        { previousDue: { $gt: 0 } },
        { $set: { previousDue: 0 } },
      );
      previousDueReset = r.modifiedCount || 0;
    }

    await logActivity(
      req.user,
      "account_cleanup",
      `${beforeMonth} se pehle ka data clean kiya — ${billsResult.deletedCount} bills, ` +
        `${visitLogsDeleted} visit logs delete, ${previousDueReset} previous-due reset`,
    );

    return res.json({
      message: "Cleanup ho gaya",
      billsDeleted: billsResult.deletedCount || 0,
      visitLogsDeleted,
      previousDueReset,
    });
  } catch (error) {
    console.error("executeCleanup error:", error);
    return res
      .status(500)
      .json({ message: "Cleanup fail ho gaya", error: error.message });
  }
};

module.exports = { previewCleanup, backupCleanupData, executeCleanup };
