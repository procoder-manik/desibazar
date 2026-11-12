// Coupons, reviews and newsletter.
const router = require('express').Router();
const { Coupon, Review, Product, Order, Subscriber, Popup } = require('../models');
const { auth, can } = require('../middleware/auth');
const { couponDiscount } = require('../pricing');

/* ---------- coupons ---------- */
router.post('/coupons/validate', async (req, res) => {
  const code = String(req.body.code || '').toUpperCase().trim();
  if (!code) return res.status(400).json({ error: 'Enter a coupon code' });
  const c = await Coupon.findOne({ code });
  const r = couponDiscount(c, Number(req.body.subtotal) || 0);
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ code: c.code, discount: r.discount, type: c.type, value: c.value });
});
router.get('/coupons', auth, can('coupons'), async (_req, res) => res.json(await Coupon.find().sort('-createdAt')));
router.post('/coupons', auth, can('coupons'), async (req, res) => res.status(201).json(await Coupon.create(req.body)));
router.patch('/coupons/:id', auth, can('coupons'), async (req, res) =>
  res.json(await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })));
router.delete('/coupons/:id', auth, can('coupons'), async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/* ---------- reviews ---------- */
async function refreshRating(productId) {
  const [s] = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  await Product.updateOne({ _id: productId }, { rating: s ? Math.round(s.avg * 10) / 10 : 0, numReviews: s?.n || 0 });
}

router.get('/products/:slug/reviews', async (req, res) => {
  const p = await Product.findOne({ slug: req.params.slug }).select('_id');
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(await Review.find({ product: p._id }).sort('-createdAt').limit(50));
});

router.post('/products/:slug/reviews', auth, async (req, res) => {
  const rating = parseInt(req.body.rating, 10);
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Choose a rating from 1 to 5' });
  const p = await Product.findOne({ slug: req.params.slug }).select('_id');
  if (!p) return res.status(404).json({ error: 'Not found' });
  const verified = !!(await Order.exists({ user: req.user._id, status: 'delivered', 'items.product': p._id }));
  // one review per customer per product; posting again updates it
  const r = await Review.findOneAndUpdate(
    { product: p._id, user: req.user._id },
    { name: req.user.name, rating, comment: String(req.body.comment || '').slice(0, 1000), verified },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await refreshRating(p._id);
  res.status(201).json(r);
});

/* ---------- promotional pop-ups ---------- */
const POPUP_FIELDS = ['name', 'active', 'layout', 'eyebrow', 'title', 'text', 'image', 'code', 'ctaLabel', 'ctaLink', 'trigger', 'delay', 'frequency', 'pages', 'audience', 'startsAt', 'endsAt', 'priority'];
const popupBody = (b) => Object.fromEntries(POPUP_FIELDS.filter((k) => b[k] !== undefined).map((k) => [k, b[k] === '' && /At$/.test(k) ? null : b[k]]));

router.get('/popups/active', async (_req, res) => {
  const now = new Date();
  res.json(await Popup.find({
    active: true,
    $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: now } }] }, { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }],
  }).sort('-priority -updatedAt').limit(5).select('-name'));
});
router.get('/popups', auth, can('content'), async (_req, res) => res.json(await Popup.find().sort('-priority -updatedAt')));
router.post('/popups', auth, can('content'), async (req, res) => res.status(201).json(await Popup.create(popupBody(req.body))));
router.put('/popups/:id', auth, can('content'), async (req, res) => res.json(await Popup.findByIdAndUpdate(req.params.id, popupBody(req.body), { new: true, runValidators: true })));
router.delete('/popups/:id', auth, can('content'), async (req, res) => { await Popup.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

/* ---------- newsletter ---------- */
router.post('/newsletter', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  await Subscriber.updateOne({ email }, { email }, { upsert: true });
  res.json({ ok: true });
});

module.exports = router;
