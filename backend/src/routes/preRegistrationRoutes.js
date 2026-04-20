const express = require("express");
const {
  createPreRegistration,
  getMyPreRegistration,
  updateMyPreRegistration
} = require("../controllers/preRegistrationController");
const requireStudentApi = require("../middleware/requireStudentApi");
const { uploadEvidence } = require("../middleware/evidenceUpload");

const router = express.Router();

router.get("/me", requireStudentApi, getMyPreRegistration);
router.post("/", requireStudentApi, uploadEvidence, createPreRegistration);
router.put("/me", requireStudentApi, uploadEvidence, updateMyPreRegistration);

module.exports = router;
