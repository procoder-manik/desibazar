'use client';
import { api } from './api';

// Remembers where the visitor came from (ad click ids and UTM tags) so it can be saved on the order.
const KEY = 'gb_src';
const DAYS = 30;

export function captureSource() {
  if (typeof window === 'undefined') return;
  try {
    const q = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(['source', 'medium', 'campaign', 'content', 'term'].map((k) => [k, q.get('utm_' + k) || undefined]).filter(([, v]) => v));
    const fbclid = q.get('fbclid'); const gclid = q.get('gclid');
    const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : '';
    if (!Object.keys(utm).length && !fbclid && !gclid && !ref) return; // nothing new: keep the last touch
    const prev = JSON.parse(localStorage.getItem(KEY) || '{}');
    localStorage.setItem(KEY, JSON.stringify({
      utm: Object.keys(utm).length ? utm : prev.utm,
      fbclid: fbclid || prev.fbclid, gclid: gclid || prev.gclid, referrer: ref || prev.referrer,
      fbcAt: fbclid ? Date.now() : prev.fbcAt, at: Date.now(),
    }));
  } catch { /* storage blocked */ }
}

const cookie = (n) => (typeof document === 'undefined' ? undefined : document.cookie.split('; ').find((c) => c.startsWith(n + '='))?.split('=')[1]);

export function source(extra = {}) {
  let s = {};
  try {
    s = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (s.at && Date.now() - s.at > DAYS * 864e5) s = {};
  } catch { /* ignore */ }
  return {
    utm: s.utm, fbclid: s.fbclid, gclid: s.gclid, referrer: s.referrer,
    fbp: cookie('_fbp'), fbc: cookie('_fbc') || (s.fbclid ? `fb.1.${s.fbcAt || Date.now()}.${s.fbclid}` : undefined),
    url: typeof window !== 'undefined' ? window.location.href.split('#')[0] : undefined,
    ...extra,
  };
}

// One id per browser session, so the same visitor's checkout is saved as one incomplete order.
export function leadKey() {
  try {
    let k = sessionStorage.getItem('gb_lead');
    if (!k) { k = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)); sessionStorage.setItem('gb_lead', k); }
    return k;
  } catch { return undefined; }
}
export const resetLeadKey = () => { try { sessionStorage.removeItem('gb_lead'); } catch { /* ignore */ } };

let timer;
let last = '';
// Save the checkout as an incomplete order once the phone number is valid (debounced, only when something changed).
export function saveLead({ name, phone, address, district, items, landing }) {
  const p = String(phone || '').replace(/[\s-]/g, '').replace(/^\+?88/, '');
  if (!/^01[3-9]\d{8}$/.test(p)) return;
  const body = { key: leadKey(), name, phone: p, address, district, landing, items: (items || []).map((i) => ({ product: i.product || i._id, qty: i.qty, price: i.price, variantLabel: i.variantLabel })) };
  const sig = JSON.stringify(body);
  if (sig === last) return;
  clearTimeout(timer);
  timer = setTimeout(() => { last = sig; api('/leads', { method: 'POST', body }).catch(() => {}); }, 1500);
}
