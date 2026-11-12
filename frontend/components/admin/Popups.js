'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../Providers';
import { CloseIcon, EditIcon, PlusIcon, TrashIcon } from '../Icons';
import { api } from '@/lib/api';

const blank = { name: '', active: true, layout: 'split', eyebrow: '', title: '', text: '', image: '', code: '', ctaLabel: 'Shop now', ctaLink: '/shop', trigger: 'delay', delay: 4, frequency: 'daily', pages: 'all', audience: 'all', startsAt: '', endsAt: '', priority: 0 };
const LAYOUTS = { split: 'Image + text', center: 'Centered card', corner: 'Corner card', bar: 'Bottom bar' };
const day = (d) => (d ? new Date(d).toISOString().slice(0, 16) : '');

function Editor({ popup, onClose, onSaved }) {
  const { token, toast } = useApp();
  const [p, setP] = useState({ ...blank, ...popup, startsAt: day(popup?.startsAt), endsAt: day(popup?.endsAt) });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setP({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' ? +e.target.value : e.target.value });
  const save = async () => {
    setErr(''); setBusy(true);
    try {
      const body = { ...p, startsAt: p.startsAt ? new Date(p.startsAt).toISOString() : '', endsAt: p.endsAt ? new Date(p.endsAt).toISOString() : '' };
      await api(popup?._id ? '/popups/' + popup._id : '/popups', { method: popup?._id ? 'PUT' : 'POST', token, body });
      toast('Pop-up saved'); onSaved();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Edit pop-up">
      <div className="scrim on" onClick={onClose} />
      <div className="modal editor">
        <div className="modal-head"><div><span className="eyebrow">{popup?._id ? 'Edit pop-up' : 'New pop-up'}</span><h3>{p.name || 'Untitled pop-up'}</h3></div><button className="iconbtn" onClick={onClose} aria-label="Close"><CloseIcon /></button></div>
        <div className="modal-body">
          {err && <p className="err boxed">{err}</p>}
          <div className="bag-grid even">
            <div>
              <section className="cf-sec"><h3>Content</h3>
                <div className="fields">
                  <label className="full">Internal name<input value={p.name} onChange={set('name')} placeholder="e.g. Eid sale" /></label>
                  <label>Small label<input value={p.eyebrow || ''} onChange={set('eyebrow')} placeholder="Limited time" /></label>
                  <label>Coupon code <small>(optional)</small><input value={p.code || ''} onChange={(e) => setP({ ...p, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" /></label>
                  <label className="full">Title<input value={p.title} onChange={set('title')} placeholder="Get 10% off your first order" /></label>
                  <label className="full">Text<textarea rows={2} value={p.text || ''} onChange={set('text')} /></label>
                  <label>Button text<input value={p.ctaLabel || ''} onChange={set('ctaLabel')} /></label>
                  <label>Button link<input value={p.ctaLink || ''} onChange={set('ctaLink')} /></label>
                  <label className="full">Image URL <small>(for "Image + text" and "Corner card")</small><input value={p.image || ''} onChange={set('image')} placeholder="https://…" /></label>
                </div>
              </section>
              <section className="cf-sec" style={{ marginTop: 14 }}><h3>Layout</h3>
                <div className="seg">{Object.entries(LAYOUTS).map(([k, l]) => <button key={k} className={p.layout === k ? 'on' : ''} onClick={() => setP({ ...p, layout: k })}>{l}</button>)}</div>
              </section>
            </div>
            <div>
              <section className="cf-sec"><h3>When to show</h3>
                <div className="fields">
                  <label>Trigger<select value={p.trigger} onChange={set('trigger')}><option value="delay">After a delay</option><option value="scroll">After scrolling</option><option value="exit">Exit intent (desktop)</option></select></label>
                  <label>Delay (seconds)<input type="number" min="0" max="120" value={p.delay} onChange={set('delay')} disabled={p.trigger !== 'delay'} /></label>
                  <label>How often<select value={p.frequency} onChange={set('frequency')}><option value="once">Once per visitor</option><option value="daily">Once a day</option><option value="session">Once per visit</option><option value="always">Every page view</option></select></label>
                  <label>Pages<select value={p.pages} onChange={set('pages')}><option value="all">All pages</option><option value="home">Home only</option><option value="shop">Shop only</option><option value="product">Product pages</option></select></label>
                  <label>Audience<select value={p.audience} onChange={set('audience')}><option value="all">Everyone</option><option value="guests">Not signed in</option><option value="members">Signed-in members</option></select></label>
                  <label>Priority<input type="number" value={p.priority} onChange={set('priority')} /></label>
                  <label>Starts<input type="datetime-local" value={p.startsAt} onChange={set('startsAt')} /></label>
                  <label>Ends<input type="datetime-local" value={p.endsAt} onChange={set('endsAt')} /></label>
                </div>
                <label className="f-row inline"><input type="checkbox" checked={p.active} onChange={set('active')} /><span className="box" /><span className="lbl">Active</span></label>
              </section>
              <section className="cf-sec popup-preview" style={{ marginTop: 14 }}>
                <h3>Preview</h3>
                <div className="pv"><span className="eyebrow">{p.eyebrow}</span><b>{p.title || 'Your title'}</b><p className="muted">{p.text}</p>{p.code && <code>{p.code}</code>}{p.ctaLabel && <span className="btn sm">{p.ctaLabel}</span>}</div>
                <p className="fine left">Save, then open your store in a new tab to see it exactly as customers do (clear the &ldquo;seen&rdquo; state by using a private window).</p>
              </section>
            </div>
          </div>
        </div>
        <div className="modal-foot"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy || !p.title || !p.name} onClick={save}>{busy ? 'Saving…' : 'Save pop-up'}</button></div>
      </div>
    </div>
  );
}

export default function Popups() {
  const { token, toast } = useApp();
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => api('/popups', { token }).then(setList).catch((e) => setErr(e.message)), [token]);
  useEffect(() => { load(); }, [load]);
  const toggle = async (p) => { await api('/popups/' + p._id, { method: 'PUT', token, body: { active: !p.active } }); load(); };
  const del = async (p) => { if (confirm(`Delete "${p.name}"?`)) { await api('/popups/' + p._id, { method: 'DELETE', token }); toast('Pop-up deleted'); load(); } };
  const now = Date.now();
  const state = (p) => (!p.active ? 'paused' : p.startsAt && new Date(p.startsAt) > now ? 'scheduled' : p.endsAt && new Date(p.endsAt) < now ? 'ended' : 'live');

  return (
    <>
      {err && <p className="err boxed">{err}</p>}
      <div className="toolbar spread"><p className="muted" style={{ margin: 0 }}>Promotional pop-ups, banners and corner cards. One shows at a time, highest priority first.</p><button className="btn" onClick={() => setEdit({})}><PlusIcon size={15} /> New pop-up</button></div>
      <div className="popup-list">
        {!list ? <div className="skel glass" style={{ height: 80 }} /> : list.length === 0 ? (
          <div className="empty glass"><h3>No pop-ups yet</h3><p>Create a welcome offer, a sale announcement or a coupon reminder.</p><button className="btn" onClick={() => setEdit({})}>Create the first pop-up</button></div>
        ) : list.map((p) => (
          <div key={p._id} className="popup-row">
            <span className="thumb">{p.image ? <img src={p.image} alt="" /> : '%'}</span>
            <div><b>{p.name}</b><small>{LAYOUTS[p.layout]} · {p.trigger === 'delay' ? `after ${p.delay}s` : p.trigger === 'scroll' ? 'on scroll' : 'exit intent'} · {p.frequency} · {p.pages === 'all' ? 'all pages' : p.pages}</small></div>
            <span className={'pill-state ' + (state(p) === 'live' ? 'ok' : '')}>{state(p)}</span>
            <div className="actions">
              <label className="switch"><input type="checkbox" checked={p.active} onChange={() => toggle(p)} /><span /></label>
              <button className="iconbtn" onClick={() => setEdit(p)} aria-label="Edit"><EditIcon size={16} /></button>
              <button className="iconbtn" onClick={() => del(p)} aria-label="Delete"><TrashIcon size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      {edit && <Editor popup={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </>
  );
}
