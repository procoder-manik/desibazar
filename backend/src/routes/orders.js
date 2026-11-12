const crypto = require('crypto');
const router = require('express').Router();
const { Order, Product, Coupon, User, ORDER_STATUSES, PAYMENT_METHODS } = require('../models');
const { auth, admin, optionalAuth } = require('../middleware/auth');
const { getSettings, deliveryFee, couponDiscount } = require('../pricing');
const { steadfast, COURIERS } = require('../gateways');

const { orderEmail, adminNewOrder } = require('../mailer');

// Atomically take stock for one line (variant-level when the line has a variant).
const take = (l) => (l.variant
  ? Product.updateOne({ _id: l.product, variants: { $elemMatch: { _id: l.variant, stock: { $gte: l.qty } } } }, { $inc: { 'variants.$.stock': -l.qty, stock: -l.qty, sold: l.qty } })
  : Product.updateOne({ _id: l.product, stock: { $gte: l.qty } }, { $inc: { stock: -l.qty, sold: l.qty } }));
const giveBack = (l) => (l.variant
  ? Product.updateOne({ _id: l.product, 'variants._id': l.variant }, { $inc: { 'variants.$.stock': l.qty, stock: l.qty, sold: -l.qty } })
  : Product.updateOne({ _id: l.product }, { $inc: { stock: l.qty, sold: -l.qty } }));
const restock = (order) => Promise.all(order.items.map(giveBack));
const normPhone = (p) => String(p || '').replace(/[\s-]/g, '').replace(/^\+?88/, '');
const canSee = (o, req) =>
  (req.user && (String(o.user) === String(req.user._id) || req.user.role === 'admin')) ||
  (req.query.key && o.accessKey && req.query.key === o.accessKey);

// which payment methods are switched on and usable right now
function methodAllowed(settings, method) {
  const p = settings.payments;
  if (method === 'cod') return p.cod;
  if (method === 'sslcommerz') return p.sslcommerz && require('../gateways').ssl.configured();
  if (method === 'bkash') return p.bkash && require('../gateways').bkash.configured();
  const key = method.replace('manual_', '');
  return method.startsWith('manual_') && p.manual && !!p.manualNumbers?.[key];
}

/* ---------- place order (customer or guest) ---------- */
router.post('/', require('../security').limits.order, optionalAuth, async (req, res) => {
  const { items, shipping = {}, coupon, saveAddress } = req.body;
  const paymentMethod = PAYMENT_METHODS.includes(req.body.paymentMethod) ? req.body.paymentMethod : 'cod';
  const settings = await getSettings();

  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Your bag is empty' });
  if (!shipping.name?.trim() || !shipping.phone?.trim() || !shipping.address?.trim())
    return res.status(400).json({ error: 'Name, phone and address are required' });
  if (!/^01[3-9]\d{8}$/.test(normPhone(shipping.phone)))
    return res.status(400).json({ error: 'Enter a valid Bangladeshi mobile number (01XXXXXXXXX)' });
  if (!methodAllowed(settings, paymentMethod)) return res.status(400).json({ error: 'That payment method is not available' });
  if (paymentMethod.startsWith('manual_') && (!req.body.trxId?.trim() || !req.body.sender?.trim()))
    return res.status(400).json({ error: 'Enter the sender number and transaction ID of your payment' });

  if (items.length > 50) return res.status(400).json({ error: 'Too many items in one order' });
  const products = await Product.find({ _id: { $in: items.map((i) => i.product) }, active: { $ne: false } });
  const lines = [];
  for (const i of items) {
    const p = products.find((x) => String(x._id) === String(i.product));
    const qty = Math.min(99, Math.max(1, parseInt(i.qty, 10) || 1));
    if (!p) return res.status(400).json({ error: 'A product in your bag is no longer available' });
    if (p.variants?.length) {
      const v = p.variants.id(i.variant);
      if (!v) return res.status(400).json({ error: `Please choose an option for ${p.name}` });
      if (v.stock < qty) return res.status(400).json({ error: `Only ${v.stock} left of ${p.name} (${v.label})` });
      const price = v.salePrice || v.price || p.salePrice || p.price;
      lines.push({ product: p._id, variant: v._id, variantLabel: v.label, name: p.name, image: v.image || p.image, unit: v.size || p.unit, qty, price });
    } else {
      if (p.stock < qty) return res.status(400).json({ error: `Only ${p.stock} left of ${p.name}` });
      lines.push({ product: p._id, name: p.name, image: p.image, unit: p.unit, qty, price: p.salePrice || p.price });
    }
  }

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  let discount = 0;
  let couponDoc = null;
  if (coupon) {
    couponDoc = await Coupon.findOne({ code: String(coupon).toUpperCase().trim() });
    const r = couponDiscount(couponDoc, subtotal);
    if (r.error) return res.status(400).json({ error: r.error });
    discount = r.discount;
  }
  const ship = deliveryFee(settings, subtotal, shipping.zone);
  if (ship.error) return res.status(400).json({ error: ship.error });

  // reserve stock atomically; roll back if any line fails
  const done = [];
  for (const l of lines) {
    const r = await take(l);
    if (!r.modifiedCount) {
      await Promise.all(done.map(giveBack));
      return res.status(409).json({ error: `${l.name} just went out of stock` });
    }
    done.push(l);
  }

  const total = subtotal - discount + ship.fee;
  const order = await Order.create({
    user: req.user?._id,
    accessKey: crypto.randomBytes(16).toString('hex'),
    items: lines,
    shipping: {
      name: shipping.name.trim(), phone: normPhone(shipping.phone), email: shipping.email?.trim(),
      address: shipping.address.trim(), district: shipping.district, zone: ship.zone.key, zoneName: ship.zone.name, note: shipping.note?.trim(),
    },
    paymentMethod,
    payment: paymentMethod.startsWith('manual_')
      ? { status: 'submitted', trxId: req.body.trxId.trim(), sender: normPhone(req.body.sender), amount: total }
      : { status: 'unpaid' },
    coupon: couponDoc?.code,
    subtotal, discount, deliveryFee: ship.fee, total,
    history: [{ status: 'pending' }],
  });
  if (couponDoc) await Coupon.updateOne({ _id: couponDoc._id }, { $inc: { used: 1 } });
  if (req.user && saveAddress) await User.updateOne({ _id: req.user._id }, { address: shipping.address.trim(), area: ship.zone.key === 'outside' ? 'outside' : 'inside' });
  if (!order.shipping.email && req.user?.email) order.shipping.email = req.user.email; // send the receipt to the account e-mail
  orderEmail(settings, order, 'orderPlaced');
  adminNewOrder(settings, order);
  res.status(201).json(order);
});

