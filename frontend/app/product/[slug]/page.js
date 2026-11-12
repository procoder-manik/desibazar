'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import ProductRail from '@/components/ProductRail';
import Reviews from '@/components/Reviews';
import VariantPicker from '@/components/VariantPicker';
import { useApp } from '@/components/Providers';
import { QtyStepper } from '@/components/CartDrawer';
import { BoltIcon, ChevronL, ChevronR, CompareIcon, HeartIcon, ReturnIcon, ShieldIcon, Stars, TruckIcon } from '@/components/Icons';
import { track } from '@/components/Analytics';
import { api, taka } from '@/lib/api';
import { priceInfo, vList, vPrice } from '@/lib/product';
import { slugOf } from '@/lib/slug';
import PostGrid from '@/components/PostGrid';

const ACC = [
  ['Description', (p) => p.description || 'Pure and natural, carefully sourced.'],
  ['Specifications', (p) => (p.details?.length ? <table className="spec"><tbody>{p.details.map((d) => <tr key={d.label}><th>{d.label}</th><td>{d.value}</td></tr>)}</tbody></table> : 'No extra specifications.')],
  ['Delivery & returns', (p, s) => `${s.shipping.zones.map((z) => `${z.name}: ${taka(z.fee)}, ${z.eta}`).join('. ')}.${s.shipping.freeOver ? ` Free delivery over ${taka(s.shipping.freeOver)}.` : ''} Tell us within 7 days if anything is wrong for a replacement or refund.`],
];

