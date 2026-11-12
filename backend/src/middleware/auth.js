const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Admin-panel areas a staff role can be given. The owner (role "admin") always has all of them.
const PERMISSIONS = {
  dashboard: 'Dashboard & reports',
  orders: 'Orders (view and update)',
  leads: 'Incomplete orders (follow-up calls)',
  customers: 'Customers',
  products: 'Products, categories & import',
  coupons: 'Coupons',
  fraud: 'Fraud protection & blocklist',
  blog: 'Blog posts',
  landing: 'Landing pages',
  content: 'Home page content & pop-ups',
  appearance: 'Appearance',
  seo: 'SEO',
  shipping: 'Shipping',
  payments: 'Payments',
  emails: 'E-mails',
  store: 'Store details, tracking & chat',
  data: 'Exports, backup & audit log',
};

async function loadUser(token) {
  const { id } = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
  const u = await User.findById(id).populate('staffRole');
  if (!u || u.active === false) throw new Error('inactive');
  return u;
}

async function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = await loadUser(token);
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
    try { req.user = await loadUser(token); } catch { /* treat as guest */ }
  }
  next();
}

// What this user may open in the admin panel.
function permissionsOf(u) {
  if (!u) return [];
  if (u.role === 'admin') return Object.keys(PERMISSIONS);
  if (u.role === 'staff' && u.staffRole?.permissions) return u.staffRole.permissions.filter((p) => PERMISSIONS[p]);
  return [];
}
const isStaff = (u) => permissionsOf(u).length > 0;

// Every admin-panel write is recorded in the audit log.
function audit(req, res) {
  if (req.method === 'GET' || req._audited) return;
  req._audited = true;
  res.on('finish', () => {
    require('../models').AuditLog.create({
      user: req.user._id, userName: `${req.user.name}${req.user.role === 'staff' ? ' (staff)' : ''}`, method: req.method,
      path: req.originalUrl.split('?')[0], ip: req.ip, status: res.statusCode,
    }).catch(() => {});
  });
}

// can('orders') or can('orders', 'leads'): allowed when the user has any of the listed permissions.
const can = (...perms) => (req, res, next) => {
  const mine = permissionsOf(req.user);
  if (!perms.some((p) => mine.includes(p))) return res.status(403).json({ error: 'You do not have permission for this' });
  audit(req, res);
  next();
};

// Owner only: staff management, raw head scripts and restoring backups.
function admin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Only the store owner can do this' });
  audit(req, res);
  next();
}

module.exports = { auth, admin, can, optionalAuth, permissionsOf, isStaff, PERMISSIONS };
