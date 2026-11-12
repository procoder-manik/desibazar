'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from './Providers';
import { ArrowIcon, BagIcon, ChevronL, ChevronR, Stars } from './Icons';
import { taka } from '@/lib/api';
import { discount, priceInfo } from '@/lib/product';

// Cycles through slides on a timer; pauses on hover/focus, when the tab is hidden and for reduced motion.
function useAutoSlide(count, delay = 4200) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((n) => setI(((n % count) + count) % count), [count]);
  useEffect(() => {
    if (paused || count < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => { if (!document.hidden) setI((x) => (x + 1) % count); }, delay);
    return () => clearInterval(t);
  }, [paused, count, delay]);
  const hold = { onMouseEnter: () => setPaused(true), onMouseLeave: () => setPaused(false), onFocus: () => setPaused(true), onBlur: () => setPaused(false) };
  return { i, go, hold, paused };
}

function Dots({ n, i, go }) {
  return <div className="dots" role="tablist" aria-label="Slides">{Array.from({ length: n }, (_, k) => <button key={k} role="tab" aria-selected={k === i} aria-label={`Slide ${k + 1}`} className={k === i ? 'on' : ''} onClick={() => go(k)} />)}</div>;
}

function Copy({ c, center, light }) {
  return (
    <div className={'hero-text' + (center ? ' center' : '') + (light ? ' light' : '')}>
      {c.eyebrow && <span className="eyebrow">{c.eyebrow}</span>}
      <h1>{c.title}{c.titleEm && <><br /><em>{c.titleEm}</em></>}</h1>
      {c.text && <p>{c.text}</p>}
      <div className="hero-cta">
        {c.cta1Label && <Link href={c.cta1Link || '/shop'} className="btn lg">{c.cta1Label} <ArrowIcon size={18} /></Link>}
        {c.cta2Label && <Link href={c.cta2Link || '/shop'} className="btn ghost lg">{c.cta2Label}</Link>}
      </div>
      {c.proof && <div className="hero-proof"><Stars value={4.8} size={15} /><span>{c.proof}</span></div>}
    </div>
  );
}

const Price = ({ p }) => { const i = priceInfo(p); return <div className="hero-price">{i.from && <small>from</small>}<b>{taka(i.price)}</b>{i.was ? <s>{taka(i.was)}</s> : null}</div>; };

/* 1. split: copy left, product cards sliding one by one on the right */
function Split({ items, c }) {
  const { buyNow } = useApp();
  const { i, go, hold } = useAutoSlide(items.length);
  return (
    <section className="hero hero-split glass">
      <Copy c={c} />
      <div className="slider" {...hold} aria-roledescription="carousel">
        <div className="slides">
          {items.map((p, k) => {
            const pos = (k - i + items.length) % items.length;
            const off = discount(p);
            return (
              <article key={p._id} className={'slide pos' + Math.min(pos, 3)} aria-hidden={pos !== 0}>
                <Link href={`/product/${p.slug}`} tabIndex={pos === 0 ? 0 : -1} className="slide-img">
                  {off ? <span className="badge sale">−{off}%</span> : null}
                  <img src={p.image} alt={p.name} />
                </Link>
                <div className="slide-meta">
                  <div><span className="eyebrow">{p.category?.name || 'Best seller'}</span><h3>{p.name}</h3><Price p={p} /></div>
                  <button className="sbag" tabIndex={pos === 0 ? 0 : -1} onClick={() => buyNow(p)} aria-label={`Buy ${p.name} now`} disabled={p.stock < 1}><BagIcon size={18} /></button>
                </div>
              </article>
            );
          })}
        </div>
        <Dots n={items.length} i={i} go={go} />
      </div>
    </section>
  );
}

