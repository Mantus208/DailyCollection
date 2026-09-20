const express = require("express");
const {
  createComplaint,
  listComplaints,
  resolveComplaint,
} = require("../controllers/complaintController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createComplaint);
router.get("/", protect, listComplaints);
router.put("/:id/resolve", protect, resolveComplaint);

module.exports = router;
