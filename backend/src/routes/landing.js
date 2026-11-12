// Sales landing pages with a one-page checkout.
const router = require('express').Router();
const { LandingPage, Order, Lead } = require('../models');
const { auth, can, optionalAuth, permissionsOf } = require('../middleware/auth');
const { uniqueSlug, seoOf, str, isId } = require('../util');

const PRODUCT_FIELDS = 'name slug image images price salePrice stock unit variants active rating numReviews';
const TYPES = ['hero', 'gallery', 'video', 'text', 'checklist', 'features', 'testimonials', 'faq', 'notice', 'cta', 'image', 'countdown', 'trust', 'checkout'];
const ACCENT = /^#[0-9a-f]{6}$/i;

// Sections are free-form blocks; keep only known types and plain values with sane sizes.
function clean(v, depth = 0) {
  if (depth > 4) return undefined;
  if (typeof v === 'string') return v.slice(0, 20000);
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.slice(0, 40).map((x) => clean(x, depth + 1)).filter((x) => x !== undefined);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).filter(([k]) => /^[a-zA-Z0-9_]{1,40}$/.test(k)).slice(0, 40)
      .map(([k, x]) => [k, clean(x, depth + 1)]).filter(([, x]) => x !== undefined));
  }
  return undefined;
}
const sectionsOf = (list) => (Array.isArray(list) ? list : []).slice(0, 40)
  .filter((s) => s && TYPES.includes(s.type))
  .map((s, i) => ({ ...clean(s), id: str(s.id, 40) || `s${Date.now().toString(36)}${i}` }));

async function body(b, id) {
  if (!String(b.title || '').trim()) throw Object.assign(new Error('The page needs a title'), { status: 400 });
  const products = (Array.isArray(b.products) ? b.products : []).slice(0, 20).filter((p) => isId(p?.product?._id || p?.product)).map((p) => ({
    product: p.product?._id || p.product,
    variant: isId(p.variant) ? p.variant : undefined,
    label: str(p.label, 120), badge: str(p.badge, 40),
    price: p.price === '' || p.price === null || p.price === undefined ? undefined : Math.max(0, Number(p.price) || 0),
    qty: Math.min(99, Math.max(1, parseInt(p.qty, 10) || 1)), selected: !!p.selected,
  }));
  const c = b.checkout || {};
  return {
    title: str(b.title, 160).trim(), slug: await uniqueSlug(LandingPage, b.slug || b.title, id),
    status: b.status === 'published' ? 'published' : 'draft',
    accent: ACCENT.test(b.accent || '') ? b.accent : '',
    header: ['minimal', 'store', 'none'].includes(b.header) ? b.header : 'minimal',
    sections: sectionsOf(b.sections), products,
    checkout: {
      mode: c.mode === 'single' ? 'single' : 'multi', title: str(c.title, 160) || 'Fill in the form to order', button: str(c.button, 60) || 'Confirm order',
      allowQty: c.allowQty !== false, coupon: c.coupon !== false, note: str(c.note, 1000) || '', freeDelivery: !!c.freeDelivery, thankYou: str(c.thankYou, 1000) || '', lang: c.lang === 'en' ? 'en' : 'bn',
    },
    seo: seoOf(b.seo) || {},
  };
}

/* ---------- public ---------- */
router.get('/landing/:slug', optionalAuth, async (req, res) => {
  const preview = req.query.preview && permissionsOf(req.user).includes('landing');
  const lp = await LandingPage.findOne({ slug: req.params.slug, ...(preview ? {} : { status: 'published' }) })
    .populate('products.product', PRODUCT_FIELDS).lean();
  if (!lp) return res.status(404).json({ error: 'Page not found' });
  lp.products = (lp.products || []).filter((x) => x.product && x.product.active !== false);
  if (!preview) LandingPage.updateOne({ _id: lp._id }, { $inc: { views: 1 } }).catch(() => {});
  res.json(lp);
});

/* ---------- admin ---------- */
router.get('/admin/landing', auth, can('landing'), async (_req, res) => {
  const pages = await LandingPage.find().select('title slug status views products updatedAt createdAt').populate('products.product', 'name image').sort('-updatedAt').lean();
  const [orders, leads] = await Promise.all([
    Order.aggregate([{ $match: { 'source.landing': { $in: pages.map((p) => p._id) }, status: { $nin: ['cancelled', 'returned'] } } },
      { $group: { _id: '$source.landing', n: { $sum: 1 }, revenue: { $sum: '$total' } } }]),
    Lead.aggregate([{ $match: { landing: { $in: pages.map((p) => p._id) }, status: { $ne: 'converted' } } }, { $group: { _id: '$landing', n: { $sum: 1 } } }]),
  ]);
  const by = (list, id) => list.find((x) => String(x._id) === String(id));
  res.json(pages.map((p) => ({ ...p, orders: by(orders, p._id)?.n || 0, revenue: by(orders, p._id)?.revenue || 0, leads: by(leads, p._id)?.n || 0 })));
});
router.get('/admin/landing/:id', auth, can('landing'), async (req, res) => {
  const lp = await LandingPage.findById(req.params.id).populate('products.product', PRODUCT_FIELDS).lean().catch(() => null);
  if (!lp) return res.status(404).json({ error: 'Page not found' });
  res.json(lp);
});
router.post('/admin/landing', auth, can('landing'), async (req, res) => res.status(201).json(await LandingPage.create(await body(req.body))));
router.put('/admin/landing/:id', auth, can('landing'), async (req, res) => {
  const cur = await LandingPage.findById(req.params.id).catch(() => null);
  if (!cur) return res.status(404).json({ error: 'Page not found' });
  Object.assign(cur, await body(req.body, cur._id));
  cur.markModified('sections');
  await cur.save();
  res.json(cur);
});
router.post('/admin/landing/:id/duplicate', auth, can('landing'), async (req, res) => {
  const cur = await LandingPage.findById(req.params.id).lean().catch(() => null);
  if (!cur) return res.status(404).json({ error: 'Page not found' });
  const { _id, createdAt, updatedAt, views, ...rest } = cur;
  res.status(201).json(await LandingPage.create({ ...rest, title: `${cur.title} (copy)`, slug: await uniqueSlug(LandingPage, `${cur.slug}-copy`), status: 'draft', views: 0 }));
});
router.delete('/admin/landing/:id', auth, can('landing'), async (req, res) => { await LandingPage.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

module.exports = router;
