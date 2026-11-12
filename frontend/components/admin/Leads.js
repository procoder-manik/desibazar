'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../Providers';
import { MailIcon, PhoneIcon, TrashIcon } from '../Icons';
import { api, taka } from '@/lib/api';
import { fmtDate } from '@/lib/format';

const TABS = [['', 'To follow up'], ['called', 'Called'], ['converted', 'Ordered'], ['lost', 'Lost']];
const WhatsApp = (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M3 21l1.7-5A9 9 0 1 1 8 19.300L3 21Z" /><path d="M9 8.500c0 3.500 3 6.500 6.500 6.500l1-1.500-2-1-1 .8c-.8-.3-1.800-1.300-2.100-2.100l.8-1-1-2L9 8.500Z" /></svg>;

const ago = (d) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 6e4));
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

// Abandoned carts and incomplete orders: people who added items or started checkout but did not order.
export default function Leads() {
  const { token, toast, settings } = useApp();
  const [status, setStatus] = useState('');
  const [stage, setStage] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(() => api('/admin/leads?' + new URLSearchParams({ ...(status && { status }), ...(stage && { stage }) }), { token }).then(setData).catch((e) => setErr(e.message)), [status, stage, token]);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const patch = async (l, body, msg) => {
    try { await api('/admin/leads/' + l._id, { method: 'PATCH', token, body }); toast(msg); load(); } catch (e) { setErr(e.message); }
  };
  const remove = async (l) => {
    if (!confirm('Delete this entry?')) return;
    try { await api('/admin/leads/' + l._id, { method: 'DELETE', token }); load(); } catch (e) { setErr(e.message); }
  };
  const remind = async (l) => {
    setErr(''); setBusy(l._id);
    try { await api(`/admin/leads/${l._id}/remind`, { method: 'POST', token }); toast('Reminder e-mail sent'); load(); } catch (e) { setErr(e.message); }
    setBusy('');
  };
  const c = data?.counts || {};
  const wa = (l) => {
    const text = `আসসালামু আলাইকুম ${l.name || ''}, ${settings.store?.name || ''} থেকে বলছি। আপনি ব্যাগে ${l.items?.[0]?.name || 'কিছু পণ্য'} রেখেছিলেন। অর্ডারটি সম্পন্ন করতে কোনো সাহায্য লাগবে?`;
    return `https://wa.me/88${l.phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <>
      <p className="muted lead">People who put items in the bag or started checkout but did not order. Anyone who gave a phone number or e-mail (typed at checkout, or saved on their account) appears here so you can call, WhatsApp or e-mail them. If they ordered, the entry moves to <b>Ordered</b> by itself.</p>
      {data && !data.smtp && <p className="fine left boxed">Reminder e-mails are sent automatically, but your mail server (SMTP) is not set up yet, so nothing goes out. Add it in Settings → E-mails.</p>}
      {err && <p className="err boxed">{err}</p>}
      <div className="chips">
        {TABS.map(([k, l]) => <button key={k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{l}{k === '' ? ` (${(c.open || 0) + (c.called || 0)})` : c[k] ? ` (${c[k]})` : ''}</button>)}
        <span className="grow" />
        <select className="pillselect" value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage">
          <option value="">Bag and checkout</option><option value="cart">Only left items in the bag</option><option value="checkout">Started checkout</option>
        </select>
      </div>
      <div className="tablewrap glass">
        <table>
          <thead><tr><th>Customer</th><th>Left in the bag</th><th>Value</th><th>Where they stopped</th><th>Contact</th><th>Note</th><th /></tr></thead>
          <tbody>
            {!data ? <tr><td colSpan={7} className="muted">Loading…</td></tr> : !data.list.length ? <tr><td colSpan={7} className="muted">Nothing here.</td></tr> : data.list.map((l) => (
              <tr key={l._id}>
                <td><b>{l.name || 'No name'}</b>{l.user && <> <span className="pill-state">member</span></>}<br /><small className="muted">{l.phone || ''}{l.phone && l.email ? ' · ' : ''}{l.email || ''}</small>{l.address && <><br /><small className="muted">{l.address}</small></>}</td>
                <td><small>{l.items?.map((i) => `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} × ${i.qty}`).join(', ') || '–'}</small></td>
                <td><b>{taka(l.total || 0)}</b></td>
                <td><span className={'pill-state' + (l.stage === 'checkout' ? ' ok' : '')}>{l.stage === 'checkout' ? 'Started checkout' : 'Bag only'}</span><br /><small className="muted">{ago(l.updatedAt)} · {fmtDate(l.updatedAt)}{l.landingSlug ? ` · /lp/${l.landingSlug}` : ''}</small></td>
                <td>
                  <div className="contact-btns">
                    {l.phone && <a className="btn ghost sm" href={`tel:${l.phone}`} onClick={() => l.status === 'open' && patch(l, { status: 'called' }, 'Marked as called')}><PhoneIcon size={14} /> Call</a>}
                    {l.phone && <a className="btn ghost sm" href={wa(l)} target="_blank" rel="noreferrer"><WhatsApp /> WhatsApp</a>}
                    {l.email && l.status !== 'converted' && <button className="btn ghost sm" disabled={busy === l._id} onClick={() => remind(l)}><MailIcon size={14} /> {l.emailCount ? 'Email again' : 'Send email'}</button>}
                  </div>
                  {l.email && <small className="muted">{l.emailedAt ? `E-mailed ${ago(l.emailedAt)}${l.emailCount > 1 ? ` (${l.emailCount}×)` : ''}` : 'Not e-mailed yet'}</small>}
                </td>
                <td><input className="mini-input" defaultValue={l.note || ''} placeholder="e.g. call after 6pm" onBlur={(e) => e.target.value !== (l.note || '') && patch(l, { note: e.target.value }, 'Note saved')} /></td>
                <td className="nowrap">
                  {l.status !== 'converted' && (
                    <select className="statussel" value={l.status} onChange={(e) => patch(l, { status: e.target.value }, 'Updated')}>
                      <option value="open">to follow up</option><option value="called">called</option><option value="lost">lost</option><option value="converted">ordered</option>
                    </select>
                  )}
                  <button className="iconbtn" aria-label="Delete" onClick={() => remove(l)}><TrashIcon size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