router.get('/mine', auth, async (req, res) =>
  res.json(await Order.find({ user: req.user._id }).select('-accessKey').sort('-createdAt')));

/* ---------- admin: dashboard numbers ---------- */
router.get('/stats', auth, admin, async (_req, res) => {
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 13);
  const [byStatus, revenue, daily, lowStock, totalProducts, byMethod, unpaid] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { status: { $nin: ['cancelled', 'returned'] } } }, { $group: { _id: null, sum: { $sum: '$total' }, n: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $nin: ['cancelled', 'returned'] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+06:00' } }, sum: { $sum: '$total' }, n: { $sum: 1 } } },
    ]),
    Product.find({ stock: { $lt: 10 } }).select('name stock slug').sort('stock').limit(10),
    Product.countDocuments(),
    Order.aggregate([{ $group: { _id: '$paymentMethod', n: { $sum: 1 }, sum: { $sum: '$total' } } }]),
    Order.countDocuments({ 'payment.status': 'submitted' }),
  ]);
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since); d.setDate(since.getDate() + i);
    const key = new Date(d.getTime() + 6 * 3600e3).toISOString().slice(0, 10);
    const hit = daily.find((x) => x._id === key);
    days.push({ day: key, revenue: hit?.sum || 0, orders: hit?.n || 0 });
  }
  res.json({
    revenue: revenue[0]?.sum || 0,
    orders: revenue[0]?.n || 0,
    byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
    byMethod: Object.fromEntries(byMethod.map((s) => [s._id, { n: s.n, sum: s.sum }])),
    awaitingVerification: unpaid,
    days, lowStock, totalProducts,
  });
});

