const express = require("express");
const { changePassword, login, logout, me } = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", me);
router.post("/change-password", requireAuth, changePassword);

module.exports = router;
