const bcrypt = require("bcrypt");
const db = require("../config/db");

function buildStudentSession(student) {
  return {
    id: student.id,
    studentId: student.student_id,
    fullName: student.full_name,
    email: student.email
  };
}

async function signupStudent(req, res) {
  const { fullName, studentId, email, password, confirmPassword } = req.body;

  if (!fullName || !studentId || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: "Please fill out all required fields." });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters long." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  const [existingStudents] = await db.execute(
    "SELECT id FROM students WHERE student_id = ? OR email = ? LIMIT 1",
    [studentId, email]
  );

  if (existingStudents.length > 0) {
    return res.status(409).json({ message: "Student ID or email is already registered." });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await db.execute(
    "INSERT INTO students (student_id, full_name, email, password_hash) VALUES (?, ?, ?, ?)",
    [studentId, fullName, email, passwordHash]
  );

  req.session.student = {
    id: result.insertId,
    studentId,
    fullName,
    email
  };

  return res.status(201).json({
    message: "Student account created successfully.",
    student: req.session.student
  });
}

async function loginStudent(req, res) {
  const { studentId, password } = req.body;

  if (!studentId || !password) {
    return res.status(400).json({ message: "Student ID and password are required." });
  }

  const [students] = await db.execute("SELECT * FROM students WHERE student_id = ? LIMIT 1", [
    studentId
  ]);

  const student = students[0];

  if (!student) {
    return res.status(401).json({ message: "Invalid student credentials." });
  }

  const isPasswordValid = await bcrypt.compare(password, student.password_hash);

  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid student credentials." });
  }

  req.session.student = buildStudentSession(student);

  return res.json({
    message: "Student login successful.",
    student: req.session.student
  });
}

function getCurrentStudent(req, res) {
  if (!req.session.student) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  return res.json({ student: req.session.student });
}

function logoutStudent(req, res) {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ message: "Unable to logout." });
    }

    res.clearCookie("enrollsched.sid");
    return res.json({ message: "Student logged out successfully." });
  });
}

async function loginAdmin(req, res) {
  const { adminId, password } = req.body;

  if (!adminId || !password) {
    return res.status(400).json({ message: "Admin ID and password are required." });
  }

  const [admins] = await db.execute("SELECT * FROM admins WHERE admin_id = ? LIMIT 1", [
    adminId
  ]);

  const admin = admins[0];

  if (!admin) {
    return res.status(401).json({ message: "Invalid admin credentials." });
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid admin credentials." });
  }

  req.session.admin = {
    id: admin.id,
    adminId: admin.admin_id,
    fullName: admin.full_name
  };

  return res.json({
    message: "Admin login successful.",
    admin: req.session.admin
  });
}

function getCurrentAdmin(req, res) {
  if (!req.session.admin) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  return res.json({ admin: req.session.admin });
}

function logoutAdmin(req, res) {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ message: "Unable to logout." });
    }

    res.clearCookie("enrollsched.sid");
    return res.json({ message: "Admin logged out successfully." });
  });
}

module.exports = {
  signupStudent,
  loginStudent,
  getCurrentStudent,
  logoutStudent,
  loginAdmin,
  getCurrentAdmin,
  logoutAdmin
};
