const express = require("express");
const {
  createOrder,
  getOrders,
  getOrderReceipt,
  updateOrderStatus
} = require("../controllers/orderController");

const router = express.Router();

router.get("/", getOrders);
router.get("/:id/receipt", getOrderReceipt);
router.post("/", createOrder);
router.patch("/:id/status", updateOrderStatus);

module.exports = router;
