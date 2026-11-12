const router = require('express').Router();
const { auth, permissionsOf, isStaff } = require('../middleware/auth');
const { getSettings, resetSettings, advanceConfig } = require('../pricing');
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
// Storefront pages whose title / description / image can be set in Admin → SEO.
const SEO_PAGES = ['home', 'shop', 'blog', 'help', 'cart', 'checkout', 'login', 'register', 'wishlist', 'compare'];
// Which permission is needed to save each part of the settings.
const SLICE_PERM = { store: 'store', appearance: 'appearance', shipping: 'shipping', payments: 'payments', content: 'content', emails: 'emails', integrations: 'store', backups: 'data', seo: 'seo', fraud: 'fraud' };

// merge saved content over the defaults so newly added fields always exist
const contentOf = (s) => {
  const c = s.content || {};
  const d = DEFAULT_CONTENT;
  return { ...d, ...c, bar: { ...d.bar, ...(c.bar || {}) }, perksEnabled: c.perksEnabled !== false, hero: { ...d.hero, ...(c.hero || {}) }, promo: { ...d.promo, ...(c.promo || {}) }, sections: { ...d.sections, ...(c.sections || {}) }, newsletter: { ...d.newsletter, ...(c.newsletter || {}) }, perks: c.perks?.length ? c.perks : d.perks };
};
const seoView = (s) => {
  const v = s.toObject ? s.toObject().seo || {} : s.seo || {};
  return { title: v.title || '', titleTemplate: v.titleTemplate || '', description: v.description || '', keywords: v.keywords || '', image: v.image || '', pages: v.pages || {} };
};

// Integration fields the storefront needs (never secrets like the Conversions API token).
const PUBLIC_INTEGRATIONS = ['gaId', 'fbPixelId', 'gtmId', 'adsId', 'adsLabel', 'tiktokPixelId', 'clarityId', 'gscVerification', 'bingVerification', 'fbDomainVerification',
  'headScripts', 'chat', 'tawkProperty', 'tawkWidget', 'crispId', 'tidioKey', 'reveId', 'whatsapp', 'messenger'];

