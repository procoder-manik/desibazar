'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from '../Providers';
import { ChevronL, ChevronR, StarIcon } from '../Icons';
import { track } from '../Analytics';
import Markdown from '../Markdown';
import OnePageCheckout, { linePrice } from './OnePageCheckout';
import { taka } from '@/lib/api';

// A sales landing page built in Admin → Landing pages: an ordered list of sections plus a one-page checkout.
const youtubeId = (u) => {
  const s = String(u || '').trim();
  const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,20})/) || s.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : null;
};
const scrollToOrder = (e) => { e?.preventDefault(); document.getElementById('order')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
const CtaButton = ({ label, big }) => (label ? <a href="#order" onClick={scrollToOrder} className={'btn lp-cta' + (big ? ' lg' : '')}>{label}</a> : null);
const Title = ({ children }) => (children ? <h2 className="lp-title">{children}</h2> : null);
const lines = (v) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => (typeof x === 'string' ? x.trim() : x)).filter(Boolean);

function Gallery({ s }) {
  const imgs = lines(s.images);
  const [i, setI] = useState(0);
  if (!imgs.length) return null;
  if (s.style === 'slider') {
    return (
      <div className="lp-slider">
        <img src={imgs[i]} alt={s.title || ''} />
        {imgs.length > 1 && <>
          <button type="button" className="iconbtn l" aria-label="Previous" onClick={() => setI((i - 1 + imgs.length) % imgs.length)}><ChevronL /></button>
          <button type="button" className="iconbtn r" aria-label="Next" onClick={() => setI((i + 1) % imgs.length)}><ChevronR /></button>
          <div className="lp-dots">{imgs.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        </>}
      </div>
    );
  }
  return <div className={'lp-gallery cols-' + Math.min(Math.max(+s.columns || 4, 2), 4)}>{imgs.map((src, k) => <img key={k} src={src} alt={`${s.title || 'Photo'} ${k + 1}`} loading="lazy" />)}</div>;
}

function Countdown({ s }) {
  const end = s.endsAt ? new Date(s.endsAt).getTime() : 0;
  const [now, setNow] = useState(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!end || now === null) return null;
  const left = Math.max(0, end - now);
  const parts = [[Math.floor(left / 864e5), 'Days'], [Math.floor(left / 36e5) % 24, 'Hours'], [Math.floor(left / 6e4) % 60, 'Min'], [Math.floor(left / 1e3) % 60, 'Sec']];
  return (
    <div className="lp-countdown">
      {s.title && <b>{s.title}</b>}
      <div className="lp-clock">{parts.map(([n, l]) => <span key={l}><em>{String(n).padStart(2, '0')}</em><small>{l}</small></span>)}</div>
      {left === 0 && s.endedText && <p>{s.endedText}</p>}
    </div>
  );
}

function Section({ s, lp }) {
  switch (s.type) {
    case 'hero': {
      const first = lp.products?.[0];
      const price = first ? linePrice(first, first.variant ? first.product.variants?.find((v) => String(v._id) === String(first.variant)) : null) : null;
      const img = s.image || (s.bg !== 'image' ? first?.product?.image : '');
      return (
        <section className={'lp-hero lp-' + (s.layout || 'split') + (s.bg === 'accent' ? ' on-accent' : '')} style={s.bg === 'image' && s.image ? { backgroundImage: `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)),url(${s.image})` } : undefined}>
          <div className="lp-hero-copy">
            {s.eyebrow && <span className="eyebrow">{s.eyebrow}</span>}
            <h1>{s.title}</h1>
            {s.subtitle && <p>{s.subtitle}</p>}
            {s.showPrice && price && <div className="lp-hero-price"><b>{taka(price.now)}</b>{price.was && <s>{taka(price.was)}</s>}</div>}
            <CtaButton label={s.cta || 'অর্ডার করুন'} big />
            {lines(s.badges).length > 0 && <div className="lp-badges">{lines(s.badges).map((b) => <span key={b}>{b}</span>)}</div>}
          </div>
          {img && s.bg !== 'image' && s.layout !== 'center' && <div className="lp-hero-img"><img src={img} alt={s.title || ''} /></div>}
        </section>
      );
    }
    case 'gallery': return <section className="lp-sec"><Title>{s.title}</Title><Gallery s={s} /><div className="lp-center"><CtaButton label={s.cta} /></div></section>;
    case 'video': {
      const id = youtubeId(s.url);
      return id ? (
        <section className="lp-sec">
          <Title>{s.title}</Title>
          <div className="lp-video"><iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title={s.title || 'Video'} loading="lazy" allowFullScreen allow="accelerometer; encrypted-media; picture-in-picture" /></div>
          {s.caption && <p className="lp-caption">{s.caption}</p>}
          <div className="lp-center"><CtaButton label={s.cta} /></div>
        </section>
      ) : null;
    }
    case 'text':
      return (
        <section className={'lp-sec lp-text' + (s.image ? ' with-img img-' + (s.imagePos || 'right') : '')}>
          <div><Title>{s.title}</Title><Markdown text={s.body} className="md lp-md" /><CtaButton label={s.cta} /></div>
          {s.image && <img src={s.image} alt={s.title || ''} loading="lazy" />}
        </section>
      );
    case 'checklist':
      return (
        <section className="lp-sec">
          <div className="lp-boxed">
            <Title>{s.title}</Title>
            <ul className={'lp-check ' + (s.icon || 'check')}>{lines(s.items).map((x, k) => <li key={k}>{x}</li>)}</ul>
          </div>
          <div className="lp-center"><CtaButton label={s.cta} /></div>
        </section>
      );
    case 'features':
      return (
        <section className="lp-sec">
          <Title>{s.title}</Title>
          <div className="lp-features">{(s.items || []).map((x, k) => <div key={k} className="lp-feature glass">{x.icon && <span className="lp-ficon">{x.icon}</span>}<b>{x.title}</b>{x.text && <p>{x.text}</p>}</div>)}</div>
        </section>
      );
    case 'testimonials':
      return (
        <section className="lp-sec">
          <Title>{s.title}</Title>
          <div className="lp-reviews">
            {(s.items || []).map((x, k) => (
              <figure key={k} className="lp-review glass">
                {x.image && <img src={x.image} alt="" loading="lazy" />}
                {x.rating ? <span className="lp-stars">{Array.from({ length: Math.min(5, +x.rating || 5) }, (_, j) => <StarIcon key={j} size={14} />)}</span> : null}
                {x.text && <blockquote>{x.text}</blockquote>}
                {x.name && <figcaption>{x.name}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      );
    case 'faq':
      return (
        <section className="lp-sec">
          <Title>{s.title}</Title>
          <div className="lp-faq">{(s.items || []).filter((x) => x.q).map((x, k) => <details key={k} className="glass"><summary>{x.q}</summary><p>{x.a}</p></details>)}</div>
        </section>
      );
    case 'notice': return <section className="lp-sec"><div className={'lp-notice ' + (s.tone || 'accent')}>{s.text}</div></section>;
    case 'cta':
      return (
        <section className="lp-sec">
          <div className="lp-banner" style={s.image ? { backgroundImage: `linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5)),url(${s.image})` } : undefined}>
            <h2>{s.title}</h2>{s.text && <p>{s.text}</p>}<CtaButton label={s.button || 'অর্ডার করুন'} big />
          </div>
        </section>
      );
    case 'image': {
      if (!s.url) return null;
      const img = <img src={s.url} alt={s.alt || ''} loading="lazy" />;
      return <section className="lp-sec lp-image">{s.link === '#order' ? <a href="#order" onClick={scrollToOrder}>{img}</a> : s.link ? <a href={s.link}>{img}</a> : img}</section>;
    }
    case 'countdown': return <section className="lp-sec"><Countdown s={s} /></section>;
    case 'trust': return <section className="lp-sec"><div className="lp-trust">{lines(s.items).map((x) => <span key={x} className="glass">{x}</span>)}</div></section>;
    case 'checkout': return <section className="lp-sec lp-order"><OnePageCheckout lp={lp} /></section>;
    default: return null;
  }
}

export default function Landing({ lp, preview }) {
  const { settings } = useApp();
  const store = settings.store || {};
  const sections = lp.sections?.some((s) => s.type === 'checkout') ? lp.sections : [...(lp.sections || []), { type: 'checkout', id: 'auto-checkout' }];
  useEffect(() => {
    const items = (lp.products || []).map((it) => ({ item_id: it.product._id, item_name: it.label || it.product.name, price: linePrice(it, null).now, quantity: 1 }));
    track('view_item', { value: items[0]?.price || 0, items });
  }, [lp._id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="lp" style={/^#[0-9a-f]{6}$/i.test(lp.accent || '') ? { '--forest': lp.accent, '--forest-2': lp.accent } : undefined}>
      {preview && <div className="lp-preview">Preview · {lp.status === 'published' ? 'Published' : 'Draft (only staff can see this)'}</div>}
      {lp.header !== 'none' && (
        <header className="lp-header glass">
          <Link href={lp.header === 'store' ? '/' : '#order'} onClick={lp.header === 'store' ? undefined : scrollToOrder} className="lp-logo">
            {store.logo ? <img src={store.logo} alt={store.name} /> : <b>{store.name}</b>}
          </Link>
          <div className="lp-header-r">
            {store.phone && <a className="link" href={`tel:${store.phone.replace(/[^\d+]/g, '')}`}>{store.phone}</a>}
            <a href="#order" onClick={scrollToOrder} className="btn sm">{lp.checkout?.lang === 'en' ? 'Order now' : 'অর্ডার করুন'}</a>
          </div>
        </header>
      )}
      {sections.map((s, k) => <Section key={s.id || k} s={s} lp={lp} />)}
      <footer className="lp-footer">
        <b>{store.name}</b>
        <span>{[store.phone, store.email, store.address].filter(Boolean).join(' · ')}</span>
        <small>© {new Date().getFullYear()} {store.name}. <Link href="/">Visit the store</Link></small>
      </footer>
    </div>
  );
}
