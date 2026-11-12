const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { auth } = require('../middleware/auth');
const { limits } = require('../security');
const { getSettings } = require('../pricing');
const { accountEmail } = require('../mailer');

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '30d' });
const pub = (u) => ({ id: u._id, name: u.name, phone: u.phone, email: u.email, role: u.role, address: u.address, area: u.area });
const normPhone = (p) => String(p || '').replace(/[\s-]/g, '').replace(/^\+?88/, '');
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);
const strong = (p) => typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

router.post('/register', limits.auth, async (req, res) => {
  const { name, email, password } = req.body;
  const phone = normPhone(req.body.phone);
  if (!String(name || '').trim()) return res.status(400).json({ error: 'Please enter your name' });
  if (!/^01[3-9]\d{8}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid mobile number (01XXXXXXXXX)' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (!strong(password)) return res.status(400).json({ error: 'Password needs 8+ characters with letters and numbers' });
  if (await User.findOne({ phone })) return res.status(409).json({ error: 'This number is already registered. Try signing in.' });
  const u = await User.create({ name: String(name).trim(), phone, email, password: await bcrypt.hash(password, 12), lastLoginAt: new Date() });
  accountEmail(await getSettings(), u, 'welcome');
  res.status(201).json({ token: sign(u), user: pub(u) });
});

router.post('/login', limits.auth, async (req, res) => {
  const u = await User.findOne({ phone: normPhone(req.body.phone) });
  // same message and similar timing whether or not the number exists
  const ok = await bcrypt.compare(String(req.body.password || ''), u?.password || DUMMY_HASH);
  if (!u || !ok) return res.status(401).json({ error: 'Wrong mobile number or password' });
  u.lastLoginAt = new Date(); await u.save();
  accountEmail(await getSettings(), u, 'login');
  res.json({ token: sign(u), user: pub(u) });
});

router.get('/me', auth, (req, res) => res.json({ user: pub(req.user) }));

router.patch('/me', auth, async (req, res) => {
  const { name, email, address, area, currentPassword, newPassword } = req.body;
  const u = req.user;
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ error: 'Name cannot be empty' });
    u.name = String(name).trim();
  }
  if (email !== undefined) {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    u.email = String(email).trim();
  }
  if (address !== undefined) u.address = String(address).trim();
  if (area !== undefined) u.area = String(area);
  if (newPassword) {
    if (!strong(newPassword)) return res.status(400).json({ error: 'New password needs 8+ characters with letters and numbers' });
    if (!(await bcrypt.compare(currentPassword || '', u.password))) return res.status(400).json({ error: 'Current password is wrong' });
    u.password = await bcrypt.hash(newPassword, 12);
  }
  await u.save();
  res.json({ user: pub(u) });
});

module.exports = router;
