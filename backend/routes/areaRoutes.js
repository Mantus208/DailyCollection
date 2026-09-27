const express = require("express");

const {
  getAreas,
  getAreaById,
  getPaytvFranchisees,
  createArea,
  updatePaytvMapping,
} = require("../controllers/areaController");

const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/paytv-franchisees",
  protect,
  restrictTo("admin"),
  getPaytvFranchisees,
);

router.get("/", protect, getAreas);
router.get("/:id", protect, getAreaById);
router.post("/", protect, restrictTo("admin"), createArea);

router.put(
  "/:id/paytv-mapping",
  protect,
  restrictTo("admin"),
  updatePaytvMapping,
);

module.exports = router;
