function requireAdminApi(req, res, next) {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ message: "Please login as an admin first." });
  }

  next();
}

module.exports = requireAdminApi;
