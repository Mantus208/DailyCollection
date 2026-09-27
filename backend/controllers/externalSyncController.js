const {
  fetchExpiryReport,
  fetchBillRegister,
  fetchCustomerWiseHardwareReport,
  fetchAllSubscribersHtml,
  fetchPaytvFranchisees,
  loginToPaytv,
  getLiveSubscriber,
} = require("../utils/paytvClient");
const {
  parseExcelBuffer,
  getField,
  toIdString,
} = require("../utils/excelParser");
const Consumer = require("../models/Consumer");
const MonthlyBill = require("../models/MonthlyBill");
const Area = require("../models/Area");
const { logActivity } = require("../utils/logActivity");

const normalizeReportKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getReportFieldFlexible = (row, ...names) => {
  const entries = Object.entries(row || {});

  for (const name of names) {
    const target = normalizeReportKey(name);

    const found = entries.find(([key]) => normalizeReportKey(key) === target);

    if (found && found[1] !== undefined && found[1] !== null) {
      return found[1];
    }
  }

  return "";
};

const buildHardwareMap = (rows) => {
  const map = new Map();

  for (const row of rows) {
    const consumerId = toIdString(
      getReportFieldFlexible(row, "Sub.No.", "Sub. No.", "SubNo"),
    )
      .trim()
      .toUpperCase();

    if (!consumerId) continue;

    const item = {
      consumerId,

      name: String(getReportFieldFlexible(row, "Subscriber") || "").trim(),

      stbNo: toIdString(
        getReportFieldFlexible(row, "STB No.", "STB No", "STBNo"),
      ).trim(),

      vcNo: toIdString(
        getReportFieldFlexible(row, "VC No.", "VC No", "VCNo"),
      ).trim(),

      type: String(getReportFieldFlexible(row, "Type") || "").trim(),

      mobile: toIdString(getReportFieldFlexible(row, "Mobile")).trim(),

      closing: String(getReportFieldFlexible(row, "Closing") || "").trim(),

      active: String(getReportFieldFlexible(row, "Active") || "").trim(),

      installationInfo: String(
        getReportFieldFlexible(row, "Instal. Dt. & Address") || "",
      ).trim(),

      raw: row,
    };

    map.set(consumerId, item);
  }

  return map;
};
const resolvePaytvContextForArea = async (selectedArea) => {
  if (!selectedArea) {
    throw new Error("Selected area nahi mila.");
  }

  // ---------------------------------------------------------
  // Already mapped?
  // ---------------------------------------------------------
  if (
    Number(selectedArea.paytvFranchiseeId) > 0 &&
    Number(selectedArea.paytvAreaId) > 0
  ) {
    return {
      companyId: Number(selectedArea.paytvCompanyId) || 1,
      franchiseId: Number(selectedArea.paytvFranchiseeId),
      areaId: Number(selectedArea.paytvAreaId),
      areaName: selectedArea.name || "",
    };
  }

  // ---------------------------------------------------------
  // Local Master se ek existing consumer lo
  // ---------------------------------------------------------
  const sampleConsumers = await Consumer.find({
    areaId: selectedArea._id,
    consumerId: {
      $exists: true,
      $nin: ["", null],
    },
  })
    .select("consumerId")
    .limit(3)
    .lean();

  if (!sampleConsumers.length) {
    throw new Error(
      `Area "${selectedArea.name}" mein koi local Master consumer nahi mila, isliye PayTV mapping discover nahi ho sakti.`,
    );
  }

  // ---------------------------------------------------------
  // PayTV se available Franchisees automatically
  // ---------------------------------------------------------
  const franchisees = await fetchPaytvFranchisees();

  console.log(`📍 Resolving PayTV mapping for "${selectedArea.name}"`);

  // ---------------------------------------------------------
  // Sample consumer + franchisee combination try karo
  // ---------------------------------------------------------
  for (const sample of sampleConsumers) {
    const consumerId = String(sample.consumerId || "")
      .trim()
      .toUpperCase();

    if (!consumerId) {
      continue;
    }

    console.log(`📍 Testing PayTV mapping with consumer ${consumerId}`);

    for (const franchisee of franchisees) {
      try {
        const live = await getLiveSubscriber(consumerId, {
          companyId: 1,
          franchiseId: franchisee.id,
        });

        if (!live?.found) {
          continue;
        }

        const actualCompanyId = Number(live.companyId) || 1;

        const actualFranchiseeId = Number(live.franchiseeId) || franchisee.id;

        const actualAreaId = Number(live.areaId) || null;

        if (!actualAreaId) {
          continue;
        }

        console.log(`✅ PayTV mapping found: ${selectedArea.name}`, {
          consumerId,
          companyId: actualCompanyId,
          franchiseeId: actualFranchiseeId,
          areaId: actualAreaId,
        });

        // -----------------------------------------------------
        // IMPORTANT:
        // Mapping automatically save kar do
        // -----------------------------------------------------
        await Area.updateOne(
          { _id: selectedArea._id },
          {
            $set: {
              paytvCompanyId: actualCompanyId,
              paytvFranchiseeId: actualFranchiseeId,
              paytvAreaId: actualAreaId,
            },
          },
        );

        return {
          companyId: actualCompanyId,
          franchiseId: actualFranchiseeId,
          areaId: actualAreaId,
          areaName: selectedArea.name || "",
        };
      } catch (error) {
        console.log(
          `📺 Franchisee ${franchisee.id} test failed for ${consumerId}: ${error.message}`,
        );
      }
    }
  }

  throw new Error(
    `Area "${selectedArea.name}" ka PayTV Franchisee/Area automatically discover nahi ho saka.`,
  );
};
const syncExpiryFromPaytv = async (req, res) => {
  try {
    const { expDays } = req.query;
    const buffer = await fetchExpiryReport(expDays || 60);

    const rows = parseExcelBuffer(buffer);
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
      if (areaNameRaw && !matchedArea) unmatchedAreas.add(areaNameRaw);

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
        await Consumer.updateOne({ _id: existing._id }, { $set: setFields });

        updated++;
      } else {
        masterMissing++;

        masterMissingConsumers.push({
          consumerId,
          name: result.paytvData.name || "",
          stbNo: result.paytvData.stbNo || "",
          vcNo: result.paytvData.vcNo || "",
        });

        console.log(`⚠️ Master consumer not found: ${consumerId}`);
      }
    }

    await logActivity(
      req.user,
      "external_sync_expiry",
      `PayTV SMS se ${updated} consumer update hue`,
    );

    return res.json({
      message: "PayTV SMS se Expiry sync ho gaya",
      totalRows: rows.length,
      updated,
      skipped,
      unmatchedAreas: Array.from(unmatchedAreas),
      unmatchedConsumers,
    });
  } catch (error) {
    console.error("syncExpiryFromPaytv error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Sync fail ho gaya" });
  }
};

