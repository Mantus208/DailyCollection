const User = require("../models/User");
const Consumer = require("../models/Consumer");
const Area = require("../models/Area");

const cheerio = require("cheerio");
const { loginToPaytv, switchPaytvFranchise } = require("../utils/paytvClient");

const { toIdString } = require("../utils/excelParser");

const getDaysDiff = (expiryDate) => {
  if (!expiryDate) return null;

  const now = new Date();
  const expiry = new Date(expiryDate);

  if (Number.isNaN(expiry.getTime())) {
    return null;
  }

  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};
const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getFieldFlexible = (row, ...names) => {
  const entries = Object.entries(row || {});

  for (const name of names) {
    const target = normalizeKey(name);

    const found = entries.find(([key]) => normalizeKey(key) === target);

    if (
      found &&
      found[1] !== undefined &&
      found[1] !== null &&
      String(found[1]).trim() !== ""
    ) {
      return found[1];
    }
  }

  return "";
};

const pad2 = (value) => String(value).padStart(2, "0");

const makeDateKey = (yyyy, mm, dd) => `${yyyy}-${pad2(mm)}-${pad2(dd)}`;

const getIndiaTodayKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const map = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  return `${map.year}-${map.month}-${map.day}`;
};

const parsePaytvExpiryDate = (value) => {
  if (!value) return null;

  const text = String(value).trim();

  // 29/Sep/2026
  let match = text.match(/^(\d{1,2})[\/-]([A-Za-z]+)[\/-](\d{4})$/);

  if (match) {
    const [, dd, monthText, yyyy] = match;

    const months = {
      jan: 1,
      january: 1,
      feb: 2,
      february: 2,
      mar: 3,
      march: 3,
      apr: 4,
      april: 4,
      may: 5,
      jun: 6,
      june: 6,
      jul: 7,
      july: 7,
      aug: 8,
      august: 8,
      sep: 9,
      sept: 9,
      september: 9,
      oct: 10,
      october: 10,
      nov: 11,
      november: 11,
      dec: 12,
      december: 12,
    };

    const mm = months[monthText.toLowerCase()];

    if (mm) {
      return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(
        2,
        "0",
      )}`;
    }
  }

  // 29/09/2026 or 29-09-2026
  match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);

  if (match) {
    const [, dd, mm, yyyy] = match;

    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(
      2,
      "0",
    )}`;
  }

  return null;
};

const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) {
    return {
      key: "unknown",
      label: "No Date",
      days: null,
    };
  }

  const [yyyy, mm, dd] = expiryDate.split("-").map(Number);

  const expiryUtc = Date.UTC(yyyy, mm - 1, dd);

  const todayKey = getIndiaTodayKey();

  const [ty, tm, td] = todayKey.split("-").map(Number);

  const todayUtc = Date.UTC(ty, tm - 1, td);

  const diffDays = Math.round((expiryUtc - todayUtc) / 86400000);

  if (diffDays < 0) {
    return {
      key: "expired",
      label: `Expired ${Math.abs(diffDays)}d`,
      days: diffDays,
    };
  }

  if (diffDays === 0) {
    return {
      key: "today",
      label: "Today",
      days: 0,
    };
  }

  if (diffDays === 1) {
    return {
      key: "tomorrow",
      label: "Tomorrow",
      days: 1,
    };
  }

  return {
    key: "upcoming",
    label: `${diffDays}d`,
    days: diffDays,
  };
};