/* 2. center: big centred copy with an endless product ribbon */
function Center({ items, c }) {
  const loop = [...items, ...items];
  return (
    <section className="hero hero-center glass">
      <Copy c={c} center />
      <div className="ribbon" aria-label="Featured products">
        <div className="ribbon-track">
          {loop.map((p, k) => (
            <Link key={p._id + k} href={`/product/${p.slug}`} className="ribbon-card" tabIndex={k >= items.length ? -1 : 0} aria-hidden={k >= items.length}>
              <img src={p.image} alt="" /><span><b>{p.name}</b><small>{taka(priceInfo(p).price)}</small></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 3. showcase: one large product at a time with thumbnails and a progress bar */
function Showcase({ items }) {
  const { buyNow } = useApp();
  const { i, go, hold, paused } = useAutoSlide(items.length, 5000);
  const p = items[i];
  const bar = useRef(null);
  useEffect(() => { const el = bar.current; if (!el) return; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }, [i]);
  const off = discount(p);
  return (
    <section className="hero hero-showcase glass" {...hold}>
      <div className="show-stage">
        {items.map((x, k) => <img key={x._id} src={x.image} alt={k === i ? x.name : ''} className={k === i ? 'on' : ''} />)}
        {off ? <span className="badge sale lg">−{off}%</span> : null}
      </div>
      <div className="show-copy">
        <span className="eyebrow">Featured · {String(i + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span>
        <h1 key={p._id} className="fade-in">{p.name}</h1>
        <p>{p.description || 'Pure, carefully sourced and delivered fresh to your door.'}</p>
        <div className="hero-price big"><b>{taka(priceInfo(p).price)}</b>{priceInfo(p).was ? <s>{taka(priceInfo(p).was)}</s> : null}</div>
        <div className="hero-cta">
          <button className="btn lg" onClick={() => buyNow(p)} disabled={p.stock < 1}>Buy now <ArrowIcon size={18} /></button>
          <Link href={`/product/${p.slug}`} className="btn ghost lg">Details</Link>
        </div>
        <div className="show-thumbs">{items.map((x, k) => <button key={x._id} className={k === i ? 'on' : ''} onClick={() => go(k)} aria-label={x.name}><img src={x.image} alt="" /></button>)}</div>
        <div className="progress"><span ref={bar} className={paused ? 'paused' : ''} /></div>
      </div>
    </section>
  );
}

/* 4. editorial: copy over a soft panel with a 4-tile mosaic that rotates its images */
function Editorial({ items, c }) {
  const { i, hold } = useAutoSlide(items.length, 3600);
  const tiles = [0, 1, 2, 3].map((k) => items[(i + k) % items.length]);
  return (
    <section className="hero hero-editorial glass" {...hold}>
      <Copy c={c} />
      <div className="mosaic">
        {tiles.map((p, k) => (
          <Link key={k} href={`/product/${p.slug}`} className={'tile t' + k}>
            <img key={p._id} src={p.image} alt={p.name} className="fade-img" />
            <span className="tile-tag"><b>{p.name}</b><small>{taka(priceInfo(p).price)}</small></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* 5. banner: full-width slides, one product per slide with the store copy */
function Banner({ items, c }) {
  const { buyNow } = useApp();
  const { i, go, hold } = useAutoSlide(items.length, 5200);
  return (
    <section className="hero hero-banner" {...hold} aria-roledescription="carousel">
      {items.map((p, k) => (
        <div key={p._id} className={'bslide' + (k === i ? ' on' : '')} aria-hidden={k !== i}>
          <img src={p.image} alt="" className="bbg" />
          <div className="bglass glass">
            <span className="eyebrow">{k === 0 ? c.eyebrow : p.category?.name}</span>
            <h1>{k === 0 ? <>{c.title} <em>{c.titleEm}</em></> : p.name}</h1>
            <p>{k === 0 ? c.text : p.description}</p>
            <div className="hero-cta">
              {k === 0 ? <Link href={c.cta1Link || '/shop'} className="btn lg" tabIndex={k === i ? 0 : -1}>{c.cta1Label || 'Shop now'} <ArrowIcon size={18} /></Link>
                : <button className="btn lg" tabIndex={k === i ? 0 : -1} onClick={() => buyNow(p)}>Buy now · {taka(priceInfo(p).price)}</button>}
              <Link href={k === 0 ? c.cta2Link || '/shop' : `/product/${p.slug}`} className="btn ghost lg" tabIndex={k === i ? 0 : -1}>{k === 0 ? c.cta2Label || 'View offers' : 'Details'}</Link>
            </div>
          </div>
        </div>
      ))}
      <button className="iconbtn bnav l" onClick={() => go(i - 1)} aria-label="Previous slide"><ChevronL /></button>
      <button className="iconbtn bnav r" onClick={() => go(i + 1)} aria-label="Next slide"><ChevronR /></button>
      <Dots n={items.length} i={i} go={go} />
    </section>
  );
}

/* 6. minimal: quiet headline, trust stats and a small floating product strip */
function Minimal({ items, c, stats }) {
  return (
    <section className="hero hero-minimal glass">
      <Copy c={c} center />
      <div className="mstats">
        {stats.map(([n, l]) => <div key={l}><b>{n}</b><small>{l}</small></div>)}
      </div>
      <div className="mstrip">{items.slice(0, 5).map((p, k) => <Link key={p._id} href={`/product/${p.slug}`} style={{ '--k': k }}><img src={p.image} alt={p.name} /></Link>)}</div>
    </section>
  );
}

/* 7. duo: headline panel + two large product panels that swap products in turn */
function Duo({ items, c }) {
  const { buyNow } = useApp();
  const { i, hold } = useAutoSlide(Math.max(1, Math.ceil(items.length / 2)), 4800);
  const pair = [items[(i * 2) % items.length], items[(i * 2 + 1) % items.length]];
  return (
    <section className="hero hero-duo" {...hold}>
      <div className="duo-copy glass"><Copy c={c} /></div>
      {pair.map((p, k) => (
        <article key={p._id + k} className={'duo-card glass d' + k}>
          <Link href={`/product/${p.slug}`} className="duo-img" tabIndex={-1}><img key={p._id} src={p.image} alt={p.name} className="fade-img" /></Link>
          <div className="duo-meta">
            <div><span className="eyebrow">{p.category?.name}</span><h3>{p.name}</h3><Price p={p} /></div>
            <button className="btn sm" onClick={() => buyNow(p)} disabled={p.stock < 1}>Buy now</button>
          </div>
        </article>
      ))}
    </section>
  );
}

/* 8. gradient: rich accent gradient with floating glass product orbs */
function Gradient({ items, c }) {
  const { i, hold } = useAutoSlide(items.length, 3800);
  const orbit = [0, 1, 2].map((k) => items[(i + k) % items.length]);
  return (
    <section className="hero hero-gradient" {...hold}>
      <Copy c={c} light />
      <div className="orbs">
        {orbit.map((p, k) => (
          <Link key={k} href={`/product/${p.slug}`} className={'orb o' + k}>
            <img key={p._id} src={p.image} alt={p.name} className="fade-img" />
            {k === 0 && <span className="orb-tag glass"><b>{p.name}</b><small>{taka(priceInfo(p).price)}</small></span>}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Hero({ items, stats = [] }) {
  const { settings } = useApp();
  const c = settings.content?.hero || {};
  const list = items.slice(0, 6);
  if (!list.length) return <section className="hero hero-split glass"><Copy c={c} /></section>;
  const v = settings.appearance?.hero;
  if (v === 'center') return <Center items={list} c={c} />;
  if (v === 'showcase') return <Showcase items={list} />;
  if (v === 'editorial') return <Editorial items={list} c={c} />;
  if (v === 'banner') return <Banner items={list} c={c} />;
  if (v === 'minimal') return <Minimal items={list} c={c} stats={stats} />;
  if (v === 'duo') return <Duo items={list} c={c} />;
  if (v === 'gradient') return <Gradient items={list} c={c} />;
  return <Split items={list} c={c} />;
}
