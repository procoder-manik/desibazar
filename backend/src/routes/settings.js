const router = require('express').Router();
const { auth, admin } = require('../middleware/auth');
const { getSettings, resetSettings } = require('../pricing');
const { ssl, bkash, steadfast, COURIERS } = require('../gateways');
const mailer = require('../mailer');
const { DEFAULT_CONTENT, Coupon } = require('../models');

const OPTIONS = {
  theme: ['sage', 'ocean', 'clay', 'honey', 'lavender', 'midnight', 'pine', 'rosewood', 'slate', 'champagne', 'olive', 'espresso'],
  shape: ['round', 'soft', 'sharp'],
  hero: ['split', 'center', 'showcase', 'editorial', 'banner', 'minimal', 'duo', 'gradient'],
  header: ['floating', 'classic', 'centered', 'bar'],
  card: ['glass', 'minimal', 'overlay', 'elevated', 'outline', 'tile'],
  listing: ['grid', 'carousel'],
  categories: ['carousel', 'grid', 'pills'],
  footer: ['classic', 'minimal', 'dark', 'centered'],
};

// merge saved content over the defaults so newly added fields always exist
const contentOf = (s) => {
  const c = s.content || {};
  const d = DEFAULT_CONTENT;
  return { ...d, ...c, bar: { ...d.bar, ...(c.bar || {}) }, perksEnabled: c.perksEnabled !== false, hero: { ...d.hero, ...(c.hero || {}) }, promo: { ...d.promo, ...(c.promo || {}) }, sections: { ...d.sections, ...(c.sections || {}) }, newsletter: { ...d.newsletter, ...(c.newsletter || {}) }, perks: c.perks?.length ? c.perks : d.perks };
};

function publicView(s) {
  const p = s.payments;
  return {
    store: s.store,
    appearance: s.appearance,
    content: contentOf(s),
    shipping: { freeOver: s.shipping.freeOver, zones: s.shipping.zones.filter((z) => z.active !== false) },
    payments: {
      cod: p.cod,
      sslcommerz: p.sslcommerz && ssl.configured(),
      bkash: p.bkash && bkash.configured(),
      manual: p.manual ? Object.fromEntries(Object.entries(p.manualNumbers || {}).filter(([, v]) => v)) : {},
    },
    integrations: {
      gaId: s.integrations?.gaId || '', fbPixelId: s.integrations?.fbPixelId || '',
      chat: s.integrations?.chat || 'none', tawkProperty: s.integrations?.tawkProperty || '', tawkWidget: s.integrations?.tawkWidget || 'default',
      crispId: s.integrations?.crispId || '', whatsapp: s.integrations?.whatsapp || '', messenger: s.integrations?.messenger || '',
    },
  };
}

// Messages for the scrolling top bar: the admin's own lines plus live offers (coupons marked "show in bar").
async function barMessages(s) {
  const c = contentOf(s);
  const own = (c.bar.messages || []).map((m) => String(m).trim()).filter(Boolean);
  if (!own.length && c.announcement) own.push(c.announcement);
  if (!c.bar.autoOffers) return own;
  const now = new Date();
  const coupons = await Coupon.find({ active: true, showInBar: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }).limit(5);
  const offers = coupons.map((k) => `Use code ${k.code} for ${k.type === 'percent' ? `${k.value}% off` : `৳${k.value} off`}${k.minSubtotal ? ` on orders over ৳${k.minSubtotal}` : ''}`);
  if (s.shipping?.freeOver) offers.push(`Free delivery on orders over ৳${Number(s.shipping.freeOver).toLocaleString('en-IN')}`);
  return [...own, ...offers.filter((o) => !own.includes(o))];
}

router.get('/settings', async (_req, res) => {
  const s = await getSettings();
  const v = publicView(s);
  v.content.barMessages = await barMessages(s);
  res.json(v);
});

router.get('/settings/admin', auth, admin, async (_req, res) => {
  const s = await getSettings();
  res.json({
    ...s.toObject(),
    content: contentOf(s),
    integrations: {
      ...(s.toObject().integrations || {}),
      sslcommerz: ssl.configured(), bkash: bkash.configured(), steadfast: steadfast.configured(), smtp: mailer.configured(),
      sslSandbox: process.env.SSLCZ_SANDBOX !== 'false', bkashSandbox: process.env.BKASH_SANDBOX !== 'false',
    },
    couriers: Object.entries(COURIERS).map(([key, c]) => ({ key, name: c.name, api: !!c.api })),
    options: OPTIONS,
  });
});

const str = (v, max = 300) => (typeof v === 'string' ? v.slice(0, max) : v);

