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
