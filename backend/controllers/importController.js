const Consumer = require("../models/Consumer");
const MonthlyBill = require("../models/MonthlyBill");
const Area = require("../models/Area");
const {
  parseExcelBuffer,
  getField,
  toIdString,
} = require("../utils/excelParser");

// @route  POST /api/import/areas
// @desc   Area.xlsx jaisi file se saare unique Area naam DB me create kar deta hai
//         (jo pehle se hain unhe dobara nahi banata)
// @access Private (admin only)
const importAreasFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Koi file upload nahi hui" });
    }

    const rows = parseExcelBuffer(req.file.buffer);
    const existingAreas = await Area.find();
    const existingNames = new Set(
      existingAreas.map((a) => a.name.trim().toLowerCase()),
    );

    const uniqueNamesInFile = new Set();
    for (const row of rows) {
      const areaName = (getField(row, "Area") || "").toString().trim();
      if (areaName) uniqueNamesInFile.add(areaName);
    }

    let created = 0;
    const createdNames = [];
    for (const areaName of uniqueNamesInFile) {
      if (!existingNames.has(areaName.toLowerCase())) {
        await Area.create({ name: areaName });
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
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/import/master-customers
// @desc   Pairing.xlsx jaisi file se saare customers (poori list) create/update karta hai.
//         Address ko existing Area naamon se match karke areaId set karta hai.
// @access Private (admin only)
const importMasterCustomers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Koi file upload nahi hui" });
    }

    const rows = parseExcelBuffer(req.file.buffer);
    const areas = await Area.find();
    const areaNames = areas.map((a) => ({
      area: a,
      upper: a.name.trim().toUpperCase(),
    }));

    // Address ko Area se match karta hai: pehle "starts with" try karta hai, phir "contains"
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
      if (matchedArea) areaMatched++;
      else {
        areaUnmatched++;
        if (address) unmatchedAddresses.add(address);
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
        { upsert: true, new: true, rawResult: true, setDefaultsOnInsert: true },
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
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/import/expiry
// @desc   Monthly Expiry-file upload — SIRF existing consumers ko update karta hai.
//         Jo Sub.No. master list me nahi mila, wo auto-create NAHI hota — list me
//         wapas bhej diya jata hai taaki admin ek click me manually add kar sake.
// @access Private (admin only)
const importExpiry = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Koi file upload nahi hui" });
    }

    const rows = parseExcelBuffer(req.file.buffer);
    const areas = await Area.find();

    let updated = 0;
    let skipped = 0;
    const unmatchedAreas = new Set();
    const unmatchedConsumers = [];

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

      const fields = {
        name: (getField(row, "Subscriber") || "").toString().trim(),
        mobile: toIdString(getField(row, "Mobile")),
        areaId: matchedArea ? matchedArea._id : null,
        areaNameRaw,
        address: (getField(row, "Address") || "").toString().trim(),
        stbNo: toIdString(getField(row, "STBNo", "STB No")),
        vcNo: toIdString(getField(row, "VC No.", "VCNo")),
        expiryDate: getField(row, "ToDate") || null,
        packageType: (getField(row, "Type") || "").toString().trim(),
        packageName: (getField(row, "Name") || "").toString().trim(),
        franchisee: (getField(row, "Franchisees", "Franchisee") || "")
          .toString()
          .trim(),
      };

      const existing = await Consumer.findOne({ consumerId });

      if (existing) {
        Object.assign(existing, fields);
        await existing.save();
        updated++;
      } else {
        // Master list me nahi tha — yahan auto-create nahi karenge
        unmatchedConsumers.push({ consumerId, ...fields });
      }
    }

    return res.json({
      message: "Expiry file import ho gaya",
      totalRows: rows.length,
      updated,
      skipped,
      unmatchedAreas: Array.from(unmatchedAreas),
      unmatchedConsumers,
    });
  } catch (error) {
    console.error("importExpiry error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/import/bills
// @desc   Monthly Bill-file upload — har consumer ke sabse zyada Net Amount wali row
//         se is mahine ka package date + amount set hota hai
// @access Private (admin only)
const importBills = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Koi file upload nahi hui" });
    }

    const rows = parseExcelBuffer(req.file.buffer);

    const grouped = {};
    for (const row of rows) {
      const consumerId = toIdString(
        getField(row, "Sub.No.", "Sub. No.", "SubNo"),
      );
      const netAmount = Number(getField(row, "Net Amount")) || 0;
      const billDate = getField(row, "BillDate");
      const billNo = toIdString(getField(row, "BillNo"));

      if (!consumerId || !billDate) continue;

      if (!grouped[consumerId] || netAmount > grouped[consumerId].netAmount) {
        grouped[consumerId] = { netAmount, billDate, billNo };
      }
    }

    let consumersUpdated = 0;
    let billsCreated = 0;
    let billsSkippedAlreadySet = 0;
    const notFoundConsumers = [];

    for (const consumerId of Object.keys(grouped)) {
      const { netAmount, billDate, billNo } = grouped[consumerId];

      const consumer = await Consumer.findOne({ consumerId });
      if (!consumer) {
        notFoundConsumers.push(consumerId);
        continue;
      }

      consumer.lastPackageDate = billDate;
      consumer.monthlyAmount = netAmount;
      await consumer.save();
      consumersUpdated++;

      const month = new Date(billDate).toISOString().slice(0, 7);

      const existingBill = await MonthlyBill.findOne({
        consumerId: consumer._id,
        month,
      });
      if (existingBill) {
        if (existingBill.status === "unpaid" && !existingBill.paidDate) {
          existingBill.amount = netAmount;
          existingBill.billDate = billDate;
          existingBill.billNo = billNo;
          await existingBill.save();
          billsCreated++;
        } else {
          billsSkippedAlreadySet++;
        }
        continue;
      }

      await MonthlyBill.create({
        consumerId: consumer._id,
        month,
        billNo,
        amount: netAmount,
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
    });
  } catch (error) {
    console.error("importBills error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  importAreasFile,
  importMasterCustomers,
  importExpiry,
  importBills,
};
