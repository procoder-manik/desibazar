// Meta (Facebook) Conversions API: sends the Purchase event from the server, so ad reporting still works
// when the browser pixel is blocked. The browser pixel sends the same event_id and Meta keeps only one.
const crypto = require('crypto');

const sha = (v) => (v ? crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex') : undefined);
const eventId = (order) => `purchase-${order._id}`;

async function purchase(settings, order, req) {
  const ig = settings.integrations || {};
  if (!/^\d{6,20}$/.test(ig.fbPixelId || '') || !ig.fbCapiToken) return;
  const s = order.shipping || {};
  const [fn, ...rest] = String(s.name || '').trim().split(/\s+/);
  const phone = String(s.phone || '').replace(/\D/g, '').replace(/^0/, '880');
  const src = req.body?.source || {};
  const fbc = src.fbc || (src.fbclid ? `fb.1.${Date.now()}.${src.fbclid}` : undefined);
  const site = (process.env.CLIENT_URL || '').split(',')[0].trim();
  const body = {
    data: [{
      event_name: 'Purchase', event_time: Math.floor(Date.now() / 1000), event_id: eventId(order), action_source: 'website',
      event_source_url: src.url || (order.source?.landingSlug ? `${site}/lp/${order.source.landingSlug}` : `${site}/checkout`),
      user_data: {
        ph: [sha(phone)], em: s.email ? [sha(s.email)] : undefined, fn: fn ? [sha(fn)] : undefined, ln: rest.length ? [sha(rest.join(' '))] : undefined,
        ct: s.district ? [sha(String(s.district).replace(/\s+/g, ''))] : undefined, country: [sha('bd')],
        external_id: [sha(phone)], client_ip_address: req.ip, client_user_agent: req.get('user-agent'),
        fbp: src.fbp || undefined, fbc,
      },
      custom_data: {
        currency: 'BDT', value: order.total, order_id: String(order._id), content_type: 'product', num_items: order.items.reduce((n, i) => n + i.qty, 0),
        contents: order.items.map((i) => ({ id: String(i.product), quantity: i.qty, item_price: i.price })),
      },
    }],
    ...(ig.fbTestCode ? { test_event_code: ig.fbTestCode } : {}),
  };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${ig.fbPixelId}/events?access_token=${encodeURIComponent(ig.fbCapiToken)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.warn('Meta CAPI:', r.status, (await r.text()).slice(0, 300));
  } catch (e) { console.warn('Meta CAPI failed:', e.message); }
}

module.exports = { purchase, eventId };
