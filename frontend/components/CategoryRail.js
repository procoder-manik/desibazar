'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { useApp } from './Providers';
import { ChevronL, ChevronR } from './Icons';

// Category list as carousel (default), grid or compact pills. Admin → Appearance → Categories.
export default function CategoryRail({ cats }) {
  const { settings } = useApp();
  const mode = settings.appearance?.categories || 'carousel';
  const track = useRef(null);
  const scroll = (d) => track.current?.scrollBy({ left: d * track.current.clientWidth * 0.8, behavior: 'smooth' });

  if (mode === 'pills') return (
    <div className="catpill-row">{cats.map((c) => (
      <Link key={c._id} href={`/shop?category=${c.slug}`} className="catpill glass">{c.img ? <img src={c.img} alt="" /> : null}<b>{c.name}</b><small>{c.count}</small></Link>
    ))}</div>
  );

  const cards = cats.map((c) => (
    <Link key={c._id} href={`/shop?category=${c.slug}`} className="catcard glass">
      <span className="catimg">{c.img ? <img src={c.img} alt="" /> : c.name[0]}</span>
      <b>{c.name}</b>
      <small>{c.count} {c.count === 1 ? 'product' : 'products'}</small>
    </Link>
  ));
  if (mode === 'grid') return <div className="catgrid">{cards}</div>;
  return (
    <div className="rail cat-rail">
      <button className="iconbtn rail-btn l" onClick={() => scroll(-1)} aria-label="Previous categories"><ChevronL /></button>
      <div className="rail-track cat-track" ref={track}>{cards}</div>
      <button className="iconbtn rail-btn r" onClick={() => scroll(1)} aria-label="Next categories"><ChevronR /></button>
    </div>
  );
}
