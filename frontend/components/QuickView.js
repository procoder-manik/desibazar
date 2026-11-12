'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from './Providers';
import VariantPicker from './VariantPicker';
import { QtyStepper } from './CartDrawer';
import { BoltIcon, CloseIcon, HeartIcon, Stars } from './Icons';
import { api, taka } from '@/lib/api';
import { priceInfo, vList, vPrice } from '@/lib/product';

export default function QuickView() {
  const { viewing, setViewing, addToCart, buyNow, inWish, toggleWish } = useApp();
  const [p, setP] = useState(null);
  const [v, setV] = useState(null);
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);

  useEffect(() => {
    if (!viewing) { setP(null); return; }
    setQty(1); setImg(0); setV(null);
    api('/products/' + viewing).then((r) => setP(r.product)).catch(() => setViewing(null));
    const onKey = (e) => e.key === 'Escape' && setViewing(null);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [viewing, setViewing]);

  if (!viewing) return null;
  const gallery = p ? [...new Set([v?.image, p.image, ...(p.images || [])].filter(Boolean))] : [];
  const needsOption = p?.variants?.length && !v;
  const stock = v ? v.stock : p?.stock;
  const out = !p || needsOption || stock < 1;
  const price = p && (v ? vPrice(p, v) : priceInfo(p).price);
  const was = p && (v ? vList(p, v) : priceInfo(p).was);

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Quick view">
      <div className="scrim on" onClick={() => setViewing(null)} />
      <div className="modal qv">
        <button className="iconbtn qv-close" onClick={() => setViewing(null)} aria-label="Close"><CloseIcon /></button>
        {!p ? <div className="skel" style={{ minHeight: 420, margin: 20 }} /> : (
          <div className="qv-grid">
            <div className="qv-gallery">
              <div className="qv-main"><img src={gallery[img] || gallery[0]} alt={p.name} /></div>
              {gallery.length > 1 && <div className="qv-thumbs">{gallery.map((g, i) => <button key={g} className={i === img ? 'on' : ''} onClick={() => setImg(i)}><img src={g} alt="" /></button>)}</div>}
            </div>
            <div className="qv-info">
              <span className="eyebrow">{p.category?.name}</span>
              <h2>{p.name}</h2>
              {p.numReviews > 0 && <Stars value={p.rating} count={p.numReviews} size={14} />}
              <div className="pprice"><b>{taka(price)}</b>{was ? <s>{taka(was)}</s> : null}{!v && priceInfo(p).from && <span className="muted">starting price</span>}</div>
              <p className="pdesc">{p.description}</p>
              <VariantPicker product={p} onChange={(x) => { setV(x); setImg(0); setQty(1); }} />
              {!p.variants?.length && <p className={'stock ' + (p.stock < 1 ? 'out' : p.stock <= 5 ? 'low' : 'in')}>{p.stock < 1 ? 'Out of stock' : p.stock <= 5 ? `Only ${p.stock} left` : 'In stock'}</p>}
              <div className="buyrow">
                <QtyStepper value={qty} max={stock} onChange={(q) => setQty(Math.max(1, Math.min(q, stock || 1)))} />
                <button className="btn lg grow" disabled={out} onClick={() => { addToCart(p, qty, { variant: v || undefined }); setViewing(null); }}>{needsOption ? 'Choose an option' : stock < 1 ? 'Sold out' : 'Add to bag'}</button>
                <button className={'iconbtn big' + (inWish(p._id) ? ' on' : '')} onClick={() => toggleWish(p)} aria-label="Save to wishlist"><HeartIcon size={20} filled={inWish(p._id)} /></button>
              </div>
              <button className="btn ghost block" disabled={out} onClick={() => buyNow(p, qty, v || undefined)}><BoltIcon size={17} /> Buy now · quick checkout</button>
              <Link href={`/product/${p.slug}`} className="link qv-more" onClick={() => setViewing(null)}>View full details →</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
