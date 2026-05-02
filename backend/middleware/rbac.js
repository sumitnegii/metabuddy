// RBAC middleware – enforce role based access
// Roles: admin, marketer, viewer
module.exports = function (requiredRole) {
  return function (req, res, next) {
    const userRole = req.userRole; // assume auth middleware sets req.userRole
    const hierarchy = { admin: 3, marketer: 2, viewer: 1 };
    if (!userRole || hierarchy[userRole] < hierarchy[requiredRole]) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
};