/* ---------- admin: list with search + filters ---------- */
router.get('/', auth, admin, async (req, res) => {
  const { status, payment, q } = req.query;
  const f = {};
  if (status) f.status = status;
  if (payment) f['payment.status'] = payment;
  if (q) {
    const s = String(q).trim().replace(/^#/, '');
    const re = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    f.$or = [{ 'shipping.name': re }, { 'shipping.phone': re }, { 'courier.consignmentId': re }, ...(/^[a-f0-9]{24}$/i.test(s) ? [{ _id: s }] : [])];
  }
  let list = await Order.find(f).populate('user', 'name phone').sort('-createdAt').limit(300);
  if (q && /^[a-f0-9]{4,8}$/i.test(String(q).replace(/^#/, ''))) {
    // short order numbers (#A1B2C3) are the tail of the id
    const tail = String(q).replace(/^#/, '').toLowerCase();
    const more = await Order.find({ ...(status && { status }) }).sort('-createdAt').limit(1000);
    list = [...list, ...more.filter((o) => String(o._id).endsWith(tail) && !list.some((x) => String(x._id) === String(o._id)))];
  }
  res.json(list);
});

router.get('/:id', optionalAuth, async (req, res) => {
  const o = await Order.findById(req.params.id).catch(() => null);
  if (!o || !canSee(o, req)) return res.status(404).json({ error: 'Order not found' });
  res.json(o);
});

// customers (or guests holding the key) may cancel while pending
router.patch('/:id/cancel', optionalAuth, async (req, res) => {
  const o = await Order.findById(req.params.id).catch(() => null);
  if (!o || !canSee(o, req)) return res.status(404).json({ error: 'Order not found' });
  if (o.status !== 'pending') return res.status(400).json({ error: 'Only pending orders can be cancelled' });
  o.status = 'cancelled';
  o.history.push({ status: 'cancelled', note: 'Cancelled by customer' });
  await o.save();
  await restock(o);
  orderEmail(await getSettings(), o, 'cancelled');
  res.json(o);
});

/* ---------- admin: update status / payment / courier / note ---------- */
router.patch('/:id', auth, admin, async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  const { status, paymentStatus, courier, adminNote, refundAmount, note } = req.body;
  const CLOSED = ['cancelled', 'returned'];
  const events = [];

  if (status && status !== o.status) {
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const wasClosed = CLOSED.includes(o.status);
    const nowClosed = CLOSED.includes(status);
    if (!wasClosed && nowClosed) await restock(o);
    if (wasClosed && !nowClosed) {
      // re-opening a cancelled / returned order: take the stock back, all or nothing
      const done = [];
      for (const l of o.items) {
        if (!(await take(l)).modifiedCount) {
          await Promise.all(done.map(giveBack));
          return res.status(409).json({ error: `Not enough stock of ${l.name}${l.variantLabel ? ` (${l.variantLabel})` : ''} to reopen this order` });
        }
        done.push(l);
      }
    }
    o.status = status;
    o.history.push({ status, note: note || (wasClosed && !nowClosed ? 'Order reopened' : undefined) });
    if (status === 'delivered' && o.paymentMethod === 'cod' && !['paid', 'refunded'].includes(o.payment.status)) {
      o.payment.status = 'paid'; o.payment.paidAt = new Date(); o.payment.amount = o.total;
    }
    if (['confirmed', 'shipped', 'delivered', 'cancelled', 'returned'].includes(status)) events.push(status);
  }
  if (paymentStatus && paymentStatus !== o.payment.status) {
    if (!['unpaid', 'submitted', 'paid', 'failed', 'refunded'].includes(paymentStatus)) return res.status(400).json({ error: 'Invalid payment status' });
    const prev = o.payment.status;
    o.payment.status = paymentStatus;
    if (paymentStatus === 'paid') { o.payment.paidAt = o.payment.paidAt || new Date(); o.payment.amount = o.payment.amount || o.total; o.payment.refundedAt = undefined; o.payment.refundAmount = undefined; }
    if (paymentStatus === 'refunded') {
      const amt = Number(refundAmount) > 0 ? Math.min(Number(refundAmount), o.total) : (o.payment.amount || o.total);
      o.payment.refundedAt = new Date(); o.payment.refundAmount = amt;
      events.push('refunded');
    }
    if (prev === 'refunded' && paymentStatus !== 'refunded') { o.payment.refundedAt = undefined; o.payment.refundAmount = undefined; }
    o.history.push({ status: o.status, note: `Payment ${prev} → ${paymentStatus}${paymentStatus === 'refunded' ? ` (৳${o.payment.refundAmount})` : ''}` });
  }
  if (courier) {
    const key = courier.name;
    if (key && !COURIERS[key]) return res.status(400).json({ error: 'Unknown courier' });
    o.courier = { ...(o.toObject().courier || {}), ...courier };
    if (key && COURIERS[key].track && !courier.trackingUrl) o.courier.trackingUrl = COURIERS[key].track(o.courier);
    if (!o.courier.bookedAt && (courier.consignmentId || courier.trackingCode)) o.courier.bookedAt = new Date();
  }
  if (adminNote !== undefined) o.adminNote = adminNote;
  await o.save();
  if (events.length) { const s = await getSettings(); for (const ev of events) orderEmail(s, o, ev); }
  res.json(o);
});

// book with a courier API (Steadfast) and move the order to "shipped"
router.post('/:id/book', auth, admin, async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  if (['cancelled', 'returned', 'delivered'].includes(o.status)) return res.status(400).json({ error: `Order is ${o.status}` });
  if (o.courier?.consignmentId) return res.status(400).json({ error: 'Already booked' });
  if (req.body.courier !== 'steadfast') return res.status(400).json({ error: 'Automatic booking is available for Steadfast; enter other couriers manually' });
  if (!steadfast.configured()) return res.status(400).json({ error: 'Add STEADFAST_API_KEY and STEADFAST_SECRET_KEY to backend/.env first' });
  const c = await steadfast.create(o);
  o.courier = { name: 'steadfast', ...c, trackingUrl: COURIERS.steadfast.track(c), bookedAt: new Date() };
  const newlyShipped = o.status !== 'shipped';
  if (newlyShipped) { o.status = 'shipped'; o.history.push({ status: 'shipped', note: `Booked with Steadfast (${c.consignmentId})` }); }
  await o.save();
  if (newlyShipped) orderEmail(await getSettings(), o, 'shipped');
  res.json(o);
});

router.post('/:id/courier-status', auth, admin, async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o?.courier?.consignmentId || o.courier.name !== 'steadfast') return res.status(400).json({ error: 'No Steadfast booking on this order' });
  o.courier.status = await steadfast.status(o.courier.consignmentId);
  await o.save();
  res.json(o);
});

module.exports = router;
