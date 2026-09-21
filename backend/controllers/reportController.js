const Consumer = require("../models/Consumer");
const MonthlyBill = require("../models/MonthlyBill");
const VisitLog = require("../models/VisitLog");
const PackagePrice = require("../models/PackagePrice");

const { getCurrentMonth } = require("../utils/dateHelpers");
const getTargetMonth = (value) => {
  if (/^\d{4}-\d{2}$/.test(value || "")) {
    return value;
  }

  return getCurrentMonth();
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getEffectivePackagePrice = (
  packagePrices,
  packageName,
  packageType,
  areaId,
) => {
  const nameKey = normalizeText(packageName);
  const typeKey = normalizeText(packageType || "Package");

  if (!nameKey) return null;

  const config = packagePrices.find(
    (p) =>
      normalizeText(p.packageName) === nameKey &&
      normalizeText(p.packageType || "Package") === typeKey &&
      p.active !== false,
  );

  if (!config) return null;

  const override = (config.areaOverrides || []).find(
    (item) => String(item.areaId) === String(areaId),
  );

  if (override) {
    return Number(override.price);
  }

  return Number(config.defaultPrice);
};

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
      amountCollected: { $gt: 0 },
      reversed: { $ne: true },
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
const monthlyCashCollection = async (req, res) => {
  try {
    const { areaId, month } = req.query;

    if (!areaId) {
      return res.status(400).json({
        message: "areaId zaroori hai",
      });
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        message: "Valid month chahiye, example 2026-09",
      });
    }

    const [year, monthNumber] = month.split("-").map(Number);

    // Selected month in IST converted to UTC range.
    const start = new Date(Date.UTC(year, monthNumber - 1, 1, 18, 30, 0, 0));

    const end = new Date(Date.UTC(year, monthNumber, 1, 18, 30, 0, 0));

    const visits = await VisitLog.find({
      purpose: "collection",
      amountCollected: { $gt: 0 },
      reversed: { $ne: true },
      createdAt: {
        $gte: start,
        $lt: end,
      },
    })
      .populate("consumerId", "consumerId name areaId")
      .populate("visitedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    const areaVisits = visits.filter(
      (visit) =>
        visit.consumerId && String(visit.consumerId.areaId) === String(areaId),
    );

    const total = areaVisits.reduce(
      (sum, visit) => sum + Number(visit.amountCollected || 0),
      0,
    );

    return res.json({
      month,
      total,
      count: areaVisits.length,
      collections: areaVisits,
    });
  } catch (error) {
    console.error("monthlyCashCollection error:", error);

    return res.status(500).json({
      message: "Monthly cash collection load nahi ho paya",
      error: error.message,
    });
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
const billingSummary = async (req, res) => {
  try {
    const { areaId, month } = req.query;

    if (!areaId) {
      return res.status(400).json({
        message: "areaId zaroori hai",
      });
    }

    const targetMonth = getTargetMonth(month);

    // 1. Active consumers of selected area
    const consumers = await Consumer.find({
      areaId,
      status: { $ne: "inactive" },
    })
      .select(
        "_id consumerId name mobile address packageName packageType monthlyAmount expiryDate",
      )
      .sort({ name: 1 })
      .lean();

    // 2. Package pricing
    const packagePrices = await PackagePrice.find({
      active: true,
    }).lean();

    const consumerIds = consumers.map((c) => c._id);

    // 3. Existing bills for selected month
    const bills = await MonthlyBill.find({
      consumerId: { $in: consumerIds },
      month: targetMonth,
    }).lean();

    const billMap = new Map();

    for (const bill of bills) {
      billMap.set(String(bill.consumerId), bill);
    }

    const customers = [];

    let expectedBill = 0;
    let totalPaid = 0;
    let totalPending = 0;

    let billableCustomers = 0;
    let billedCustomers = 0;
    let paidCustomersCount = 0;
    let pendingCustomersCount = 0;
    let notBilledCustomersCount = 0;
    let noPriceCustomersCount = 0;

    for (const consumer of consumers) {
      const bill = billMap.get(String(consumer._id));

      // Standard package price
      const configuredPrice = getEffectivePackagePrice(
        packagePrices,
        consumer.packageName,
        consumer.packageType,
        areaId,
      );

      const fallbackPrice = Number(consumer.monthlyAmount || 0);

      const standardAmount =
        configuredPrice !== null ? configuredPrice : fallbackPrice;

      const hasPrice = standardAmount > 0;

      /*
       * VERY IMPORTANT:
       *
       * If bill already exists, bill.amount is the FINAL
       * payable amount.
       *
       * Example:
       * Package = ₹250
       * Concession = ₹20
       * MonthlyBill.amount = ₹230
       *
       * Summary must use ₹230, not ₹250.
       */
      const finalBillAmount = bill ? Number(bill.amount || 0) : standardAmount;

      const amountPaid =
        bill?.amountPaid !== undefined && bill?.amountPaid !== null
          ? Number(bill.amountPaid)
          : bill?.status === "paid"
            ? Number(bill.amount || 0)
            : 0;

      const balance = Math.max(0, finalBillAmount - amountPaid);

      const isBilled = Boolean(bill);

      const isPaid =
        hasPrice && isBilled && balance <= 0 && finalBillAmount > 0;

      const isNotBilled = hasPrice && !isBilled;

      const isPending = hasPrice && isBilled && balance > 0;

      const isNoPrice = !hasPrice;

      if (consumer.consumerId === "NCVS0156") {
        console.log("SUMITRA BILL DEBUG:", {
          consumerId: consumer.consumerId,
          consumerMongoId: String(consumer._id),
          targetMonth,
          billFound: Boolean(bill),
          billId: bill?._id,
          billAmount: bill?.amount,
          amountPaid: bill?.amountPaid,
          billStatus: bill?.status,
          standardAmount,
          finalBillAmount,
          balance,
          isPaid,
          isPending,
        });
      }

      if (hasPrice) {
        billableCustomers++;

        expectedBill += finalBillAmount;

        totalPaid += Math.min(amountPaid, finalBillAmount);

        totalPending += balance;
      }

      if (isBilled) {
        billedCustomers++;
      }

      if (isPaid) {
        paidCustomersCount++;
      }

      if (isPending) {
        pendingCustomersCount++;
      }

      if (isNotBilled) {
        notBilledCustomersCount++;
      }

      if (isNoPrice) {
        noPriceCustomersCount++;
      }

      customers.push({
        consumerId: consumer._id,

        customerId: consumer.consumerId,

        name: consumer.name,

        mobile: consumer.mobile || "",

        address: consumer.address || "",

        packageName: consumer.packageName || "",

        packageType: consumer.packageType || "Package",

        monthlyAmount: Number(consumer.monthlyAmount || 0),

        configuredPrice,

        standardAmount,

        billId: bill?._id || null,

        billAmount: finalBillAmount,

        amountPaid,

        balance,

        month: targetMonth,

        status: isPaid
          ? "paid"
          : isNoPrice
            ? "no_price"
            : isNotBilled
              ? "not_billed"
              : "pending",

        billed: isBilled,

        paid: isPaid,

        pending: isPending,

        notBilled: isNotBilled,

        noPrice: isNoPrice,

        billDate: bill?.billDate || null,

        paidDate: bill?.paidDate || null,

        dueRemark: bill?.dueRemark || "",

        // Concession information
        baseAmount: Number(bill?.baseAmount ?? standardAmount ?? 0),

        concessionAmount: Number(bill?.concessionAmount || 0),

        concessionRemark: bill?.concessionRemark || "",
      });
    }

    const paidCustomers = customers.filter((c) => c.paid);

    const pendingCustomers = customers.filter((c) => c.pending);

    const notBilledCustomers = customers.filter((c) => c.notBilled);

    const noPriceCustomers = customers.filter((c) => c.noPrice);

    const billedCustomerList = customers.filter((c) => c.billed);

    return res.json({
      month: targetMonth,

      totalCustomers: consumers.length,

      billableCustomers,

      billedCustomers,

      paidCustomersCount,

      pendingCustomersCount,

      notBilledCustomersCount,

      noPriceCustomersCount,

      expectedBill,

      totalBill: expectedBill,

      totalPaid,

      totalPending,

      customers,

      billedCustomerList,

      paidCustomers,

      pendingCustomers,

      notBilledCustomers,

      noPriceCustomers,
    });
  } catch (error) {
    console.error("billingSummary error:", error);

    return res.status(500).json({
      message: "Billing summary load nahi ho paya",
      error: error.message,
    });
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
  billingSummary,
  monthlyCashCollection,
};