router.put('/settings', auth, admin, async (req, res) => {
  const s = await getSettings();
  const cur = s.toObject();
  const { store, appearance, shipping, payments, content, emails, integrations, backups } = req.body;

  if (appearance) {
    for (const k of Object.keys(OPTIONS)) if (appearance[k] && !OPTIONS[k].includes(appearance[k])) return res.status(400).json({ error: `Unknown ${k}: ${appearance[k]}` });
    if (appearance.accent && !/^#[0-9a-f]{6}$/i.test(appearance.accent)) return res.status(400).json({ error: 'Accent must be a hex colour like #2f4a3a' });
    s.appearance = { ...cur.appearance, ...appearance };
  }
  if (store) s.store = { ...cur.store, ...Object.fromEntries(Object.entries(store).map(([k, v]) => [k, str(v, 200)])) };
  if (content) {
    // shallow-validate: only known top-level keys, strings trimmed to sane lengths
    const c = contentOf(s);
    const clip = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 600) : v]));
    s.content = {
      announcement: str(content.announcement ?? c.announcement, 200),
      hero: { ...c.hero, ...clip(content.hero) },
      promo: { ...c.promo, ...clip(content.promo) },
      sections: { ...c.sections, ...clip(content.sections) },
      newsletter: { ...c.newsletter, ...clip(content.newsletter) },
      perks: Array.isArray(content.perks) ? content.perks.slice(0, 4).map(clip) : c.perks,
      perksEnabled: content.perksEnabled === undefined ? c.perksEnabled : !!content.perksEnabled,
      bar: {
        mode: ['static', 'ticker', 'off'].includes(content.bar?.mode) ? content.bar.mode : c.bar.mode,
        messages: Array.isArray(content.bar?.messages) ? content.bar.messages.map((m) => String(m).slice(0, 200)).filter((m) => m.trim()).slice(0, 10) : c.bar.messages,
        autoOffers: content.bar?.autoOffers === undefined ? c.bar.autoOffers : !!content.bar.autoOffers,
      },
    };
    s.markModified('content');
  }
  if (shipping) {
    if (shipping.zones) {
      const keys = new Set();
      for (const z of shipping.zones) {
        if (!z.key || !z.name || !(z.fee >= 0)) return res.status(400).json({ error: 'Every zone needs a key, a name and a fee' });
        if (keys.has(z.key)) return res.status(400).json({ error: `Duplicate zone key: ${z.key}` });
        keys.add(z.key);
      }
    }
    s.shipping = { ...cur.shipping, ...shipping };
  }
  if (payments) s.payments = { ...cur.payments, ...payments, manualNumbers: { ...cur.payments.manualNumbers, ...(payments.manualNumbers || {}) } };
  if (emails) {
    if (emails.adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emails.adminEmail)) return res.status(400).json({ error: 'Admin e-mail is not valid' });
    s.emails = { ...cur.emails, ...emails };
  }
  if (integrations) {
    const keep = (k) => (integrations[k] === undefined ? (cur.integrations || {})[k] || '' : String(integrations[k] || '').trim());
    const ga = keep('gaId'), px = keep('fbPixelId');
    if (ga && !/^G-[A-Z0-9]{4,15}$/i.test(ga)) return res.status(400).json({ error: 'Google Analytics ID looks like G-XXXXXXXXXX' });
    if (px && !/^\d{6,20}$/.test(px)) return res.status(400).json({ error: 'Meta Pixel ID is a number' });
    const cur2 = cur.integrations || {};
    const pick = (k, re, msg) => {
      const v = integrations[k] === undefined ? cur2[k] || '' : String(integrations[k]).trim();
      if (v && re && !re.test(v)) throw Object.assign(new Error(msg), { status: 400 });
      return v;
    };
    s.integrations = {
      gaId: ga, fbPixelId: px,
      chat: ['none', 'tawk', 'crisp'].includes(integrations.chat) ? integrations.chat : cur2.chat || 'none',
      tawkProperty: pick('tawkProperty', /^[a-f0-9]{24}$/i, 'tawk.to Property ID is the 24-character code in your widget link'),
      tawkWidget: pick('tawkWidget', /^[a-z0-9]{1,20}$/i, 'tawk.to Widget ID looks like "default" or "1h2abc3de"') || 'default',
      crispId: pick('crispId', /^[a-f0-9-]{36}$/i, 'Crisp Website ID looks like xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
      whatsapp: pick('whatsapp', /^\+?\d{10,15}$/, 'WhatsApp number: digits with country code, e.g. 8801711000000').replace('+', ''),
      messenger: pick('messenger', /^[A-Za-z0-9.]{3,60}$/, 'Messenger: your Facebook page username'),
    };
  }
  if (backups) s.backups = { ...cur.backups, auto: !!backups.auto };
  await s.save();
  resetSettings();
  res.json(publicView(s));
});

module.exports = router;
