'use client';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { useApp } from '@/components/Providers';
import { HeartIcon } from '@/components/Icons';

export default function Wishlist() {
  const { wish, ready, addToCart } = useApp();
  if (!ready) return null;
  const available = wish.filter((p) => p.stock > 0);

  return (
    <div>
      <div className="crumbs"><Link href="/">Home</Link><span>/</span><b>Wishlist</b></div>
      <div className="page-title row-title">
        <div><h1>Wishlist</h1><p>{wish.length} saved {wish.length === 1 ? 'item' : 'items'}</p></div>
        {available.length > 1 && <button className="btn" onClick={() => available.forEach((p, i) => addToCart(p, 1, { open: i === available.length - 1 }))}>Add all to bag</button>}
      </div>
      {wish.length === 0 ? (
        <div className="empty glass"><span className="empty-ico"><HeartIcon size={30} /></span><h3>Nothing saved yet</h3><p>Tap the heart on any product to save it here.</p><Link href="/shop" className="btn">Browse products</Link></div>
      ) : (
        <div className="row4">{wish.map((p) => <ProductCard key={p._id} p={p} />)}</div>
      )}
    </div>
  );
}
