const express = require("express");
const {
  getCurrentAdmin,
  getCurrentStudent,
  loginAdmin,
  loginStudent,
  logoutAdmin,
  logoutStudent,
  signupStudent
} = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signupStudent);
router.post("/login", loginStudent);
router.get("/me", getCurrentStudent);
router.post("/logout", logoutStudent);

router.post("/admin/login", loginAdmin);
router.get("/admin/me", getCurrentAdmin);
router.post("/admin/logout", logoutAdmin);

module.exports = router;
