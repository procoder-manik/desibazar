// Abandoned carts and incomplete orders: people who put items in the bag or started checkout but did not order.
// A lead is created when we can reach them (valid phone and/or e-mail, from the checkout form or their account).
// If they left an e-mail, a reminder with a link that restores their bag is sent (instantly, or after a delay).
const crypto = require('crypto');
const router = require('express').Router();
const { Lead, Product, LandingPage } = require('../models');
const { auth, can, optionalAuth } = require('../middleware/auth');
const { limits } = require('../security');
const { getSettings } = require('../pricing');
const { str, isId, normPhone } = require('../util');
const mailer = require('../mailer');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DAY = 864e5;

// Send the reminder at most once per lead and once per address per day, and never to people who already ordered.
async function remind(settings, lead, { force = false } = {}) {
  if (!lead.email || !EMAIL.test(lead.email)) return 'no-email';
  if (!force) {
    if (!settings.emails?.abandoned || lead.emailedAt || lead.status === 'converted' || !lead.items?.length) return 'skipped';
    if (await Lead.exists({ email: lead.email, emailedAt: { $gte: new Date(Date.now() - DAY) }, _id: { $ne: lead._id } })) return 'skipped';
  }
  const status = await mailer.abandonedEmail(settings, lead);
  if (status === 'sent') await Lead.updateOne({ _id: lead._id }, { $set: { emailedAt: new Date() }, $inc: { emailCount: 1 } });
  return status;
}

router.post('/leads', limits.light, optionalAuth, async (req, res) => {
  const b = req.body || {};
  const key = str(b.key, 64);
  if (!key || !/^[a-z0-9-]{8,64}$/i.test(key)) return res.json({ ok: false });
  const phone = normPhone(b.phone || req.user?.phone);
  const email = String(b.email || req.user?.email || '').trim().toLowerCase();
  const goodPhone = /^01[3-9]\d{8}$/.test(phone);
  const goodEmail = EMAIL.test(email) && email.length <= 120;
  if (!goodPhone && !goodEmail) return res.json({ ok: false }); // nobody to contact
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 20).filter((i) => isId(i.product));
  if (!items.length) return res.json({ ok: false });
  const products = await Product.find({ _id: { $in: items.map((i) => i.product) } }).select('name price salePrice').lean();
  const lines = items.map((i) => {
    const p = products.find((x) => String(x._id) === String(i.product));
    return p && { product: p._id, name: p.name, qty: Math.min(99, Math.max(1, parseInt(i.qty, 10) || 1)), price: Number(i.price) || p.salePrice || p.price, variantLabel: str(i.variantLabel, 80), variant: isId(i.variant) ? i.variant : undefined };
  }).filter(Boolean);
  if (!lines.length) return res.json({ ok: false });
  const landing = isId(b.landing) ? await LandingPage.findById(b.landing).select('slug').lean() : null;
  const existing = await Lead.findOne({ key }).select('status stage').lean();
  if (existing?.status === 'converted') return res.json({ ok: true });

  const lead = await Lead.findOneAndUpdate({ key }, {
    $set: {
      key, ...(goodPhone && { phone }), ...(goodEmail && { email }), name: str(b.name, 80) || undefined, address: str(b.address, 300), district: str(b.district, 60),
      items: lines, total: lines.reduce((s, l) => s + l.price * l.qty, 0), user: req.user?._id,
      stage: existing?.stage === 'checkout' || b.stage === 'checkout' ? 'checkout' : 'cart',
      source: landing ? 'landing' : 'store', landing: landing?._id, landingSlug: landing?.slug, lastSeenAt: new Date(),
    },
    $setOnInsert: { recoverToken: crypto.randomBytes(12).toString('hex') },
  }, { upsert: true, new: true });

  // instant reminder (a delay in Settings → E-mails is handled by the sweeper below)
  const settings = await getSettings();
  if (goodEmail && !lead.emailedAt && settings.emails?.abandoned && !settings.emails?.abandonedDelay) remind(settings, lead).catch(() => {});
  res.json({ ok: true });
});

