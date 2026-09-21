const express = require("express");

const { getFollowUps } = require("../controllers/followUpController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getFollowUps);

module.exports = router;
