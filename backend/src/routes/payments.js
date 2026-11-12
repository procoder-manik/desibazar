// Online payment flows. The browser is sent to the gateway, the gateway sends it back here,
// we verify server-to-server, then redirect to the order page on the storefront.
// For cash-on-delivery orders with an advance, the gateway only charges the advance.
const router = require('express').Router();
const express = require('express');
const { Order } = require('../models');
const { optionalAuth } = require('../middleware/auth');
const { ssl, bkash } = require('../gateways');
const { dueOnline } = require('../pricing');

const apiUrl = (req) => process.env.API_URL || `${req.protocol}://${req.get('host')}`;
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0].trim();
const back = (o, result) => `${clientUrl()}/orders/${o._id}?key=${o.accessKey}&payment=${result}`;
const advanceDue = (o) => o.paymentMethod === 'cod' && o.advance?.required && o.advance.status !== 'paid';

async function payable(req, res) {
  const o = await Order.findById(req.body.orderId).catch(() => null);
  const allowed = o && ((req.user && String(o.user) === String(req.user._id)) || req.body.key === o.accessKey);
  if (!allowed) { res.status(404).json({ error: 'Order not found' }); return null; }
  if (o.status === 'cancelled') { res.status(400).json({ error: 'This order was cancelled' }); return null; }
  if (!advanceDue(o) && o.payment.status === 'paid') { res.status(400).json({ error: 'This order is already paid' }); return null; }
  if (o.paymentMethod === 'cod' && !advanceDue(o)) { res.status(400).json({ error: 'This order is paid on delivery' }); return null; }
  return o;
}

function failed(o) {
  if (advanceDue(o)) o.advance.status = 'failed';
  else if (o.payment.status !== 'paid') o.payment.status = 'failed';
  return o.save();
}

async function markPaid(o, { trxId, ref, amount, via }) {
  if (advanceDue(o)) {
    o.advance.status = 'paid'; o.advance.trxId = trxId; o.advance.gatewayRef = ref; o.advance.paidAt = new Date();
    o.history.push({ status: o.status, note: `Advance ৳${amount} paid via ${via}` });
  } else {
    if (o.payment.status === 'paid') return o;
    o.payment = { ...o.toObject().payment, status: 'paid', trxId, gatewayRef: ref, amount, paidAt: new Date() };
    o.history.push({ status: o.status, note: `Paid ${amount} via ${via}` });
  }
  if (o.status === 'pending') { o.status = 'confirmed'; o.history.push({ status: 'confirmed', note: 'Auto-confirmed after online payment' }); }
  return o.save();
}

/* ---------- which online methods are usable (shown at checkout) ---------- */
router.get('/methods', (_req, res) => res.json({ sslcommerz: ssl.configured(), bkash: bkash.configured() }));

/* ---------- SSLCommerz ---------- */
router.post('/sslcommerz/init', optionalAuth, async (req, res) => {
  if (!ssl.configured()) return res.status(400).json({ error: 'SSLCommerz is not configured' });
  const o = await payable(req, res); if (!o) return;
  const { url, ref } = await ssl.init({ order: o, apiUrl: apiUrl(req), amount: dueOnline(o) });
  if (advanceDue(o)) o.advance.gatewayRef = ref; else o.payment.gatewayRef = ref;
  await o.save();
  res.json({ url });
});

const sslOk = (v, o) => ['VALID', 'VALIDATED'].includes(v.status) && v.tran_id === String(o._id) && Number(v.amount) >= dueOnline(o);

// SSLCommerz posts the browser back here (form-encoded) for success, fail and cancel
router.post('/sslcommerz/return', express.urlencoded({ extended: false }), async (req, res) => {
  const o = await Order.findById(req.body.tran_id).catch(() => null);
  if (!o) return res.redirect(303, clientUrl());
  if (req.body.status !== 'VALID' || !req.body.val_id) {
    await failed(o);
    return res.redirect(303, back(o, req.body.status === 'CANCELLED' ? 'cancelled' : 'failed'));
  }
  const v = await ssl.validate(req.body.val_id);
  if (!sslOk(v, o)) { await failed(o); return res.redirect(303, back(o, 'failed')); }
  await markPaid(o, { trxId: v.bank_tran_id, ref: req.body.val_id, amount: Number(v.amount), via: `SSLCommerz (${v.card_type || 'online'})` });
  res.redirect(303, back(o, 'success'));
});

// server-to-server notification (needs a public API_URL to reach us)
router.post('/sslcommerz/ipn', express.urlencoded({ extended: false }), async (req, res) => {
  const o = await Order.findById(req.body.tran_id).catch(() => null);
  if (o && req.body.val_id) {
    const v = await ssl.validate(req.body.val_id);
    if (sslOk(v, o)) await markPaid(o, { trxId: v.bank_tran_id, ref: req.body.val_id, amount: Number(v.amount), via: 'SSLCommerz IPN' });
  }
  res.json({ ok: true });
});

/* ---------- bKash tokenized ---------- */
router.post('/bkash/init', optionalAuth, async (req, res) => {
  if (!bkash.configured()) return res.status(400).json({ error: 'bKash is not configured' });
  const o = await payable(req, res); if (!o) return;
  const { url, ref } = await bkash.create({ order: o, apiUrl: apiUrl(req), amount: dueOnline(o) });
  if (advanceDue(o)) o.advance.gatewayRef = ref; else o.payment.gatewayRef = ref;
  await o.save();
  res.json({ url });
});

router.get('/bkash/callback', async (req, res) => {
  const { paymentID, status } = req.query;
  const o = await Order.findOne({ $or: [{ 'payment.gatewayRef': paymentID }, { 'advance.gatewayRef': paymentID }] }).catch(() => null);
  if (!o) return res.redirect(303, clientUrl());
  if (status !== 'success') {
    await failed(o);
    return res.redirect(303, back(o, status === 'cancel' ? 'cancelled' : 'failed'));
  }
  let d = await bkash.execute(paymentID);
  if (d.transactionStatus !== 'Completed') d = await bkash.query(paymentID); // execute can time out after success
  const ok = d.transactionStatus === 'Completed' && Number(d.amount) >= dueOnline(o);
  if (!ok) { await failed(o); return res.redirect(303, back(o, 'failed')); }
  await markPaid(o, { trxId: d.trxID, ref: paymentID, amount: Number(d.amount), via: 'bKash' });
  res.redirect(303, back(o, 'success'));
});

module.exports = router;