function publicView(s) {
  const p = s.payments;
  const ig = s.integrations || {};
  return {
    store: s.store,
    appearance: s.appearance,
    content: contentOf(s),
    seo: seoView(s),
    shipping: { freeOver: s.shipping.freeOver, zones: s.shipping.zones.filter((z) => z.active !== false), advance: advanceConfig(s) },
    payments: {
      cod: p.cod,
      sslcommerz: p.sslcommerz && ssl.configured(),
      bkash: p.bkash && bkash.configured(),
      manual: p.manual ? Object.fromEntries(Object.entries(p.manualNumbers || {}).filter(([, v]) => v)) : {},
      codAdvance: advanceConfig(s), // set in Shipping → Advance delivery charge
    },
    integrations: Object.fromEntries(PUBLIC_INTEGRATIONS.map((k) => [k, ig[k] || (k === 'chat' ? 'none' : k === 'tawkWidget' ? 'default' : '')])),
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

router.get('/settings/admin', auth, async (req, res) => {
  if (!isStaff(req.user)) return res.status(403).json({ error: 'Staff only' });
  const s = await getSettings();
  const obj = s.toObject();
  const ig = obj.integrations || {};
  res.json({
    ...obj,
    content: contentOf(s),
    seo: seoView(s),
    seoPages: SEO_PAGES,
    integrations: {
      ...ig, fbCapiToken: '', fbCapiSet: !!ig.fbCapiToken, // the token is write-only
      sslcommerz: ssl.configured(), bkash: bkash.configured(), steadfast: steadfast.configured(), smtp: mailer.configured(),
      sslSandbox: process.env.SSLCZ_SANDBOX !== 'false', bkashSandbox: process.env.BKASH_SANDBOX !== 'false',
    },
    couriers: Object.entries(COURIERS).map(([key, c]) => ({ key, name: c.name, api: !!c.api })),
    options: OPTIONS,
    permissions: permissionsOf(req.user),
    owner: req.user.role === 'admin',
  });
});

const str = (v, max = 300) => (typeof v === 'string' ? v.slice(0, max) : v);
const bad = (msg) => Object.assign(new Error(msg), { status: 400 });

function integrationsOf(input, cur, owner) {
  const pick = (k, re, msg, max = 200) => {
    const v = input[k] === undefined ? cur[k] || '' : String(input[k] ?? '').trim().slice(0, max);
    if (v && re && !re.test(v)) throw bad(msg);
    return v;
  };
  // Search Console / Bing / Facebook give either the bare code or the whole <meta> tag: keep only the code.
  const verify = (k) => {
    const raw = input[k] === undefined ? cur[k] || '' : String(input[k] ?? '').trim();
    const m = raw.match(/content=["']([^"']+)["']/i);
    const v = (m ? m[1] : raw).trim();
    if (v && !/^[A-Za-z0-9_\-.:=+/]{6,120}$/.test(v)) throw bad(`${k === 'gscVerification' ? 'Google Search Console' : k === 'bingVerification' ? 'Bing' : 'Facebook domain'} verification code looks wrong`);
    return v;
  };
  return {
    gaId: pick('gaId', /^G-[A-Z0-9]{4,15}$/i, 'Google Analytics ID looks like G-XXXXXXXXXX'),
    gtmId: pick('gtmId', /^GTM-[A-Z0-9]{4,12}$/i, 'Google Tag Manager ID looks like GTM-XXXXXXX'),
    adsId: pick('adsId', /^AW-\d{6,15}$/i, 'Google Ads ID looks like AW-123456789'),
    adsLabel: pick('adsLabel', /^[A-Za-z0-9_-]{4,40}$/, 'Google Ads conversion label is letters and numbers, e.g. AbC-D_efG123'),
    fbPixelId: pick('fbPixelId', /^\d{6,20}$/, 'Meta Pixel ID is a number'),
    fbCapiToken: input.fbCapiToken === undefined ? cur.fbCapiToken || '' : String(input.fbCapiToken || '').trim().slice(0, 400),
    fbTestCode: pick('fbTestCode', /^TEST\d{3,10}$/i, 'Meta test event code looks like TEST12345'),
    tiktokPixelId: pick('tiktokPixelId', /^[A-Z0-9]{10,30}$/i, 'TikTok Pixel ID is letters and numbers, e.g. CABC123DEF456GHI789'),
    clarityId: pick('clarityId', /^[a-z0-9]{6,20}$/i, 'Microsoft Clarity project ID is letters and numbers'),
    gscVerification: verify('gscVerification'),
    bingVerification: verify('bingVerification'),
    fbDomainVerification: verify('fbDomainVerification'),
    // raw HTML in <head>: only the owner may change it
    headScripts: owner && input.headScripts !== undefined ? String(input.headScripts || '').slice(0, 20000) : cur.headScripts || '',
    chat: ['none', 'tawk', 'crisp', 'tidio', 'reve'].includes(input.chat) ? input.chat : cur.chat || 'none',
    tawkProperty: pick('tawkProperty', /^[a-f0-9]{24}$/i, 'tawk.to Property ID is the 24-character code in your widget link'),
    tawkWidget: pick('tawkWidget', /^[a-z0-9]{1,20}$/i, 'tawk.to Widget ID looks like "default" or "1h2abc3de"') || 'default',
    crispId: pick('crispId', /^[a-f0-9-]{36}$/i, 'Crisp Website ID looks like xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
    tidioKey: pick('tidioKey', /^[a-z0-9]{20,40}$/i, 'Tidio public key is the 32-character code in your Tidio script link'),
    reveId: pick('reveId', /^\d{4,12}$/, 'REVE Chat account ID is a number (the __revechat_account value in your widget code)'),
    whatsapp: pick('whatsapp', /^\+?\d{10,15}$/, 'WhatsApp number: digits with country code, e.g. 8801711000000').replace('+', ''),
    messenger: pick('messenger', /^[A-Za-z0-9.]{3,60}$/, 'Messenger: your Facebook page username'),
  };
}

function seoOf(input, cur) {
  const t = (v, max) => String(v ?? '').trim().slice(0, max);
  const pages = {};
  for (const k of SEO_PAGES) {
    const p = (input.pages || {})[k] ?? (cur.pages || {})[k];
    if (p && (p.title || p.description || p.image || p.noindex)) pages[k] = { title: t(p.title, 120), description: t(p.description, 320), image: t(p.image, 600), noindex: !!p.noindex };
  }
  const tpl = t(input.titleTemplate ?? cur.titleTemplate, 120);
  if (tpl && !tpl.includes('%s')) throw bad('The title template must contain %s where the page title goes, e.g. "%s | Desi Bazar"');
  return {
    title: t(input.title ?? cur.title, 120), titleTemplate: tpl, description: t(input.description ?? cur.description, 320),
    keywords: t(input.keywords ?? cur.keywords, 300), image: t(input.image ?? cur.image, 600), pages,
  };
}

router.put('/settings', auth, async (req, res) => {
  const mine = permissionsOf(req.user);
  const denied = Object.keys(req.body || {}).filter((k) => SLICE_PERM[k] && !mine.includes(SLICE_PERM[k]));
  if (!mine.length || denied.length) return res.status(403).json({ error: 'You do not have permission for this' });
  if (req.method !== 'GET') {
    const { AuditLog } = require('../models');
    res.on('finish', () => AuditLog.create({ user: req.user._id, userName: req.user.name, method: 'PUT', path: `/api/settings (${Object.keys(req.body).join(', ')})`, ip: req.ip, status: res.statusCode }).catch(() => {}));
  }
  const s = await getSettings();
  const cur = s.toObject();
  const { store, appearance, shipping, payments, content, emails, integrations, backups, seo, fraud } = req.body;

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
    let advance = cur.shipping.advance;
    if (shipping.advance) {
      const a = { ...(advance || {}), ...shipping.advance };
      advance = { enabled: !!a.enabled, scope: a.scope === 'products' ? 'products' : 'all', type: a.type === 'fixed' ? 'fixed' : 'delivery', amount: Math.max(0, Math.round(Number(a.amount) || 0)), note: String(a.note || '').slice(0, 300) };
      if (advance.enabled && advance.type === 'fixed' && !advance.amount) return res.status(400).json({ error: 'Enter the fixed advance amount' });
      s.set('payments.codAdvance.enabled', false); // the older Payments switch is replaced by this one
    }
    s.shipping = { ...cur.shipping, ...shipping, advance };
  }
  if (payments) {
    const { codAdvance: _ignored, ...rest } = payments;
    s.payments = { ...cur.payments, ...rest, manualNumbers: { ...cur.payments.manualNumbers, ...(payments.manualNumbers || {}) } };
  }
  if (shipping || payments) {
    const adv = advanceConfig(s);
    const p = s.payments;
    const canAdvance = (p.manual && Object.values(p.manualNumbers || {}).some(Boolean)) || (p.bkash && bkash.configured()) || (p.sslcommerz && ssl.configured());
    if (adv.enabled && !canAdvance) return res.status(400).json({ error: 'To take an advance, add a bKash / Nagad / Rocket Send Money number in Payments (or connect bKash / SSLCommerz) first' });
  }
  if (fraud) {
    const f = { ...(cur.fraud || {}), ...fraud };
    const n = (v, min, max, d) => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : d; };
    const out = {
      enabled: !!f.enabled, blockFakePhones: !!f.blockFakePhones,
      flagScore: n(f.flagScore, 5, 99, 40), blockScore: n(f.blockScore, 10, 100, 80),
      maxOrdersPerPhone: n(f.maxOrdersPerPhone, 1, 50, 3), maxOrdersPerIp: n(f.maxOrdersPerIp, 1, 100, 5), badHistory: n(f.badHistory, 1, 20, 3),
    };
    if (out.flagScore >= out.blockScore) return res.status(400).json({ error: 'The review score must be lower than the block score' });
    s.fraud = out;
  }
  if (emails) {
    if (emails.adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emails.adminEmail)) return res.status(400).json({ error: 'Admin e-mail is not valid' });
    const delay = Math.min(1440, Math.max(0, Math.round(Number(emails.abandonedDelay ?? cur.emails.abandonedDelay) || 0)));
    s.emails = { ...cur.emails, ...emails, abandonedDelay: delay };
  }
  if (integrations) s.integrations = integrationsOf(integrations, cur.integrations || {}, req.user.role === 'admin');
  if (seo) { s.seo = seoOf(seo, cur.seo || {}); s.markModified('seo'); }
  if (backups) s.backups = { ...cur.backups, auto: !!backups.auto };
  await s.save();
  resetSettings();
  res.json(publicView(s));
});

module.exports = router;
