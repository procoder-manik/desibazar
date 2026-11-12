const ENV_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// In the browser, follow the host the page was opened from (localhost, 127.0.0.1 or a LAN IP)
// so requests are not cross-host when the env value points at localhost.
const base = () => {
  if (typeof window === 'undefined') return ENV_BASE;
  try {
    const u = new URL(ENV_BASE);
    if (['localhost', '127.0.0.1'].includes(u.hostname)) u.hostname = window.location.hostname;
    return u.toString().replace(/\/$/, '');
  } catch { return ENV_BASE; }
};

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(base() + path, {
    method,
    cache: 'no-store', // prices and stock change; never serve Next's cached copy
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// display mirror of backend/src/pricing.js (server recomputes on order)
export const FEES = { inside: 60, outside: 120 };
export const FREE_OVER = 3000;
export const deliveryFee = (subtotal, area) => (subtotal >= FREE_OVER ? 0 : FEES[area === 'outside' ? 'outside' : 'inside']);

export const taka = (n) => '৳' + Number(n).toLocaleString('en-BD');

export const apiBase = base;
