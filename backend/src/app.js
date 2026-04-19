const express = require("express");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const preRegistrationRoutes = require("./routes/preRegistrationRoutes");
const timeSlotRoutes = require("./routes/timeSlotRoutes");
const requireAdmin = require("./middleware/requireAdmin");
const requireStudent = require("./middleware/requireStudent");

const app = express();
const frontendPath = path.join(__dirname, "..", "..", "frontend");

app.use(express.json());
app.use(
  session({
    name: "enrollsched.sid",
    secret: process.env.SESSION_SECRET || "development_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 2
    }
  })
);

app.get("/admin.html", requireAdmin, (req, res) => {
  res.sendFile(path.join(frontendPath, "admin.html"));
});

app.get("/student.html", requireStudent, (req, res) => {
  res.sendFile(path.join(frontendPath, "student.html"));
});

app.use(express.static(frontendPath));

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/pre-registrations", preRegistrationRoutes);
app.use("/api/time-slots", timeSlotRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "EnrollSched API" });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

module.exports = app;
