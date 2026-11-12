// Transactional e-mail: SMTP via nodemailer, premium HTML templates in the store's theme colour.
// Without SMTP settings the e-mail is logged as "skipped" so nothing breaks in development.
const nodemailer = require('nodemailer');
const { EmailLog } = require('./models');

const THEME_ACCENT = { sage: '#2f4a3a', ocean: '#24506b', clay: '#8a4b35', honey: '#7a5520', lavender: '#4f4577', midnight: '#2f4a3a', pine: '#1f3d34', rosewood: '#7b3b4a', slate: '#3a4553', champagne: '#7a6440', olive: '#4e5a2b', espresso: '#4a3328' };

let transport = null;
const configured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
function getTransport() {
  if (!transport && configured()) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_PORT) === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tk = (n) => '৳' + Number(n || 0).toLocaleString('en-IN');
const orderNo = (o) => '#' + String(o._id).slice(-6).toUpperCase();
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0].trim();

function layout(settings, { preheader, title, intro, body, cta }) {
  const a = settings?.appearance || {};
  const accent = /^#[0-9a-f]{6}$/i.test(a.accent || '') ? a.accent : THEME_ACCENT[a.theme] || '#2f4a3a';
  const s = settings?.store || {};
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f2f3ee;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#1d2420">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader || '')}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f3ee;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
  <tr><td style="padding:0 8px 18px">
    <table role="presentation" width="100%"><tr>
      <td><span style="display:inline-block;width:38px;height:38px;border-radius:50%;background:${accent};color:#fff;text-align:center;line-height:38px;font-weight:700;font-family:Georgia,serif">${esc((s.name || 'G')[0])}</span>
      <span style="font-family:Georgia,serif;font-size:20px;font-weight:600;vertical-align:middle;margin-left:10px">${esc(s.name || 'Our store')}</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(29,36,32,.08)">
    <div style="height:6px;background:${accent}"></div>
    <div style="padding:36px 36px 30px">
      <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:500;font-size:28px;line-height:1.2;color:#1d2420">${esc(title)}</h1>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#4a544d">${intro}</p>
      ${body || ''}
      ${cta ? `<p style="margin:28px 0 4px"><a href="${esc(cta.href)}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:14px 26px;border-radius:99px">${esc(cta.label)}</a></p>` : ''}
    </div>
  </td></tr>
  <tr><td style="padding:22px 12px;text-align:center;font-size:12px;line-height:1.7;color:#7c857e">
    ${esc(s.name || '')} · ${esc(s.address || '')}<br>${esc(s.phone || '')} · ${esc(s.email || '')}
  </td></tr>
</table></td></tr></table></body></html>`;
}

// Invoice block used in order e-mails.
function invoiceHtml(o, accent = '#2f4a3a') {
  const rows = o.items.map((i) => `<tr>
    <td style="padding:12px 0;border-bottom:1px solid #eceee8;font-size:14px">${esc(i.name)}${i.variantLabel ? `<br><span style="color:#7c857e;font-size:12px">${esc(i.variantLabel)}</span>` : ''}</td>
    <td style="padding:12px 0;border-bottom:1px solid #eceee8;font-size:14px;text-align:center;color:#4a544d">${i.qty}</td>
    <td style="padding:12px 0;border-bottom:1px solid #eceee8;font-size:14px;text-align:right">${tk(i.price * i.qty)}</td></tr>`).join('');
  const line = (l, v, bold) => `<tr><td colspan="2" style="padding:5px 0;font-size:14px;color:${bold ? '#1d2420' : '#4a544d'};${bold ? 'font-weight:700;font-size:17px;padding-top:12px' : ''}">${l}</td><td style="padding:5px 0;text-align:right;font-size:14px;${bold ? 'font-weight:700;font-size:17px;padding-top:12px' : ''}">${v}</td></tr>`;
  const st = o.status === 'cancelled' ? ['CANCELLED', '#7c857e'] : o.payment?.status === 'refunded' ? ['REFUNDED', '#3f5c77'] : o.status === 'returned' ? ['RETURNED', '#7c857e'] : o.payment?.status === 'paid' ? ['PAID', '#2f7d4f'] : ['PAYMENT DUE', '#a5463b'];
  return `<div style="border:1px solid #eceee8;border-radius:18px;padding:22px 22px 14px">
    <table role="presentation" width="100%"><tr>
      <td style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#7c857e;font-weight:700">Invoice ${orderNo(o).replace('#', 'INV-')}</td>
      <td style="text-align:right"><span style="display:inline-block;border:2px solid ${st[1]};color:${st[1]};border-radius:6px;padding:3px 10px;font-size:11px;font-weight:800;letter-spacing:1.4px">${st[0]}</span></td>
    </tr></table>
    <table role="presentation" width="100%" style="margin-top:10px;border-collapse:collapse">
      <tr><td style="font-size:11px;color:#7c857e;text-transform:uppercase;letter-spacing:1px;padding-bottom:6px">Item</td><td style="font-size:11px;color:#7c857e;text-align:center;text-transform:uppercase;letter-spacing:1px">Qty</td><td style="font-size:11px;color:#7c857e;text-align:right;text-transform:uppercase;letter-spacing:1px">Amount</td></tr>
      ${rows}
      ${line('Subtotal', tk(o.subtotal))}
      ${o.discount ? line(`Discount${o.coupon ? ` (${esc(o.coupon)})` : ''}`, '−' + tk(o.discount)) : ''}
      ${line('Delivery', o.deliveryFee ? tk(o.deliveryFee) : 'Free')}
      ${line('Total', `<span style="color:${accent}">${tk(o.total)}</span>`, true)}
      ${o.payment?.status === 'refunded' ? line('Refunded', '−' + tk(o.payment.refundAmount || o.total)) : ''}
    </table>
    <p style="margin:16px 0 4px;font-size:13px;line-height:1.6;color:#4a544d"><b>Delivering to:</b> ${esc(o.shipping.name)}, ${esc(o.shipping.phone)}<br>${esc(o.shipping.address)}${o.shipping.district ? ', ' + esc(o.shipping.district) : ''}</p>
  </div>`;
}

const STATUS_COPY = {
  orderPlaced: (o) => ['Thank you for your order', `We received order <b>${orderNo(o)}</b>. We will call you shortly to confirm it. Your invoice is below.`],
  confirmed: (o) => ['Your order is confirmed', `Good news! Order <b>${orderNo(o)}</b> is confirmed and our team is packing it now.`],
  shipped: (o) => ['Your order is on the way', `Order <b>${orderNo(o)}</b> has left our warehouse${o.courier?.name ? ` with <b>${esc(o.courier.name.replace('_', ' '))}</b>` : ''}.${o.courier?.consignmentId ? ` Tracking ID: <b>${esc(o.courier.consignmentId)}</b>.` : ''}`],
  delivered: (o) => ['Delivered. Enjoy!', `Order <b>${orderNo(o)}</b> has been delivered. We hope you love it. If anything is not right, reply to this e-mail within 7 days.`],
  returned: (o) => ['Return received', `We have received the return for order <b>${orderNo(o)}</b>. ${o.payment?.status === 'refunded' ? 'Your refund has been processed.' : 'We will process your refund shortly.'}`],
  refunded: (o) => ['Your refund is on its way', `We refunded <b>${tk(o.payment?.refundAmount || o.total)}</b> for order <b>${orderNo(o)}</b>. It can take 3-7 working days to reach your account.`],
  cancelled: (o) => ['Your order was cancelled', `Order <b>${orderNo(o)}</b> has been cancelled. If you paid online, the refund will be processed to the same account. Questions? Just reply to this e-mail.`],
};

async function send({ to, subject, html, event, order }) {
  if (!to) return;
  const t = getTransport();
  if (!t) { await EmailLog.create({ to, subject, event, order, status: 'skipped', error: 'SMTP not configured' }); return; }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html });
    await EmailLog.create({ to, subject, event, order, status: 'sent' });
  } catch (e) {
    await EmailLog.create({ to, subject, event, order, status: 'failed', error: e.message });
  }
}

// Fire-and-forget helpers: never block or fail the request because of e-mail.
const later = (fn) => setImmediate(() => fn().catch((e) => console.error('mail:', e.message)));

function orderEmail(settings, o, event) {
  later(async () => {
    if (!settings.emails?.[event] || !STATUS_COPY[event]) return;
    const to = o.shipping?.email;
    if (!to) return;
    const [title, intro] = STATUS_COPY[event](o);
    const accent = THEME_ACCENT[settings.appearance?.theme] || '#2f4a3a';
    const link = `${clientUrl()}/orders/${o._id}?key=${o.accessKey}`;
    await send({
      to, event, order: o._id, subject: `${title} · ${orderNo(o)}`,
      html: layout(settings, { preheader: intro.replace(/<[^>]+>/g, ''), title, intro, body: invoiceHtml(o, accent), cta: { href: link, label: event === 'cancelled' ? 'View order' : 'Track your order' } }),
    });
  });
}

function adminNewOrder(settings, o) {
  later(async () => {
    const to = settings.emails?.adminEmail || settings.store?.email;
    if (!settings.emails?.adminNewOrder || !to) return;
    await send({
      to, event: 'adminNewOrder', order: o._id, subject: `New order ${orderNo(o)} · ${tk(o.total)}`,
      html: layout(settings, { title: `New order ${orderNo(o)}`, intro: `${esc(o.shipping.name)} (${esc(o.shipping.phone)}) placed an order for <b>${tk(o.total)}</b>.`, body: invoiceHtml(o), cta: { href: `${clientUrl()}/admin#orders`, label: 'Open in admin' } }),
    });
  });
}

