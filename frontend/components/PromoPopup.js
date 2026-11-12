'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from './Providers';
import { api } from '@/lib/api';
import { CheckIcon, CloseIcon } from './Icons';

const seenKey = (id) => `gb_popup_${id}`;
const read = (store, k) => { try { return store.getItem(k); } catch { return null; } };
const write = (store, k, v) => { try { store.setItem(k, v); } catch { /* blocked */ } };

// Shows at most one active promotional pop-up per visit, following its trigger, page, audience and frequency rules.
export default function PromoPopup() {
  const { user, ready, toast } = useApp();
  const path = usePathname();
  const [popup, setPopup] = useState(null);
  const [list, setList] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { api('/popups/active').then(setList).catch(() => setList([])); }, []);

  useEffect(() => {
    if (!ready || !list || popup || path.startsWith('/admin') || path.startsWith('/checkout')) return;
    const page = path === '/' ? 'home' : path.startsWith('/shop') ? 'shop' : path.startsWith('/product') ? 'product' : 'other';
    const eligible = list.find((p) => {
      if (p.pages !== 'all' && p.pages !== page) return false;
      if (p.audience === 'guests' && user) return false;
      if (p.audience === 'members' && !user) return false;
      const k = seenKey(p._id);
      if (p.frequency === 'once' && read(localStorage, k)) return false;
      if (p.frequency === 'daily' && Date.now() - Number(read(localStorage, k) || 0) < 864e5) return false;
      if (p.frequency === 'session' && read(sessionStorage, k)) return false;
      return true;
    });
    if (!eligible) return;
    const show = () => setPopup(eligible);
    let off = () => {};
    if (eligible.trigger === 'scroll') {
      const on = () => { if (window.scrollY > 600) { show(); off(); } };
      window.addEventListener('scroll', on, { passive: true }); off = () => window.removeEventListener('scroll', on);
    } else if (eligible.trigger === 'exit') {
      const on = (e) => { if (e.clientY <= 0) { show(); off(); } };
      document.addEventListener('mouseleave', on); off = () => document.removeEventListener('mouseleave', on);
      // touch devices have no exit intent: fall back to a delay
      if (window.matchMedia('(hover: none)').matches) { const t = setTimeout(show, 12000); off = () => clearTimeout(t); }
    } else {
      const t = setTimeout(show, (eligible.delay ?? 4) * 1000); off = () => clearTimeout(t);
    }
    return off;
  }, [ready, list, path, user, popup]);

  const close = () => {
    if (popup) { write(localStorage, seenKey(popup._id), String(Date.now())); write(sessionStorage, seenKey(popup._id), '1'); }
    setPopup(null); setList((l) => (l || []).filter((x) => x._id !== popup?._id));
  };
  useEffect(() => {
    if (!popup) return;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [popup]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!popup) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(popup.code); setCopied(true); toast(`Code ${popup.code} copied`); setTimeout(() => setCopied(false), 2000); } catch { toast(`Your code: ${popup.code}`); }
  };
  const body = (
    <>
      {popup.eyebrow && <span className="eyebrow">{popup.eyebrow}</span>}
      <h2>{popup.title}</h2>
      {popup.text && <p>{popup.text}</p>}
      {popup.code && <button className="codebox" onClick={copy}><code>{popup.code}</code><span>{copied ? <><CheckIcon size={14} /> Copied</> : 'Tap to copy'}</span></button>}
      <div className="popup-cta">
        {popup.ctaLabel && <Link href={popup.ctaLink || '/shop'} className="btn" onClick={close}>{popup.ctaLabel}</Link>}
        <button className="textaction" onClick={close}>No thanks</button>
      </div>
    </>
  );

  if (popup.layout === 'bar') return (
    <div className="popup-bar glass" role="dialog" aria-label={popup.title}>
      <div><b>{popup.title}</b>{popup.text && <span> {popup.text}</span>}</div>
      {popup.code && <button className="codebox inline" onClick={copy}><code>{popup.code}</code></button>}
      {popup.ctaLabel && <Link href={popup.ctaLink || '/shop'} className="btn sm" onClick={close}>{popup.ctaLabel}</Link>}
      <button className="iconbtn sm" onClick={close} aria-label="Close"><CloseIcon size={15} /></button>
    </div>
  );
  if (popup.layout === 'corner') return (
    <aside className="popup-corner glass" role="dialog" aria-label={popup.title}>
      <button className="iconbtn sm close" onClick={close} aria-label="Close"><CloseIcon size={15} /></button>
      {popup.image && <img src={popup.image} alt="" />}
      <div>{body}</div>
    </aside>
  );
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label={popup.title}>
      <div className="scrim on" onClick={close} />
      <div className={'modal popup ' + popup.layout}>
        <button className="iconbtn close" onClick={close} aria-label="Close"><CloseIcon /></button>
        {popup.layout === 'split' && <div className="popup-art">{popup.image ? <img src={popup.image} alt="" /> : <span className="art-fallback">%</span>}</div>}
        <div className="popup-body">{body}</div>
      </div>
    </div>
  );
}
