// Payment gateway and courier API clients. Credentials live in .env, never in the database.
const env = (k, d = '') => process.env[k] || d;

/* ---------------- SSLCommerz (cards, bKash, Nagad, Rocket, net banking via hosted page) ---------------- */
const ssl = {
  configured: () => !!(env('SSLCZ_STORE_ID') && env('SSLCZ_STORE_PASSWD')),
  base: () => (env('SSLCZ_SANDBOX', 'true') === 'true' ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com'),

  async init({ order, apiUrl }) {
    const s = order.shipping;
    const body = new URLSearchParams({
      store_id: env('SSLCZ_STORE_ID'),
      store_passwd: env('SSLCZ_STORE_PASSWD'),
      total_amount: String(order.total),
      currency: 'BDT',
      tran_id: String(order._id),
      success_url: `${apiUrl}/api/payments/sslcommerz/return`,
      fail_url: `${apiUrl}/api/payments/sslcommerz/return`,
      cancel_url: `${apiUrl}/api/payments/sslcommerz/return`,
      ipn_url: `${apiUrl}/api/payments/sslcommerz/ipn`,
      cus_name: s.name, cus_email: s.email || 'customer@example.com', cus_phone: s.phone,
      cus_add1: s.address, cus_city: s.district || 'Dhaka', cus_country: 'Bangladesh',
      shipping_method: 'Courier', ship_name: s.name, ship_add1: s.address, ship_city: s.district || 'Dhaka',
      ship_postcode: '1000', ship_country: 'Bangladesh', num_of_item: String(order.items.length),
      product_name: order.items.map((i) => i.name).join(', ').slice(0, 250),
      product_category: 'Food', product_profile: 'physical-goods',
    });
    const r = await fetch(`${ssl.base()}/gwprocess/v4/api.php`, { method: 'POST', body });
    const d = await r.json();
    if (d.status !== 'SUCCESS' || !d.GatewayPageURL) throw new Error(d.failedreason || 'SSLCommerz could not start the payment');
    return { url: d.GatewayPageURL, ref: d.sessionkey };
  },

  // Server-to-server validation; never trust the browser POST on its own.
  async validate(valId) {
    const q = new URLSearchParams({ val_id: valId, store_id: env('SSLCZ_STORE_ID'), store_passwd: env('SSLCZ_STORE_PASSWD'), format: 'json' });
    const r = await fetch(`${ssl.base()}/validator/api/validationserverAPI.php?${q}`);
    return r.json(); // { status: 'VALID' | 'VALIDATED' | 'INVALID_TRANSACTION', tran_id, amount, bank_tran_id, ... }
  },
};

/* ---------------- bKash tokenized checkout ---------------- */
const bkash = {
  configured: () => !!(env('BKASH_APP_KEY') && env('BKASH_APP_SECRET') && env('BKASH_USERNAME') && env('BKASH_PASSWORD')),
  base: () => (env('BKASH_SANDBOX', 'true') === 'true'
    ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout'
    : 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout'),
  token: null,
  tokenAt: 0,

  async grant() {
    if (bkash.token && Date.now() - bkash.tokenAt < 50 * 60 * 1000) return bkash.token;
    const r = await fetch(`${bkash.base()}/token/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', username: env('BKASH_USERNAME'), password: env('BKASH_PASSWORD') },
      body: JSON.stringify({ app_key: env('BKASH_APP_KEY'), app_secret: env('BKASH_APP_SECRET') }),
    });
    const d = await r.json();
    if (!d.id_token) throw new Error(d.statusMessage || 'bKash authentication failed');
    bkash.token = d.id_token; bkash.tokenAt = Date.now();
    return bkash.token;
  },
  async call(path, body) {
    const r = await fetch(`${bkash.base()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: await bkash.grant(), 'X-APP-Key': env('BKASH_APP_KEY') },
      body: JSON.stringify(body),
    });
    return r.json();
  },
  async create({ order, apiUrl }) {
    const d = await bkash.call('/create', {
      mode: '0011', payerReference: order.shipping.phone, callbackURL: `${apiUrl}/api/payments/bkash/callback`,
      amount: String(order.total), currency: 'BDT', intent: 'sale', merchantInvoiceNumber: String(order._id),
    });
    if (!d.bkashURL) throw new Error(d.statusMessage || 'bKash could not start the payment');
    return { url: d.bkashURL, ref: d.paymentID };
  },
  execute: (paymentID) => bkash.call('/execute', { paymentID }),
  query: (paymentID) => bkash.call('/payment/status', { paymentID }),
};

/* ---------------- Couriers ---------------- */
const COURIERS = {
  steadfast: { name: 'Steadfast', api: true, track: (c) => (c.trackingCode ? `https://steadfast.com.bd/t/${c.trackingCode}` : '') },
  pathao: { name: 'Pathao Courier' },
  redx: { name: 'RedX' },
  paperfly: { name: 'Paperfly' },
  ecourier: { name: 'eCourier' },
  sundarban: { name: 'Sundarban Courier' },
  sa_paribahan: { name: 'SA Paribahan' },
  karatoa: { name: 'Karatoa Courier' },
  janani: { name: 'Janani Courier' },
  own: { name: 'Own delivery rider' },
};

const steadfast = {
  configured: () => !!(env('STEADFAST_API_KEY') && env('STEADFAST_SECRET_KEY')),
  base: () => env('STEADFAST_BASE', 'https://portal.packzy.com/api/v1'),
  headers: () => ({ 'Api-Key': env('STEADFAST_API_KEY'), 'Secret-Key': env('STEADFAST_SECRET_KEY'), 'Content-Type': 'application/json' }),
  async create(order) {
    const due = order.payment?.status === 'paid' ? 0 : order.total;
    const r = await fetch(`${steadfast.base()}/create_order`, {
      method: 'POST', headers: steadfast.headers(),
      body: JSON.stringify({
        invoice: String(order._id).slice(-10).toUpperCase(),
        recipient_name: order.shipping.name, recipient_phone: order.shipping.phone,
        recipient_address: [order.shipping.address, order.shipping.district].filter(Boolean).join(', '),
        cod_amount: due, note: order.shipping.note || '',
      }),
    });
    const d = await r.json();
    if (!d.consignment) throw new Error(d.message || 'Steadfast rejected the booking');
    return { consignmentId: String(d.consignment.consignment_id), trackingCode: d.consignment.tracking_code, status: d.consignment.status };
  },
  async status(consignmentId) {
    const r = await fetch(`${steadfast.base()}/status_by_cid/${consignmentId}`, { headers: steadfast.headers() });
    const d = await r.json();
    return d.delivery_status;
  },
};

module.exports = { ssl, bkash, steadfast, COURIERS };
