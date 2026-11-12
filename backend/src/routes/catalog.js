const router = require('express').Router();
const { Category, Product } = require('../models');
const { auth, admin, optionalAuth } = require('../middleware/auth');

const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SORTS = ['-createdAt', 'price', '-price', 'name', '-rating', '-sold'];

// Keep product-level price/stock in step with its variants so listings and filters stay simple.
function normalise(body) {
  const b = { ...body };
  delete b.rating; delete b.numReviews; delete b.sold; delete b._id;
  if (b.name && !b.slug) b.slug = slugify(b.name);
  if (Array.isArray(b.images)) b.images = b.images.map(String).filter(Boolean).slice(0, 12);
  if (Array.isArray(b.variants)) {
    b.variants = b.variants.filter((v) => v && String(v.label || v.color || v.size || '').trim()).map((v) => ({
      ...v,
      label: String(v.label || [v.color, v.size].filter(Boolean).join(' / ')).trim(),
      price: v.price === '' || v.price === null || v.price === undefined ? undefined : Number(v.price),
      salePrice: v.salePrice === '' || v.salePrice === null || v.salePrice === undefined ? undefined : Number(v.salePrice),
      stock: Math.max(0, Number(v.stock) || 0),
    }));
    if (b.variants.length) b.stock = b.variants.reduce((s, v) => s + v.stock, 0);
  }
  if (b.salePrice === '' || b.salePrice === null) b.salePrice = undefined;
  return b;
}

/* ---------- categories ---------- */
router.get('/categories', async (_req, res) => res.json(await Category.find().sort('name')));
router.post('/categories', auth, admin, async (req, res) =>
  res.status(201).json(await Category.create({ name: req.body.name, image: req.body.image, slug: req.body.slug || slugify(req.body.name || '') })));
router.put('/categories/:id', auth, admin, async (req, res) =>
  res.json(await Category.findByIdAndUpdate(req.params.id, { name: req.body.name, image: req.body.image, ...(req.body.slug && { slug: slugify(req.body.slug) }) }, { new: true, runValidators: true })));
router.delete('/categories/:id', auth, admin, async (req, res) => {
  const n = await Product.countDocuments({ category: req.params.id });
  if (n) return res.status(400).json({ error: `Move or delete the ${n} products in this category first` });
  await Category.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/* ---------- products ---------- */
router.get('/products', optionalAuth, async (req, res) => {
  const { category, q, featured, sale, page = 1, limit = 20, color } = req.query;
  const sort = SORTS.includes(req.query.sort) ? req.query.sort : '-createdAt';
  const filter = {};
  if (!(req.user?.role === 'admin' && req.query.all === 'true')) filter.active = { $ne: false };
  if (category) {
    const c = await Category.findOne({ slug: String(category) });
    filter.category = c ? c._id : null;
  }
  if (q) filter.$or = [{ name: { $regex: escapeRe(String(q)), $options: 'i' } }, { description: { $regex: escapeRe(String(q)), $options: 'i' } }];
  if (featured === 'true') filter.featured = true;
  if (sale === 'true') filter.salePrice = { $gt: 0 };
  if (req.query.inStock === 'true') filter.stock = { $gt: 0 };
  if (color) filter['variants.color'] = { $regex: `^${escapeRe(String(color))}$`, $options: 'i' };
  if (req.query.ids) filter._id = { $in: String(req.query.ids).split(',').filter((x) => /^[a-f0-9]{24}$/i.test(x)).slice(0, 8) };
  const { minPrice, maxPrice } = req.query;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (+minPrice > 0) filter.price.$gte = +minPrice;
    if (+maxPrice > 0) filter.price.$lte = +maxPrice;
  }
  const lim = Math.min(+limit || 20, 100);
  const pg = Math.max(+page || 1, 1);
  const [items, total] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort(sort).skip((pg - 1) * lim).limit(lim),
    Product.countDocuments(filter),
  ]);
  res.json({ items, total, page: pg, pages: Math.ceil(total / lim) });
});

// every colour used by any product, for the shop filter
router.get('/colors', async (_req, res) => {
  const rows = await Product.aggregate([{ $match: { active: { $ne: false } } }, { $unwind: '$variants' }, { $match: { 'variants.color': { $nin: [null, ''] } } },
    { $group: { _id: { $toLower: '$variants.color' }, name: { $first: '$variants.color' }, hex: { $first: '$variants.hex' }, n: { $addToSet: '$_id' } } },
    { $project: { _id: 0, name: 1, hex: 1, count: { $size: '$n' } } }, { $sort: { count: -1, name: 1 } }]);
  res.json(rows);
});

router.get('/products/:slug', async (req, res) => {
  const p = await Product.findOne({ slug: req.params.slug, active: { $ne: false } }).populate('category', 'name slug');
  if (!p) return res.status(404).json({ error: 'Product not found' });
  const related = await Product.find({ category: p.category._id, _id: { $ne: p._id }, active: { $ne: false } }).populate('category', 'name slug').limit(4);
  res.json({ product: p, related });
});

router.post('/products', auth, admin, async (req, res) => res.status(201).json(await Product.create(normalise(req.body))));
router.put('/products/:id', auth, admin, async (req, res) =>
  res.json(await Product.findByIdAndUpdate(req.params.id, normalise(req.body), { new: true, runValidators: true }).populate('category', 'name slug')));
router.delete('/products/:id', auth, admin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
