const express = require("express");
const { getSummary } = require("../controllers/reportController");

const router = express.Router();

router.get("/summary", getSummary);

module.exports = router;
