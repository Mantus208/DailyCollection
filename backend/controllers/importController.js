const Consumer = require("../models/Consumer");
const MonthlyBill = require("../models/MonthlyBill");
const Area = require("../models/Area");
const PackagePrice = require("../models/PackagePrice");

const {
  parseExcelBuffer,
  getField,
  toIdString,
} = require("../utils/excelParser");

/* ============================================================
   HELPERS
============================================================ */

const normalizeText = (value) => (value ?? "").toString().trim().toUpperCase();

const makePackageKey = (packageName, packageType) =>
  `${normalizeText(packageName)}|${normalizeText(packageType)}`;

/**
 * Loads all active package pricing into memory.
 *
 * Example:
 * CCN ODIA PACK NEW + STANDARD
 *     -> default ₹250
 *     -> BARAPALLI ₹270
 */
const loadPricingMap = async () => {
  const configs = await PackagePrice.find({
    active: true,
  }).lean();

  const map = new Map();

  configs.forEach((config) => {
    const key = makePackageKey(config.packageName, config.packageType);

    map.set(key, config);
  });

  return map;
};

/**
 * Returns the final price for a package + area.
 *
 * Priority:
 * 1. Area override
 * 2. Package default price
 * 3. null if package pricing is not configured
 */
const getEffectivePrice = (pricingMap, packageName, packageType, areaId) => {
  const key = makePackageKey(packageName, packageType);

  const config = pricingMap.get(key);

  if (!config) {
    return null;
  }

  const override = (config.areaOverrides || []).find(
    (item) => areaId && item.areaId && String(item.areaId) === String(areaId),
  );

  if (override) {
    return Number(override.price);
  }

  return Number(config.defaultPrice);
};

/**
 * Information to show when package pricing is missing.
 */
const pricingInfo = (packageName, packageType, area) => ({
  packageName: packageName || "",
  packageType: packageType || "",
  area: area?.name || "",
});

/* ============================================================
   1. IMPORT AREAS
============================================================ */

// @route  POST /api/import/areas
// @desc   Area file se unique areas create karta hai
// @access Private (admin only)

const importAreasFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Koi file upload nahi hui",
      });
    }

    const rows = parseExcelBuffer(req.file.buffer);

    const existingAreas = await Area.find();

    const existingNames = new Set(
      existingAreas.map((a) => a.name.trim().toLowerCase()),
    );

    const uniqueNamesInFile = new Set();

    for (const row of rows) {
      const areaName = (getField(row, "Area") || "").toString().trim();

      if (areaName) {
        uniqueNamesInFile.add(areaName);
      }
    }

    let created = 0;
    const createdNames = [];

    for (const areaName of uniqueNamesInFile) {
      if (!existingNames.has(areaName.toLowerCase())) {
        await Area.create({
          name: areaName,
        });

        existingNames.add(areaName.toLowerCase());

        created++;
        createdNames.push(areaName);
      }
    }

    return res.json({
      message: "Area file import ho gaya",
      totalUniqueAreasInFile: uniqueNamesInFile.size,
      created,
      createdNames,
    });
  } catch (error) {
    console.error("importAreasFile error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

/* ============================================================
   2. MASTER CUSTOMER IMPORT
============================================================ */

// @route  POST /api/import/master-customers
// @desc   Master customer list create/update karta hai
// @access Private (admin only)

const importMasterCustomers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Koi file upload nahi hui",
      });
    }

    const rows = parseExcelBuffer(req.file.buffer);

    const areas = await Area.find();

    const areaNames = areas.map((a) => ({
      area: a,
      upper: a.name.trim().toUpperCase(),
    }));

    const matchArea = (address) => {
      if (!address) return null;

      const addr = address.toString().trim().toUpperCase();

      let hit = areaNames.find((a) => addr.startsWith(a.upper));

      if (hit) return hit.area;

      hit = areaNames.find((a) => addr.includes(a.upper));

      return hit ? hit.area : null;
    };

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let areaMatched = 0;
    let areaUnmatched = 0;

    const unmatchedAddresses = new Set();

    for (const row of rows) {
      const consumerId = toIdString(
        getField(row, "Fr_Customer_no", "FrCustomerNo"),
      ).toUpperCase();

      if (!consumerId) {
        skipped++;
        continue;
      }

      const address = (getField(row, "Ledger_Address") || "").toString().trim();

      const matchedArea = matchArea(address);

      if (matchedArea) {
        areaMatched++;
      } else {
        areaUnmatched++;

        if (address) {
          unmatchedAddresses.add(address);
        }
      }

      const name =
        (getField(row, "Customer_nm") || "").toString().trim() ||
        "(Naam missing — Pairing file me khali tha)";

      const update = {
        consumerId,
        name,
        address,

        franchisee: (getField(row, "Franchisee_nm") || "").toString().trim(),

        areaId: matchedArea ? matchedArea._id : null,

        areaNameRaw: address,
      };

      const result = await Consumer.findOneAndUpdate(
        { consumerId },
        { $set: update },
        {
          upsert: true,
          new: true,
          rawResult: true,
          setDefaultsOnInsert: true,
        },
      );

      if (result.lastErrorObject && result.lastErrorObject.upserted) {
        created++;
      } else {
        updated++;
      }
    }

    return res.json({
      message: "Master customer list import ho gayi",

      totalRows: rows.length,
      created,
      updated,
      skipped,

      areaMatched,
      areaUnmatched,

      unmatchedAddressesSample: Array.from(unmatchedAddresses).slice(0, 20),
    });
  } catch (error) {
    console.error("importMasterCustomers error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

/* ============================================================
   3. IMPORT EXPIRY
============================================================ */

// @route  POST /api/import/expiry
// @desc   Expiry file se consumer details update karta hai
//        aur Package Pricing Master se final monthly price
//        calculate karta hai.
//
// IMPORTANT:
// Expiry Excel price source nahi hai.
// PackagePrice Master final source hai.
//
// @access Private (admin only)

const importExpiry = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Koi file upload nahi hui",
      });
    }

    const rows = parseExcelBuffer(req.file.buffer);

    const areas = await Area.find();

    // ✅ Pricing Master ek baar load
    const pricingMap = await loadPricingMap();

    let updated = 0;
    let skipped = 0;
    let pricingApplied = 0;

    const unmatchedAreas = new Set();
    const unmatchedConsumers = [];
    const pricingNotConfigured = new Map();

    for (const row of rows) {
      const consumerId = toIdString(
        getField(row, "Sub. No.", "Sub.No.", "SubNo"),
      ).toUpperCase();

      if (!consumerId) {
        skipped++;
        continue;
      }

      const areaNameRaw = (getField(row, "Area") || "").toString().trim();

      const matchedArea = areas.find(
        (a) => a.name.toLowerCase() === areaNameRaw.toLowerCase(),
      );

      if (areaNameRaw && !matchedArea) {
        unmatchedAreas.add(areaNameRaw);
      }

      const packageType = (getField(row, "Type") || "").toString().trim();

      const packageName = (getField(row, "Name") || "").toString().trim();

      // =====================================================
      // FINAL PACKAGE PRICE
      // =====================================================

      const effectivePrice = getEffectivePrice(
        pricingMap,
        packageName,
        packageType,
        matchedArea?._id || null,
      );

      if (effectivePrice !== null) {
        pricingApplied++;
      } else {
        const key = makePackageKey(packageName, packageType);

        if (!pricingNotConfigured.has(key)) {
          pricingNotConfigured.set(
            key,
            pricingInfo(packageName, packageType, matchedArea),
          );
        }
      }

      const fields = {
        name: (getField(row, "Subscriber") || "").toString().trim(),

        mobile: toIdString(getField(row, "Mobile")),

        areaId: matchedArea ? matchedArea._id : null,

        areaNameRaw,

        address: (getField(row, "Address") || "").toString().trim(),

        stbNo: toIdString(getField(row, "STBNo", "STB No")),

        vcNo: toIdString(getField(row, "VC No.", "VCNo")),

        expiryDate: getField(row, "ToDate") || null,

        packageType,
        packageName,

        franchisee: (getField(row, "Franchisees", "Franchisee") || "")
          .toString()
          .trim(),
      };

      const existing = await Consumer.findOne({
        consumerId,
      });

      if (existing) {
        Object.assign(existing, fields);

        // ✅ IMPORTANT
        // Pricing configured hai to wahi final amount.
        //
        // Pricing configured nahi hai to old value
        // temporary preserve kar rahe hain.
        // Bills import is old value ko use nahi karega.
        if (effectivePrice !== null) {
          existing.monthlyAmount = effectivePrice;
        }

        await existing.save();

        updated++;
      } else {
        // Master list me nahi tha.
        // Auto-create nahi karenge.

        unmatchedConsumers.push({
          consumerId,
          ...fields,

          // UI ko useful information
          suggestedMonthlyAmount: effectivePrice ?? 0,
        });
      }
    }

    return res.json({
      message: "Expiry file import ho gaya",

      totalRows: rows.length,

      updated,
      skipped,

      pricingApplied,

      unmatchedAreas: Array.from(unmatchedAreas),

      unmatchedConsumers,

      pricingNotConfigured: Array.from(pricingNotConfigured.values()),
    });
  } catch (error) {
    console.error("importExpiry error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

/* ============================================================
   4. IMPORT BILLS
============================================================ */

// @route  POST /api/import/bills
//
// IMPORTANT:
// Bills Excel ka "Net Amount" ab PRICE SOURCE nahi hai.
//
// Net Amount:
//     ❌ Ignore for final package price
//
// PackagePrice Master:
//     ✅ Final source
//
// Priority:
//     Area Override
//         ↓
//     Package Default
//
// @access Private (admin only)

const importBills = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Koi file upload nahi hui",
      });
    }

    const rows = parseExcelBuffer(req.file.buffer);

    // ✅ Load pricing once
    const pricingMap = await loadPricingMap();

    const grouped = {};

    for (const row of rows) {
      const consumerId = toIdString(
        getField(row, "Sub.No.", "Sub. No.", "SubNo"),
      );

      // =====================================================
      // NOTE:
      // Net Amount ko sirf read nahi kar rahe.
      // Ye final amount ke liye use nahi hoga.
      // =====================================================

      const billDate = getField(row, "BillDate");

      const billNo = toIdString(getField(row, "BillNo"));

      if (!consumerId || !billDate) {
        continue;
      }

      if (!grouped[consumerId]) {
        grouped[consumerId] = {
          billDate,
          billNo,
        };
      }
    }

    let consumersUpdated = 0;
    let billsCreated = 0;
    let billsSkippedAlreadySet = 0;

    const notFoundConsumers = [];
    const priceNotConfigured = [];

    for (const consumerId of Object.keys(grouped)) {
      const { billDate, billNo } = grouped[consumerId];

      const consumer = await Consumer.findOne({
        consumerId,
      });

      if (!consumer) {
        notFoundConsumers.push(consumerId);

        continue;
      }

      // =====================================================
      // FINAL PRICE FROM PACKAGE MASTER
      // =====================================================

      const effectivePrice = getEffectivePrice(
        pricingMap,
        consumer.packageName,
        consumer.packageType,
        consumer.areaId,
      );

      // -----------------------------------------------------
      // Pricing missing
      // -----------------------------------------------------

      if (effectivePrice === null) {
        priceNotConfigured.push({
          consumerId: consumer.consumerId,

          name: consumer.name,

          packageName: consumer.packageName || "",

          packageType: consumer.packageType || "",

          area: consumer.areaId?.name || "",

          areaId: consumer.areaId?._id || consumer.areaId || null,
        });

        // ❌ Bill create/update nahi karenge
        // jab tak manual pricing configured nahi hai.

        continue;
      }

      // =====================================================
      // Consumer monthly amount
      // =====================================================

      consumer.lastPackageDate = billDate;

      // ✅ Manual Package Pricing final
      consumer.monthlyAmount = effectivePrice;

      await consumer.save();

      consumersUpdated++;

      // =====================================================
      // BILL MONTH
      // =====================================================

      const month = new Date(billDate).toISOString().slice(0, 7);

      const existingBill = await MonthlyBill.findOne({
        consumerId: consumer._id,
        month,
      });

      // =====================================================
      // EXISTING BILL
      // =====================================================

      if (existingBill) {
        if (existingBill.status === "unpaid" && !existingBill.paidDate) {
          // ✅ Update with manual package price
          existingBill.amount = effectivePrice;

          existingBill.billDate = billDate;

          existingBill.billNo = billNo;

          await existingBill.save();

          billsCreated++;
        } else {
          // Paid / already finalized bill
          // ko overwrite nahi karenge.

          billsSkippedAlreadySet++;
        }

        continue;
      }

      // =====================================================
      // NEW BILL
      // =====================================================

      await MonthlyBill.create({
        consumerId: consumer._id,

        month,

        billNo,

        // ✅ FINAL PRICE
        amount: effectivePrice,

        billDate,

        status: "unpaid",
      });

      billsCreated++;
    }

    return res.json({
      message: "Bill file import ho gaya",

      totalConsumersInFile: Object.keys(grouped).length,

      consumersUpdated,

      billsCreated,

      billsSkippedAlreadySet,

      notFoundConsumers,

      // ✅ Important for admin UI
      priceNotConfigured,
    });
  } catch (error) {
    console.error("importBills error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  importAreasFile,
  importMasterCustomers,
  importExpiry,
  importBills,
};
