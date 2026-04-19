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
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowedOrigin =
    !origin ||
    allowedOrigins.includes(origin) ||
    (!isProduction && allowedOrigins.length === 0);

  if (origin && isAllowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return isAllowedOrigin ? res.sendStatus(204) : res.sendStatus(403);
  }

  if (origin && !isAllowedOrigin) {
    return res.status(403).json({ message: "Origin is not allowed." });
  }

  return next();
});

app.use(express.json());
app.use(
  session({
    name: "enrollsched.sid",
    secret: process.env.SESSION_SECRET || "development_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
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
