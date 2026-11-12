'use client';
import { usePathname } from 'next/navigation';
import { useApp } from './Providers';
import { BagIcon } from './Icons';
import { taka } from '@/lib/api';

// Bag button fixed on the right edge: item count and total, opens the cart drawer.
// Switch it off in Admin → Appearance → Floating bag button.
export default function FloatingCart() {
  const { cart, setDrawer, settings } = useApp();
  const path = usePathname() || '';
  if (settings.appearance?.floatingCart === false) return null;
  if (/^\/(admin|checkout|cart|lp\/)/.test(path)) return null;
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  return (
    <button type="button" className={'float-cart' + (count ? ' has' : '')} onClick={() => setDrawer(true)} aria-label={`Open bag, ${count} items, ${taka(total)}`}>
      <span className="fc-top"><BagIcon size={22} /><small>{count} {count === 1 ? 'Item' : 'Items'}</small></span>
      <b>{taka(total)}</b>
    </button>
  );
}
