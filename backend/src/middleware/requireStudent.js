function requireStudent(req, res, next) {
  if (!req.session || !req.session.student) {
    return res.redirect("/login.html");
  }

  next();
}

module.exports = requireStudent;
