const express = require("express");
const { login, logout, me } = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", me);

module.exports = router;
