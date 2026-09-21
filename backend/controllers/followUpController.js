const Consumer = require("../models/Consumer");
const MonthlyBill = require("../models/MonthlyBill");
const VisitLog = require("../models/VisitLog");

const getCurrentMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getToday = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDateKey = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const getFollowUps = async (req, res) => {
  try {
    const { areaId } = req.query;

    if (!areaId) {
      return res.status(400).json({
        message: "areaId zaroori hai",
      });
    }

    const today = getToday();
    const month = getCurrentMonth();

    const consumers = await Consumer.find({
      areaId,
      status: { $ne: "inactive" },
    })
      .select(
        "_id consumerId name address expiryDate monthlyAmount packageName",
      )
      .sort({ name: 1 })
      .lean();

    if (!consumers.length) {
      return res.json({
        today: [],
        overdue: [],
        upcoming: [],
      });
    }

    const consumerIds = consumers.map((c) => c._id);

    // Current month bills
    const bills = await MonthlyBill.find({
      consumerId: { $in: consumerIds },
      month,
    }).lean();

    const billMap = new Map();

    for (const bill of bills) {
      billMap.set(String(bill.consumerId), bill);
    }

    // Latest promised-later collection visit
    const visits = await VisitLog.find({
      consumerId: { $in: consumerIds },
      purpose: "collection",
      outcome: "promised_later",
    })
      .sort({ createdAt: -1 })
      .lean();

    const visitMap = new Map();

    for (const visit of visits) {
      const key = String(visit.consumerId);

      if (!visitMap.has(key)) {
        visitMap.set(key, visit);
      }
    }

    const todayList = [];
    const overdueList = [];
    const upcomingList = [];

    for (const consumer of consumers) {
      const consumerKey = String(consumer._id);

      const bill = billMap.get(consumerKey);
      const visit = visitMap.get(consumerKey);

      const billAmount = Number(bill?.amount ?? consumer.monthlyAmount ?? 0);

      const amountPaid = Number(bill?.amountPaid ?? 0);

      const balance = Math.max(0, billAmount - amountPaid);

      // Paid customer kahin bhi nahi dikhega
      if (balance <= 0) {
        continue;
      }

      const expiryDate = getDateKey(consumer.expiryDate);

      // IMPORTANT:
      // Bill date first, VisitLog date fallback
      const followUpDate =
        getDateKey(visit?.followUpDate) || getDateKey(bill?.followUpDate);

      /*
       * PROMISED FOLLOW-UP
       *
       * Bill followUpDate OR visit followUpDate mile
       * to expiry ko ignore karke promise date ke basis
       * par classify karenge.
       */
      if (followUpDate) {
        const item = {
          _id: bill?._id || consumer._id,

          consumerId: {
            _id: consumer._id,
            name: consumer.name,
            consumerId: consumer.consumerId,
          },

          address: consumer.address || "",

          amount: billAmount,
          amountPaid,
          balance,

          packageName: consumer.packageName || "",

          expiryDate: consumer.expiryDate || null,

          followUpDate: followUpDate || null,

          dueRemark:
            bill?.dueRemark ||
            visit?.customerRemark ||
            "Payment promised later",

          visitDate: visit?.createdAt || null,

          type: "promised",
        };

        if (followUpDate < today) {
          overdueList.push(item);
        } else if (followUpDate === today) {
          todayList.push(item);
        } else {
          upcomingList.push(item);
        }

        continue;
      }

      /*
       * No promised date:
       * expiry passed => Today
       */
      if (expiryDate && expiryDate <= today) {
        todayList.push({
          _id: bill?._id || consumer._id,

          consumerId: {
            _id: consumer._id,
            name: consumer.name,
            consumerId: consumer.consumerId,
          },

          address: consumer.address || "",

          amount: billAmount,
          amountPaid,
          balance,

          packageName: consumer.packageName || "",

          expiryDate: consumer.expiryDate || null,

          followUpDate: null,

          dueRemark: "Expiry ho chuki hai - payment pending",

          visitDate: null,

          type: "expiry",
        });
      }
    }

    return res.json({
      today: todayList,
      overdue: overdueList,
      upcoming: upcomingList,
    });
  } catch (error) {
    console.error("getFollowUps error:", error);

    return res.status(500).json({
      message: "Follow-ups load nahi ho paye",
      error: error.message,
    });
  }
};

module.exports = {
  getFollowUps,
};