const syncBillsFromPaytv = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const buffer = await fetchBillRegister(
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );

    const rows = parseExcelBuffer(buffer);

    const grouped = {};
    for (const row of rows) {
      const consumerId = toIdString(
        getField(row, "Sub.No.", "Sub. No.", "SubNo"),
      ).toUpperCase();
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

    await logActivity(
      req.user,
      "external_sync_bills",
      `PayTV SMS se ${billsCreated} bill entries sync hui`,
    );

    return res.json({
      message: "PayTV SMS se Bill Register sync ho gaya",
      totalConsumersInFile: Object.keys(grouped).length,
      consumersUpdated,
      billsCreated,
      billsSkippedAlreadySet,
      notFoundConsumers,
    });
  } catch (error) {
    console.error("syncBillsFromPaytv error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Sync fail ho gaya" });
  }
};

// @route  POST /api/external-sync/all-subscribers?withHardware=true
// @desc   PayTV subscribers + bulk hardware sync
//
// withHardware=true:
//   1. CustomerWiseHardwareInfo bulk report se Consumer IDs
//   2. STB / VC
//   3. Har unique Consumer ID ke liye live PayTV details
//   4. Sirf paytv.* update
//   5. Master/local fields untouched

const syncAllSubscribersFromPaytv = async (req, res) => {
  try {
    const withHardware = req.query.withHardware === "true";
    const requestedAreaId = req.query.areaId || null;

    let paytvContext = {
      companyId: Number(process.env.PAYTV_COMPANY_ID || 1),
      franchiseId: Number(
        process.env.PAYTV_FRANCHISE_ID ||
          process.env.PAYTV_FRANCHISEE_ID ||
          10027,
      ),
      areaId: null,
      areaName: "",
    };

    if (requestedAreaId) {
      const selectedArea = await Area.findById(requestedAreaId).lean();

      if (!selectedArea) {
        return res.status(400).json({
          message: "Selected area nahi mila.",
        });
      }

      try {
        paytvContext = await resolvePaytvContextForArea(selectedArea);
      } catch (mappingError) {
        return res.status(400).json({
          message: mappingError.message,
        });
      }
    }

    console.log("📍 PayTV sync context:", paytvContext);
    // =========================================================
    // MODE 1: Normal subscriber sync
    // =========================================================
    if (!withHardware) {
      const client = await loginToPaytv();

      const rows = await fetchAllSubscribersHtml(client);

      console.log(`📺 PayTV subscriber rows: ${rows.length}`);

      let updated = 0;
      let skipped = 0;

      const masterMissingConsumers = [];

      for (const row of rows) {
        const consumerId = String(row.consumerId || "")
          .trim()
          .toUpperCase();

        if (!consumerId) continue;

        const existing = await Consumer.findOne({
          consumerId,
        }).select("_id");

        if (!existing) {
          skipped++;

          masterMissingConsumers.push({
            consumerId,
            name: row.name || "",
          });

          console.log(`⚠️ Master consumer not found: ${consumerId}`);

          continue;
        }

        const setFields = {
          "paytv.encodedId": row.encodedId || "",

          "paytv.name": row.name || "",

          "paytv.mobile": row.mobile === "0" ? "" : row.mobile || "",

          "paytv.status":
            String(row.activeStatus || "").toLowerCase() === "active"
              ? "active"
              : "inactive",

          "paytv.customerType": row.type || "",

          "paytv.areaName": String(row.area || "").trim(),

          "paytv.fetchStatus": "live",

          "paytv.fetchError": "",

          "paytv.lastFetchedAt": new Date(),
        };

        await Consumer.updateOne(
          { _id: existing._id },
          {
            $set: setFields,
          },
        );

        updated++;
      }

      await logActivity(
        req.user,
        "external_sync_all_subscribers",
        `PayTV subscriber sync: ${updated} updated, ${skipped} master missing`,
      );

      return res.json({
        message: "PayTV subscriber sync ho gaya",

        totalFetched: rows.length,

        updated,

        skipped,

        masterMissing: masterMissingConsumers.length,

        masterMissingConsumers,
      });
    }

    // =========================================================
    // MODE 2: BULK HARDWARE + LIVE PAYTV DETAILS
    // =========================================================

    await loginToPaytv();

    // ---------------------------------------------------------
    // 1. Generate ONE bulk hardware report
    // ---------------------------------------------------------
    console.log("📺 Generating CustomerWiseHardwareInfo report...");

    const hardwareBuffer = await fetchCustomerWiseHardwareReport({
      companyId: paytvContext.companyId,

      franchiseId: paytvContext.franchiseId,

      areaId: paytvContext.areaId,
    });

    const hardwareRows = parseExcelBuffer(hardwareBuffer);

    console.log(`📺 CustomerWiseHardwareInfo rows: ${hardwareRows.length}`);

    if (hardwareRows.length > 0) {
      console.log("📺 Hardware report columns:", Object.keys(hardwareRows[0]));
    }

    const hardwareMap = buildHardwareMap(hardwareRows);

    console.log(`📺 Hardware map unique Consumer IDs: ${hardwareMap.size}`);

    // ---------------------------------------------------------
    // 2. NCVS0028 test
    // ---------------------------------------------------------
    const ncvs0028Hw = hardwareMap.get("NCVS0028");

    console.log("📺 NCVS0028 HARDWARE CHECK:", {
      found: Boolean(ncvs0028Hw),
      consumerId: ncvs0028Hw?.consumerId || "",
      stbNo: ncvs0028Hw?.stbNo || "",
      vcNo: ncvs0028Hw?.vcNo || "",
    });

    // ---------------------------------------------------------
    // 3. Unique Consumer IDs
    // ---------------------------------------------------------
    const consumerIds = Array.from(hardwareMap.keys());

    console.log(`📺 Live PayTV details to fetch: ${consumerIds.length}`);

    // ---------------------------------------------------------
    // 4. Counters
    // ---------------------------------------------------------
    let updated = 0;

    let liveFetched = 0;
    let liveFailed = 0;

    let masterMissing = 0;

    let hardwareFetched = 0;
    let hardwareMissing = 0;

    const masterMissingConsumers = [];
    const failedConsumers = [];

    // ---------------------------------------------------------
    // 5. Limited concurrency
    // ---------------------------------------------------------
    const CONCURRENCY = 2;

    for (let i = 0; i < consumerIds.length; i += CONCURRENCY) {
      const batch = consumerIds.slice(i, i + CONCURRENCY);

      console.log(
        `📺 Live batch ${i + 1}-${Math.min(
          i + batch.length,
          consumerIds.length,
        )} / ${consumerIds.length}`,
      );

      const results = await Promise.all(
        batch.map(async (consumerId) => {
          try {
            const hw = hardwareMap.get(consumerId);

            // ------------------------------------------------
            // Check local Master first
            // ------------------------------------------------
            const existing = await Consumer.findOne({
              consumerId,
            }).select("_id name");

            // PayTV consumer exists but
            // local Master doesn't exist.
            if (!existing) {
              return {
                success: false,
                masterMissing: true,
                consumerId,
                error: "Local Master consumer not found",
                hasHardware: Boolean(hw),
                hw,
              };
            }

            // ------------------------------------------------
            // Get live PayTV details
            // ------------------------------------------------
            const live = await getLiveSubscriber(consumerId, {
              companyId: paytvContext.companyId,
              franchiseId: paytvContext.franchiseId,
              areaId: paytvContext.areaId,
            });

            // ------------------------------------------------
            // PayTV data
            // ------------------------------------------------
            const paytvData = {
              customerId: live.customerId || null,

              encodedId: live.encodedId || "",

              companyId: live.companyId || null,

              franchiseeId: live.franchiseeId || null,

              parentFranchiseeId: live.parentFranchiseeId || null,

              areaId: live.areaId || null,

              name: live.name || "",

              mobile: live.mobile === "0" ? "" : live.mobile || "",

              status: live.active ? "active" : "inactive",

              customerType: hw?.type || "",

              address1: live.address1 || "",

              address2: live.address2 || "",

              address3: live.address3 || "",

              postCode: live.postCode || "",

              lastFetchedAt: new Date(),

              fetchStatus: "live",

              fetchError: "",
            };

            // ------------------------------------------------
            // Hardware
            // ------------------------------------------------
            if (hw?.stbNo) {
              paytvData.stbNo = hw.stbNo;
            }

            if (hw?.vcNo) {
              paytvData.vcNo = hw.vcNo;
            }

            return {
              success: true,
              masterMissing: false,
              consumerId,
              paytvData,
              hasHardware: Boolean(hw),
              hasStbVc: Boolean(hw?.stbNo || hw?.vcNo),
            };
          } catch (error) {
            console.error(`📺 Live PayTV failed ${consumerId}:`, error.message);

            return {
              success: false,
              masterMissing: false,
              consumerId,
              error: error.message || "PayTV detail fetch failed",
              hasHardware: Boolean(hardwareMap.get(consumerId)),
              hw: hardwareMap.get(consumerId),
            };
          }
        }),
      );

      // ---------------------------------------------------------
      // Save batch
      // ---------------------------------------------------------
      for (const result of results) {
        const consumerId = result.consumerId;

        const hw = result.hw || hardwareMap.get(consumerId);

        // -------------------------------------------------------
        // Master missing
        // -------------------------------------------------------
        if (result.masterMissing) {
          masterMissing++;

          masterMissingConsumers.push({
            consumerId,
            name: "",
            stbNo: hw?.stbNo || "",
            vcNo: hw?.vcNo || "",
          });

          console.log(`⚠️ Master consumer not found: ${consumerId}`);

          continue;
        }

        // -------------------------------------------------------
        // Hardware count
        // -------------------------------------------------------
        if (result.hasHardware) {
          if (hw?.stbNo || hw?.vcNo) {
            hardwareFetched++;
          } else {
            hardwareMissing++;
          }
        }

        // -------------------------------------------------------
        // PayTV fetch failed
        // -------------------------------------------------------
        if (!result.success) {
          liveFailed++;

          failedConsumers.push({
            consumerId,
            error: result.error,
          });

          // Existing Master consumer hai,
          // isliye error state save kar sakte hain.
          await Consumer.updateOne(
            { consumerId },
            {
              $set: {
                "paytv.fetchStatus": "error",

                "paytv.fetchError": result.error,

                "paytv.lastFetchedAt": new Date(),

                ...(hw?.stbNo
                  ? {
                      "paytv.stbNo": hw.stbNo,
                    }
                  : {}),

                ...(hw?.vcNo
                  ? {
                      "paytv.vcNo": hw.vcNo,
                    }
                  : {}),
              },
            },
          );

          continue;
        }

        // -------------------------------------------------------
        // SUCCESS
        // -------------------------------------------------------
        await Consumer.updateOne(
          { consumerId },
          {
            $set: {
              // IMPORTANT:
              // Sirf paytv.* update hoga.
              // Master name/area/mobile/status untouched.

              "paytv.customerId": result.paytvData.customerId,

              "paytv.encodedId": result.paytvData.encodedId,

              "paytv.companyId": result.paytvData.companyId,

              "paytv.franchiseeId": result.paytvData.franchiseeId,

              "paytv.parentFranchiseeId": result.paytvData.parentFranchiseeId,

              "paytv.areaId": result.paytvData.areaId,

              "paytv.name": result.paytvData.name,

              "paytv.mobile": result.paytvData.mobile,

              "paytv.status": result.paytvData.status,

              "paytv.customerType": result.paytvData.customerType,

              "paytv.address1": result.paytvData.address1,

              "paytv.address2": result.paytvData.address2,

              "paytv.address3": result.paytvData.address3,

              "paytv.postCode": result.paytvData.postCode,

              "paytv.stbNo": result.paytvData.stbNo || "",

              "paytv.vcNo": result.paytvData.vcNo || "",

              "paytv.fetchStatus": "live",

              "paytv.fetchError": "",

              "paytv.lastFetchedAt": result.paytvData.lastFetchedAt,
            },
          },
        );

        updated++;
        liveFetched++;
      }
    }
    console.log("✅ ALL LIVE BATCHES COMPLETED");

    console.log("📊 FINAL COUNTERS:", {
      updated,
      liveFetched,
      liveFailed,
      hardwareFetched,
      hardwareMissing,
      masterMissing,
    });

    console.log("📤 Sending final sync response...");
    // ---------------------------------------------------------
    // 6. Activity log
    // ---------------------------------------------------------
    await logActivity(
      req.user,
      "external_sync_all_subscribers",
      `PayTV bulk hardware + live sync: ${consumerIds.length} unique subscribers, ${liveFetched} live, ${liveFailed} failed, ${masterMissing} master missing, ${hardwareFetched} hardware matched`,
    );

    // ---------------------------------------------------------
    // 7. Response
    // ---------------------------------------------------------
    return res.json({
      message: "PayTV bulk hardware + live subscriber sync complete",

      hardwareReportRows: hardwareRows.length,

      uniqueConsumers: consumerIds.length,

      updated,

      liveFetched,
      liveFailed,

      hardwareFetched,
      hardwareMissing,

      masterMissing,
      masterMissingConsumers,

      failedConsumers,
    });
  } catch (error) {
    console.error("syncAllSubscribersFromPaytv error:", error);

    return res.status(500).json({
      message: error.message || "PayTV subscriber sync fail ho gaya",
    });
  }
};

module.exports = {
  syncExpiryFromPaytv,
  syncBillsFromPaytv,
  syncAllSubscribersFromPaytv,
};
