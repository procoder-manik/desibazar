'use client';
import { useEffect, useState } from 'react';
import { api } from './api';
import { resetLeadKey, leadKey, source } from './attribution';
import { track, gaItem } from '@/components/Analytics';

// Shared by the store checkout, the quick-checkout pop-up and landing pages:
// place the order, report the purchase to every tag, then go to the payment gateway or the order page.
export async function placeOrder({ body, token, sourceExtra, toast, router }) {
  const o = await api('/orders', { method: 'POST', token, body: { ...body, leadKey: leadKey(), source: source(sourceExtra) } });
  resetLeadKey();
  track('purchase', {
    transaction_id: String(o._id), value: o.total, shipping: o.deliveryFee, coupon: o.coupon,
    items: o.items.map(gaItem),
  }, { eventId: `purchase-${o._id}` });

  const online = (m) => m === 'sslcommerz' || m === 'bkash';
  const payNow = online(o.paymentMethod) ? o.paymentMethod : o.advance?.required && o.advance.status === 'unpaid' && online(o.advance.method) ? o.advance.method : null;
  if (payNow) {
    toast?.('Redirecting to secure payment...');
    try {
      const r = await api(`/payments/${payNow}/init`, { method: 'POST', token, body: { orderId: o._id, key: o.accessKey } });
      window.location.href = r.url;
      return o;
    } catch (e) {
      toast?.(e.message);
    }
  }
  toast?.('Order placed successfully');
  router.push(`/orders/${o._id}?key=${o.accessKey}&placed=1`);
  return o;
}

// Methods the customer can use to pay a cash-on-delivery advance.
export function advanceMethods(pay) {
  return [
    ...Object.keys(pay.manual || {}).map((k) => `manual_${k}`),
    pay.bkash && 'bkash', pay.sslcommerz && 'sslcommerz',
  ].filter(Boolean);
}

// Advance due for cash on delivery (mirror of backend/src/pricing.js advanceFor). `required` comes from useAdvanceRequired.
export function advanceDue(pay, method, fee, total, required) {
  const a = pay.codAdvance;
  if (method !== 'cod' || !a?.enabled || !required) return 0;
  const amt = a.type === 'fixed' ? Number(a.amount) || 0 : fee;
  return Math.max(0, Math.min(Math.round(amt), total));
}

// Asks the server whether this bag needs the advance (products can follow, require or skip the store setting).
export function useAdvanceRequired(items, enabled) {
  const [required, setRequired] = useState(false);
  const sig = (items || []).map((i) => i.product || i._id).sort().join(',');
  useEffect(() => {
    if (!enabled || !sig) { setRequired(false); return undefined; }
    let live = true;
    api('/orders/advance-check', { method: 'POST', body: { items: sig.split(',').map((product) => ({ product })) } }).then((r) => live && setRequired(!!r.required)).catch(() => live && setRequired(true));
    return () => { live = false; };
  }, [sig, enabled]);
  return required;
}
