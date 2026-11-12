'use client';
import { useRef } from 'react';
import ProductCard from './ProductCard';
import { useApp } from './Providers';
import { ChevronL, ChevronR } from './Icons';

// Product list shown as a grid or a swipeable carousel (Admin → Appearance → Product lists).
export default function ProductRail({ items, layout }) {
  const { settings } = useApp();
  const mode = layout || settings.appearance?.listing || 'grid';
  const track = useRef(null);
  const scroll = (dir) => { const el = track.current; if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' }); };

  if (mode !== 'carousel') return <div className="row4">{items.map((p) => <ProductCard key={p._id} p={p} />)}</div>;
  return (
    <div className="rail">
      <button className="iconbtn rail-btn l" onClick={() => scroll(-1)} aria-label="Previous"><ChevronL /></button>
      <div className="rail-track" ref={track}>{items.map((p) => <div className="rail-item" key={p._id}><ProductCard p={p} /></div>)}</div>
      <button className="iconbtn rail-btn r" onClick={() => scroll(1)} aria-label="Next"><ChevronR /></button>
    </div>
  );
}
