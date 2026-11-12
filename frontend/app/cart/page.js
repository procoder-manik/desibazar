'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { useApp } from '@/components/Providers';
import { FreeBar, QtyStepper } from '@/components/CartDrawer';
import { ArrowIcon, BoltIcon, BagIcon, CheckIcon, HeartIcon, TrashIcon } from '@/components/Icons';
import { api, taka } from '@/lib/api';

export default function Cart() {
  const { cart, setQty, toggleWish, inWish, ready, openQuick } = useApp();
  const [more, setMore] = useState([]);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  useEffect(() => { api('/products?featured=true&limit=8').then((r) => setMore(r.items)).catch(() => {}); }, []);
  const suggestions = more.filter((p) => !cart.some((c) => c._id === p._id)).slice(0, 4);
  if (!ready) return null;

  return (
    <div className="bag">
      <div className="crumbs"><Link href="/">Home</Link><span>/</span><b>Bag</b></div>
      <div className="page-title row-title"><h1>Your bag</h1>{count > 0 && <span className="pill-count">{count} {count === 1 ? 'item' : 'items'}</span>}</div>

      {!cart.length ? (
        <div className="empty glass">
          <span className="empty-ico"><BagIcon size={30} /></span>
          <h3>Your bag is empty</h3>
          <p>Discover pure honey, dates, ghee and more.</p>
          <Link href="/shop" className="btn">Start shopping <ArrowIcon size={16} /></Link>
        </div>
      ) : (
        <div className="bag-grid">
          <div>
            <FreeBar subtotal={subtotal} />
            {cart.map((i) => (
              <div className="bag-item glass" key={i.key}>
                <Link href={`/product/${i.slug || ''}`}><img src={i.image} alt="" /></Link>
                <div className="bi-info">
                  <Link href={`/product/${i.slug || ''}`}><h3>{i.name}</h3></Link>
                  <small>{i.variantLabel || i.unit} · {taka(i.price)} each</small>
                  <div className="bi-actions">
                    <QtyStepper small value={i.qty} max={i.stock} onChange={(q) => setQty(i.key, q)} />
                    <button className="textaction" onClick={() => { if (!inWish(i._id)) toggleWish(i); setQty(i.key, 0); }}><HeartIcon size={15} /> Save for later</button>
                    <button className="textaction danger" onClick={() => setQty(i.key, 0)}><TrashIcon size={15} /> Remove</button>
                  </div>
                </div>
                <div className="bi-price">{taka(i.price * i.qty)}</div>
              </div>
            ))}
            <Link href="/shop" className="back">← Continue shopping</Link>
          </div>

          <aside className="sticky">
            <div className="summary glass">
              <h4>Order summary</h4>
              <div className="srow"><span>Subtotal ({count})</span><b>{taka(subtotal)}</b></div>
              <div className="srow muted"><span>Delivery</span><span>Calculated at checkout</span></div>
              <div className="srow muted"><span>Coupon</span><span>Apply at checkout</span></div>
              <div className="srow total"><span>Estimated total</span><b>{taka(subtotal)}</b></div>
              <button className="btn lg block" onClick={openQuick}><BoltIcon size={17} /> Buy now · quick checkout</button>
              <Link href="/checkout" className="btn ghost block" style={{ marginTop: 10 }}>Full checkout <ArrowIcon size={17} /></Link>
              <ul className="checks">
                <li><CheckIcon size={14} />Cash on delivery available</li>
                <li><CheckIcon size={14} />7-day easy returns</li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {suggestions.length > 0 && (
        <section className="sect">
          <div className="sect-head"><div><span className="eyebrow">Complete your pantry</span><h2>You might also like</h2></div></div>
          <div className="row4">{suggestions.map((p) => <ProductCard key={p._id} p={p} />)}</div>
        </section>
      )}
    </div>
  );
}