// Large image with arrows, hover zoom and a thumbnail rail (left on desktop, below on mobile).
function Gallery({ images, name, badge }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(null);
  const box = useRef(null);
  useEffect(() => { setI(0); }, [images[0]]); // a new colour picked -> show its image
  const n = images.length;
  const go = (d) => setI((x) => (x + d + n) % n);
  const move = (e) => {
    const r = box.current.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };
  return (
    <div className={'gallery glass' + (n > 1 ? ' has-thumbs' : '')}>
      {n > 1 && (
        <div className="gthumbs" role="tablist" aria-label="Product images">
          {images.map((g, k) => <button key={g + k} role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => setI(k)}><img src={g} alt={`${name} image ${k + 1}`} /></button>)}
        </div>
      )}
      <div className="gmain" ref={box} onMouseMove={move} onMouseLeave={() => setZoom(null)}>
        {badge}
        <img src={images[i]} alt={name} style={zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
        {n > 1 && (
          <>
            <button className="iconbtn gnav l" onClick={() => go(-1)} aria-label="Previous image"><ChevronL /></button>
            <button className="iconbtn gnav r" onClick={() => go(1)} aria-label="Next image"><ChevronR /></button>
            <span className="gcount">{i + 1} / {n}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProductPage() {
  const slug = slugOf(useParams().slug);
  const { addToCart, buyNow, inWish, toggleWish, inCompare, toggleCompare, recent, addRecent, settings } = useApp();
  const FREE_OVER = settings.shipping.freeOver;
  const [d, setD] = useState(null);
  const [v, setV] = useState(null);
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(0);
  const [error, setError] = useState('');
  const [posts, setPosts] = useState([]);

  const load = () => api('/products/' + encodeURIComponent(slug)).then(setD).catch((e) => setError(e.message));
  useEffect(() => { setD(null); setQty(1); setV(null); load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!d?.product) return;
    addRecent(d.product);
    const price = priceInfo(d.product).price;
    track('view_item', { value: price, items: [{ item_id: d.product._id, item_name: d.product.name, price, quantity: 1 }] });
    api(`/posts?product=${d.product._id}&limit=3`).then((r) => setPosts(r.items)).catch(() => setPosts([]));
  }, [d, addRecent]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="empty glass"><h3>Product not found</h3><p>{error}</p><Link href="/shop" className="btn">Back to shop</Link></div>;
  if (!d) return <div className="pdp-grid"><div className="skel glass tall" /><div className="skel glass tall" /></div>;
  const { product: p, related } = d;
  const hasOptions = p.variants?.length > 0;
  const price = v ? vPrice(p, v) : priceInfo(p).price;
  const was = v ? vList(p, v) : priceInfo(p).was;
  const stock = v ? v.stock : hasOptions ? 0 : p.stock;
  const out = stock < 1;
  const saved = inWish(p._id);
  const images = [...new Set([v?.image, p.image, ...(p.images || []), ...(p.variants || []).map((x) => x.image)].filter(Boolean))];
  const seen = recent.filter((r) => r._id !== p._id).slice(0, 4);
  const off = was ? Math.round(100 - (price / was) * 100) : 0;

  return (
    <div className="pdp">
      <div className="crumbs">
        <Link href="/">Home</Link><span>/</span><Link href="/shop">Shop</Link>
        {p.category && <><span>/</span><Link href={`/shop?category=${p.category.slug}`}>{p.category.name}</Link></>}<span>/</span><b>{p.name}</b>
      </div>

      <div className="pdp-grid">
        <Gallery images={images} name={p.name} badge={off ? <span className="badge sale lg">−{off}%</span> : null} />

        <div className="pinfo glass">
          <span className="eyebrow">{p.category?.name}</span>
          <h1>{p.name}</h1>
          <a href="#reviews" className="pdp-rating"><Stars value={p.rating} count={p.numReviews} size={15} />{!p.numReviews && <small>Be the first to review</small>}</a>
          <div className="pprice">
            <b>{taka(price)}</b>
            {was ? <><s>{taka(was)}</s><span className="save">Save {taka(was - price)}</span></> : null}
            {!hasOptions && <span>/ {p.unit}</span>}
          </div>
          <p className="pdesc">{p.description}</p>

          {hasOptions ? <VariantPicker product={p} onChange={(x) => { setV(x); setQty(1); }} /> : (
            <div className="pmeta">
              <div><small>Pack size</small><span className="pillsel">{p.unit}</span></div>
              <div><small>Availability</small><span className={'stock ' + (out ? 'out' : p.stock <= 5 ? 'low' : 'in')}>{out ? 'Out of stock' : p.stock <= 5 ? `Only ${p.stock} left` : 'In stock'}</span></div>
            </div>
          )}

          <div className="buyrow">
            <QtyStepper value={qty} max={stock} onChange={(q) => setQty(Math.max(1, Math.min(q, stock || 1)))} />
            <button className="btn lg grow" disabled={out} onClick={() => addToCart(p, qty, { variant: v || undefined })}>
              {hasOptions && !v ? 'Choose an option' : out ? 'Out of stock' : `Add to bag · ${taka(price * qty)}`}
            </button>
            <button className={'iconbtn big' + (saved ? ' on' : '')} onClick={() => toggleWish(p)} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={saved}><HeartIcon size={21} filled={saved} /></button>
          </div>
          <div className="btn-pair">
            <button className="btn ghost buynow" disabled={out} onClick={() => buyNow(p, qty, v || undefined)}><BoltIcon size={17} /> Buy now</button>
            <button className={'btn ghost' + (inCompare(p._id) ? ' active' : '')} onClick={() => toggleCompare(p)}><CompareIcon size={17} /> {inCompare(p._id) ? 'In compare' : 'Compare'}</button>
          </div>

          <div className="assure">
            <span><TruckIcon size={18} />{FREE_OVER ? `Free delivery over ${taka(FREE_OVER)}` : 'Fast courier delivery'}</span>
            <span><ShieldIcon size={18} />Cash on delivery</span>
            <span><ReturnIcon size={18} />7-day easy returns</span>
          </div>

          {ACC.map(([t, body], i) => (
            <div key={t} className={'acc' + (open === i ? ' open' : '')}>
              <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>{t}<span>{open === i ? '−' : '+'}</span></button>
              {open === i && <div className="acc-body">{body(p, settings)}</div>}
            </div>
          ))}
        </div>
      </div>

      <Reviews slug={slug} rating={p.rating} count={p.numReviews} onPosted={load} />

      {related.length > 0 && (
        <section className="sect">
          <div className="sect-head"><div><span className="eyebrow">Pairs well with</span><h2>You might also like</h2></div></div>
          <ProductRail items={related} />
        </section>
      )}
      {posts.length > 0 && (
        <section className="sect">
          <div className="sect-head"><div><span className="eyebrow">From the journal</span><h2>Read before you buy</h2></div><Link href="/blog" className="link">All articles</Link></div>
          <PostGrid posts={posts} />
        </section>
      )}
      {seen.length > 0 && (
        <section className="sect">
          <div className="sect-head"><div><span className="eyebrow">Your history</span><h2>Recently viewed</h2></div></div>
          <ProductRail items={seen} />
        </section>
      )}
    </div>
  );
}
