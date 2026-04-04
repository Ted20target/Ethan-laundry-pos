exports.requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Authentication required." });
  }

  return next();
};

exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (!roles.includes(req.session.user.role)) {
    return res.status(403).json({ message: "You do not have permission to perform this action." });
  }

  return next();
};
