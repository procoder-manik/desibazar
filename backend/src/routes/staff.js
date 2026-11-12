// Owner only: staff roles (sets of admin-panel permissions) and staff accounts.
const bcrypt = require('bcryptjs');
const router = require('express').Router();
const { Role, User } = require('../models');
const { auth, admin, PERMISSIONS } = require('../middleware/auth');

router.use(auth, admin);

const PRESETS = [
  { name: 'Order manager', description: 'Confirms, ships and follows up orders', permissions: ['dashboard', 'orders', 'leads', 'customers', 'fraud'] },
  { name: 'Order checker', description: 'Checks and calls new and incomplete orders', permissions: ['orders', 'leads'] },
  { name: 'Product manager', description: 'Adds and edits products, prices and stock', permissions: ['products', 'coupons'] },
  { name: 'Marketing', description: 'Landing pages, blog, SEO and offers', permissions: ['dashboard', 'landing', 'blog', 'seo', 'content', 'coupons'] },
];
const normPhone = (p) => String(p || '').replace(/[\s-]/g, '').replace(/^\+?88/, '');
const strong = (p) => typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
const cleanPerms = (list) => [...new Set((Array.isArray(list) ? list : []).filter((p) => PERMISSIONS[p]))];
const pubUser = (u) => ({ _id: u._id, name: u.name, phone: u.phone, email: u.email, role: u.role, active: u.active !== false, staffRole: u.staffRole, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt });

router.get('/', async (_req, res) => {
  if (!(await Role.countDocuments())) await Role.insertMany(PRESETS).catch(() => {});
  const [roles, staff] = await Promise.all([
    Role.find().sort('name').lean(),
    User.find({ role: { $in: ['staff', 'admin'] } }).populate('staffRole', 'name').sort('role name').lean(),
  ]);
  const counts = await User.aggregate([{ $match: { role: 'staff' } }, { $group: { _id: '$staffRole', n: { $sum: 1 } } }]);
  res.json({
    permissions: PERMISSIONS,
    roles: roles.map((r) => ({ ...r, members: counts.find((c) => String(c._id) === String(r._id))?.n || 0 })),
    staff: staff.map(pubUser),
  });
});

/* ---------- roles ---------- */
router.post('/roles', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Give the role a name' });
  const permissions = cleanPerms(req.body.permissions);
  if (!permissions.length) return res.status(400).json({ error: 'Tick at least one permission' });
  res.status(201).json(await Role.create({ name, description: String(req.body.description || '').slice(0, 200), permissions }));
});
router.put('/roles/:id', async (req, res) => {
  const permissions = cleanPerms(req.body.permissions);
  if (!permissions.length) return res.status(400).json({ error: 'Tick at least one permission' });
  const r = await Role.findByIdAndUpdate(req.params.id, { name: String(req.body.name || '').trim(), description: String(req.body.description || '').slice(0, 200), permissions }, { new: true, runValidators: true });
  if (!r) return res.status(404).json({ error: 'Role not found' });
  res.json(r);
});
router.delete('/roles/:id', async (req, res) => {
  const n = await User.countDocuments({ role: 'staff', staffRole: req.params.id });
  if (n) return res.status(400).json({ error: `${n} staff member(s) still use this role. Give them another role first.` });
  await Role.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/* ---------- staff accounts ---------- */
// Add staff: an existing customer account (by phone) or a new account with a password.
router.post('/users', async (req, res) => {
  const phone = normPhone(req.body.phone);
  if (!/^01[3-9]\d{8}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid mobile number (01XXXXXXXXX)' });
  const role = await Role.findById(req.body.roleId).catch(() => null);
  if (!role) return res.status(400).json({ error: 'Choose a role' });
  let u = await User.findOne({ phone });
  if (u) {
    if (u.role === 'admin') return res.status(400).json({ error: 'This number belongs to an owner account' });
    u.role = 'staff'; u.staffRole = role._id; u.active = true;
    if (req.body.password) {
      if (!strong(req.body.password)) return res.status(400).json({ error: 'Password needs 8+ characters with letters and numbers' });
      u.password = await bcrypt.hash(req.body.password, 12);
    }
    await u.save();
  } else {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Enter the staff member’s name' });
    if (!strong(req.body.password)) return res.status(400).json({ error: 'Set a password: 8+ characters with letters and numbers' });
    u = await User.create({ name, phone, email: req.body.email || undefined, role: 'staff', staffRole: role._id, password: await bcrypt.hash(req.body.password, 12) });
  }
  res.status(201).json(pubUser(await u.populate('staffRole', 'name')));
});

router.patch('/users/:id', async (req, res) => {
  const u = await User.findById(req.params.id).catch(() => null);
  if (!u || u.role !== 'staff') return res.status(404).json({ error: 'Staff member not found' });
  if (req.body.roleId) {
    if (!(await Role.exists({ _id: req.body.roleId }))) return res.status(400).json({ error: 'Role not found' });
    u.staffRole = req.body.roleId;
  }
  if (req.body.active !== undefined) u.active = !!req.body.active;
  if (req.body.password) {
    if (!strong(req.body.password)) return res.status(400).json({ error: 'Password needs 8+ characters with letters and numbers' });
    u.password = await bcrypt.hash(req.body.password, 12);
  }
  await u.save();
  res.json(pubUser(await u.populate('staffRole', 'name')));
});

// Remove from staff: the account stays as a normal customer.
router.delete('/users/:id', async (req, res) => {
  const u = await User.findOneAndUpdate({ _id: req.params.id, role: 'staff' }, { role: 'customer', $unset: { staffRole: 1 } }, { new: true }).catch(() => null);
  if (!u) return res.status(404).json({ error: 'Staff member not found' });
  res.json({ ok: true });
});

module.exports = router;
