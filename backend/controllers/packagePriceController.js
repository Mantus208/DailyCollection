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
const normalizePackageType = (value) => {
  const type = String(value || "")
    .trim()
    .toLowerCase();

  if (type.includes("channel")) {
    return "Channel";
  }

  return "Package";
};

const getConsumerPaytvItems = (consumer) => {
  const paytv = consumer?.paytv || {};

  let rawItems = [];

  // Prefer complete live package list
  if (Array.isArray(paytv.packages) && paytv.packages.length > 0) {
    rawItems = paytv.packages;
  } else {
    // Fallback for older cached consumers
    rawItems = [
      ...(paytv.basicPackage ? [paytv.basicPackage] : []),

      ...(Array.isArray(paytv.addons) ? paytv.addons : []),
    ];
  }

  const map = new Map();

  for (const item of rawItems) {
    const name = String(item?.name || "").trim();

    if (!name) continue;

    const packageType = normalizePackageType(item?.type);

    const key = makePackageKey(name, packageType);

    if (!map.has(key)) {
      map.set(key, {
        packageName: name,
        packageType,
      });
    }
  }

  return Array.from(map.values());
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
    // =====================================================
    // LIVE PAYTV PACKAGE CATALOG
    // Base Package + Add-on Package + Add-on Channel
    // =====================================================

    const consumers = await Consumer.find({})
      .select(
        "_id areaId packageName packageType " +
          "paytv.basicPackage paytv.addons paytv.packages",
      )
      .lean();

    const catalogMap = new Map();

    const addCatalogItem = (packageName, packageType) => {
      const name = String(packageName || "").trim();

      if (!name) return;

      const type = String(packageType || "Package").trim() || "Package";

      const key = makePackageKey(name, type);

      const existing = catalogMap.get(key);

      if (existing) {
        existing.consumerCount += 1;
        return;
      }

      catalogMap.set(key, {
        packageName: name,
        packageType: type,
        consumerCount: 1,
      });
    };

    for (const consumer of consumers) {
      const paytv = consumer.paytv || {};

      // ===================================================
      // BASE PACKAGE
      // ===================================================

      if (paytv.basicPackage?.name) {
        addCatalogItem(paytv.basicPackage.name, "Package");
      }

      // ===================================================
      // ALL PACKAGES
      // Use only if available and avoid duplicate
      // ===================================================

      if (Array.isArray(paytv.packages)) {
        for (const item of paytv.packages) {
          if (!item?.name) continue;

          const rawType = String(item.type || "")
            .trim()
            .toLowerCase();

          let packageType = "Package";

          if (rawType === "channel" || rawType.includes("channel")) {
            packageType = "Channel";
          }

          addCatalogItem(item.name, packageType);
        }
      }

      // ===================================================
      // ADDONS
      // Package / Channel dono support
      // ===================================================

      if (Array.isArray(paytv.addons)) {
        for (const item of paytv.addons) {
          if (!item?.name) continue;

          const rawType = String(item.type || "")
            .trim()
            .toLowerCase();

          const packageType =
            rawType === "channel" || rawType.includes("channel")
              ? "Channel"
              : "Package";

          addCatalogItem(item.name, packageType);
        }
      }

      // ===================================================
      // LEGACY FALLBACK
      // Purane consumers ke liye
      // ===================================================

      if (
        !paytv.basicPackage?.name &&
        !paytv.addons?.length &&
        !paytv.packages?.length &&
        consumer.packageName
      ) {
        addCatalogItem(consumer.packageName, consumer.packageType || "Package");
      }
    }

    const catalog = Array.from(catalogMap.values()).sort((a, b) => {
      const nameCompare = a.packageName.localeCompare(b.packageName);

      if (nameCompare !== 0) {
        return nameCompare;
      }

      return a.packageType.localeCompare(b.packageType);
    });

    // =====================================================
    // EXISTING PRICING CONFIG
    // =====================================================

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

    // =====================================================
    // FINAL RESULT
    // =====================================================

    const result = catalog.map((item) => {
      const key = makePackageKey(item.packageName, item.packageType);

      const config = pricingMap.get(key);

      return {
        _id: config?._id || null,

        packageName: item.packageName,

        packageType: item.packageType,

        consumerCount: item.consumerCount,

        configured: Boolean(config),

        defaultPrice: config ? config.defaultPrice : null,

        areaOverrides: config ? config.areaOverrides || [] : [],

        active: config ? config.active : false,
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("getPackageCatalog error:", error);

    return res.status(500).json({
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
const calculateConsumerMonthlyAmount = (consumer, pricingMap) => {
  const paytv = consumer?.paytv || {};

  // Prefer the authoritative billable package list.
  // Fallback to basic + addons if packages is missing.
  let items = [];

  if (Array.isArray(paytv.packages) && paytv.packages.length > 0) {
    items = paytv.packages;
  } else {
    items = [
      ...(paytv.basicPackage ? [paytv.basicPackage] : []),
      ...(Array.isArray(paytv.addons) ? paytv.addons : []),
    ];
  }

  if (!items.length) {
    return {
      success: false,
      amount: null,
      missing: [],
    };
  }

  let total = 0;
  const missing = [];

  for (const item of items) {
    const packageName = String(item?.name || "").trim();

    if (!packageName) {
      continue;
    }

    // IMPORTANT:
    // Basic/Addon is packType, not packageType.
    // For pricing:
    // - Package = package
    // - Channel = channel
    let packageType;

    const rawType = String(item?.type || "")
      .trim()
      .toLowerCase();

    if (rawType === "addon" || rawType === "basic") {
      packageType = "Package";
    } else {
      packageType = normalizePackageType(item?.type);
    }

    const key = makePackageKey(packageName, packageType);

    const config = pricingMap.get(key);

    console.log("💰 PACKAGE PRICE DEBUG:", {
      consumerId: consumer?._id,
      packageName,
      originalType: item?.type,
      packType: item?.packType,
      resolvedPackageType: packageType,
      key,
      configuredPrice: config
        ? getEffectivePrice(config, consumer.areaId)
        : null,
    });

    if (!config) {
      missing.push({
        packageName,
        packageType,
      });
      continue;
    }

    const price = getEffectivePrice(config, consumer.areaId);

    if (
      price === null ||
      price === undefined ||
      !Number.isFinite(Number(price))
    ) {
      missing.push({
        packageName,
        packageType,
      });
      continue;
    }

    total += Number(price);
  }

  const finalAmount = Math.round(total * 100) / 100;

  console.log("💰 FINAL MONTHLY AMOUNT:", {
    consumerId: consumer?._id,
    items: items.map((item) => ({
      name: item?.name,
      type: item?.type,
      packType: item?.packType,
    })),
    total: finalAmount,
    missing,
  });

  return {
    success: missing.length === 0,
    amount: finalAmount,
    missing,
  };
};
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

    // =====================================================
    // ALL CONSUMERS WITH PAYTV DATA
    // =====================================================

    const consumers = await Consumer.find({
      "paytv.customerId": {
        $ne: null,
      },
    })
      .select("_id areaId monthlyAmount paytv")
      .lean();

    if (!consumers.length) {
      return res.json({
        message: "No PayTV consumers found",
        matchedConsumers: 0,
        updatedConsumers: 0,
        updatedBills: 0,
        skippedConsumers: 0,
      });
    }

    // =====================================================
    // LOAD ALL ACTIVE PRICING CONFIGURATIONS
    // =====================================================

    const pricingConfigs = await PackagePrice.find({
      active: true,
    }).lean();

    const pricingMap = new Map();

    for (const item of pricingConfigs) {
      const key = makePackageKey(item.packageName, item.packageType);

      pricingMap.set(key, item);
    }

    // =====================================================
    // TARGET PACKAGE
    // =====================================================

    const targetKey = makePackageKey(config.packageName, config.packageType);

    // =====================================================
    // CALCULATE EACH CUSTOMER
    // =====================================================

    const consumerBulkOps = [];
    const priceMap = new Map();

    let matchedConsumers = 0;
    let updatedConsumers = 0;
    let skippedConsumers = 0;
    let incompletePricing = 0;

    const missingPricingSet = new Set();

    for (const consumer of consumers) {
      const paytvItems = getConsumerPaytvItems(consumer);

      if (!paytvItems.length) {
        continue;
      }

      // ---------------------------------------------------
      // Is target package actually present?
      // ---------------------------------------------------

      const hasTarget = paytvItems.some((item) => {
        const key = makePackageKey(item.packageName, item.packageType);

        return key === targetKey;
      });

      if (!hasTarget) {
        continue;
      }

      matchedConsumers++;

      // ---------------------------------------------------
      // BASE PACKAGE MUST HAVE PRICING
      // ---------------------------------------------------

      // ---------------------------------------------------
      // CALCULATE COMPLETE PAYTV MONTHLY AMOUNT
      // Base + Addon Packages + Channels
      // ---------------------------------------------------

      const calculation = calculateConsumerMonthlyAmount(consumer, pricingMap);
      console.log("🔍 BILLING CALCULATION DEBUG:", {
        consumerId: consumer._id,
        paytvPackages: consumer?.paytv?.packages,
        basicPackage: consumer?.paytv?.basicPackage,
        addons: consumer?.paytv?.addons,
        calculation,
      });

      if (!calculation.success) {
        skippedConsumers++;
        incompletePricing++;

        for (const item of calculation.missing) {
          missingPricingSet.add(`${item.packageName} [${item.packageType}]`);
        }

        console.log("⚠️ Pricing missing:", {
          consumerId: consumer._id,
          missing: calculation.missing,
        });

        continue;
      }

      const totalAmount = calculation.amount;

      priceMap.set(String(consumer._id), totalAmount);

      consumerBulkOps.push({
        updateOne: {
          filter: {
            _id: consumer._id,
          },

          update: {
            $set: {
              monthlyAmount: totalAmount,
            },
          },
        },
      });

      updatedConsumers++;
    }

    // =====================================================
    // UPDATE CONSUMERS
    // =====================================================

    if (consumerBulkOps.length > 0) {
      await Consumer.bulkWrite(consumerBulkOps);
    }

    // =====================================================
    // UPDATE CURRENT MONTH UNPAID/DUE BILLS
    // =====================================================

    const month = getCurrentMonth();

    const consumerIds = Array.from(priceMap.keys());

    let updatedBills = 0;

    if (consumerIds.length > 0) {
      const bills = await MonthlyBill.find({
        consumerId: {
          $in: consumerIds,
        },
        month,
        manualAmountOverride: {
          $ne: true,
        },
      })
        .select("_id consumerId amount status paidDate")
        .lean();

      const billBulkOps = [];

      for (const bill of bills) {
        // Paid bill ko touch nahi karna
        if (bill.paidDate || bill.status === "paid") {
          continue;
        }

        const newAmount = priceMap.get(String(bill.consumerId));

        if (newAmount === undefined) {
          continue;
        }

        billBulkOps.push({
          updateOne: {
            filter: {
              _id: bill._id,
            },

            update: {
              $set: {
                amount: newAmount,
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

    return res.json({
      message: "Package pricing applied successfully",

      packageName: config.packageName,

      packageType: config.packageType,

      matchedConsumers,

      updatedConsumers,

      updatedBills,

      skippedConsumers,

      incompletePricing,
    });
  } catch (error) {
    console.error("applyPackagePrice error:", error);

    return res.status(500).json({
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
