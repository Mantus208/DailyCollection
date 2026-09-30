const Area = require("../models/Area");
const User = require("../models/User");
const { logActivity } = require("../utils/logActivity");
const { fetchPaytvFranchisees } = require("../utils/paytvClient");

// ---------------------------------------------------------
// PayTV Franchise Cache
// 10 minutes tak same list reuse hogi.
// Isse Area page kholte hi baar-baar PayTV login nahi hoga.
// ---------------------------------------------------------

let paytvFranchiseCache = {
  data: [],
  expiresAt: 0,
};

const getCachedPaytvFranchisees = async () => {
  const now = Date.now();

  if (
    paytvFranchiseCache.data.length > 0 &&
    paytvFranchiseCache.expiresAt > now
  ) {
    return paytvFranchiseCache.data;
  }

  const data = await fetchPaytvFranchisees();

  paytvFranchiseCache = {
    data,
    expiresAt: now + 10 * 60 * 1000,
  };

  return data;
};

// =========================================================
// GET AREAS
// =========================================================

const getAreas = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      const areas = await Area.find({
        $or: [{ active: true }, { active: { $exists: false } }],
      }).sort({ name: 1 });

      return res.json(areas);
    }

    const user = await User.findById(req.user._id).populate({
      path: "assignedAreas",
      match: {
        $or: [{ active: true }, { active: { $exists: false } }],
      },
      options: {
        sort: { name: 1 },
      },
    });

    return res.json(user.assignedAreas || []);
  } catch (error) {
    console.error("getAreas error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =========================================================
// GET AREA BY ID
// =========================================================

const getAreaById = async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);

    if (!area) {
      return res.status(404).json({
        message: "ଏରିଆ ମିଳିଲାନି ।",
      });
    }

    if (req.user.role !== "admin") {
      const hasAccess = (req.user.assignedAreas || []).some(
        (id) => String(id) === String(area._id),
      );

      if (!hasAccess) {
        return res.status(403).json({
          message: "ଏହି ଏରିଆକୁ ପ୍ରବେଶ କରିବା ପାଇଁ ଆପଣଙ୍କ ପାଖରେ ଅନୁମତି ନାହିଁ ।",
        });
      }
    }

    return res.json(area);
  } catch (error) {
    console.error("getAreaById error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =========================================================
// GET PAYTV FRANCHISEES
// =========================================================

const getPaytvFranchisees = async (req, res) => {
  try {
    const franchisees = await getCachedPaytvFranchisees();

    return res.json(
      franchisees.map((item) => ({
        id: Number(item.id),
        name: item.name || "",
        code: item.code || "",
        parent: item.parent || "",
        franchiseeType: item.franchiseeType || "",
      })),
    );
  } catch (error) {
    console.error("getPaytvFranchisees error:", error);

    return res.status(502).json({
      message: "PayTV ଫ୍ରାଞ୍ଚାଇଜ୍ ଲିଷ୍ଟ ଲୋଡ୍ ହେଲାନି ।",
      error: error.message,
    });
  }
};

// =========================================================
// CREATE AREA
// =========================================================

const createArea = async (req, res) => {
  try {
    const { name, description, paytvCompanyId, paytvFranchiseeId } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "ଏରିଆ ନାମ ଜରୁରୀ ଅଟେ ।",
      });
    }

    const franchiseId = Number(paytvFranchiseeId);

    if (!Number.isFinite(franchiseId) || franchiseId <= 0) {
      return res.status(400).json({
        message: "ayTV ଫ୍ରାଞ୍ଚାଇଜ୍ ସିଲେକ୍ଟ କରିବା ଜରୁରୀ ଅଟେ ।",
      });
    }

    const existing = await Area.findOne({
      name: name.trim(),
    });

    if (existing) {
      return res.status(400).json({
        message: "ଏହି ଏରିଆ ପୂର୍ବରୁ ତିଆରି ହୋଇସାରିଛି ।",
      });
    }

    const companyId =
      Number(paytvCompanyId) || Number(process.env.PAYTV_COMPANY_ID || 1);

    const area = await Area.create({
      name: name.trim(),
      description: description?.trim() || "",

      paytvCompanyId: companyId,
      paytvFranchiseeId: franchiseId,

      paytvAreaId: null,
    });

    await logActivity(
      req.user,
      "area_add",
      `Naya area: ${area.name} | PayTV Franchise: ${franchiseId}`,
    );

    return res.status(201).json(area);
  } catch (error) {
    console.error("createArea error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =========================================================
// UPDATE PAYTV FRANCHISE MAPPING
// =========================================================

const updatePaytvMapping = async (req, res) => {
  try {
    const { id } = req.params;

    const { paytvCompanyId, paytvFranchiseeId } = req.body;

    const franchiseId = Number(paytvFranchiseeId);

    if (!Number.isFinite(franchiseId) || franchiseId <= 0) {
      return res.status(400).json({
        message: "ଏକ ବୈଧ PayTV ଫ୍ରାଞ୍ଚାଇଜ୍ ସିଲେକ୍ଟ କରନ୍ତୁ ।",
      });
    }

    const companyId =
      Number(paytvCompanyId) || Number(process.env.PAYTV_COMPANY_ID || 1);

    const area = await Area.findById(id);

    if (!area) {
      return res.status(404).json({
        message: "ଏରିଆ ମିଳିଲାନି ।",
      });
    }

    area.paytvCompanyId = companyId;
    area.paytvFranchiseeId = franchiseId;

    // PayTV Area abhi set nahi kar rahe.
    // Next step mein franchise ke basis par set karenge.
    area.paytvAreaId = null;

    await area.save();

    await logActivity(
      req.user,
      "area_paytv_mapping",
      `${area.name} ର PayTV ଫ୍ରାଞ୍ଚାଇଜ୍ ${franchiseId} ସେଟ୍ କରାଗଲା ।`,
    );

    return res.json({
      message: "PayTV ଫ୍ରାଞ୍ଚାଇଜ୍ ମ୍ୟାପିଙ୍ଗ୍ ସେଭ୍ ହୋଇଗଲା ।",
      area,
    });
  } catch (error) {
    console.error("updatePaytvMapping error:", error);

    return res.status(500).json({
      message: "PayTV ମ୍ୟାପିଙ୍ଗ୍ ସେଭ୍ ହେଲାନି ।",
      error: error.message,
    });
  }
};

module.exports = {
  getAreas,
  getAreaById,
  getPaytvFranchisees,
  createArea,
  updatePaytvMapping,
};