const getExpiryReport = async (req, res) => {
  try {
    const todayOnly = String(req.query.todayOnly).toLowerCase() === "true";
    const user = await User.findById(req.user._id)
      .select("role assignedAreas")
      .lean();

    if (!user) {
      return res.status(401).json({
        message: "User session invalid hai",
      });
    }

    // =========================================================
    // 1. USER AREA PERMISSION
    // =========================================================

    let areas;

    if (user.role === "admin") {
      areas = await Area.find({})
        .select("_id name paytvCompanyId paytvFranchiseeId paytvAreaId active")
        .lean();
    } else {
      const assignedAreaIds = Array.isArray(user.assignedAreas)
        ? user.assignedAreas.map((area) => area?._id || area)
        : [];

      if (!assignedAreaIds.length) {
        return res.json({
          success: true,
          total: 0,
          franchiseCount: 0,
          areas: [],
          rows: [],
        });
      }

      areas = await Area.find({
        _id: { $in: assignedAreaIds },
      })
        .select("_id name paytvCompanyId paytvFranchiseeId paytvAreaId active")
        .lean();
    }

    // =========================================================
    // 2. UNIQUE PAYTV FRANCHISEE GROUP
    // =========================================================

    const franchiseMap = new Map();

    for (const area of areas) {
      const companyId = Number(area.paytvCompanyId) || 1;
      const franchiseId = Number(area.paytvFranchiseeId) || null;

      if (!franchiseId) {
        continue;
      }

      const key = `${companyId}:${franchiseId}`;

      if (!franchiseMap.has(key)) {
        franchiseMap.set(key, {
          companyId,
          franchiseId,
          areaIds: [],
        });
      }

      franchiseMap.get(key).areaIds.push(String(area._id));
    }

    // =========================================================
    // 3. CONSUMERS — ONLY ALLOWED AREAS
    // =========================================================

    const allowedAreaIds = areas.map((area) => area._id);

    const consumers = await Consumer.find({
      areaId: { $in: allowedAreaIds },
    })
      .select("consumerId name mobile areaId monthlyAmount packageName paytv")
      .lean();

    const consumerMap = new Map();

    for (const consumer of consumers) {
      consumerMap.set(
        String(consumer.consumerId || "")
          .trim()
          .toUpperCase(),
        consumer,
      );
    }

    // =========================================================
    // 4. FETCH EACH PAYTV FRANCHISE REPORT
    // =========================================================
    const requestedDays = Math.max(0, Number(req.query.days ?? 0));
    const finalRows = [];
    const processedConsumerIds = new Set();
    const failedFranchises = [];

    for (const franchise of franchiseMap.values()) {
      try {
        console.log(
          `📺 UPCOMING EXPIRE: franchise=${franchise.franchiseId}, days=${requestedDays}`,
        );

        // PayTV session ko selected franchise par switch karo
        await switchPaytvFranchise(franchise.franchiseId);

        const client = await loginToPaytv();

        // =====================================================
        // PAYTV /UpcomingExpire DIRECT POST
        // =====================================================

        const form = new URLSearchParams();

        form.append("hdID", "0");
        form.append("CompanyID", String(franchise.companyId));
        form.append("FranchiseeID", String(franchise.franchiseId));

        form.append("hdAreaID", "");

        form.append("Name", "");
        form.append("CustomNo", "");
        form.append("Mobile", "");
        form.append("STBNo", "");
        form.append("VCNo", "");

        form.append("CityID", "");
        form.append("AreaID", "");

        // PAYTV
        form.append("ServiceMasterID", "1");
        form.append("hdServiceMasterID", "");

        // PayTV Days
        form.append("Days", String(requestedDays));

        // Search
        form.append("action", "Index");

        const response = await client.post("/UpcomingExpire", form, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 60000,
        });

        const html =
          typeof response.data === "string"
            ? response.data
            : String(response.data || "");

        if (!html.includes("Upcoming Expire List")) {
          throw new Error(
            `Invalid UpcomingExpire response for franchise ${franchise.franchiseId}`,
          );
        }

        const $ = cheerio.load(html);

        console.log(
          `📺 PayTV UpcomingExpire HTML received: franchise=${franchise.franchiseId}`,
        );

        // =====================================================
        // PARSE PAYTV TABLE
        // =====================================================

        $("table#tbl tbody tr").each((index, tr) => {
          const cells = $(tr)
            .find("td")
            .map(function () {
              return $(this).text().trim();
            })
            .get();

          if (cells.length < 9) {
            return;
          }

          const consumerId = String(cells[1] || "")
            .trim()
            .toUpperCase();

          if (!consumerId) {
            return;
          }

          const consumer = consumerMap.get(consumerId);

          if (!consumer) {
            return;
          }

          const localArea = areas.find(
            (area) => String(area._id) === String(consumer.areaId),
          );

          if (!localArea) {
            return;
          }

          // Safety: local area aur current PayTV franchise same hona chahiye.
          if (
            Number(localArea.paytvFranchiseeId) !==
            Number(franchise.franchiseId)
          ) {
            return;
          }

          const customerName =
            String(cells[2] || "").trim() || consumer.name || "";

          const mobile = String(cells[4] || "").trim() || consumer.mobile || "";

          const stbNo = String(cells[6] || "").trim();

          const vcNo = String(cells[7] || "").trim();

          const expiryDate = parsePaytvExpiryDate(cells[8]);

          const packageName =
            consumer.paytv?.basicPackage?.name || consumer.packageName || "";

          const status = getExpiryStatus(expiryDate);

          finalRows.push({
            _id: `${consumer._id}-${localArea._id}`,

            consumerId,

            customerName,

            mobile,

            areaId: localArea._id,

            area: localArea.name,

            companyId: franchise.companyId,

            franchiseId: franchise.franchiseId,

            stbNo,

            vcNo,

            packageName,

            localAmount: Number(consumer.monthlyAmount || 0),

            expiryDate,

            status: status.label,

            statusKey: status.key,

            days: status.days ?? null,
          });

          processedConsumerIds.add(consumerId);
        });

        console.log(
          `📺 Franchise ${franchise.franchiseId} direct rows: ${
            finalRows.filter(
              (row) =>
                Number(row.franchiseId) === Number(franchise.franchiseId),
            ).length
          }`,
        );
      } catch (error) {
        console.error(
          `❌ Franchise ${franchise.franchiseId} failed:`,
          error.code || error.message,
        );

        failedFranchises.push({
          companyId: franchise.companyId,
          franchiseId: franchise.franchiseId,
          reason: error.code || error.message || "Unknown PayTV error",
        });

        continue;
      }
    }
    // =======================================================
    // RETRY FAILED FRANCHISEES ONCE
    // =======================================================

    if (failedFranchises.length > 0) {
      console.log(
        `🔁 Retrying ${failedFranchises.length} failed PayTV franchise(s)...`,
      );

      const retryFranchises = [...failedFranchises];

      // Old failed list clear
      failedFranchises.length = 0;

      for (const failed of retryFranchises) {
        const franchise = Array.from(franchiseMap.values()).find(
          (item) => Number(item.franchiseId) === Number(failed.franchiseId),
        );

        if (!franchise) {
          continue;
        }

        try {
          console.log(`🔁 RETRY EXPIRY: franchise=${franchise.franchiseId}`);

          // Fresh franchise switch
          await switchPaytvFranchise(franchise.franchiseId);

          const client = await loginToPaytv();

          const form = new URLSearchParams();

          form.append("hdID", "0");
          form.append("CompanyID", String(franchise.companyId));
          form.append("FranchiseeID", String(franchise.franchiseId));

          form.append("hdAreaID", "");
          form.append("Name", "");
          form.append("CustomNo", "");
          form.append("Mobile", "");
          form.append("STBNo", "");
          form.append("VCNo", "");
          form.append("CityID", "");
          form.append("AreaID", "");

          form.append("ServiceMasterID", "1");
          form.append("hdServiceMasterID", "");
          form.append("Days", String(requestedDays));
          form.append("action", "Index");

          const response = await client.post("/UpcomingExpire", form, {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: 30000,
          });

          const html =
            typeof response.data === "string"
              ? response.data
              : String(response.data || "");

          if (!html.includes("Upcoming Expire List")) {
            throw new Error("Invalid UpcomingExpire retry response");
          }

          const $ = cheerio.load(html);

          let retryCount = 0;

          $("table#tbl tbody tr").each((index, tr) => {
            const cells = $(tr)
              .find("td")
              .map(function () {
                return $(this).text().trim();
              })
              .get();

            if (cells.length < 9) {
              return;
            }

            const consumerId = String(cells[1] || "")
              .trim()
              .toUpperCase();

            if (!consumerId) {
              return;
            }

            const consumer = consumerMap.get(consumerId);

            if (!consumer) {
              return;
            }

            const localArea = areas.find(
              (area) => String(area._id) === String(consumer.areaId),
            );

            if (!localArea) {
              return;
            }

            if (
              Number(localArea.paytvFranchiseeId) !==
              Number(franchise.franchiseId)
            ) {
              return;
            }

            const expiryDate = parsePaytvExpiryDate(cells[8]);

            const status = getExpiryStatus(expiryDate);

            finalRows.push({
              _id: `${consumer._id}-${localArea._id}`,

              consumerId,

              customerName:
                String(cells[2] || "").trim() || consumer.name || "",

              mobile: String(cells[4] || "").trim() || consumer.mobile || "",

              areaId: localArea._id,
              area: localArea.name,

              companyId: franchise.companyId,
              franchiseId: franchise.franchiseId,

              stbNo: String(cells[6] || "").trim(),
              vcNo: String(cells[7] || "").trim(),

              packageName:
                consumer.paytv?.basicPackage?.name ||
                consumer.packageName ||
                "",

              localAmount: Number(consumer.monthlyAmount || 0),

              expiryDate,

              status: status.label,
              statusKey: status.key,
              days: status.days ?? null,
            });

            retryCount++;
          });

          console.log(
            `✅ RETRY franchise ${franchise.franchiseId}: ${retryCount} rows`,
          );
        } catch (retryError) {
          console.error(
            `❌ RETRY FAILED franchise ${franchise.franchiseId}:`,
            retryError.code || retryError.message,
          );

          failedFranchises.push({
            companyId: franchise.companyId,
            franchiseId: franchise.franchiseId,
            reason: retryError.code || retryError.message || "Retry failed",
          });
        }
      }
    }
    // =========================================================
    // 6. DUPLICATE REMOVE
    // =========================================================

    const uniqueMap = new Map();

    for (const row of finalRows) {
      const key = `${row.consumerId}|${row.areaId}`;

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, row);
      }
    }

    const rows = Array.from(uniqueMap.values());
    const summary = {
      total: rows.length,
      expired: 0,
      within3: 0,
      within7: 0,
      within15: 0,
      within30: 0,
    };

    for (const row of rows) {
      const days = row.days;

      if (days === null || days === undefined) {
        continue;
      }

      if (days < 0) {
        summary.expired++;
      } else if (days <= 3) {
        summary.within3++;
      } else if (days <= 7) {
        summary.within7++;
      } else if (days <= 15) {
        summary.within15++;
      } else if (days <= 30) {
        summary.within30++;
      }
    }

    // =========================================================
    // 7. SORT
    // =========================================================

    rows.sort((a, b) => {
      const areaCompare = String(a.areaName || "").localeCompare(
        String(b.areaName || ""),
      );

      if (areaCompare !== 0) {
        return areaCompare;
      }

      const dateA = a.expiryDate || "9999-12-31";
      const dateB = b.expiryDate || "9999-12-31";

      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    // =========================================================
    // 8. AREA GROUPS
    // =========================================================

    const grouped = new Map();

    for (const row of rows) {
      if (!grouped.has(row.areaId.toString())) {
        grouped.set(row.areaId.toString(), {
          areaId: row.areaId,
          areaName: row.areaName,
          franchiseIds: new Set(),
          rows: [],
        });
      }

      const group = grouped.get(row.areaId.toString());

      group.franchiseIds.add(Number(row.franchiseId));

      group.rows.push(row);
    }

    const areaGroups = Array.from(grouped.values()).map((group) => ({
      areaId: group.areaId,
      areaName: group.areaName,
      franchiseIds: Array.from(group.franchiseIds),
      count: group.rows.length,
    }));

    return res.json({
      success: true,
      total: rows.length,
      summary,
      franchiseCount: franchiseMap.size,

      failedFranchises,

      franchisees: Array.from(franchiseMap.values()).map((item) => ({
        companyId: item.companyId,
        franchiseId: item.franchiseId,
      })),

      areas: areaGroups,
      rows,
    });
  } catch (error) {
    console.error("getExpiryReport error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Expiry report load nahi hua",
    });
  }
};

module.exports = {
  getExpiryReport,
};
