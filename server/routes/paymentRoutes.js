const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  handleMpesaCallback,
  pushExistingPayment,
  queryMpesaPayment
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/mpesa/callback", handleMpesaCallback);
router.post("/:id/mpesa/push", requireAuth, pushExistingPayment);
router.get("/:id/mpesa/query", requireAuth, queryMpesaPayment);

module.exports = router;
