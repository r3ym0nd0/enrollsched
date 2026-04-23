const express = require("express");
const {
  getAdminDashboard,
  updatePreRegistrationStatus,
  updateTimeSlotCapacity,
  updateTimeSlotAvailability
} = require("../controllers/adminDashboardController");
const requireAdminApi = require("../middleware/requireAdminApi");

const router = express.Router();

router.get("/dashboard", requireAdminApi, getAdminDashboard);
router.put("/pre-registrations/:id/status", requireAdminApi, updatePreRegistrationStatus);
router.put("/time-slots/:id/capacity", requireAdminApi, updateTimeSlotCapacity);
router.put("/time-slots/:id/availability", requireAdminApi, updateTimeSlotAvailability);

module.exports = router;
