const express = require("express");
const {
  createService,
  deleteService,
  getServices,
  updateService
} = require("../controllers/serviceController");
const { requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getServices);
router.post("/", createService);
router.put("/:id", requireRole("Administrator"), updateService);
router.delete("/:id", requireRole("Administrator"), deleteService);

module.exports = router;
