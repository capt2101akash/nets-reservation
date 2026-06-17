const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'northridge_nets_jwt_secret_2024';

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !['admin', 'org_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}

module.exports = { verifyToken, requireAdmin, requireRole, JWT_SECRET };
