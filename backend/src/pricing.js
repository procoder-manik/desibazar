// Store settings + money maths. The backend is the only place prices, fees and discounts are decided.
const { Settings } = require('./models');

let cache = null;
async function getSettings() {
  if (cache) return cache;
  cache = await Settings.findOne({ key: 'store' });
  if (!cache) cache = await Settings.create({ key: 'store' });
  return cache;
}
const resetSettings = () => { cache = null; };

// Fee for a shipping zone; falls back to the most expensive active zone for unknown keys.
function deliveryFee(settings, subtotal, zoneKey) {
  const { freeOver, zones } = settings.shipping;
  const active = zones.filter((z) => z.active !== false);
  const zone = active.find((z) => z.key === zoneKey) || [...active].sort((a, b) => b.fee - a.fee)[0];
  if (!zone) return { error: 'Delivery is not available right now' };
  return { zone, fee: freeOver && subtotal >= freeOver ? 0 : zone.fee };
}

// Returns { discount } or { error } for a coupon document against a subtotal.
function couponDiscount(c, subtotal) {
  if (!c || !c.active) return { error: 'Invalid coupon code' };
  if (c.expiresAt && c.expiresAt < new Date()) return { error: 'This coupon has expired' };
  if (c.usageLimit && c.used >= c.usageLimit) return { error: 'This coupon has reached its usage limit' };
  if (subtotal < (c.minSubtotal || 0)) return { error: `Spend at least ৳${c.minSubtotal} to use this coupon` };
  let d = c.type === 'percent' ? Math.round((subtotal * c.value) / 100) : c.value;
  if (c.maxDiscount) d = Math.min(d, c.maxDiscount);
  return { discount: Math.min(d, subtotal) };
}

module.exports = { getSettings, resetSettings, deliveryFee, couponDiscount };

// Advance delivery charge settings (Shipping → Advance delivery charge). Falls back to the older Payments switch.
function advanceConfig(settings) {
  const a = settings.shipping?.advance;
  if (a?.enabled) return { enabled: true, scope: a.scope === 'products' ? 'products' : 'all', type: a.type === 'fixed' ? 'fixed' : 'delivery', amount: a.amount || 0, note: a.note || '' };
  const old = settings.payments?.codAdvance;
  if (old?.enabled) return { enabled: true, scope: 'all', type: old.type === 'fixed' ? 'fixed' : 'delivery', amount: old.amount || 0, note: old.note || '' };
  return { enabled: false, scope: a?.scope === 'products' ? 'products' : 'all', type: a?.type === 'fixed' ? 'fixed' : 'delivery', amount: a?.amount || 0, note: a?.note || '' };
}

// Does an order with these products need the advance? Each product follows the store setting, or is forced on / off.
function advanceRequired(settings, products) {
  const a = advanceConfig(settings);
  if (!a.enabled) return false;
  return products.some((p) => p.advanceShipping === 'require' || (a.scope === 'all' && p.advanceShipping !== 'exempt'));
}

// Advance to collect now for a cash-on-delivery order (0 when it is off, not required or nothing is due).
function advanceFor(settings, method, fee, total, required) {
  if (method !== 'cod' || !required) return 0;
  const a = advanceConfig(settings);
  const amt = a.type === 'fixed' ? Number(a.amount) || 0 : fee;
  return Math.max(0, Math.min(Math.round(amt), total));
}

// What an online payment for this order should charge: the advance for COD orders, otherwise the full total.
const dueOnline = (o) => (o.paymentMethod === 'cod' && o.advance?.required && o.advance.status !== 'paid' ? o.advance.amount : o.total);

module.exports.advanceFor = advanceFor;
module.exports.advanceConfig = advanceConfig;
module.exports.advanceRequired = advanceRequired;
module.exports.dueOnline = dueOnline;
