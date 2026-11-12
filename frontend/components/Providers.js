'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, FREE_OVER } from '@/lib/api';
import { applyAppearance } from '@/lib/theme';
import CartDrawer from './CartDrawer';
import QuickCheckout from './QuickCheckout';
import QuickView from './QuickView';
import { track } from './Analytics';
import { CheckIcon } from './Icons';
import { captureSource } from '@/lib/attribution';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } };

// small product snapshot kept in local storage
export const snap = (p) => ({
  _id: p._id, slug: p.slug, name: p.name, image: p.image, unit: p.unit, price: p.price, salePrice: p.salePrice, stock: p.stock,
  rating: p.rating, numReviews: p.numReviews, category: p.category?.name ? { name: p.category.name, slug: p.category.slug } : undefined,
  variants: p.variants?.map((v) => ({ _id: v._id, label: v.label, color: v.color, hex: v.hex, size: v.size, price: v.price, salePrice: v.salePrice, stock: v.stock, image: v.image })),
});
// cart line identity: a product, or a product + chosen option
export const lineKey = (productId, variantId) => (variantId ? `${productId}:${variantId}` : String(productId));

const DEFAULT_SETTINGS = {
  store: { name: 'Ghorer Bazar', tagline: 'Pure food, honestly sourced' },
  appearance: { theme: 'sage', shape: 'round', hero: 'split', header: 'floating', card: 'glass', listing: 'grid' },
  content: {},
  shipping: { freeOver: FREE_OVER, zones: [{ key: 'dhaka', name: 'Inside Dhaka city', fee: 60, eta: '1-2 days' }, { key: 'outside', name: 'Outside Dhaka', fee: 120, eta: '2-4 days' }] },
  payments: { cod: true, sslcommerz: false, bkash: false, manual: {} },
};

export default function Providers({ children, initialSettings }) {
  const [settings, setSettings] = useState(initialSettings || DEFAULT_SETTINGS);
  const [cart, setCart] = useState([]);
  const [wish, setWish] = useState([]);
  const [recent, setRecent] = useState([]);
  const [compare, setCompare] = useState([]);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [quick, setQuick] = useState(false);
  const [viewing, setViewing] = useState(null); // product slug in the quick-view pop-up
  const [toasts, setToasts] = useState([]);
  const tid = useRef(0);

  useEffect(() => {
    // older carts stored lines without a key
    setCart(read('gb_cart', []).map((i) => ({ ...i, key: i.key || lineKey(i._id, i.variant) })));
    setWish(read('gb_wish', []));
    setRecent(read('gb_recent', []));
    setCompare(read('gb_compare', []));
    const t = read('gb_token', null);
    setToken(t);
    if (t) api('/auth/me', { token: t }).then((r) => setUser(r.user)).catch(() => setToken(null));
    api('/settings').then(setSettings).catch(() => {});
    captureSource(); // remember ad / UTM source for the order
    setReady(true);
  }, []);
  useEffect(() => { applyAppearance(settings.appearance); }, [settings.appearance]);

  useEffect(() => { if (ready) write('gb_cart', cart); }, [cart, ready]);
  useEffect(() => { if (ready) write('gb_wish', wish); }, [wish, ready]);
  useEffect(() => { if (ready) write('gb_recent', recent); }, [recent, ready]);
  useEffect(() => { if (ready) write('gb_compare', compare); }, [compare, ready]);
  useEffect(() => {
    if (!ready) return;
    token ? write('gb_token', token) : localStorage.removeItem('gb_token');
  }, [token, ready]);

  const toast = useCallback((msg) => {
    const id = ++tid.current;
    setToasts((t) => [...t.slice(-2), { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  // Products with options use the chosen variant, or the first one in stock when added from a card.
  const addToCart = (p, qty = 1, { open = true, silent = false, atLeast = false, variant } = {}) => {
    const v = variant || (p.variants?.length ? p.variants.find((x) => x.stock > 0) || null : null);
    if (p.variants?.length && !v) { toast(`${p.name} is sold out`); return false; }
    const key = lineKey(p._id, v?._id);
    const max = (v ? v.stock : p.stock) ?? 99;
    const price = v ? v.salePrice || v.price || p.salePrice || p.price : p.salePrice || p.price;
    setCart((c) => {
      const i = c.findIndex((x) => x.key === key);
      const next = (cur) => Math.min(atLeast ? Math.max(cur, qty) : cur + qty, max);
      if (i >= 0) return c.map((x, j) => (j === i ? { ...x, qty: next(x.qty) } : x));
      return [...c, { key, _id: p._id, variant: v?._id, variantLabel: v?.label, hex: v?.hex, slug: p.slug, name: p.name, image: v?.image || p.image, unit: v?.size || p.unit, price, stock: max, qty: Math.min(qty, max) }];
    });
    track('add_to_cart', { value: price * qty, items: [{ item_id: p._id, item_name: p.name, quantity: qty, price }] });
    if (!silent) toast(`${p.name}${v ? ` (${v.label})` : ''} added to your bag`);
    if (open) setDrawer(true);
    return true;
  };
  const buyNow = (p, qty = 1, variant) => {
    if (addToCart(p, qty, { open: false, silent: true, atLeast: true, variant }) === false) return;
    setViewing(null); setDrawer(false); setQuick(true);
  };
  const openQuick = () => { setDrawer(false); setQuick(true); };

  const setQty = (key, qty) =>
    setCart((c) => (qty < 1 ? c.filter((x) => x.key !== key) : c.map((x) => (x.key === key ? { ...x, qty: Math.min(qty, x.stock ?? 99) } : x))));
  const clearCart = () => setCart([]);

  const inWish = (id) => wish.some((w) => w._id === id);
  const toggleWish = (p) => {
    const on = inWish(p._id);
    setWish((w) => (on ? w.filter((x) => x._id !== p._id) : [snap(p), ...w]));
    toast(on ? 'Removed from wishlist' : 'Saved to wishlist');
  };
  const inCompare = (id) => compare.some((c) => c._id === id);
  const toggleCompare = (p) => {
    if (inCompare(p._id)) { setCompare((c) => c.filter((x) => x._id !== p._id)); return; }
    if (compare.length >= 4) { toast('You can compare up to 4 products'); return; }
    setCompare((c) => [...c, snap(p)]);
    toast('Added to compare');
  };
  const addRecent = useCallback((p) => setRecent((r) => [snap(p), ...r.filter((x) => x._id !== p._id)].slice(0, 8)), []);

  const login = (t, u) => { setToken(t); setUser(u); };
  const logout = () => { setToken(null); setUser(null); toast('You have been logged out'); };

  const feeFor = (subtotal, zoneKey) => {
    const { freeOver, zones } = settings.shipping;
    const z = zones.find((x) => x.key === zoneKey) || zones[zones.length - 1];
    return !z ? 0 : freeOver && subtotal >= freeOver ? 0 : z.fee;
  };

  return (
    <Ctx.Provider value={{
      settings, setSettings, feeFor,
      cart, addToCart, buyNow, setQty, clearCart, wish, inWish, toggleWish, recent, addRecent,
      compare, setCompare, inCompare, toggleCompare, viewing, setViewing,
      token, user, setUser, login, logout, ready, drawer, setDrawer, quick, setQuick, openQuick, toast,
    }}>
      {children}
      <CartDrawer />
      <QuickView />
      <QuickCheckout />
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast"><span className="tick"><CheckIcon size={14} /></span>{t.msg}</div>)}
      </div>
    </Ctx.Provider>
  );
}
