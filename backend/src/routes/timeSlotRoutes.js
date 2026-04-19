const express = require("express");
const { getTimeSlots } = require("../controllers/timeSlotController");

const router = express.Router();

router.get("/", getTimeSlots);

module.exports = router;
