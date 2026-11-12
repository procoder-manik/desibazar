'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '../Providers';
import { api } from '@/lib/api';

// Edit the words on the storefront: announcement, hero, perks, section titles, promo and newsletter.
export default function Content({ full, onSaved }) {
  const { token, toast, setSettings, settings } = useApp();
  const [c, setC] = useState(full.content);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => setC(full.content), [full.content]);
  const dirty = JSON.stringify(c) !== JSON.stringify(full.content);

  // live preview: push edits into the storefront settings while typing
  useEffect(() => { setSettings((s) => ({ ...s, content: c })); }, [c]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => setSettings((s) => ({ ...s, content: full.content })), [full.content]); // eslint-disable-line react-hooks/exhaustive-deps

  const on = (sec, k) => (e) => setC({ ...c, [sec]: { ...c[sec], [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } });
  const perk = (i, k) => (e) => setC({ ...c, perks: c.perks.map((p, j) => (j === i ? { ...p, [k]: e.target.value } : p)) });
  const save = async () => {
    setBusy(true); setErr('');
    try { const pub = await api('/settings', { method: 'PUT', token, body: { content: c } }); setSettings(pub); onSaved(); toast('Content published'); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const h = c.hero || {};

  return (
    <>
      <p className="muted lead">Edit the text customers see. Changes appear on the <Link className="link" href="/" target="_blank">home page</Link> as soon as you publish. The hero layout itself is chosen in Appearance (current: <b>{settings.appearance?.hero}</b>).</p>
      <div className="glass co-card">
        <h3>Top bar</h3>
        <div className="seg" style={{ marginBottom: 14 }}>
          {[['static', 'One line'], ['ticker', 'Scrolling ticker'], ['off', 'Hidden']].map(([k, l]) => <button key={k} className={(c.bar?.mode || 'static') === k ? 'on' : ''} onClick={() => setC({ ...c, bar: { ...c.bar, mode: k } })}>{l}</button>)}
        </div>
        {(c.bar?.mode || 'static') !== 'off' && (
          <>
            <div className="fields one">
              <label>Messages <small>(one per line. A ticker scrolls them right to left, a single line shows the first)</small>
                <textarea rows={4} value={(c.bar?.messages?.length ? c.bar.messages : [c.announcement || '']).join('\n')} onChange={(e) => setC({ ...c, bar: { ...c.bar, messages: e.target.value.split('\n') } })} />
              </label>
            </div>
            <label className="f-row inline"><input type="checkbox" checked={c.bar?.autoOffers !== false} onChange={(e) => setC({ ...c, bar: { ...c.bar, autoOffers: e.target.checked } })} /><span className="box" /><span className="lbl">Also show live offers automatically (free delivery, and coupons marked &ldquo;In top bar&rdquo; in Coupons)</span></label>
          </>
        )}
      </div>
      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Hero section</h3>
        <div className="fields">
          <label>Small label above the headline<input value={h.eyebrow || ''} onChange={on('hero', 'eyebrow')} /></label>
          <label>Rating line<input value={h.proof || ''} onChange={on('hero', 'proof')} /></label>
          <label>Headline, line 1<input value={h.title || ''} onChange={on('hero', 'title')} /></label>
          <label>Headline, line 2 <small>(italic accent)</small><input value={h.titleEm || ''} onChange={on('hero', 'titleEm')} /></label>
          <label className="full">Paragraph<textarea rows={2} value={h.text || ''} onChange={on('hero', 'text')} /></label>
          <label>Main button text<input value={h.cta1Label || ''} onChange={on('hero', 'cta1Label')} /></label>
          <label>Main button link<input value={h.cta1Link || ''} onChange={on('hero', 'cta1Link')} placeholder="/shop" /></label>
          <label>Second button text<input value={h.cta2Label || ''} onChange={on('hero', 'cta2Label')} /></label>
          <label>Second button link<input value={h.cta2Link || ''} onChange={on('hero', 'cta2Link')} placeholder="/shop?sale=true" /></label>
        </div>
        <p className="fine left">Products in the hero slider are your <b>Featured</b> products (Products → Edit → Featured).</p>
      </div>
      <div className="glass co-card" style={{ marginTop: 16 }}>
        <div className="card-head"><h3>Trust badges</h3><label className="switch"><input type="checkbox" checked={c.perksEnabled !== false} onChange={(e) => setC({ ...c, perksEnabled: e.target.checked })} /><span /></label></div>
        <div className="fields">
          {(c.perks || []).map((p, i) => (
            <div key={i} className="perk-edit"><input value={p.title} onChange={perk(i, 'title')} placeholder="Title" /><input value={p.text} onChange={perk(i, 'text')} placeholder="Subtitle" /></div>
          ))}
        </div>
      </div>
      <div className="bag-grid even" style={{ marginTop: 16 }}>
        <div className="glass co-card">
          <h3>Promo banner (CTA section)</h3>
          <label className="f-row inline"><input type="checkbox" checked={c.promo?.enabled !== false} onChange={on('promo', 'enabled')} /><span className="box" /><span className="lbl">Show the promo banner</span></label>
          <div className="fields one">
            <label>Label<input value={c.promo?.eyebrow || ''} onChange={on('promo', 'eyebrow')} /></label>
            <label>Title<input value={c.promo?.title || ''} onChange={on('promo', 'title')} /></label>
            <label>Text<textarea rows={2} value={c.promo?.text || ''} onChange={on('promo', 'text')} /></label>
            <label>Button text<input value={c.promo?.ctaLabel || ''} onChange={on('promo', 'ctaLabel')} /></label>
            <label>Button link<input value={c.promo?.ctaLink || ''} onChange={on('promo', 'ctaLink')} /></label>
          </div>
          <p className="fine left">The images come from products that are on sale. Create the coupon itself in Coupons.</p>
        </div>
        <div className="glass co-card">
          <h3>Section titles</h3>
          <div className="fields one">
            <label>Categories<input value={c.sections?.categories || ''} onChange={on('sections', 'categories')} /></label>
            <label>Best sellers<input value={c.sections?.best || ''} onChange={on('sections', 'best')} /></label>
            <label>New arrivals<input value={c.sections?.fresh || ''} onChange={on('sections', 'fresh')} /></label>
          </div>
          <h3 style={{ marginTop: 18 }}>Newsletter (footer)</h3>
          <div className="fields one">
            <label>Title<input value={c.newsletter?.title || ''} onChange={on('newsletter', 'title')} /></label>
            <label>Text<input value={c.newsletter?.text || ''} onChange={on('newsletter', 'text')} /></label>
          </div>
        </div>
      </div>
      <div className="savebar">
        {err && <p className="err">{err}</p>}
        {dirty && <span className="muted">Unsaved changes (previewing live)</span>}
        {dirty && <button className="btn ghost sm" onClick={() => setC(full.content)}>Discard</button>}
        <button className="btn" disabled={!dirty || busy} onClick={save}>{busy ? 'Publishing…' : 'Publish'}</button>
      </div>
    </>
  );
}
