// Blog posts. Public readers see published posts; staff with the "blog" permission manage them.
const router = require('express').Router();
const { Post, Product } = require('../models');
const { auth, can, optionalAuth, permissionsOf } = require('../middleware/auth');
const { uniqueSlug, seoOf, str, isId, escapeRe } = require('../util');

const PRODUCT_FIELDS = 'name slug image price salePrice stock unit rating numReviews variants category';
const LIST_FIELDS = 'title slug excerpt cover author tags publishedAt products';
const live = () => ({ status: 'published', publishedAt: { $lte: new Date() } });

/* ---------- public ---------- */
router.get('/posts', async (req, res) => {
  const lim = Math.min(+req.query.limit || 12, 50);
  const pg = Math.max(+req.query.page || 1, 1);
  const f = live();
  if (req.query.tag) f.tags = String(req.query.tag);
  if (isId(req.query.product)) f.products = req.query.product;
  if (req.query.q) f.title = { $regex: escapeRe(String(req.query.q)), $options: 'i' };
  const [items, total] = await Promise.all([
    Post.find(f).select(LIST_FIELDS).sort('-publishedAt').skip((pg - 1) * lim).limit(lim).lean(),
    Post.countDocuments(f),
  ]);
  res.json({ items, total, page: pg, pages: Math.ceil(total / lim) });
});

// Staff can open drafts with ?preview=1
router.get('/posts/:slug', optionalAuth, async (req, res) => {
  const preview = req.query.preview && permissionsOf(req.user).includes('blog');
  const p = await Post.findOne({ slug: req.params.slug, ...(preview ? {} : live()) })
    .populate({ path: 'products', match: { active: { $ne: false } }, select: PRODUCT_FIELDS, populate: { path: 'category', select: 'name slug' } }).lean();
  if (!p) return res.status(404).json({ error: 'Post not found' });
  const related = await Post.find({ ...live(), _id: { $ne: p._id }, $or: [{ tags: { $in: p.tags || [] } }, { products: { $in: (p.products || []).map((x) => x._id) } }] })
    .select(LIST_FIELDS).sort('-publishedAt').limit(3).lean();
  if (!preview) Post.updateOne({ _id: p._id }, { $inc: { views: 1 } }).catch(() => {});
  res.json({ post: p, related });
});

// Products referenced as [product:slug] inside a post body.
router.get('/posts-products', async (req, res) => {
  const slugs = String(req.query.slugs || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
  res.json(slugs.length ? await Product.find({ slug: { $in: slugs }, active: { $ne: false } }).select(PRODUCT_FIELDS).populate('category', 'name slug').lean() : []);
});

/* ---------- admin ---------- */
const body = async (b, id) => {
  const out = {
    title: str(b.title, 160), excerpt: str(b.excerpt, 400), content: str(b.content, 200000) ?? '', cover: str(b.cover, 600),
    author: str(b.author, 80), tags: (Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(',')).map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 12),
    products: (Array.isArray(b.products) ? b.products : []).map((p) => p?._id || p).filter(isId).slice(0, 12),
    status: b.status === 'published' ? 'published' : 'draft', seo: seoOf(b.seo) || {},
  };
  if (!out.title?.trim()) throw Object.assign(new Error('The post needs a title'), { status: 400 });
  out.slug = await uniqueSlug(Post, b.slug || b.title, id);
  if (out.status === 'published') out.publishedAt = b.publishedAt ? new Date(b.publishedAt) : new Date();
  return out;
};

router.get('/admin/posts', auth, can('blog'), async (_req, res) =>
  res.json(await Post.find().select('-content').populate('products', 'name slug image').sort('-updatedAt').lean()));
router.get('/admin/posts/:id', auth, can('blog'), async (req, res) => {
  const p = await Post.findById(req.params.id).populate('products', 'name slug image price salePrice').lean().catch(() => null);
  if (!p) return res.status(404).json({ error: 'Post not found' });
  res.json(p);
});
router.post('/admin/posts', auth, can('blog'), async (req, res) => res.status(201).json(await Post.create(await body(req.body))));
router.put('/admin/posts/:id', auth, can('blog'), async (req, res) => {
  const cur = await Post.findById(req.params.id).catch(() => null);
  if (!cur) return res.status(404).json({ error: 'Post not found' });
  const b = await body(req.body, cur._id);
  if (b.status === 'published' && cur.publishedAt && !req.body.publishedAt) b.publishedAt = cur.publishedAt; // keep the original date
  Object.assign(cur, b);
  await cur.save();
  res.json(cur);
});
router.delete('/admin/posts/:id', auth, can('blog'), async (req, res) => { await Post.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

module.exports = router;
