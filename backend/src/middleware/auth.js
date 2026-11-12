const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = await User.findById(id);
    if (!req.user) throw new Error();
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
// Sets req.user when a valid token is sent, otherwise continues as a guest.
async function optionalAuth(req, _res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (token) {
    try {
      const { id } = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      req.user = await User.findById(id);
    } catch { /* treat as guest */ }
  }
  next();
}

// Admin gate; every admin write is recorded in the audit log.
function admin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (req.method !== 'GET' && !req._audited) {
    req._audited = true;
    res.on('finish', () => {
      require('../models').AuditLog.create({
        user: req.user._id, userName: req.user.name, method: req.method,
        path: req.originalUrl.split('?')[0], ip: req.ip, status: res.statusCode,
      }).catch(() => {});
    });
  }
  next();
}

module.exports = { auth, admin, optionalAuth };
