const express = require("express");
const { getUsers, updateUserAreas } = require("../controllers/userController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, restrictTo("admin"), getUsers);
router.put("/:id/areas", protect, restrictTo("admin"), updateUserAreas);

module.exports = router;
