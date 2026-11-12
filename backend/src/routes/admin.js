// Admin-only: reports, customers, exports, backups, e-mail and audit logs.
const fs = require('fs');
const path = require('path');
const router = require('express').Router();
const { Order, Product, User, Subscriber, EmailLog, AuditLog, Settings } = require('../models');
const { auth, admin, can } = require('../middleware/auth');
const backup = require('../backup');
const mailer = require('../mailer');
const { getSettings, resetSettings } = require('../pricing');

router.use(auth);

const LIVE = { status: { $nin: ['cancelled', 'returned'] } };
const TZ = '+06:00';
const dayKey = (d) => new Date(d.getTime() + 6 * 3600e3).toISOString().slice(0, 10);

/* ---------- reports for the dashboard ---------- */
router.get('/report', can('dashboard'), async (req, res) => {
  const days = Math.min(Math.max(+req.query.days || 30, 7), 365);
  // midnight in Dhaka (UTC+6) today, then back (days - 1) days
  const todayStart = Math.floor((Date.now() + 6 * 3600e3) / 864e5) * 864e5 - 6 * 3600e3;
  const since = new Date(todayStart - (days - 1) * 864e5);
  const prevSince = new Date(since.getTime() - days * 864e5);
  const [daily, totals, prev, byStatus, byMethod, top, byCategory, byDistrict, customers, newCustomers, lowStock, awaiting, productCount] = await Promise.all([
    Order.aggregate([{ $match: { ...LIVE, createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { ...LIVE, createdAt: { $gte: since } } }, { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 }, items: { $sum: { $sum: '$items.qty' } } } }]),
    Order.aggregate([{ $match: { ...LIVE, createdAt: { $gte: prevSince, $lt: since } } }, { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$paymentMethod', n: { $sum: 1 }, sum: { $sum: '$total' } } }, { $sort: { n: -1 } }]),
    Order.aggregate([{ $match: { ...LIVE, createdAt: { $gte: since } } }, { $unwind: '$items' }, { $group: { _id: '$items.name', qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } }, { $sort: { revenue: -1 } }, { $limit: 8 }]),
    Order.aggregate([{ $match: { ...LIVE, createdAt: { $gte: since } } }, { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'p' } }, { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'categories', localField: 'p.category', foreignField: '_id', as: 'c' } }, { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$c.name', 'Other'] }, revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } }, { $sort: { revenue: -1 } }]),
    Order.aggregate([{ $match: { ...LIVE, createdAt: { $gte: since } } }, { $group: { _id: { $ifNull: ['$shipping.district', 'Unknown'] }, n: { $sum: 1 }, revenue: { $sum: '$total' } } }, { $sort: { n: -1 } }, { $limit: 8 }]),
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: since } }),
    Product.find({ stock: { $lt: 10 } }).select('name stock slug').sort('stock').limit(10),
    Order.countDocuments({ 'payment.status': 'submitted' }),
    Product.countDocuments(),
  ]);
  const series = [];
  for (let i = 0; i < days; i++) {
    const key = dayKey(new Date(since.getTime() + i * 864e5));
    const hit = daily.find((d) => d._id === key);
    series.push({ day: key, revenue: hit?.revenue || 0, orders: hit?.orders || 0 });
  }
  const t = totals[0] || { revenue: 0, orders: 0, items: 0 };
  const p = prev[0] || { revenue: 0, orders: 0 };
  res.json({
    days, series,
    revenue: t.revenue, orders: t.orders, items: t.items, aov: t.orders ? Math.round(t.revenue / t.orders) : 0,
    prev: { revenue: p.revenue, orders: p.orders },
    byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
    byMethod: byMethod.map((m) => ({ method: m._id, n: m.n, sum: m.sum })),
    topProducts: top.map((x) => ({ name: x._id, qty: x.qty, revenue: x.revenue })),
    byCategory: byCategory.map((x) => ({ name: x._id, revenue: x.revenue })),
    byDistrict: byDistrict.map((x) => ({ name: x._id, n: x.n, revenue: x.revenue })),
    customers, newCustomers, lowStock, awaitingVerification: awaiting, productCount,
  });
});

/* ---------- customers ---------- */
router.get('/customers', can('customers'), async (req, res) => {
  const q = String(req.query.q || '').trim();
  const re = q && new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await User.find(re ? { $or: [{ name: re }, { phone: re }, { email: re }] } : {}).select('-password').sort('-createdAt').limit(500).lean();
  const stats = await Order.aggregate([{ $match: { ...LIVE, user: { $in: users.map((u) => u._id) } } }, { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$total' }, last: { $max: '$createdAt' } } }]);
  const by = Object.fromEntries(stats.map((s) => [String(s._id), s]));
  res.json(users.map((u) => ({ ...u, orders: by[u._id]?.orders || 0, spent: by[u._id]?.spent || 0, lastOrder: by[u._id]?.last })));
});
// Owner only: make someone an owner or a plain customer (staff roles are managed under /api/staff).
router.patch('/customers/:id', admin, async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ error: "You can't change your own role" });
  const role = req.body.role === 'admin' ? 'admin' : 'customer';
  res.json(await User.findByIdAndUpdate(req.params.id, { role, $unset: { staffRole: 1 } }, { new: true }).select('-password'));
});

