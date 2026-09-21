const Consumer = require("../models/Consumer");
const MonthlyBill = require("../models/MonthlyBill");
const VisitLog = require("../models/VisitLog");
const { getCurrentMonth } = require("../utils/dateHelpers");
const { logActivity } = require("../utils/logActivity");

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

    await logActivity(
      req.user,
      "consumer_add",
      `Naya consumer manually add kiya: ${consumer.name} (${consumer.consumerId})`,
    );

    return res.status(201).json(consumer);
  } catch (error) {
    console.error("createConsumer error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

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

const searchConsumers = async (req, res) => {
  try {
    const { areaId, q } = req.query;
    if (!areaId) return res.status(400).json({ message: "areaId zaroori hai" });

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
const applyConcession = async (req, res) => {
  try {
    const { amount, remark = "" } = req.body;

    const concession = Number(amount);

    if (!Number.isFinite(concession) || concession <= 0) {
      return res.status(400).json({
        message: "Valid concession amount enter karein",
      });
    }

    const consumer = await Consumer.findById(req.params.id);

    if (!consumer) {
      return res.status(404).json({
        message: "Consumer nahi mila",
      });
    }

    const month = getCurrentMonth();

    let bill = await MonthlyBill.findOne({
      consumerId: consumer._id,
      month,
    });

    if (!bill) {
      bill = await MonthlyBill.create({
        consumerId: consumer._id,
        month,
        amount: consumer.monthlyAmount || 0,
        amountPaid: 0,
        status: "unpaid",
      });
    }

    const currentAmount = Number(bill.amount || 0);
    const amountPaid = Number(bill.amountPaid || 0);
    const balance = currentAmount - amountPaid;

    if (balance <= 0) {
      return res.status(400).json({
        message: "Is bill me concession ke liye balance nahi hai",
      });
    }

    if (concession > balance) {
      return res.status(400).json({
        message: `Maximum ₹${balance} concession de sakte hain`,
      });
    }

    // Original amount preserve karein
    if (!bill.baseAmount || bill.baseAmount === 0) {
      bill.baseAmount = currentAmount;
    }

    bill.concessionAmount = Number(bill.concessionAmount || 0) + concession;

    bill.concessionRemark = remark.trim();

    // Current month ka payable amount reduce
    bill.amount = currentAmount - concession;

    // Agar concession ke baad paid amount complete ho gaya
    if (bill.amountPaid >= bill.amount) {
      bill.amountPaid = bill.amount;
      bill.status = "paid";
      bill.paidDate = new Date();
      bill.dueRemark = "";
      bill.followUpDate = null;
    } else {
      bill.status = "due";

      const newBalance = bill.amount - bill.amountPaid;

      bill.dueRemark = `Concession ₹${concession} ke baad ₹${newBalance} baaki hai`;
    }

    bill.lastEditedBy = req.user._id;
    bill.lastEditedAt = new Date();

    await bill.save();

    await logActivity(
      req.user,
      "concession",
      `${consumer.name} (${consumer.consumerId}) ko ₹${concession} concession diya — ${month}`,
    );

    return res.json(bill);
  } catch (error) {
    console.error("applyConcession error:", error);

    return res.status(500).json({
      message: error.message || "Concession apply nahi hua",
      error: error.message || "Unknown error",
    });
  }
};
const collectPayment = async (req, res) => {
  try {
    const { amountPaid } = req.body;

    const paidNow = Number(amountPaid);

    if (!Number.isFinite(paidNow) || paidNow <= 0) {
      return res.status(400).json({
        message: "Valid collection amount enter karein",
      });
    }

    const consumer = await Consumer.findById(req.params.id);

    if (!consumer) {
      return res.status(404).json({
        message: "Consumer nahi mila",
      });
    }

    const month = getCurrentMonth();

    let bill = await MonthlyBill.findOne({
      consumerId: consumer._id,
      month,
    });

    if (!bill) {
      bill = await MonthlyBill.create({
        consumerId: consumer._id,
        month,
        amount: consumer.monthlyAmount || 0,
        amountPaid: 0,
        status: "unpaid",
      });
    }

    const billAmount = Number(bill.amount || 0);
    const alreadyPaid = Number(bill.amountPaid || 0);
    const balanceBefore = billAmount - alreadyPaid;

    if (balanceBefore <= 0) {
      return res.status(400).json({
        message: "Is bill ka payment already complete hai",
      });
    }

    if (paidNow > balanceBefore) {
      return res.status(400).json({
        message: `Maximum ₹${balanceBefore} hi collect kar sakte hain`,
      });
    }

    // Add current collection
    bill.amountPaid = alreadyPaid + paidNow;

    bill.lastEditedBy = req.user._id;
    bill.lastEditedAt = new Date();

    // Paid / Partial Due
    if (bill.amount > 0 && bill.amountPaid >= bill.amount) {
      bill.status = "paid";
      bill.paidDate = new Date();
      bill.dueRemark = "";
      bill.followUpDate = null;
    } else {
      bill.status = "due";

      const balance = bill.amount - bill.amountPaid;

      bill.dueRemark = `Partial payment — ₹${balance} baaki hai`;
    }

    await bill.save();

    // Save collection history
    await VisitLog.create({
      consumerId: consumer._id,
      visitedBy: req.user._id,
      purpose: "collection",
      outcome: bill.status === "paid" ? "paid" : "promised_later",
      amountCollected: paidNow,
      customerRemark: bill.status !== "paid" ? bill.dueRemark : "",
      followUpDate: null,
      reversed: false,
    });

    await logActivity(
      req.user,
      "collect_payment",
      `${consumer.name} (${consumer.consumerId}) se ₹${paidNow} liya`,
    );

    return res.json(bill);
  } catch (error) {
    console.error("collectPayment FULL ERROR:", error);

    return res.status(500).json({
      message: error.message || "Server error",
      error: error.message || "Unknown error",
    });
  }
};

const editBillAmount = async (req, res) => {
  try {
    const { amount } = req.body;
    if (amount === undefined || amount === null || amount === "") {
      return res.status(400).json({ message: "Amount zaroori hai" });
    }
    const consumer = await Consumer.findById(req.params.id);
    if (!consumer)
      return res.status(404).json({ message: "Consumer nahi mila" });

    const month = getCurrentMonth();
    let bill = await MonthlyBill.findOne({ consumerId: consumer._id, month });
    if (!bill) {
      bill = await MonthlyBill.create({
        consumerId: consumer._id,
        month,
        amount: Number(amount),
        status: "unpaid",
      });
    } else {
      bill.amount = Number(amount);
      if (bill.amount > 0 && bill.amountPaid >= bill.amount) {
        bill.status = "paid";
      } else if (bill.amountPaid > 0) {
        bill.status = "due";
        bill.dueRemark = `Partial payment — ₹${bill.amount - bill.amountPaid} baaki hai`;
      }
      bill.lastEditedBy = req.user._id;
      bill.lastEditedAt = new Date();
      await bill.save();
    }

    await logActivity(
      req.user,
      "edit_amount",
      `${consumer.name} (${consumer.consumerId}) ka amount ₹${amount} kiya`,
    );

    return res.json(bill);
  } catch (error) {
    console.error("editBillAmount error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const markUnpaid = async (req, res) => {
  try {
    const consumer = await Consumer.findById(req.params.id);

    if (!consumer) {
      return res.status(404).json({
        message: "Consumer nahi mila",
      });
    }

    const month = getCurrentMonth();

    let bill = await MonthlyBill.findOne({
      consumerId: consumer._id,
      month,
    });

    // -------------------------------------------------
    // Reverse latest collection
    // -------------------------------------------------
    const latestCollection = await VisitLog.findOne({
      consumerId: consumer._id,
      purpose: "collection",
      amountCollected: { $gt: 0 },
      reversed: { $ne: true },
      outcome: { $in: ["paid", "promised_later"] },
    }).sort({ createdAt: -1 });

    if (latestCollection) {
      latestCollection.reversed = true;
      await latestCollection.save();

      console.log(
        `Collection reversed: ${latestCollection._id} | ₹${latestCollection.amountCollected}`,
      );
    }

    // -------------------------------------------------
    // Reset current month's bill
    // -------------------------------------------------
    if (!bill) {
      bill = await MonthlyBill.create({
        consumerId: consumer._id,
        month,
        amount: consumer.monthlyAmount || 0,
        status: "unpaid",
        amountPaid: 0,
        dueRemark: "",
        followUpDate: null,
        lastEditedBy: req.user._id,
        lastEditedAt: new Date(),
      });
    } else {
      bill.status = "unpaid";
      bill.paidDate = null;
      bill.amountPaid = 0;
      bill.dueRemark = "";
      bill.followUpDate = null;
      bill.lastEditedBy = req.user._id;
      bill.lastEditedAt = new Date();

      await bill.save();
    }

    // -------------------------------------------------
    // Audit history
    // -------------------------------------------------
    await VisitLog.create({
      consumerId: consumer._id,
      visitedBy: req.user._id,
      purpose: "collection",
      outcome: "not_paid",
      amountCollected: 0,
      customerRemark: "Galti se Paid mark hua tha, Unpaid me correct kiya gaya",
      followUpDate: null,
      reversed: false,
    });

    await logActivity(
      req.user,
      "mark_unpaid",
      `${consumer.name} (${consumer.consumerId}) ko Unpaid kiya`,
    );

    return res.json(bill);
  } catch (error) {
    console.error("markUnpaid error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const markDue = async (req, res) => {
  try {
    const { remark, followUpDate } = req.body;
    if (!followUpDate) {
      return res.status(400).json({
        message: "Follow-up date select karein",
      });
    }
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
        followUpDate: followUpDate || null,
        lastEditedBy: req.user._id,
        lastEditedAt: new Date(),
      });
    } else {
      bill.status = "due";
      bill.dueRemark = remark || "";
      bill.followUpDate = followUpDate || null;
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
      followUpDate: followUpDate || null,
    });

    await logActivity(
      req.user,
      "mark_due",
      `${consumer.name} (${consumer.consumerId}) ko Due kiya — ${remark || ""}`,
    );

    return res.json(bill);
  } catch (error) {
    console.error("markDue error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const logVisit = async (req, res) => {
  try {
    const {
      purpose,
      serviceNote,
      outcome,
      amountCollected,
      customerRemark,
      followUpDate,
    } = req.body;

    const consumer = await Consumer.findById(req.params.id);

    if (!consumer) {
      return res.status(404).json({
        message: "Consumer nahi mila",
      });
    }

    // -------------------------------------------------
    // If customer promised to pay later,
    // follow-up date is required.
    // -------------------------------------------------
    if (outcome === "promised_later" && !followUpDate) {
      return res.status(400).json({
        message: "Baad me denge bole hain to follow-up date select karein",
      });
    }

    // -------------------------------------------------
    // Save visit history
    // -------------------------------------------------
    const visit = await VisitLog.create({
      consumerId: consumer._id,
      visitedBy: req.user._id,
      purpose: purpose || "service",
      serviceNote: serviceNote || "",
      outcome: outcome || "not_paid",
      amountCollected: Number(amountCollected) || 0,
      customerRemark: customerRemark || "",

      followUpDate: outcome === "promised_later" ? followUpDate : null,
    });

    // -------------------------------------------------
    // PROMISED LATER
    // Convert current bill into Due + Follow-up
    // -------------------------------------------------
    if (outcome === "promised_later" && purpose === "collection") {
      const month = getCurrentMonth();

      let bill = await MonthlyBill.findOne({
        consumerId: consumer._id,
        month,
      });

      if (!bill) {
        bill = await MonthlyBill.create({
          consumerId: consumer._id,
          month,
          amount: consumer.monthlyAmount || 0,
          amountPaid: 0,
          status: "due",
          dueRemark: customerRemark || "Payment promised later",
          followUpDate,
          lastEditedBy: req.user._id,
          lastEditedAt: new Date(),
        });
      } else {
        // Keep already collected partial amount.
        bill.status = "due";
        bill.dueRemark = customerRemark || "Payment promised later";
        bill.followUpDate = followUpDate;
        bill.paidDate = null;
        bill.lastEditedBy = req.user._id;
        bill.lastEditedAt = new Date();

        await bill.save();
      }

      await logActivity(
        req.user,
        "promised_payment",
        `${consumer.name} (${consumer.consumerId}) ne baad me payment ka promise kiya — follow-up ${followUpDate}`,
      );
    } else {
      await logActivity(
        req.user,
        "visit_entry",
        `${consumer.name} (${consumer.consumerId}) — ${
          purpose || "service"
        }: ${serviceNote || ""}`,
      );
    }

    return res.status(201).json({
      visit,
      followUpCreated: outcome === "promised_later" && purpose === "collection",
    });
  } catch (error) {
    console.error("logVisit error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

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
  editBillAmount,
  markUnpaid,
  markDue,
  logVisit,
  getHistory,
  applyConcession,
};
