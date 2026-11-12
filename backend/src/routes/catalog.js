const router = require('express').Router();
const { Category, Product } = require('../models');
const { auth, can, optionalAuth, isStaff } = require('../middleware/auth');

const { slugify, uniqueSlug, escapeRe, seoOf, str } = require('../util');
const SORTS = ['-createdAt', 'price', '-price', 'name', '-rating', '-sold'];

// Keep product-level price/stock in step with its variants so listings and filters stay simple.
function normalise(body) {
  const b = { ...body };
  delete b.rating; delete b.numReviews; delete b.sold; delete b._id;
  if (b.slug) b.slug = slugify(b.slug);
  if (b.seo) b.seo = seoOf(b.seo);
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
router.get('/categories/:slug', async (req, res) => {
  const c = await Category.findOne({ slug: req.params.slug });
  if (!c) return res.status(404).json({ error: 'Category not found' });
  res.json(c);
});
const catBody = (b) => ({ name: str(b.name, 80), image: b.image, description: str(b.description, 2000), ...(b.seo && { seo: seoOf(b.seo) }) });
router.post('/categories', auth, can('products'), async (req, res) =>
  res.status(201).json(await Category.create({ ...catBody(req.body), slug: await uniqueSlug(Category, req.body.slug || req.body.name) })));
router.put('/categories/:id', auth, can('products'), async (req, res) =>
  res.json(await Category.findByIdAndUpdate(req.params.id, { ...catBody(req.body), ...(req.body.slug && { slug: await uniqueSlug(Category, req.body.slug, req.params.id) }) }, { new: true, runValidators: true })));
router.delete('/categories/:id', auth, can('products'), async (req, res) => {
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
  if (!(isStaff(req.user) && req.query.all === 'true')) filter.active = { $ne: false };
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

router.post('/products', auth, can('products'), async (req, res) => {
  const b = normalise(req.body);
  b.slug = await uniqueSlug(Product, b.slug || b.name);
  res.status(201).json(await Product.create(b));
});
router.put('/products/:id', auth, can('products'), async (req, res) => {
  const b = normalise(req.body);
  if (b.slug) b.slug = await uniqueSlug(Product, b.slug, req.params.id);
  res.json(await Product.findByIdAndUpdate(req.params.id, b, { new: true, runValidators: true }).populate('category', 'name slug'));
});

// One product sent by the Chrome extension (or any tool) from another website.
// The category can be an id or a name (created when it does not exist yet).
router.post('/products/import', auth, can('products'), async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0, 200);
  const num = (v) => Number(String(v ?? '').replace(/[^\d.]/g, ''));
  const price = num(b.price);
  if (!name) return res.status(400).json({ error: 'The product needs a name' });
  if (!(price > 0)) return res.status(400).json({ error: 'The product needs a price' });
  let cat = /^[a-f0-9]{24}$/i.test(String(b.category || '')) ? await Category.findById(b.category) : null;
  if (!cat) {
    const cname = String(b.category || 'Imported').trim().slice(0, 80) || 'Imported';
    cat = await Category.findOne({ name: new RegExp('^' + escapeRe(cname) + '$', 'i') })
      || await Category.create({ name: cname, slug: await uniqueSlug(Category, cname) });
  }
  const images = [...new Set((Array.isArray(b.images) ? b.images : []).map(String).filter((u) => /^https?:\/\//i.test(u)))].slice(0, 12);
  const sale = num(b.salePrice);
  const doc = normalise({
    name, category: cat._id, price, salePrice: sale > 0 && sale < price ? sale : undefined,
    description: String(b.description || '').slice(0, 20000), unit: str(b.unit, 40) || '1 pc',
    image: images[0] || '', images: images.slice(1), stock: Math.max(0, parseInt(b.stock, 10) || 0),
    details: (Array.isArray(b.details) ? b.details : []).filter((d) => d?.label && d?.value).slice(0, 30).map((d) => ({ label: str(d.label, 80), value: str(d.value, 300) })),
    variants: Array.isArray(b.variants) ? b.variants.slice(0, 50) : [],
    active: b.active !== false, sourceUrl: str(b.sourceUrl, 1000),
  });
  doc.slug = await uniqueSlug(Product, name);
  const p = await Product.create(doc);
  res.status(201).json(await p.populate('category', 'name slug'));
});
router.delete('/products/:id', auth, can('products'), async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