/* ---------- CSV exports (open directly in Excel / Google Sheets) ---------- */
const csvCell = (v) => {
  let s = v === undefined || v === null ? '' : v instanceof Date ? v.toISOString().replace('T', ' ').slice(0, 19) : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (head, rows) => '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
const range = (q) => {
  const f = {};
  if (q.from) f.$gte = new Date(q.from + 'T00:00:00+06:00');
  if (q.to) f.$lte = new Date(q.to + 'T23:59:59+06:00');
  return Object.keys(f).length ? { createdAt: f } : {};
};

router.get('/export/:type', can('data'), async (req, res) => {
  const { type } = req.params;
  let csv;
  if (type === 'orders') {
    const os = await Order.find(range(req.query)).sort('-createdAt').lean();
    csv = toCsv(['Order', 'Date', 'Status', 'Customer', 'Phone', 'Email', 'District', 'Address', 'Zone', 'Items', 'Subtotal', 'Discount', 'Coupon', 'Delivery', 'Total', 'Payment method', 'Payment status', 'Trx ID', 'Courier', 'Consignment'],
      os.map((o) => ['#' + String(o._id).slice(-6).toUpperCase(), o.createdAt, o.status, o.shipping?.name, o.shipping?.phone, o.shipping?.email, o.shipping?.district, o.shipping?.address, o.shipping?.zoneName,
        o.items.map((i) => `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.qty}`).join('; '), o.subtotal, o.discount, o.coupon, o.deliveryFee, o.total,
        o.paymentMethod, o.payment?.status, o.payment?.trxId, o.courier?.name, o.courier?.consignmentId]));
  } else if (type === 'items') {
    const os = await Order.find({ ...range(req.query), ...LIVE }).sort('-createdAt').lean();
    csv = toCsv(['Order', 'Date', 'Product', 'Option', 'Qty', 'Unit price', 'Line total', 'Customer', 'Phone'],
      os.flatMap((o) => o.items.map((i) => ['#' + String(o._id).slice(-6).toUpperCase(), o.createdAt, i.name, i.variantLabel, i.qty, i.price, i.qty * i.price, o.shipping?.name, o.shipping?.phone])));
  } else if (type === 'daily') {
    const rows = await Order.aggregate([{ $match: { ...range(req.query), ...LIVE } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, orders: { $sum: 1 }, items: { $sum: { $sum: '$items.qty' } }, subtotal: { $sum: '$subtotal' }, discount: { $sum: '$discount' }, delivery: { $sum: '$deliveryFee' }, total: { $sum: '$total' },
        paid: { $sum: { $cond: [{ $eq: ['$payment.status', 'paid'] }, '$total', 0] } } } }, { $sort: { _id: -1 } }]);
    csv = toCsv(['Date', 'Orders', 'Items sold', 'Subtotal', 'Discounts', 'Delivery fees', 'Total sales', 'Collected (paid)'], rows.map((r) => [r._id, r.orders, r.items, r.subtotal, r.discount, r.delivery, r.total, r.paid]));
  } else if (type === 'customers') {
    const us = await User.find().select('-password').sort('-createdAt').lean();
    const st = await Order.aggregate([{ $match: LIVE }, { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$total' } } }]);
    const by = Object.fromEntries(st.map((s) => [String(s._id), s]));
    const guests = await Order.aggregate([{ $match: { user: null } }, { $group: { _id: '$shipping.phone', name: { $last: '$shipping.name' }, email: { $last: '$shipping.email' }, district: { $last: '$shipping.district' }, orders: { $sum: 1 }, spent: { $sum: '$total' }, first: { $min: '$createdAt' } } }]);
    csv = toCsv(['Type', 'Name', 'Phone', 'Email', 'District / Address', 'Orders', 'Total spent', 'Joined'],
      [...us.map((u) => [u.role === 'admin' ? 'Admin' : 'Registered', u.name, u.phone, u.email, u.address, by[u._id]?.orders || 0, by[u._id]?.spent || 0, u.createdAt]),
        ...guests.map((g) => ['Guest', g.name, g._id, g.email, g.district, g.orders, g.spent, g.first])]);
  } else if (type === 'products') {
    const ps = await Product.find().populate('category', 'name').lean();
    csv = toCsv(['Name', 'Category', 'Option', 'Colour', 'Size / unit', 'Price', 'Sale price', 'Stock', 'Sold', 'Rating', 'Active'],
      ps.flatMap((p) => (p.variants?.length ? p.variants : [null]).map((v) => [p.name, p.category?.name, v?.label, v?.color, v?.size || p.unit, v?.price ?? p.price, v?.salePrice ?? p.salePrice, v ? v.stock : p.stock, p.sold, p.rating, p.active !== false ? 'yes' : 'no'])));
  } else if (type === 'subscribers') {
    csv = toCsv(['Email', 'Subscribed'], (await Subscriber.find().sort('-createdAt').lean()).map((s) => [s.email, s.createdAt]));
  } else return res.status(404).json({ error: 'Unknown export' });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-${dayKey(new Date())}.csv"`);
  res.send(csv);
});

/* ---------- backups ---------- */
router.get('/backup', can('data'), async (_req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="ghorerbazar-backup-${dayKey(new Date())}.json"`);
  res.json(await backup.dump());
});
router.get('/backups', can('data'), async (_req, res) => {
  const files = fs.existsSync(backup.DIR) ? fs.readdirSync(backup.DIR).filter((f) => f.endsWith('.json')).sort().reverse() : [];
  const s = await getSettings();
  res.json({ auto: s.backups?.auto !== false, lastAt: s.backups?.lastAt, dir: backup.DIR, files: files.map((f) => ({ name: f, size: fs.statSync(path.join(backup.DIR, f)).size })) });
});
router.post('/backups/now', can('data'), async (_req, res) => {
  const file = await backup.saveToDisk();
  await Settings.updateOne({ key: 'store' }, { 'backups.lastAt': new Date() }); resetSettings();
  res.json({ file: path.basename(file) });
});
router.get('/backups/:name', can('data'), (req, res) => {
  const name = path.basename(req.params.name);
  const file = path.join(backup.DIR, name);
  if (!name.endsWith('.json') || !fs.existsSync(file)) return res.status(404).json({ error: 'Backup not found' });
  res.download(file);
});
router.post('/restore', admin, async (req, res) => {
  if (req.query.confirm !== 'RESTORE') return res.status(400).json({ error: 'Confirmation missing' });
  await backup.saveToDisk(); // safety copy of the current data first
  const counts = await backup.restore(req.body);
  resetSettings();
  res.json({ ok: true, counts });
});

/* ---------- bulk product import (rows parsed from CSV in the browser) ----------
   Columns: name, category, price, salePrice, stock, unit, description, image, images (| separated),
   featured (yes/no), color, hex, size. Rows with the same name become one product with variants. */
router.post('/import/products', can('products'), async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows.slice(0, 2000) : [];
  if (!rows.length) return res.status(400).json({ error: 'No rows found in the file' });
  const { Category } = require('../models');
  const slug = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const num = (v) => (v === undefined || v === null || String(v).trim() === '' ? undefined : Number(String(v).replace(/[^\d.]/g, '')));
  const groups = new Map();
  const errors = [];
  rows.forEach((r, i) => {
    const name = String(r.name || '').trim();
    if (!name || !String(r.category || '').trim() || num(r.price) === undefined) { errors.push(`Row ${i + 2}: name, category and price are required`); return; }
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(r);
  });
  let created = 0, updated = 0;
  const cats = {};
  for (const [name, rs] of groups) {
    const r0 = rs[0];
    const cname = String(r0.category).trim();
    cats[cname] = cats[cname] || (await Category.findOne({ name: new RegExp(`^${cname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })) || (await Category.create({ name: cname, slug: slug(cname) }));
    const variants = rs.filter((r) => r.color || r.size).map((r) => ({
      color: r.color || undefined, hex: /^#?[0-9a-f]{6}$/i.test(r.hex || '') ? '#' + String(r.hex).replace('#', '') : undefined, size: r.size || undefined,
      label: [r.color, r.size].filter(Boolean).join(' / '), price: num(r.price), salePrice: num(r.salePrice), stock: num(r.stock) || 0, image: r.image || undefined,
    }));
    const doc = {
      name, slug: slug(name), category: cats[cname]._id, description: r0.description || '', unit: r0.unit || '1 pc',
      price: num(r0.price), salePrice: num(r0.salePrice), image: r0.image || '', images: String(r0.images || '').split('|').map((x) => x.trim()).filter(Boolean),
      featured: /^(yes|true|1)$/i.test(String(r0.featured || '')), variants,
      stock: variants.length ? variants.reduce((s, v) => s + v.stock, 0) : num(r0.stock) || 0,
    };
    const ex = await Product.findOne({ slug: doc.slug });
    if (ex) { Object.assign(ex, doc); await ex.save(); updated++; } else { await Product.create(doc); created++; }
  }
  res.json({ created, updated, errors: errors.slice(0, 50) });
});

/* ---------- e-mail ---------- */
router.get('/emails', can('emails'), async (_req, res) => res.json({ configured: mailer.configured(), logs: await EmailLog.find().sort('-createdAt').limit(100) }));
router.post('/emails/test', can('emails'), async (req, res) => {
  const to = req.body.to || req.user.email;
  if (!to) return res.status(400).json({ error: 'Enter an e-mail address to send the test to' });
  await mailer.testEmail(await getSettings(), to);
  res.json({ ok: true });
});

/* ---------- audit ---------- */
router.get('/audit', can('data'), async (_req, res) => res.json(await AuditLog.find().sort('-createdAt').limit(200)));

module.exports = router;
