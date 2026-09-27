const Consumer = require("../models/Consumer");
const Area = require("../models/Area");

const getDaysDiff = (expiryDate) => {
  if (!expiryDate) return null;

  const now = new Date();
  const expiry = new Date(expiryDate);

  if (Number.isNaN(expiry.getTime())) {
    return null;
  }

  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const getExpiryStatus = (days) => {
  if (days === null) return "No Expiry";

  if (days < 0) return "Expired";

  if (days <= 3) return "3 Days";

  if (days <= 7) return "7 Days";

  if (days <= 15) return "15 Days";

  if (days <= 30) return "30 Days";

  return "Active";
};

const getExpiryReport = async (req, res) => {
  try {
    const {
      q = "",
      areaId = "",
      franchiseeId = "",
      status = "",
      groupBy = "area",
    } = req.query;

    const filter = {
      active: { $ne: false },
    };

    if (areaId) {
      filter.areaId = areaId;
    }

    const consumers = await Consumer.find(filter)
      .select("_id consumerId name areaId monthlyAmount paytv")
      .populate("areaId", "name franchiseeId paytvFranchiseeId paytvAreaId")
      .lean();

    const search = String(q || "")
      .trim()
      .toLowerCase();

    const rows = [];

    for (const consumer of consumers) {
      const area = consumer.areaId;

      if (!area) continue;

      if (franchiseeId && String(area.franchiseeId) !== String(franchiseeId)) {
        continue;
      }

      const customerId = String(consumer.consumerId || "").trim();

      const customerName = String(consumer.name || "").trim();

      const stbNo = String(consumer.paytv?.stbNo || "").trim();

      const vcNo = String(consumer.paytv?.vcNo || "").trim();

      const basicPackage = consumer.paytv?.basicPackage || null;

      const packageName = String(basicPackage?.name || "").trim();

      const expiryDate =
        basicPackage?.endDate || consumer.paytv?.package?.expiryDate || null;

      const daysRemaining = getDaysDiff(expiryDate);

      const expiryStatus = getExpiryStatus(daysRemaining);

      const localAmount = Number(consumer.monthlyAmount || 0);

      if (search) {
        const haystack = [
          customerId,
          customerName,
          area.name,
          stbNo,
          vcNo,
          packageName,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(search)) {
          continue;
        }
      }

      if (status) {
        if (status === "expired" && expiryStatus !== "Expired") {
          continue;
        }

        if (status === "3days" && expiryStatus !== "3 Days") {
          continue;
        }

        if (
          status === "7days" &&
          !["3 Days", "7 Days"].includes(expiryStatus)
        ) {
          continue;
        }

        if (
          status === "15days" &&
          !["3 Days", "7 Days", "15 Days"].includes(expiryStatus)
        ) {
          continue;
        }

        if (
          status === "30days" &&
          !["3 Days", "7 Days", "15 Days", "30 Days"].includes(expiryStatus)
        ) {
          continue;
        }
      }

      rows.push({
        _id: consumer._id,
        customerId,
        customerName,
        area: area.name || "-",
        franchiseeId: area.paytvFranchiseeId || area.franchiseeId || null,
        paytvAreaId: area.paytvAreaId || null,
        stbNo: stbNo || "-",
        vcNo: vcNo || "-",
        localAmount,
        packageName: packageName || "-",
        expiryDate,
        daysRemaining,
        status: expiryStatus,
      });
    }

    rows.sort((a, b) => {
      if (a.daysRemaining === null) return 1;
      if (b.daysRemaining === null) return -1;

      return a.daysRemaining - b.daysRemaining;
    });

    const summary = {
      total: rows.length,
      expired: rows.filter((x) => x.status === "Expired").length,
      within3: rows.filter((x) => x.status === "3 Days").length,
      within7: rows.filter((x) => ["3 Days", "7 Days"].includes(x.status))
        .length,
      within15: rows.filter((x) =>
        ["3 Days", "7 Days", "15 Days"].includes(x.status),
      ).length,
      within30: rows.filter((x) =>
        ["3 Days", "7 Days", "15 Days", "30 Days"].includes(x.status),
      ).length,
      active: rows.filter((x) => x.status === "Active").length,
    };

    return res.json({
      groupBy,
      summary,
      rows,
    });
  } catch (error) {
    console.error("getExpiryReport error:", error);

    return res.status(500).json({
      message: "Expiry report load nahi hua",
      error: error.message,
    });
  }
};

module.exports = {
  getExpiryReport,
};
