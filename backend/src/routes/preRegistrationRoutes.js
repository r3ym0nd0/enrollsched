const express = require("express");
const {
  createPreRegistration,
  getMyPreRegistration,
  updateMyPreRegistration
} = require("../controllers/preRegistrationController");
const requireStudentApi = require("../middleware/requireStudentApi");

const router = express.Router();

router.get("/me", requireStudentApi, getMyPreRegistration);
router.post("/", requireStudentApi, createPreRegistration);
router.put("/me", requireStudentApi, updateMyPreRegistration);

module.exports = router;