// The link in the reminder e-mail: rebuilds the bag from the saved lead with today's prices and stock.
router.get('/leads/recover/:token', limits.light, async (req, res) => {
  const lead = await Lead.findOne({ recoverToken: String(req.params.token), status: { $ne: 'converted' } }).lean();
  if (!lead) return res.status(404).json({ error: 'This link has expired' });
  const products = await Product.find({ _id: { $in: lead.items.map((i) => i.product) }, active: { $ne: false } }).lean();
  const cart = [];
  for (const i of lead.items) {
    const p = products.find((x) => String(x._id) === String(i.product));
    if (!p) continue;
    const v = p.variants?.length ? p.variants.find((x) => String(x._id) === String(i.variant)) || p.variants.find((x) => x.stock > 0) : null;
    if (p.variants?.length && !v) continue;
    const stock = v ? v.stock : p.stock;
    if (stock < 1) continue;
    cart.push({
      key: v ? `${p._id}:${v._id}` : String(p._id), _id: p._id, variant: v?._id, variantLabel: v?.label, hex: v?.hex, slug: p.slug, name: p.name, image: v?.image || p.image,
      unit: v?.size || p.unit, price: v ? v.salePrice || v.price || p.salePrice || p.price : p.salePrice || p.price, stock, qty: Math.min(i.qty, stock),
    });
  }
  res.json({ cart });
});

/* ---------- admin ---------- */
router.get('/admin/leads', auth, can('leads'), async (req, res) => {
  const f = {};
  if (['open', 'called', 'converted', 'lost'].includes(req.query.status)) f.status = req.query.status;
  else f.status = { $in: ['open', 'called'] };
  if (['cart', 'checkout'].includes(req.query.stage)) f.stage = req.query.stage;
  const [list, counts] = await Promise.all([
    Lead.find(f).select('-recoverToken').sort('-updatedAt').limit(300).lean(),
    Lead.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  res.json({ list, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])), smtp: mailer.configured() });
});
router.patch('/admin/leads/:id', auth, can('leads'), async (req, res) => {
  const set = {};
  if (['open', 'called', 'converted', 'lost'].includes(req.body.status)) set.status = req.body.status;
  if (req.body.note !== undefined) set.note = str(req.body.note, 500);
  res.json(await Lead.findByIdAndUpdate(req.params.id, set, { new: true }).select('-recoverToken'));
});
// Send (or send again) the reminder e-mail by hand.
router.post('/admin/leads/:id/remind', auth, can('leads'), async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Not found' });
  if (!lead.email) return res.status(400).json({ error: 'This customer did not leave an e-mail address. Call or WhatsApp them instead.' });
  if (lead.status === 'converted') return res.status(400).json({ error: 'They already ordered' });
  const status = await remind(await getSettings(), lead, { force: true });
  if (status === 'skipped' || status === 'failed') return res.status(400).json({ error: status === 'skipped' ? 'E-mail is not set up (SMTP). Add SMTP_HOST, SMTP_USER and SMTP_PASS to backend/.env' : 'The e-mail could not be sent. See Admin → E-mails for the reason.' });
  res.json({ ok: true, status });
});
router.delete('/admin/leads/:id', auth, can('leads'), async (req, res) => { await Lead.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

// Called when an order is placed: the visitor's lead (and other open leads from the same phone) are done.
async function convert(order, key) {
  const since = new Date(Date.now() - 7 * DAY);
  const or = [...(key ? [{ key }] : []), ...(order.shipping.phone ? [{ phone: order.shipping.phone, updatedAt: { $gte: since } }] : []), ...(order.shipping.email ? [{ email: String(order.shipping.email).toLowerCase(), updatedAt: { $gte: since } }] : [])];
  if (!or.length) return;
  await Lead.updateMany({ $or: or, status: { $ne: 'converted' } }, { status: 'converted', order: order._id }).catch(() => {});
}

// With a delay set in Settings → E-mails, reminders go out once the visitor has been quiet that long.
function startSweeper() {
  const tick = async () => {
    try {
      const settings = await getSettings();
      const delay = settings.emails?.abandonedDelay || 0;
      if (!settings.emails?.abandoned || !delay) return;
      const due = await Lead.find({
        status: 'open', email: { $exists: true, $ne: '' }, emailedAt: null,
        updatedAt: { $lte: new Date(Date.now() - delay * 6e4), $gte: new Date(Date.now() - 3 * DAY) },
      }).limit(25);
      for (const l of due) await remind(settings, l);
    } catch (e) { console.error('abandoned-cart sweep:', e.message); }
  };
  const t = setInterval(tick, 60 * 1000);
  t.unref?.();
}

module.exports = router;
module.exports.convert = convert;
module.exports.startSweeper = startSweeper;
