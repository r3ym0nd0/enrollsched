function requireAdmin(req, res, next) {
  if (!req.session || !req.session.admin) {
    return res.redirect("/admin-login.html");
  }

  next();
}

module.exports = requireAdmin;
