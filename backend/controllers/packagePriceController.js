const PackagePrice = require("../models/PackagePrice");
const Consumer = require("../models/Consumer");
const MonthlyBill = require("../models/MonthlyBill");
const Area = require("../models/Area");

// =====================================================
// HELPERS
// =====================================================

const normalizeText = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const makePackageKey = (packageName, packageType) => {
  return `${normalizeText(packageName)}__${normalizeText(packageType || "Package")}`;
};

const getCurrentMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

// Get final price:
// 1. Area override
// 2. Default price
const getEffectivePrice = (config, areaId) => {
  if (!config) return null;

  const override = (config.areaOverrides || []).find(
    (item) => String(item.areaId) === String(areaId),
  );

  if (override && Number.isFinite(Number(override.price))) {
    return Number(override.price);
  }

  if (Number.isFinite(Number(config.defaultPrice))) {
    return Number(config.defaultPrice);
  }

  return null;
};

// Clean area overrides and remove duplicates
const normalizeAreaOverrides = (areaOverrides = []) => {
  const map = new Map();

  for (const item of areaOverrides) {
    if (!item?.areaId) continue;

    const areaId = String(item.areaId);
    const price = Number(item.price);

    if (!Number.isFinite(price) || price < 0) {
      continue;
    }

    map.set(areaId, {
      areaId,
      price,
    });
  }

  return Array.from(map.values());
};

// =====================================================
// GET ALL CONFIGURED PACKAGE PRICES
// =====================================================

const getPackagePrices = async (req, res) => {
  try {
    const packages = await PackagePrice.find({
      active: true,
    })
      .populate("areaOverrides.areaId", "name")
      .sort({
        packageName: 1,
        packageType: 1,
      })
      .lean();

    res.json(packages);
  } catch (error) {
    console.error("getPackagePrices error:", error);

    res.status(500).json({
      message: "Failed to load package pricing",
      error: error.message,
    });
  }
};

// =====================================================
// GET PACKAGE CATALOG FROM EXISTING CONSUMERS
// =====================================================

