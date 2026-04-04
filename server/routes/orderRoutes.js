const express = require("express");
const {
  createOrder,
  getOrders,
  updateOrderStatus
} = require("../controllers/orderController");

const router = express.Router();

router.get("/", getOrders);
router.post("/", createOrder);
router.patch("/:id/status", updateOrderStatus);

module.exports = router;
