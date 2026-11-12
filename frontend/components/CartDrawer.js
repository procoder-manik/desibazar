'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useApp } from './Providers';
import { FREE_OVER, taka } from '@/lib/api';
import { BagIcon, BoltIcon, CloseIcon, MinusIcon, PlusIcon, TruckIcon } from './Icons';

export function FreeBar({ subtotal }) {
  const freeOver = useApp()?.settings?.shipping?.freeOver ?? FREE_OVER;
  if (!freeOver) return null;
  const left = freeOver - subtotal;
  const pct = Math.min(100, (subtotal / freeOver) * 100);
  return (
    <div className="freebar">
      <p><TruckIcon size={16} />{left > 0 ? <>Add <b>{taka(left)}</b> more for free delivery</> : <>You&apos;ve unlocked <b>free delivery</b></>}</p>
      <div className="track"><span style={{ width: pct + '%' }} /></div>
    </div>
  );
}

export function QtyStepper({ value, onChange, max, small }) {
  return (
    <div className={'stepper' + (small ? ' sm' : '')}>
      <button type="button" onClick={() => onChange(value - 1)} aria-label="Decrease quantity"><MinusIcon size={14} /></button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={max !== undefined && value >= max} aria-label="Increase quantity"><PlusIcon size={14} /></button>
    </div>
  );
}

export default function CartDrawer() {
  const { cart, setQty, drawer, setDrawer, openQuick } = useApp();
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [drawer, setDrawer]);

  return (
    <>
      <div className={'scrim' + (drawer ? ' on' : '')} onClick={() => setDrawer(false)} />
      <aside className={'drawer' + (drawer ? ' on' : '')} aria-hidden={!drawer} aria-label="Shopping bag">
        <div className="drawer-head">
          <h3>Your bag <small>{count} {count === 1 ? 'item' : 'items'}</small></h3>
          <button className="iconbtn" onClick={() => setDrawer(false)} aria-label="Close"><CloseIcon /></button>
        </div>
        {cart.length === 0 ? (
          <div className="drawer-empty">
            <span className="empty-ico"><BagIcon size={28} /></span>
            <p>Your bag is empty</p>
            <Link href="/shop" className="btn" onClick={() => setDrawer(false)}>Start shopping</Link>
          </div>
        ) : (
          <>
            <FreeBar subtotal={subtotal} />
            <div className="drawer-items">
              {cart.map((i) => (
                <div className="ditem" key={i.key}>
                  <Link href={`/product/${i.slug || ''}`} onClick={() => setDrawer(false)}><img src={i.image} alt="" /></Link>
                  <div>
                    <h4>{i.name}</h4>
                    <small>{i.variantLabel || i.unit}</small>
                    <QtyStepper small value={i.qty} max={i.stock} onChange={(q) => setQty(i.key, q)} />
                  </div>
                  <b>{taka(i.price * i.qty)}</b>
                </div>
              ))}
            </div>
            <div className="drawer-foot">
              <div className="srow"><span>Subtotal</span><b>{taka(subtotal)}</b></div>
              <p className="fine">Delivery and coupons are applied at checkout.</p>
              <button className="btn lg block" onClick={openQuick}><BoltIcon size={17} /> Buy now · quick checkout</button>
              <div className="btn-pair">
                <Link href="/checkout" className="btn ghost" onClick={() => setDrawer(false)}>Full checkout</Link>
                <Link href="/cart" className="btn ghost" onClick={() => setDrawer(false)}>View bag</Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
