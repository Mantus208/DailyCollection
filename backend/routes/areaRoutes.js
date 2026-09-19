const express = require("express");
const {
  getAreas,
  getAreaById,
  createArea,
} = require("../controllers/areaController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getAreas);
router.get("/:id", protect, getAreaById);
router.post("/", protect, restrictTo("admin"), createArea);

module.exports = router;
