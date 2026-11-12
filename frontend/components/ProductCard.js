'use client';
import Link from 'next/link';
import { useApp } from './Providers';
import { taka } from '@/lib/api';
import { discount, options, priceInfo, totalStock } from '@/lib/product';
import { BagIcon, BoltIcon, CompareIcon, EyeIcon, HeartIcon, Stars } from './Icons';

// One card component; its look comes from <html data-card>: glass, minimal, overlay, elevated, outline, tile.
// Actions: bag = add to cart, "Buy now" = quick checkout pop-up, eye = quick view, plus wishlist and compare.
export default function ProductCard({ p }) {
  const { addToCart, buyNow, inWish, toggleWish, inCompare, toggleCompare, setViewing } = useApp();
  const stock = totalStock(p);
  const out = stock < 1;
  const low = !out && stock <= 5;
  const saved = inWish(p._id);
  const cmp = inCompare(p._id);
  const off = discount(p);
  const { from, price, was } = priceInfo(p);
  const { colors } = options(p);
  const hasOptions = p.variants?.length > 0;

  return (
    <article className={'scard' + (out ? ' out' : '')}>
      <div className="simg">
        <div className="badges">
          {off ? <span className="badge sale">−{off}%</span> : null}
          {out ? <span className="badge muted">Sold out</span> : low ? <span className="badge warn">Only {stock} left</span> : null}
        </div>
        <div className="card-tools">
          <button className={'heart' + (saved ? ' on' : '')} onClick={() => toggleWish(p)} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={saved} title="Wishlist"><HeartIcon size={16} filled={saved} /></button>
          <button className={'heart' + (cmp ? ' on cmp' : '')} onClick={() => toggleCompare(p)} aria-label="Compare" aria-pressed={cmp} title="Compare"><CompareIcon size={16} /></button>
          <button className="heart" onClick={() => setViewing(p.slug)} aria-label="Quick view" title="Quick view"><EyeIcon size={16} /></button>
        </div>
        <Link href={`/product/${p.slug}`} tabIndex={-1} aria-hidden="true"><img src={p.image} alt={p.name} loading="lazy" /></Link>
        {!out && (
          <div className="quickbar">
            <button onClick={() => buyNow(p)}><BoltIcon size={15} /> Buy now</button>
          </div>
        )}
      </div>
      <div className="sinfo">
        <span className="scat">{[p.category?.name, hasOptions ? null : p.unit].filter(Boolean).join(' · ')}</span>
        <Link href={`/product/${p.slug}`}><h3>{p.name}</h3></Link>
        {colors.length > 0 && (
          <div className="cdots" aria-label={`${colors.length} colours`}>
            {colors.slice(0, 5).map((c) => <i key={c.name} style={{ background: c.hex }} title={c.name} />)}
            {colors.length > 5 && <small>+{colors.length - 5}</small>}
          </div>
        )}
        {p.numReviews > 0 && <Stars value={p.rating} count={p.numReviews} size={12} />}
        <div className="sbuy">
          <span className="sprice">
            {from && <small className="from">from </small>}<b>{taka(price)}</b>
            {was ? <s>{taka(was)}</s> : null}
          </span>
          <button className="sbag" disabled={out} onClick={() => addToCart(p)} aria-label={out ? 'Sold out' : `Add ${p.name} to bag`} title={out ? 'Sold out' : 'Add to bag'}>
            <BagIcon size={17} /><span className="sbag-label">Add to bag</span>
          </button>
        </div>
      </div>
    </article>
  );
}
