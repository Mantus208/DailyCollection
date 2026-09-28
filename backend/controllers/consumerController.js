const Consumer = require("../models/Consumer");
const MonthlyBill = require("../models/MonthlyBill");
const VisitLog = require("../models/VisitLog");
const Area = require("../models/Area");
const { getCurrentMonth } = require("../utils/dateHelpers");
const { logActivity } = require("../utils/logActivity");

const PackagePrice = require("../models/PackagePrice");
const {
  makePackageKey,
  getEffectivePrice,
  normalizePackageType,
  calculateConsumerMonthlyAmount,
} = require("./packagePriceController");

const {
  getLiveSubscriber,
  getLiveSubscriberByEncodedId,
  getLiveSubscriberAddress,
  getLiveHardware,
  getLiveExpiryFromReport,
  getLiveBill,
  switchPaytvFranchise,
} = require("../utils/paytvClient");
const getConsumerPaytvLive = async (req, res) => {
  try {
    const { id } = req.params;

    const consumer = await Consumer.findById(id)
      .select("consumerId name paytv areaId")
      .lean();

    if (!consumer) {
      return res.status(404).json({
        message: "Consumer nahi mila",
      });
    }

    if (!consumer.consumerId) {
      return res.status(400).json({
        message: "Consumer ID missing hai",
      });
    }

    // =========================================================
    // 1. LOCAL AREA MAPPING
    // =========================================================

    const area = await Area.findById(consumer.areaId)
      .select("name paytvCompanyId paytvFranchiseeId paytvAreaId")
      .lean();

    if (!area) {
      return res.status(400).json({
        message: "Consumer ka local Area mapped nahi hai.",
      });
    }

    const companyId =
      Number(area.paytvCompanyId) ||
      Number(consumer.paytv?.companyId) ||
      Number(process.env.PAYTV_COMPANY_ID || 1);

    const franchiseId =
      Number(area.paytvFranchiseeId) ||
      Number(consumer.paytv?.franchiseeId) ||
      null;

    const paytvAreaId =
      Number(area.paytvAreaId) || Number(consumer.paytv?.areaId) || null;

    if (!franchiseId) {
      return res.status(400).json({
        message: `Area "${area.name}" ka PayTV Franchise mapped nahi hai.`,
      });
    }

    console.log(
      `📺 Live PayTV fetch: ${consumer.consumerId} | area=${area.name} | company=${companyId} | franchise=${franchiseId} | paytvArea=${paytvAreaId || "not-set"}`,
    );

    // =========================================================
    // 2. CORRECT PAYTV FRANCHISE SESSION
    // =========================================================

    await switchPaytvFranchise(franchiseId);

    console.log("✅ PayTV franchise selected:", {
      area: area.name,
      companyId,
      franchiseId,
      paytvAreaId,
    });

    // =========================================================
    // 3. CUSTOMER RESOLUTION
    //
    // First time:
    //   Consumer ID -> search ONLY inside mapped franchise
    //
    // Next time:
    //   Saved customerId -> direct GeneralInfo
    //   No subscriber search
    // =========================================================

    let live = null;

    const cachedCustomerId = Number(consumer.paytv?.customerId) || null;

    if (cachedCustomerId) {
      // =====================================================
      // CACHE HIT
      // Subscriber search + GeneralInfo dono SKIP
      // =====================================================

      console.log(
        `📺 CACHE HIT: ${consumer.consumerId} → customerId=${cachedCustomerId}`,
      );

      const encodedId = Buffer.from(String(cachedCustomerId), "utf8").toString(
        "base64",
      );

      live = {
        found: true,

        customerId: cachedCustomerId,

        encodedId,

        consumerId: consumer.consumerId,

        companyId,

        franchiseId,

        areaId: paytvAreaId,

        name: consumer.name || "",

        mobile: "",

        active: true,

        prepaid: false,

        hardwareUrl: null,
      };
    } else {
      // =====================================================
      // FIRST TIME ONLY
      // Search ONLY mapped franchise
      // =====================================================

      console.log(
        `📺 FIRST SEARCH: ${consumer.consumerId} | franchise=${franchiseId}`,
      );

      live = await getLiveSubscriber(consumer.consumerId, {
        companyId,
        franchiseId,
        areaId: paytvAreaId,
      });

      if (!live?.found) {
        return res.status(404).json({
          message: "Mapped PayTV Franchise mein customer nahi mila.",
          consumerId: consumer.consumerId,
          area: area.name,
          franchiseId,
        });
      }

      // First successful lookup ke baad cache
      await Consumer.updateOne(
        { _id: consumer._id },
        {
          $set: {
            "paytv.companyId": companyId,
            "paytv.franchiseeId": franchiseId,
            "paytv.areaId": paytvAreaId,

            "paytv.customerId": Number(live.customerId) || null,

            "paytv.encodedId": live.encodedId || "",

            "paytv.name": live.name || consumer.name || "",

            "paytv.mobile": live.mobile || "",

            "paytv.status": live.active ? "active" : "inactive",

            "paytv.stbNo": hardware?.stbNo || "",

            "paytv.vcNo": hardware?.vcNo || "",

            "paytv.basicPackage": hardware?.basicPackage || null,

            "paytv.addons": hardware?.addons || [],

            "paytv.packages": hardware?.packages || [],

            "paytv.lastFetchedAt": new Date(),

            "paytv.fetchStatus": "live",

            "paytv.fetchError": "",
          },
        },
      );

      console.log(`✅ First-time PayTV customer cached: ${live.customerId}`);
    }

    if (!live?.found) {
      return res.status(404).json({
        message: "Mapped PayTV Franchise mein customer nahi mila.",
        consumerId: consumer.consumerId,
        area: area.name,
        franchiseId,
      });
    }

    // =========================================================
    // 4. AREA MAPPING = AUTHORITATIVE FRANCHISE
    // =========================================================

    const resolvedFranchiseId = franchiseId;

    console.log("📺 RESOLVED PAYTV CONTEXT:", {
      companyId,
      localAreaId: consumer.areaId,
      areaName: area.name,
      paytvAreaId,
      franchiseId: resolvedFranchiseId,
      customerId: live.customerId,
      consumerId: live.consumerId || consumer.consumerId,
    });

    // =========================================================
    // 5. CACHE CONSUMER PAYTV MAPPING
    // =========================================================

    await Consumer.updateOne(
      { _id: consumer._id },
      {
        $set: {
          "paytv.companyId": companyId,

          "paytv.franchiseeId": resolvedFranchiseId,

          "paytv.areaId": paytvAreaId,

          "paytv.customerId": Number(live.customerId) || null,
        },
      },
    );

    console.log("✅ PayTV consumer mapping cached:", {
      consumerId: consumer.consumerId,
      companyId,
      franchiseId: resolvedFranchiseId,
      paytvAreaId,
      customerId: Number(live.customerId) || null,
    });

    // =========================================================
    // 6. LIVE HARDWARE + PACKAGE
    // =========================================================

    let hardware = {
      found: false,
      hardwareId: null,
      stbNo: "",
      vcNo: "",
      basicPackage: null,
      addons: [],
      packages: [],
    };

    try {
      hardware = await getLiveHardware(live.customerId, {
        hardwareUrl: live.hardwareUrl,
        encodedId: live.encodedId,
      });
    } catch (error) {
      console.error("📺 Live hardware error:", error.message);
    }
    // =========================================================
    // LIVE EXPIRY REPORT
    // =========================================================

    let liveExpiry = {
      found: false,
      packageName: "",
      packageType: "",
      startDate: null,
      expiryDate: null,
    };

    try {
      liveExpiry = await getLiveExpiryFromReport({
        companyId,
        franchiseId: resolvedFranchiseId,
        consumerId: live.consumerId || consumer.consumerId,
      });

      console.log("✅ LIVE EXPIRY FETCHED:", {
        consumerId: live.consumerId || consumer.consumerId,
        packageName: liveExpiry?.packageName,
        startDate: liveExpiry?.startDate,
        expiryDate: liveExpiry?.expiryDate,
      });
    } catch (error) {
      console.error("📺 Live expiry error:", error.message);
    }
    // =========================================================
    // 5b. LOCAL PACKAGE PRICING — har live package/addon ka
    //     configured price (area-override ya default) nikal ke
    //     total consumer monthly amount banata hai
    //     (yahi calculation Package Pricing ke "Apply" me hoti hai)
    // =========================================================
    let pricingBreakdown = [];
    let pricingTotal = null;
    let pricingMissing = [];

    try {
      const pricingConfigs = await PackagePrice.find({ active: true }).lean();
      const pricingMap = new Map();
      for (const cfg of pricingConfigs) {
        pricingMap.set(makePackageKey(cfg.packageName, cfg.packageType), cfg);
      }

      const fakeConsumer = {
        areaId: consumer.areaId,
        paytv: { packages: hardware?.packages || [] },
      };

      const calc = calculateConsumerMonthlyAmount(fakeConsumer, pricingMap);
      pricingMissing = calc.missing || [];
      if (calc.success) {
        pricingTotal = calc.amount;
      }

      pricingBreakdown = (hardware?.packages || []).map((item) => {
        const rawType = String(item?.type || "")
          .trim()
          .toLowerCase();
        const packageType =
          rawType === "addon" || rawType === "basic"
            ? "Package"
            : normalizePackageType(item?.type);
        const key = makePackageKey(item?.name, packageType);
        const cfg = pricingMap.get(key);
        const price = cfg ? getEffectivePrice(cfg, consumer.areaId) : null;
        return {
          name: item?.name || "",
          type: item?.type || "",
          configuredPrice: price,
        };
      });
    } catch (error) {
      console.error("📺 Package pricing calculation failed:", error.message);
    }
    // =========================================================
    // SAVE LIVE PAYTV HARDWARE + PACKAGE CACHE
    // =========================================================

    await Consumer.updateOne(
      { _id: consumer._id },
      {
        $set: {
          "paytv.companyId": companyId,
          "paytv.franchiseeId": franchiseId,
          "paytv.areaId": paytvAreaId,

          "paytv.customerId": Number(live.customerId) || null,

          "paytv.encodedId": live.encodedId || "",

          "paytv.name": live.name || consumer.name || "",

          "paytv.mobile": live.mobile || "",

          "paytv.status": live.active ? "active" : "inactive",

          "paytv.stbNo": hardware?.stbNo || "",

          "paytv.vcNo": hardware?.vcNo || "",

          "paytv.basicPackage": hardware?.basicPackage || null,

          "paytv.addons": Array.isArray(hardware?.addons)
            ? hardware.addons
            : [],

          "paytv.packages": Array.isArray(hardware?.packages)
            ? hardware.packages
            : [],

          "paytv.lastFetchedAt": new Date(),

          "paytv.fetchStatus": hardware?.found ? "live" : "error",

          "paytv.fetchError": hardware?.found
            ? ""
            : "Live hardware/package data not found",
        },
      },
    );

    console.log("✅ LIVE PAYTV CACHE SAVED:", {
      consumerId: consumer.consumerId,
      customerId: live.customerId,
      basicPackage: hardware?.basicPackage?.name || null,
      addonCount: Array.isArray(hardware?.addons) ? hardware.addons.length : 0,
      totalPackages: Array.isArray(hardware?.packages)
        ? hardware.packages.length
        : 0,
    });
    // =========================================================
    // 7. LIVE BILL
    // =========================================================

    // let bill = null;

    // try {
    //   if (live.customerId) {
    //     bill = await getLiveBill(live.customerId, consumer.consumerId, {
    //       companyId,
    //       franchiseId: resolvedFranchiseId,
    //     });
    //   }
    // } catch (error) {
    //   console.error("📺 Live bill fetch failed:", error.message);
    // }

    // =========================================================
    // 8. FINAL RESPONSE
    // =========================================================

    return res.json({
      source: "paytv-live",

      fetchedAt: new Date(),

      consumer: {
        consumerId: live.consumerId || consumer.consumerId,

        customerId: live.customerId || null,

        encodedId: live.encodedId || "",

        name: live.name || consumer.name || "",

        mobile: live.mobile === "0" ? "" : live.mobile || "",

        status: live.active ? "active" : "inactive",

        prepaid: Boolean(live.prepaid),
      },

      paytv: {
        companyId,

        franchiseeId: resolvedFranchiseId,

        parentFranchiseeId: live.parentFranchiseeId || null,

        areaId: paytvAreaId || live.areaId || null,
      },

      address: {
        address1: live.address1 || "",

        address2: live.address2 || "",

        address3: live.address3 || "",

        postCode: live.postCode || "",

        country: {
          id: null,
          name: "",
        },

        state: {
          id: null,
          name: "",
        },

        zone: {
          id: null,
          name: "",
        },

        city: {
          id: null,
          name: "",
        },

        area: {
          id: paytvAreaId || null,
          name: area.name || "",
        },
      },

      hardware: {
        source: "paytv-live-hardware",

        hardwareId: hardware?.hardwareId || null,

        stbNo: hardware?.stbNo || "",

        vcNo: hardware?.vcNo || "",

        type: hardware?.basicPackage?.type || "",

        basicPackage: hardware?.basicPackage || null,

        addons: hardware?.addons || [],

        packages: hardware?.packages || [],
      },

      package: {
        lastPackageDate: hardware?.basicPackage?.startDate || null,
        name: hardware?.basicPackage?.name || "",
        type: hardware?.basicPackage?.type || "",

        startDate:
          liveExpiry?.startDate || hardware?.basicPackage?.startDate || null,

        expiryDate:
          liveExpiry?.expiryDate || hardware?.basicPackage?.expiryDate || null,

        price: hardware?.basicPackage?.price ?? null,
        channelCount: hardware?.basicPackage?.channelCount ?? 0,
        plan: hardware?.basicPackage?.plan || "",
        packages: hardware?.packages || [],
        addons: hardware?.addons || [],
        pricingBreakdown,
        totalAmount: pricingTotal,
        missingPricing: pricingMissing,
      },
      bill: null,
    });
  } catch (error) {
    console.error("getConsumerPaytvLive error:", error);

    return res.status(500).json({
      message:
        error.response?.data?.message ||
        error.message ||
        "Live PayTV data fetch nahi hua",
    });
  }
};
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
const getLivePaytv = async (req, res) => {
  try {
    const consumer = await Consumer.findById(req.params.id).select(
      "consumerId name paytv",
    );

    if (!consumer) {
      return res.status(404).json({
        message: "Consumer nahi mila",
      });
    }

    const companyId = Number(consumer.paytv?.companyId) || 1;

    const franchiseId = Number(consumer.paytv?.franchiseeId) || 10027;

    console.log(
      `📡 PayTV LIVE fetch: ${consumer.consumerId} | company=${companyId} | franchise=${franchiseId}`,
    );

    const live = await getLiveSubscriberFull(consumer.consumerId, {
      companyId,
      franchiseId,
    });

    return res.json({
      success: true,
      source: "paytv-live",
      fetchedAt: new Date(),
      consumerId: consumer.consumerId,

      live: {
        ...live,

        // Hardware existing PayTV sync se
        hardware: {
          source: "paytv-sync",
          stbNo: consumer.paytv?.stbNo || "",
          vcNo: consumer.paytv?.vcNo || "",
          basicPackage: consumer.paytv?.basicPackage || null,
          addons: consumer.paytv?.addons || [],
          packages: consumer.paytv?.packages || [],
          fetchStatus: consumer.paytv?.fetchStatus || "never",
          lastFetchedAt: consumer.paytv?.lastFetchedAt || null,
        },
      },
    });
  } catch (error) {
    console.error("getLivePaytv error:", error);

    return res.status(502).json({
      success: false,
      source: "paytv-live",
      message: "PayTV se live data fetch nahi ho paya",
      error: error.message,
    });
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

    if (!consumer) {
      return res.status(404).json({
        message: "Consumer nahi mila",
      });
    }

    const month = getCurrentMonth();

    // -----------------------------------------
    // CURRENT MONTH BILL
    // -----------------------------------------
    let currentBill = await MonthlyBill.findOne({
      consumerId: consumer._id,
      month,
    });

    // -----------------------------------------
    // ADVANCE AUTO ADJUST
    // -----------------------------------------
    if (
      currentBill &&
      Number(consumer.advanceAmount || 0) > 0 &&
      currentBill.status !== "paid"
    ) {
      const billAmount = Number(currentBill.amount || 0);
      const alreadyPaid = Number(currentBill.amountPaid || 0);
      const concession = Number(currentBill.concessionAmount || 0);

      const billBalance = Math.max(billAmount - alreadyPaid - concession, 0);

      const advance = Number(consumer.advanceAmount || 0);

      const advanceUsed = Math.min(advance, billBalance);

      if (advanceUsed > 0) {
        currentBill.amountPaid = alreadyPaid + advanceUsed;

        const finalSettled =
          Number(currentBill.amountPaid || 0) +
          Number(currentBill.concessionAmount || 0);

        if (finalSettled >= billAmount) {
          currentBill.status = "paid";
          currentBill.paidDate = new Date();
          currentBill.dueRemark = "";
          currentBill.followUpDate = null;
        }

        await currentBill.save();

        consumer.advanceAmount = advance - advanceUsed;

        await consumer.save();
      }
    }

    // -----------------------------------------
    // PREVIOUS MONTH UNPAID / DUE BILLS
    // -----------------------------------------
    const previousBills = await MonthlyBill.find({
      consumerId: consumer._id,
      month: { $lt: month },
    })
      .sort({
        month: 1,
        createdAt: 1,
      })
      .lean();

    let previousBillsDue = 0;

    for (const oldBill of previousBills) {
      const oldAmount = Number(oldBill.amount || 0);

      const oldPaid = Number(oldBill.amountPaid || 0);

      const oldConcession = Number(oldBill.concessionAmount || 0);

      const oldBalance = Math.max(oldAmount - oldPaid - oldConcession, 0);

      previousBillsDue += oldBalance;
    }

    // -----------------------------------------
    // MANUAL PREVIOUS DUE
    // -----------------------------------------
    const manualPreviousDue = Number(consumer.previousDue || 0);

    // -----------------------------------------
    // CURRENT BILL BALANCE
    // -----------------------------------------
    const currentBillAmount = Number(currentBill?.amount || 0);

    const currentBillPaid = Number(currentBill?.amountPaid || 0);

    const currentBillConcession = Number(currentBill?.concessionAmount || 0);

    const currentBillBalance = Math.max(
      currentBillAmount - currentBillPaid - currentBillConcession,
      0,
    );

    // -----------------------------------------
    // TOTAL OUTSTANDING
    // -----------------------------------------
    const totalPreviousDue = previousBillsDue + manualPreviousDue;

    const totalOutstanding =
      totalPreviousDue +
      currentBillBalance -
      Number(consumer.advanceAmount || 0);

    // -----------------------------------------
    // RESPONSE
    // -----------------------------------------
    return res.json({
      ...consumer.toObject(),

      currentBill,

      previousBillsDue,
      manualPreviousDue,
      totalPreviousDue,

      currentBillBalance,

      totalOutstanding: Math.max(totalOutstanding, 0),
    });
  } catch (error) {
    console.error("getConsumerDetail error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
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

    // bill.amount ko CHHEDNA NAHI HAI. Wo fixed package price rahega (e.g., 310)

    // settled amount nikalenge (Pehle se diya hua paisa + Naya concession)
    const settledAmount =
      Number(bill.amountPaid || 0) + Number(bill.concessionAmount || 0);

    // Agar concession lagane ke baad total settled amount, bill amount ke barabar ya jyada ho jaye
    if (settledAmount >= currentAmount) {
      bill.status = "paid";
      bill.paidDate = new Date();
      bill.dueRemark = "";
      bill.followUpDate = null;
    } else {
      bill.status = "due";
      const newBalance = currentAmount - settledAmount;
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

    // 🟢 RECENT ACTIVITY ME DIKHANE KE LIYE YEH NAYA BLOCK ADD KAREIN
    await VisitLog.create({
      consumerId: consumer._id,
      visitedBy: req.user._id,
      purpose: "concession", // purpose concession rakha hai taaki cash me mix na ho
      outcome: bill.status === "paid" ? "paid" : "not_paid",
      amountCollected: concession,
      customerRemark:
        `₹${concession} ka discount (concession) diya gaya.` +
        (remark.trim() ? ` Reason: ${remark.trim()}` : ""),
      followUpDate: null,
      reversed: false,
    });

    return res.json(bill);
  } catch (error) {
    console.error("applyConcession error:", error);

    return res.status(500).json({
      message: error.message || "Concession apply nahi hua",
      error: error.message || "Unknown error",
    });
  }
};
const setPreviousDue = async (req, res) => {
  try {
    const { previousDue } = req.body;

    const amount = Number(previousDue);

    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({
        message: "Valid previous due amount enter karein",
      });
    }

    const consumer = await Consumer.findById(req.params.id);

    if (!consumer) {
      return res.status(404).json({
        message: "Consumer nahi mila",
      });
    }

    consumer.previousDue = amount;

    await consumer.save();

    await logActivity(
      req.user,
      "previous_due_update",
      `${consumer.name} (${consumer.consumerId}) ka previous due ₹${amount} set kiya`,
    );

    return res.json({
      message: "Previous due save ho gaya",
      previousDue: consumer.previousDue,
    });
  } catch (error) {
    console.error("setPreviousDue error:", error);

    return res.status(500).json({
      message: error.message || "Previous due save nahi hua",
    });
  }
};
const collectPayment = async (req, res) => {
  try {
    const {
      amountPaid,
      concessionAmount = 0,
      concessionRemark = "",
    } = req.body;

    const paidNow = Number(amountPaid);
    const concessionNow = Number(concessionAmount || 0);

    // -----------------------------------------
    // BASIC VALIDATION
    // -----------------------------------------

    if (!Number.isFinite(paidNow) || paidNow <= 0) {
      return res.status(400).json({
        message: "Valid collection amount enter karein",
      });
    }

    if (!Number.isFinite(concessionNow) || concessionNow < 0) {
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

    // -----------------------------------------
    // CURRENT MONTH BILL
    // -----------------------------------------

    let currentBill = await MonthlyBill.findOne({
      consumerId: consumer._id,
      month,
    });

    if (!currentBill) {
      const currentPackageAmount = Number(consumer.monthlyAmount || 0);

      if (currentPackageAmount <= 0) {
        return res.status(400).json({
          message:
            "Current monthly package amount set nahi hai. Pehle package amount set karein.",
        });
      }

      currentBill = await MonthlyBill.create({
        consumerId: consumer._id,
        month,
        amount: currentPackageAmount,
        baseAmount: currentPackageAmount,
        amountPaid: 0,
        concessionAmount: 0,
        concessionRemark: "",
        status: "unpaid",
      });
    }

    // -----------------------------------------
    // CURRENT MONTH BALANCE
    // -----------------------------------------

    const currentAmount = Number(currentBill.amount || 0);

    const currentPaid = Number(currentBill.amountPaid || 0);

    const currentConcession = Number(currentBill.concessionAmount || 0);

    const currentBalance = Math.max(
      currentAmount - currentPaid - currentConcession,
      0,
    );

    // -----------------------------------------
    // PREVIOUS MONTH BILL DUES
    // -----------------------------------------

    const previousBills = await MonthlyBill.find({
      consumerId: consumer._id,
      month: { $lt: month },
    }).sort({
      month: 1,
      createdAt: 1,
    });

    const previousDueBills = [];

    let previousBillsDue = 0;

    for (const oldBill of previousBills) {
      const oldAmount = Number(oldBill.amount || 0);

      const oldPaid = Number(oldBill.amountPaid || 0);

      const oldConcession = Number(oldBill.concessionAmount || 0);

      const oldBalance = Math.max(oldAmount - oldPaid - oldConcession, 0);

      if (oldBalance > 0) {
        previousBillsDue += oldBalance;

        previousDueBills.push({
          bill: oldBill,
          balance: oldBalance,
        });
      }
    }

    // -----------------------------------------
    // MANUAL PREVIOUS DUE
    // Ye unbilled/missing history ka due hai
    // -----------------------------------------

    const manualPreviousDue = Number(consumer.previousDue || 0);

    const totalPreviousDue = previousBillsDue + manualPreviousDue;

    // -----------------------------------------
    // TOTAL OUTSTANDING
    // -----------------------------------------

    const totalOutstanding = totalPreviousDue + currentBalance;

    // -----------------------------------------
    // CONCESSION ONLY CURRENT MONTH
    // -----------------------------------------

    if (concessionNow > currentBalance) {
      return res.status(400).json({
        message: `Current month mein maximum ₹${currentBalance} concession de sakte hain.`,
      });
    }

    // -----------------------------------------
    // COLLECTION + CONCESSION VALIDATION
    // -----------------------------------------

    // -----------------------------------------
    // ALLOCATE PAYMENT
    // 1. Old monthly bills
    // 2. Manual previous due
    // 3. Current month
    // -----------------------------------------

    let remainingCollection = paidNow;

    // -----------------------------------------
    // OLD MONTHLY BILLS
    // -----------------------------------------

    for (const entry of previousDueBills) {
      if (remainingCollection <= 0) {
        break;
      }

      const oldBill = entry.bill;
      const oldBalance = entry.balance;

      const collectFromOld = Math.min(remainingCollection, oldBalance);

      const oldPaid = Number(oldBill.amountPaid || 0);

      oldBill.amountPaid = oldPaid + collectFromOld;

      const oldSettled =
        Number(oldBill.amountPaid || 0) + Number(oldBill.concessionAmount || 0);

      if (oldSettled >= Number(oldBill.amount || 0)) {
        oldBill.status = "paid";
        oldBill.paidDate = new Date();
        oldBill.dueRemark = "";
        oldBill.followUpDate = null;
      } else {
        oldBill.status = "due";

        const oldRemaining = Number(oldBill.amount || 0) - oldSettled;

        oldBill.dueRemark = `₹${oldRemaining} baaki hai`;
      }

      oldBill.lastEditedBy = req.user._id;
      oldBill.lastEditedAt = new Date();

      await oldBill.save();

      // Old due collection history
      await VisitLog.create({
        consumerId: consumer._id,
        visitedBy: req.user._id,
        purpose: "collection",
        outcome: "paid",
        amountCollected: collectFromOld,
        customerRemark: `Previous due ${oldBill.month} se adjust kiya`,
        followUpDate: null,
        reversed: false,
      });

      remainingCollection -= collectFromOld;
    }

    // -----------------------------------------
    // MANUAL PREVIOUS DUE
    // -----------------------------------------

    if (remainingCollection > 0 && consumer.previousDue > 0) {
      const collectFromManualDue = Math.min(
        remainingCollection,
        Number(consumer.previousDue || 0),
      );

      consumer.previousDue =
        Number(consumer.previousDue || 0) - collectFromManualDue;

      await consumer.save();

      await VisitLog.create({
        consumerId: consumer._id,
        visitedBy: req.user._id,
        purpose: "collection",
        outcome: "paid",
        amountCollected: collectFromManualDue,
        customerRemark: "Manual previous due adjust kiya",
        followUpDate: null,
        reversed: false,
      });

      remainingCollection -= collectFromManualDue;
    }

    // -----------------------------------------
    // CURRENT MONTH COLLECTION
    // -----------------------------------------

    const currentCollection = Math.min(remainingCollection, currentBalance);

    currentBill.amountPaid = currentPaid + currentCollection;
    // -----------------------------------------
    // EXTRA COLLECTION → ADVANCE
    // -----------------------------------------

    const advanceReceived = Math.max(
      remainingCollection - currentCollection,
      0,
    );

    if (advanceReceived > 0) {
      consumer.advanceAmount =
        Number(consumer.advanceAmount || 0) + advanceReceived;

      await consumer.save();

      // Advance cash ki history bhi rakhein
      // taaki total collection report mein amount miss na ho.
      await VisitLog.create({
        consumerId: consumer._id,
        visitedBy: req.user._id,
        purpose: "collection",
        outcome: "paid",
        amountCollected: advanceReceived,
        customerRemark: "Advance payment received for future month",
        followUpDate: null,
        reversed: false,
      });
    }

    // -----------------------------------------
    // CURRENT MONTH CONCESSION
    // -----------------------------------------

    currentBill.concessionAmount = currentConcession + concessionNow;

    if (concessionRemark.trim()) {
      currentBill.concessionRemark = concessionRemark.trim();
    }

    // -----------------------------------------
    // CURRENT MONTH FINAL STATUS
    // -----------------------------------------

    const finalCurrentSettled =
      Number(currentBill.amountPaid || 0) +
      Number(currentBill.concessionAmount || 0);

    const finalCurrentBalance = Math.max(
      currentAmount - finalCurrentSettled,
      0,
    );

    if (currentAmount > 0 && finalCurrentBalance <= 0) {
      currentBill.status = "paid";
      currentBill.paidDate = new Date();
      currentBill.dueRemark = "";
      currentBill.followUpDate = null;
    } else {
      currentBill.status = "due";

      currentBill.dueRemark = `₹${finalCurrentBalance} baaki hai`;
    }

    currentBill.lastEditedBy = req.user._id;
    currentBill.lastEditedAt = new Date();

    await currentBill.save();

    // -----------------------------------------
    // CURRENT MONTH COLLECTION HISTORY
    // -----------------------------------------

    if (currentCollection > 0) {
      await VisitLog.create({
        consumerId: consumer._id,
        visitedBy: req.user._id,
        purpose: "collection",
        outcome: finalCurrentBalance <= 0 ? "paid" : "promised_later",
        amountCollected: currentCollection,

        customerRemark:
          concessionNow > 0
            ? `Collection ₹${currentCollection}. ` +
              `Concession ₹${concessionNow}` +
              (concessionRemark.trim() ? ` — ${concessionRemark.trim()}` : "")
            : "",

        followUpDate: null,

        reversed: false,
      });
    }

    // -----------------------------------------
    // ACTIVITY LOG
    // -----------------------------------------

    let activityMessage = `${consumer.name} (${consumer.consumerId}) se ₹${paidNow} liya`;

    if (totalPreviousDue > 0) {
      activityMessage += `, previous due ₹${Math.min(
        paidNow,
        totalPreviousDue,
      )} adjust kiya`;
    }

    if (concessionNow > 0) {
      activityMessage += `, ₹${concessionNow} concession diya`;
    }

    await logActivity(req.user, "collect_payment", activityMessage);

    // -----------------------------------------
    // RESPONSE
    // -----------------------------------------

    return res.json({
      ...currentBill.toObject(),

      previousDue: Number(consumer.previousDue || 0),
      previousBillsDue,
      totalPreviousDue,
      totalOutstanding,

      currentCollection,
      totalCollected: paidNow,
      concessionGiven: concessionNow,
      finalCurrentBalance,

      // IMPORTANT
      advanceAmount: Number(consumer.advanceAmount || 0),

      consumerId: consumer._id,
    });
  } catch (error) {
    console.error("collectPayment FULL ERROR:", error);

    return res.status(500).json({
      message: error.message || "Server error",

      error: error.message || "Unknown error",
    });
  }
};
const recordAdvancePayment = async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message: "Valid advance amount enter karein",
      });
    }

    const consumer = await Consumer.findById(req.params.id);

    if (!consumer) {
      return res.status(404).json({
        message: "Consumer nahi mila",
      });
    }

    const oldAdvance = Number(consumer.advanceAmount || 0);

    const newAdvance = oldAdvance + amount;

    // ONLY advance increase
    consumer.advanceAmount = newAdvance;

    await consumer.save();

    await VisitLog.create({
      consumerId: consumer._id,
      visitedBy: req.user._id,
      purpose: "collection",
      outcome: "paid",
      amountCollected: amount,
      customerRemark: "Advance payment received for future month",
      followUpDate: null,
      reversed: false,
    });

    await logActivity(
      req.user,
      "advance_payment",
      `${consumer.name} (${consumer.consumerId}) se ₹${amount} advance liya`,
    );

    return res.json({
      message: `₹${amount} advance successfully save ho gaya`,
      advanceReceived: amount,
      previousAdvance: oldAdvance,
      advanceAmount: newAdvance,
    });
  } catch (error) {
    console.error("recordAdvancePayment error:", error);

    return res.status(500).json({
      message: "Advance payment save nahi hua",
      error: error.message,
    });
  }
};
const editBillAmount = async (req, res) => {
  try {
    const { amount } = req.body;

    if (amount === undefined || amount === null || amount === "") {
      return res.status(400).json({
        message: "Amount zaroori hai",
      });
    }

    const newAmount = Number(amount);

    if (!Number.isFinite(newAmount) || newAmount < 0) {
      return res.status(400).json({
        message: "Valid amount enter karein",
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
        amount: newAmount,
        baseAmount: newAmount,
        amountPaid: 0,
        concessionAmount: 0,
        concessionRemark: "",
        status: newAmount <= 0 ? "paid" : "unpaid",
        dueRemark: "",
        paidDate: newAmount <= 0 ? new Date() : null,
        manualAmountOverride: true,
        lastEditedBy: req.user._id,
        lastEditedAt: new Date(),
      });
    } else {
      bill.amount = newAmount;

      // Mark this month's amount as manually overridden.
      bill.manualAmountOverride = true;

      const paid = Number(bill.amountPaid || 0);
      const concession = Number(bill.concessionAmount || 0);

      const settled = paid + concession;

      if (newAmount <= 0) {
        bill.status = "paid";
        bill.paidDate = new Date();
        bill.dueRemark = "";
        bill.followUpDate = null;
      } else if (settled >= newAmount) {
        bill.status = "paid";
        bill.paidDate = new Date();
        bill.dueRemark = "";
        bill.followUpDate = null;
      } else if (settled > 0) {
        bill.status = "due";
        bill.paidDate = null;
        bill.dueRemark = `Partial payment — ₹${newAmount - settled} baaki hai`;
      } else {
        bill.status = "unpaid";
        bill.paidDate = null;
        bill.dueRemark = `₹${newAmount} baaki hai`;
      }

      bill.lastEditedBy = req.user._id;
      bill.lastEditedAt = new Date();

      await bill.save();
    }

    await logActivity(
      req.user,
      "edit_amount",
      `${consumer.name} (${consumer.consumerId}) ka amount ₹${newAmount} kiya`,
    );

    return res.json(bill);
  } catch (error) {
    console.error("editBillAmount error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
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
      bill.concessionAmount = 0;
      bill.concessionRemark = "";
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
const resetPreStartBilling = async (req, res) => {
  try {
    const { id } = req.params;

    // App billing start month
    const startMonth = "2026-09";

    const consumer = await Consumer.findById(id);

    if (!consumer) {
      return res.status(404).json({
        message: "Consumer nahi mila",
      });
    }

    // ---------------------------------------------------------
    // CURRENT MONTH BILL
    // ---------------------------------------------------------
    const currentBill = await MonthlyBill.findOne({
      consumerId: consumer._id,
      month: startMonth,
    });

    if (!currentBill) {
      return res.status(400).json({
        message: `Current bill ${startMonth} mein nahi mila.`,
      });
    }

    // ---------------------------------------------------------
    // SEPTEMBER COLLECTION HISTORY
    // IMPORTANT:
    // Jo payment August due mein adjust hua tha,
    // wo bhi September VisitLog mein collection ke naam se saved hai.
    // Isliye usko current September bill mein re-allocate karenge.
    // ---------------------------------------------------------
    const startDate = new Date(`${startMonth}-01T00:00:00.000Z`);

    const nextMonthDate = new Date(startDate);
    nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);

    const collectionLogs = await VisitLog.find({
      consumerId: consumer._id,
      purpose: "collection",
      reversed: { $ne: true },
      createdAt: {
        $gte: startDate,
        $lt: nextMonthDate,
      },
    })
      .select("amountCollected")
      .lean();

    const totalSeptemberCollected = collectionLogs.reduce((sum, item) => {
      return sum + Number(item.amountCollected || 0);
    }, 0);

    // ---------------------------------------------------------
    // CURRENT BILL REBUILD
    // ---------------------------------------------------------
    const billAmount = Number(currentBill.amount || 0);
    const concession = Number(currentBill.concessionAmount || 0);

    const payableAmount = Math.max(billAmount - concession, 0);

    const currentPaid = Math.min(totalSeptemberCollected, payableAmount);

    const newAdvanceAmount = Math.max(
      totalSeptemberCollected - payableAmount,
      0,
    );

    currentBill.amountPaid = currentPaid;

    const settledAmount = currentPaid + concession;

    const currentBalance = Math.max(billAmount - settledAmount, 0);

    if (billAmount <= 0) {
      currentBill.status = "unpaid";
      currentBill.paidDate = null;
      currentBill.dueRemark = "";
      currentBill.followUpDate = null;
    } else if (currentBalance <= 0) {
      currentBill.status = "paid";
      currentBill.paidDate = new Date();
      currentBill.dueRemark = "";
      currentBill.followUpDate = null;
    } else {
      currentBill.status = "due";
      currentBill.paidDate = null;
      currentBill.dueRemark = `₹${currentBalance} baaki hai`;
    }

    currentBill.lastEditedBy = req.user._id;
    currentBill.lastEditedAt = new Date();

    await currentBill.save();

    // ---------------------------------------------------------
    // ADVANCE REBUILD
    // Since app starts from September, September collection
    // excess becomes current consumer advance.
    // ---------------------------------------------------------
    consumer.advanceAmount = newAdvanceAmount;

    await consumer.save();

    // ---------------------------------------------------------
    // DELETE PRE-START MONTHLY BILLS
    // August and older
    // ---------------------------------------------------------
    const oldBills = await MonthlyBill.find({
      consumerId: consumer._id,
      month: { $lt: startMonth },
    })
      .select("_id month amount amountPaid")
      .lean();

    const deleteResult = await MonthlyBill.deleteMany({
      consumerId: consumer._id,
      month: { $lt: startMonth },
    });
    // ---------------------------------------------------------
    // CLEAN PRE-START COLLECTION LOGS
    // App September 2026 se start hua.
    // Old-bill allocation ki separate activity ko hata kar
    // September ki actual collection ko ek single entry mein rakhen.
    // ---------------------------------------------------------

    const septemberCollectionStart = new Date("2026-09-01T00:00:00.000Z");

    const septemberCollectionEnd = new Date("2026-10-01T00:00:00.000Z");

    // September ke collection logs
    const septemberCollectionLogs = await VisitLog.find({
      consumerId: consumer._id,
      purpose: "collection",
      createdAt: {
        $gte: septemberCollectionStart,
        $lt: septemberCollectionEnd,
      },
      reversed: { $ne: true },
    }).select("_id amountCollected");

    // Total actual September collection
    const totalSeptemberCollectionForHistory = septemberCollectionLogs.reduce(
      (sum, log) => sum + Number(log.amountCollected || 0),
      0,
    );

    // Purane split collection entries hatao
    if (septemberCollectionLogs.length > 0) {
      await VisitLog.deleteMany({
        _id: {
          $in: septemberCollectionLogs.map((log) => log._id),
        },
      });
    }

    // Ek single clean September collection history
    if (totalSeptemberCollectionForHistory > 0) {
      await VisitLog.create({
        consumerId: consumer._id,
        visitedBy: req.user._id,
        purpose: "collection",
        outcome: currentBill.status === "paid" ? "paid" : "promised_later",
        amountCollected: totalSeptemberCollectionForHistory,
        customerRemark: "September collection",
        followUpDate: null,
        reversed: false,
      });
    }
    // ---------------------------------------------------------
    // ACTIVITY LOG
    // ---------------------------------------------------------
    await logActivity(
      req.user,
      "reset_prestart_billing",
      `${consumer.name} (${consumer.consumerId}) ka pre-start billing history ${startMonth} se pehle clear kiya gaya. September collection ₹${totalSeptemberCollected} ko current bill mein re-allocate kiya gaya.`,
    );

    return res.json({
      message: "Pre-start billing successfully reset",

      consumerId: consumer.consumerId,

      startMonth,

      deletedOldBills: deleteResult.deletedCount || 0,

      oldBillDetails: oldBills,

      septemberCollected: totalSeptemberCollected,

      currentBillAmount: billAmount,

      currentBillPaid: currentPaid,

      currentBalance,

      advanceAmount: newAdvanceAmount,

      currentBillStatus: currentBill.status,
    });
  } catch (error) {
    console.error("resetPreStartBilling error:", error);

    return res.status(500).json({
      message: "Pre-start billing reset nahi hua",
      error: error.message,
    });
  }
};
const mergeSeptemberCollectionHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const consumer = await Consumer.findById(id);

    if (!consumer) {
      return res.status(404).json({
        message: "Consumer nahi mila",
      });
    }

    const startDate = new Date("2026-09-01T00:00:00.000Z");
    const endDate = new Date("2026-10-01T00:00:00.000Z");

    const logs = await VisitLog.find({
      consumerId: consumer._id,
      purpose: "collection",
      reversed: { $ne: true },
      createdAt: {
        $gte: startDate,
        $lt: endDate,
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!logs.length) {
      return res.status(404).json({
        message: "September collection history nahi mili",
      });
    }

    // Same second ke collection logs ko group karo.
    // ₹150 + ₹100 jaisi split entry isi group mein milegi.
    const groups = new Map();

    for (const log of logs) {
      const key = new Date(log.createdAt).toISOString().slice(0, 19);

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(log);
    }

    // Latest split collection group dhoondo
    let targetGroup = null;

    for (const group of groups.values()) {
      if (group.length < 2) {
        continue;
      }

      const hasPreviousDueLog = group.some((item) =>
        String(item.customerRemark || "")
          .toLowerCase()
          .includes("previous due"),
      );

      if (hasPreviousDueLog) {
        targetGroup = group;
        break;
      }
    }

    if (!targetGroup) {
      return res.status(404).json({
        message:
          "Split September collection history nahi mili. Kuch bhi change nahi hua.",
      });
    }

    const totalAmount = targetGroup.reduce(
      (sum, item) => sum + Number(item.amountCollected || 0),
      0,
    );

    // Old split logs delete
    await VisitLog.deleteMany({
      _id: {
        $in: targetGroup.map((item) => item._id),
      },
    });

    // Ek single clean collection entry
    await VisitLog.create({
      consumerId: consumer._id,
      visitedBy: req.user._id,
      purpose: "collection",
      outcome: "paid",
      amountCollected: totalAmount,
      customerRemark: "September collection",
      followUpDate: null,
      reversed: false,
    });

    await logActivity(
      req.user,
      "merge_collection_history",
      `${consumer.name} (${consumer.consumerId}) ki September split collection history ₹${totalAmount} ko single collection entry mein merge kiya`,
    );

    return res.json({
      message: "September collection history merge ho gayi",
      consumerId: consumer.consumerId,
      mergedEntries: targetGroup.length,
      totalAmount,
    });
  } catch (error) {
    console.error("mergeSeptemberCollectionHistory error:", error);

    return res.status(500).json({
      message: "Collection history merge nahi hui",
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
  getConsumerPaytvLive,
  getLivePaytv,
  collectPayment,
  recordAdvancePayment,
  editBillAmount,
  markUnpaid,
  markDue,
  logVisit,
  getHistory,
  applyConcession,
  markDue,
  resetPreStartBilling,
  applyConcession,
  setPreviousDue,
  mergeSeptemberCollectionHistory,
};
