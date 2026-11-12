// Fraud protection admin: blocklist, blocked attempts and orders that need review.
const router = require('express').Router();
const { Blocklist, FraudLog, Order } = require('../models');
const { auth, can } = require('../middleware/auth');
const { normPhone, isId, str } = require('../util');

router.use(auth, can('fraud'));

const clean = (type, value) => {
  const v = String(value || '').trim().toLowerCase();
  if (type === 'phone') { const p = normPhone(v); return /^01[3-9]\d{8}$/.test(p) ? p : null; }
  if (type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? v : null;
  if (type === 'ip') return /^[0-9a-f:.]{3,45}$/.test(v) ? v : null;
  return null;
};

router.get('/', async (_req, res) => {
  const week = new Date(Date.now() - 7 * 864e5);
  const [blocklist, log, review, blocked7] = await Promise.all([
    Blocklist.find().sort('-createdAt').limit(500).lean(),
    FraudLog.find().sort('-createdAt').limit(100).lean(),
    Order.find({ 'risk.level': 'review', 'risk.reviewed': { $ne: true } }).select('shipping total status risk createdAt items').sort('-createdAt').limit(100).lean(),
    FraudLog.countDocuments({ createdAt: { $gte: week } }),
  ]);
  res.json({ blocklist, log, review, blocked7 });
});

router.post('/block', async (req, res) => {
  const { type, orderId, what } = req.body;
  let entries = [];
  if (isId(orderId)) {
    const o = await Order.findById(orderId).lean();
    if (!o) return res.status(404).json({ error: 'Order not found' });
    if (what !== 'ip') entries.push(['phone', o.shipping?.phone]);
    if (what === 'ip' || what === 'both') entries.push(['ip', o.risk?.ip]);
    if (what === 'email' && o.shipping?.email) entries.push(['email', o.shipping.email]);
  } else entries = [[type, req.body.value]];
  const added = [];
  for (const [t, raw] of entries) {
    const value = clean(t, raw);
    if (!value) { if (entries.length === 1) return res.status(400).json({ error: t === 'phone' ? 'Enter a valid mobile number (01XXXXXXXXX)' : t === 'ip' ? 'Enter a valid IP address' : 'Enter a valid e-mail address' }); continue; }
    await Blocklist.updateOne({ type: t, value }, { $set: { reason: str(req.body.reason, 200), by: req.user.name } }, { upsert: true });
    added.push(`${t}: ${value}`);
  }
  if (!added.length) return res.status(400).json({ error: 'Nothing to block on this order (no phone or IP saved)' });
  if (isId(orderId) && req.body.cancel) {
    const o = await Order.findById(orderId);
    if (o && o.status === 'pending') {
      const { Product } = require('../models');
      for (const l of o.items) {
        await (l.variant ? Product.updateOne({ _id: l.product, 'variants._id': l.variant }, { $inc: { 'variants.$.stock': l.qty, stock: l.qty, sold: -l.qty } }) : Product.updateOne({ _id: l.product }, { $inc: { stock: l.qty, sold: -l.qty } }));
      }
      o.status = 'cancelled'; o.history.push({ status: 'cancelled', note: 'Cancelled as fraud' }); await o.save();
    }
  }
  res.status(201).json({ added });
});

router.delete('/block/:id', async (req, res) => { await Blocklist.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

module.exports = router;
