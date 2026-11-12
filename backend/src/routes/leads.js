// Incomplete orders: saved while a customer fills the checkout form, so staff can call people who did not finish.
const router = require('express').Router();
const { Lead, Product, LandingPage } = require('../models');
const { auth, can } = require('../middleware/auth');
const { limits } = require('../security');
const { str, isId, normPhone } = require('../util');

router.post('/leads', limits.light, async (req, res) => {
  const b = req.body || {};
  const key = str(b.key, 64);
  const phone = normPhone(b.phone);
  if (!key || !/^[a-z0-9-]{8,64}$/i.test(key) || !/^01[3-9]\d{8}$/.test(phone)) return res.json({ ok: false });
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 20).filter((i) => isId(i.product));
  const products = await Product.find({ _id: { $in: items.map((i) => i.product) } }).select('name price salePrice').lean();
  const lines = items.map((i) => {
    const p = products.find((x) => String(x._id) === String(i.product));
    return p && { product: p._id, name: p.name, qty: Math.min(99, Math.max(1, parseInt(i.qty, 10) || 1)), price: Number(i.price) || p.salePrice || p.price, variantLabel: str(i.variantLabel, 80) };
  }).filter(Boolean);
  const landing = isId(b.landing) ? await LandingPage.findById(b.landing).select('slug').lean() : null;
  const existing = await Lead.findOne({ key }).select('status').lean();
  if (existing && existing.status === 'converted') return res.json({ ok: true });
  await Lead.updateOne({ key }, {
    $set: {
      key, phone, name: str(b.name, 80), address: str(b.address, 300), district: str(b.district, 60), items: lines,
      total: lines.reduce((s, l) => s + l.price * l.qty, 0),
      source: landing ? 'landing' : 'store', landing: landing?._id, landingSlug: landing?.slug,
    },
  }, { upsert: true });
  res.json({ ok: true });
});

router.get('/admin/leads', auth, can('leads'), async (req, res) => {
  const f = {};
  if (['open', 'called', 'converted', 'lost'].includes(req.query.status)) f.status = req.query.status;
  else f.status = { $in: ['open', 'called'] };
  const [list, counts] = await Promise.all([
    Lead.find(f).sort('-updatedAt').limit(300).lean(),
    Lead.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  res.json({ list, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) });
});
router.patch('/admin/leads/:id', auth, can('leads'), async (req, res) => {
  const set = {};
  if (['open', 'called', 'converted', 'lost'].includes(req.body.status)) set.status = req.body.status;
  if (req.body.note !== undefined) set.note = str(req.body.note, 500);
  res.json(await Lead.findByIdAndUpdate(req.params.id, set, { new: true }));
});
router.delete('/admin/leads/:id', auth, can('leads'), async (req, res) => { await Lead.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

// Called when an order is placed: the visitor's lead (and other open leads from the same phone) are done.
async function convert(order, key) {
  const since = new Date(Date.now() - 7 * 864e5);
  await Lead.updateMany({ $or: [...(key ? [{ key }] : []), { phone: order.shipping.phone, updatedAt: { $gte: since } }], status: { $ne: 'converted' } },
    { status: 'converted', order: order._id }).catch(() => {});
}

module.exports = router;
module.exports.convert = convert;
