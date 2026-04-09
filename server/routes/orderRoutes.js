const express = require("express");
const {
  archiveActiveOrders,
  createOrder,
  getOrders,
  getOrderReceipt,
  updateOrderStatus
} = require("../controllers/orderController");
const { requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getOrders);
router.get("/:id/receipt", getOrderReceipt);
router.post("/archive", requireRole("Administrator"), archiveActiveOrders);
router.post("/", createOrder);
router.patch("/:id/status", updateOrderStatus);

module.exports = router;