function accountEmail(settings, user, event) {
  later(async () => {
    if (!settings.emails?.[event] || !user.email) return;
    const name = esc(user.name.split(' ')[0]);
    const copy = event === 'welcome'
      ? [`Welcome, ${name}!`, `Your ${esc(settings.store?.name)} account is ready. Track orders, save your address and get member-only offers. Use code <b>WELCOME10</b> for 10% off your first order.`, { href: `${clientUrl()}/shop`, label: 'Start shopping' }]
      : [`New sign-in to your account`, `Hi ${name}, your account was just signed in on ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })} (Dhaka time). If this wasn't you, change your password right away.`, { href: `${clientUrl()}/account`, label: 'Review account' }];
    await send({ to: user.email, event, subject: copy[0], html: layout(settings, { title: copy[0], intro: copy[1], cta: copy[2] }) });
  });
}

// Sends a sample so admins can check SMTP and the design.
async function testEmail(settings, to) {
  const t = getTransport();
  if (!t) throw new Error('SMTP is not configured. Add SMTP_HOST, SMTP_USER and SMTP_PASS to backend/.env');
  const sample = { _id: '000000000000000000abc123', items: [{ name: 'Sundarban Honey', variantLabel: '500 g', qty: 2, price: 650 }], subtotal: 1300, discount: 0, deliveryFee: 60, total: 1360, shipping: { name: 'Sample Customer', phone: '01700000000', address: 'House 1, Road 2', district: 'Dhaka' }, payment: { status: 'paid' } };
  await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject: 'Test e-mail · your store design', html: layout(settings, { title: 'This is how your e-mails look', intro: 'If you can read this, SMTP works. Below is the invoice block customers receive.', body: invoiceHtml(sample) }) });
}

module.exports = { configured, orderEmail, adminNewOrder, accountEmail, testEmail };
