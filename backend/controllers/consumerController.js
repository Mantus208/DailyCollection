const Consumer = require("../models/Consumer");
const MonthlyBill = require("../models/MonthlyBill");
const VisitLog = require("../models/VisitLog");
const { getCurrentMonth } = require("../utils/dateHelpers");

// @route  POST /api/consumers
// @desc   Manually add ek consumer (jo Expiry file me aaya lekin master list me nahi tha)
// @access Private (admin only)
const createConsumer = async (req, res) => {
  try {
    const {
      consumerId,
      name,
      mobile,
      areaId,
      address,
      stbNo,
      vcNo,
      expiryDate,
      packageType,
      packageName,
      franchisee,
    } = req.body;

    if (!consumerId || !name) {
      return res
        .status(400)
        .json({ message: "Consumer ID aur naam zaroori hai" });
    }

    const existing = await Consumer.findOne({
      consumerId: consumerId.toUpperCase(),
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Ye Consumer ID pehle se maujood hai" });
    }

    const consumer = await Consumer.create({
      consumerId: consumerId.toUpperCase(),
      name,
      mobile,
      areaId: areaId || null,
      address,
      stbNo,
      vcNo,
      expiryDate: expiryDate || null,
      packageType,
      packageName,
      franchisee,
    });

    return res.status(201).json(consumer);
  } catch (error) {
    console.error("createConsumer error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/consumers/unmatched-areas
const getUnmatchedAreaGroups = async (req, res) => {
  try {
    const groups = await Consumer.aggregate([
      { $match: { areaId: null } },
      {
        $group: {
          _id: "$areaNameRaw",
          count: { $sum: 1 },
          samples: { $push: { consumerId: "$consumerId", name: "$name" } },
        },
      },
      { $project: { count: 1, samples: { $slice: ["$samples", 5] } } },
      { $sort: { count: -1 } },
    ]);
    return res.json(
      groups.map((g) => ({
        address: g._id,
        count: g.count,
        samples: g.samples,
      })),
    );
  } catch (error) {
    console.error("getUnmatchedAreaGroups error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/consumers/assign-area-by-address
const assignAreaByAddress = async (req, res) => {
  try {
    const { address, areaId } = req.body;
    if (!address || !areaId) {
      return res
        .status(400)
        .json({ message: "Address aur Area dono zaroori hain" });
    }
    const result = await Consumer.updateMany(
      { areaNameRaw: address, areaId: null },
      { $set: { areaId } },
    );
    return res.json({
      message: "Area assign ho gaya",
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error("assignAreaByAddress error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/consumers/search?areaId=&q=
// @desc   Ek area ke andar naam/ID/VC No./mobile se consumer dhoondta hai, current
//         month ka payment status bhi saath me deta hai
// @access Private
const searchConsumers = async (req, res) => {
  try {
    const { areaId, q } = req.query;
    if (!areaId) {
      return res.status(400).json({ message: "areaId zaroori hai" });
    }

    const filter = { areaId };
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { name: regex },
        { consumerId: regex },
        { vcNo: regex },
        { mobile: regex },
      ];
    }

    const consumers = await Consumer.find(filter).sort({ name: 1 }).limit(50);
    const month = getCurrentMonth();
    const bills = await MonthlyBill.find({
      consumerId: { $in: consumers.map((c) => c._id) },
      month,
    });
    const billMap = {};
    bills.forEach((b) => (billMap[b.consumerId.toString()] = b));

    const result = consumers.map((c) => ({
      ...c.toObject(),
      currentBill: billMap[c._id.toString()] || null,
    }));

    return res.json(result);
  } catch (error) {
    console.error("searchConsumers error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/consumers/:id
// @access Private
const getConsumerDetail = async (req, res) => {
  try {
    const consumer = await Consumer.findById(req.params.id).populate(
      "areaId",
      "name",
    );
    if (!consumer)
      return res.status(404).json({ message: "Consumer nahi mila" });

    const month = getCurrentMonth();
    const currentBill = await MonthlyBill.findOne({
      consumerId: consumer._id,
      month,
    });

    return res.json({ ...consumer.toObject(), currentBill });
  } catch (error) {
    console.error("getConsumerDetail error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/consumers/:id/collect
// @desc   Is mahine ka payment "Paid" mark karta hai
// @access Private
const collectPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const consumer = await Consumer.findById(req.params.id);
    if (!consumer)
      return res.status(404).json({ message: "Consumer nahi mila" });

    const month = getCurrentMonth();
    let bill = await MonthlyBill.findOne({ consumerId: consumer._id, month });
    const finalAmount =
      amount !== undefined && amount !== null && amount !== ""
        ? Number(amount)
        : (bill?.amount ?? consumer.monthlyAmount ?? 0);

    if (!bill) {
      bill = await MonthlyBill.create({
        consumerId: consumer._id,
        month,
        amount: finalAmount,
        status: "paid",
        paidDate: new Date(),
        lastEditedBy: req.user._id,
        lastEditedAt: new Date(),
      });
    } else {
      bill.amount = finalAmount;
      bill.status = "paid";
      bill.paidDate = new Date();
      bill.dueRemark = "";
      bill.lastEditedBy = req.user._id;
      bill.lastEditedAt = new Date();
      await bill.save();
    }

    await VisitLog.create({
      consumerId: consumer._id,
      visitedBy: req.user._id,
      purpose: "collection",
      outcome: "paid",
      amountCollected: finalAmount,
    });

    return res.json(bill);
  } catch (error) {
    console.error("collectPayment error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/consumers/:id/unpaid
// @desc   Galti se Paid mark hua tha use wapas Unpaid karta hai
// @access Private
const markUnpaid = async (req, res) => {
  try {
    const consumer = await Consumer.findById(req.params.id);
    if (!consumer)
      return res.status(404).json({ message: "Consumer nahi mila" });

    const month = getCurrentMonth();
    let bill = await MonthlyBill.findOne({ consumerId: consumer._id, month });
    if (!bill) {
      bill = await MonthlyBill.create({
        consumerId: consumer._id,
        month,
        amount: consumer.monthlyAmount,
        status: "unpaid",
      });
    } else {
      bill.status = "unpaid";
      bill.paidDate = null;
      bill.lastEditedBy = req.user._id;
      bill.lastEditedAt = new Date();
      await bill.save();
    }

    await VisitLog.create({
      consumerId: consumer._id,
      visitedBy: req.user._id,
      purpose: "collection",
      outcome: "not_paid",
      customerRemark: "Galti se Paid mark hua tha, Unpaid me correct kiya gaya",
    });

    return res.json(bill);
  } catch (error) {
    console.error("markUnpaid error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/consumers/:id/due
// @desc   Is mahine "Due" mark karta hai, remark ke saath
// @access Private
const markDue = async (req, res) => {
  try {
    const { remark } = req.body;
    const consumer = await Consumer.findById(req.params.id);
    if (!consumer)
      return res.status(404).json({ message: "Consumer nahi mila" });

    const month = getCurrentMonth();
    let bill = await MonthlyBill.findOne({ consumerId: consumer._id, month });
    if (!bill) {
      bill = await MonthlyBill.create({
        consumerId: consumer._id,
        month,
        amount: consumer.monthlyAmount,
        status: "due",
        dueRemark: remark || "",
        lastEditedBy: req.user._id,
        lastEditedAt: new Date(),
      });
    } else {
      bill.status = "due";
      bill.dueRemark = remark || "";
      bill.paidDate = null;
      bill.lastEditedBy = req.user._id;
      bill.lastEditedAt = new Date();
      await bill.save();
    }

    await VisitLog.create({
      consumerId: consumer._id,
      visitedBy: req.user._id,
      purpose: "collection",
      outcome: "promised_later",
      customerRemark: remark || "",
    });

    return res.json(bill);
  } catch (error) {
    console.error("markDue error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/consumers/:id/visit
// @desc   Service Entry — bina payment ke bhi ek visit log karta hai (kisliye gaye the)
// @access Private
const logVisit = async (req, res) => {
  try {
    const { purpose, serviceNote, outcome, amountCollected, customerRemark } =
      req.body;
    const consumer = await Consumer.findById(req.params.id);
    if (!consumer)
      return res.status(404).json({ message: "Consumer nahi mila" });

    const visit = await VisitLog.create({
      consumerId: consumer._id,
      visitedBy: req.user._id,
      purpose: purpose || "service",
      serviceNote: serviceNote || "",
      outcome: outcome || "not_paid",
      amountCollected: amountCollected || 0,
      customerRemark: customerRemark || "",
    });

    return res.status(201).json(visit);
  } catch (error) {
    console.error("logVisit error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/consumers/:id/history
// @desc   Poora ledger — har month ka bill + har visit, dono newest-first
// @access Private
const getHistory = async (req, res) => {
  try {
    const consumerId = req.params.id;
    const bills = await MonthlyBill.find({ consumerId }).sort({ month: -1 });
    const visits = await VisitLog.find({ consumerId })
      .populate("visitedBy", "name")
      .sort({ createdAt: -1 });
    return res.json({ bills, visits });
  } catch (error) {
    console.error("getHistory error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createConsumer,
  getUnmatchedAreaGroups,
  assignAreaByAddress,
  searchConsumers,
  getConsumerDetail,
  collectPayment,
  markUnpaid,
  markDue,
  logVisit,
  getHistory,
};
