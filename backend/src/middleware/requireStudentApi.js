function requireStudentApi(req, res, next) {
  if (!req.session || !req.session.student) {
    return res.status(401).json({ message: "Please login as a student first." });
  }

  next();
}

module.exports = requireStudentApi;