const getPackageCatalog = async (req, res) => {
  try {
    const catalog = await Consumer.aggregate([
      {
        $match: {
          packageName: {
            $exists: true,
            $nin: ["", null],
          },
        },
      },
      {
        $group: {
          _id: {
            packageName: "$packageName",
            packageType: "$packageType",
          },
          consumerCount: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          "_id.packageName": 1,
          "_id.packageType": 1,
        },
      },
    ]);

    const pricing = await PackagePrice.find({
      active: true,
    })
      .populate("areaOverrides.areaId", "name")
      .lean();

    const pricingMap = new Map();

    for (const item of pricing) {
      const key = makePackageKey(item.packageName, item.packageType);

      pricingMap.set(key, item);
    }

    const result = catalog.map((item) => {
      const packageName = item._id.packageName;
      const packageType = item._id.packageType || "Package";

      const key = makePackageKey(packageName, packageType);

      const config = pricingMap.get(key);

      return {
        _id: config?._id || null,

        packageName,
        packageType,

        consumerCount: item.consumerCount,

        configured: !!config,

        defaultPrice: config ? config.defaultPrice : null,

        areaOverrides: config ? config.areaOverrides || [] : [],

        active: config ? config.active : false,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("getPackageCatalog error:", error);

    res.status(500).json({
      message: "Failed to load package catalog",
      error: error.message,
    });
  }
};

// =====================================================
// CREATE PACKAGE PRICE
// =====================================================

const createPackagePrice = async (req, res) => {
  try {
    const { packageName, packageType, defaultPrice, areaOverrides } = req.body;

    if (!packageName || !String(packageName).trim()) {
      return res.status(400).json({
        message: "Package name is required",
      });
    }

    const price = Number(defaultPrice);

    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        message: "Valid default price is required",
      });
    }

    const finalPackageType =
      String(packageType || "Package").trim() || "Package";

    // Check duplicate
    const existing = await PackagePrice.findOne({
      packageName: String(packageName).trim(),
      packageType: finalPackageType,
    });

    if (existing) {
      return res.status(409).json({
        message: "Pricing already exists for this package and package type",
      });
    }

    const cleanOverrides = normalizeAreaOverrides(areaOverrides);

    const created = await PackagePrice.create({
      packageName: String(packageName).trim(),
      packageType: finalPackageType,
      defaultPrice: price,
      areaOverrides: cleanOverrides,
      active: true,
    });

    const result = await PackagePrice.findById(created._id)
      .populate("areaOverrides.areaId", "name")
      .lean();

    res.status(201).json(result);
  } catch (error) {
    console.error("createPackagePrice error:", error);

    // Mongo duplicate key
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Pricing already exists for this package and package type",
      });
    }

    res.status(500).json({
      message: "Failed to create package pricing",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE PACKAGE PRICE
// =====================================================

const updatePackagePrice = async (req, res) => {
  try {
    const { id } = req.params;

    const { packageName, packageType, defaultPrice, areaOverrides } = req.body;

    const config = await PackagePrice.findById(id);

    if (!config) {
      return res.status(404).json({
        message: "Package pricing not found",
      });
    }

    if (!packageName || !String(packageName).trim()) {
      return res.status(400).json({
        message: "Package name is required",
      });
    }

    const price = Number(defaultPrice);

    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        message: "Valid default price is required",
      });
    }

    const finalPackageType =
      String(packageType || "Package").trim() || "Package";

    // Check duplicate against another record
    const duplicate = await PackagePrice.findOne({
      _id: { $ne: id },
      packageName: String(packageName).trim(),
      packageType: finalPackageType,
      active: true,
    });

    if (duplicate) {
      return res.status(409).json({
        message:
          "Another pricing configuration already exists for this package",
      });
    }

    config.packageName = String(packageName).trim();

    config.packageType = finalPackageType;

    config.defaultPrice = price;

    config.areaOverrides = normalizeAreaOverrides(areaOverrides);

    await config.save();

    const result = await PackagePrice.findById(id)
      .populate("areaOverrides.areaId", "name")
      .lean();

    res.json(result);
  } catch (error) {
    console.error("updatePackagePrice error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Pricing already exists for this package and package type",
      });
    }

    res.status(500).json({
      message: "Failed to update package pricing",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE / DEACTIVATE PACKAGE PRICE
// =====================================================

const deletePackagePrice = async (req, res) => {
  try {
    const { id } = req.params;

    const config = await PackagePrice.findById(id);

    if (!config) {
      return res.status(404).json({
        message: "Package pricing not found",
      });
    }

    // Soft delete
    config.active = false;

    await config.save();

    res.json({
      message: "Package pricing deactivated successfully",
    });
  } catch (error) {
    console.error("deletePackagePrice error:", error);

    res.status(500).json({
      message: "Failed to deactivate package pricing",
      error: error.message,
    });
  }
};

// =====================================================
// APPLY PACKAGE PRICE TO EXISTING CONSUMERS
// =====================================================

const applyPackagePrice = async (req, res) => {
  try {
    const { id } = req.params;

    const config = await PackagePrice.findById(id).lean();

    if (!config) {
      return res.status(404).json({
        message: "Package pricing configuration not found",
      });
    }

    if (!config.active) {
      return res.status(400).json({
        message: "This package pricing is inactive",
      });
    }

    // Find all consumers belonging to this package
    const consumers = await Consumer.find({
      packageName: config.packageName,
      packageType: config.packageType,
    })
      .select("_id areaId monthlyAmount")
      .lean();

    if (!consumers.length) {
      return res.json({
        message: "No existing consumers found for this package",

        matchedConsumers: 0,
        updatedConsumers: 0,
        updatedBills: 0,
        skippedConsumers: 0,
      });
    }

    const consumerBulkOps = [];

    const priceMap = new Map();

    let updatedConsumers = 0;
    let skippedConsumers = 0;

    for (const consumer of consumers) {
      const effectivePrice = getEffectivePrice(config, consumer.areaId);

      if (effectivePrice === null) {
        skippedConsumers++;
        continue;
      }

      priceMap.set(String(consumer._id), effectivePrice);

      consumerBulkOps.push({
        updateOne: {
          filter: {
            _id: consumer._id,
          },
          update: {
            $set: {
              monthlyAmount: effectivePrice,
            },
          },
        },
      });

      updatedConsumers++;
    }

    // Update consumers
    if (consumerBulkOps.length > 0) {
      await Consumer.bulkWrite(consumerBulkOps);
    }

    // =================================================
    // CURRENT MONTH BILL UPDATE
    // =================================================

    const month = getCurrentMonth();

    const consumerIds = Array.from(priceMap.keys());

    let updatedBills = 0;

    if (consumerIds.length > 0) {
      const bills = await MonthlyBill.find({
        consumerId: {
          $in: consumerIds,
        },
        month,
      })
        .select("_id consumerId amount status paidDate")
        .lean();

      const billBulkOps = [];

      for (const bill of bills) {
        // NEVER MODIFY PAID BILL
        if (bill.paidDate || bill.status === "paid") {
          continue;
        }

        const effectivePrice = priceMap.get(String(bill.consumerId));

        if (effectivePrice === undefined) {
          continue;
        }

        billBulkOps.push({
          updateOne: {
            filter: {
              _id: bill._id,
            },
            update: {
              $set: {
                amount: effectivePrice,
              },
            },
          },
        });

        updatedBills++;
      }

      if (billBulkOps.length > 0) {
        await MonthlyBill.bulkWrite(billBulkOps);
      }
    }

    res.json({
      message: "Package pricing applied successfully",

      packageName: config.packageName,
      packageType: config.packageType,

      matchedConsumers: consumers.length,

      updatedConsumers,

      updatedBills,

      skippedConsumers,
    });
  } catch (error) {
    console.error("applyPackagePrice error:", error);

    res.status(500).json({
      message: "Failed to apply package pricing",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getPackagePrices,
  getPackageCatalog,
  createPackagePrice,
  updatePackagePrice,
  deletePackagePrice,
  applyPackagePrice,
};
