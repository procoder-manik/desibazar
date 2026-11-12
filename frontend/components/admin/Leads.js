'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../Providers';
import { PhoneIcon, TrashIcon } from '../Icons';
import { api, taka } from '@/lib/api';
import { fmtDate } from '@/lib/format';

const TABS = [['', 'To follow up'], ['called', 'Called'], ['converted', 'Ordered'], ['lost', 'Lost']];

// Incomplete orders: people who typed their phone number at checkout but did not place the order.
export default function Leads() {
  const { token, toast } = useApp();
  const [status, setStatus] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => api('/admin/leads' + (status ? `?status=${status}` : ''), { token }).then(setData).catch((e) => setErr(e.message)), [status, token]);
  useEffect(() => { load(); }, [load]);

  const patch = async (l, body, msg) => {
    try { await api('/admin/leads/' + l._id, { method: 'PATCH', token, body }); toast(msg); load(); } catch (e) { setErr(e.message); }
  };
  const remove = async (l) => {
    if (!confirm('Delete this incomplete order?')) return;
    try { await api('/admin/leads/' + l._id, { method: 'DELETE', token }); load(); } catch (e) { setErr(e.message); }
  };
  const c = data?.counts || {};

  return (
    <>
      <p className="muted lead">When a customer types a valid phone number at checkout (store or landing page) but leaves without ordering, it shows up here. Call them, then mark the result. If they order later, it moves to <b>Ordered</b> automatically.</p>
      {err && <p className="err boxed">{err}</p>}
      <div className="chips">
        {TABS.map(([k, l]) => <button key={k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{l}{k === '' ? ` (${(c.open || 0) + (c.called || 0)})` : c[k] ? ` (${c[k]})` : ''}</button>)}
      </div>
      <div className="tablewrap glass">
        <table>
          <thead><tr><th>Customer</th><th>Wanted</th><th>Value</th><th>From</th><th>Last seen</th><th>Note</th><th /></tr></thead>
          <tbody>
            {!data ? <tr><td colSpan={7} className="muted">Loading…</td></tr> : !data.list.length ? <tr><td colSpan={7} className="muted">Nothing here.</td></tr> : data.list.map((l) => (
              <tr key={l._id}>
                <td><b>{l.name || 'No name'}</b><br /><a className="link" href={`tel:${l.phone}`}><PhoneIcon size={13} /> {l.phone}</a>{l.address && <><br /><small className="muted">{l.address}</small></>}</td>
                <td><small>{l.items?.map((i) => `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} × ${i.qty}`).join(', ') || '–'}</small></td>
                <td><b>{taka(l.total || 0)}</b></td>
                <td><small>{l.landingSlug ? `/lp/${l.landingSlug}` : 'Store checkout'}</small></td>
                <td><small>{fmtDate(l.updatedAt)}</small></td>
                <td><input className="mini-input" defaultValue={l.note || ''} placeholder="e.g. call after 6pm" onBlur={(e) => e.target.value !== (l.note || '') && patch(l, { note: e.target.value }, 'Note saved')} /></td>
                <td className="nowrap">
                  {l.status !== 'converted' && (
                    <select className="statussel" value={l.status} onChange={(e) => patch(l, { status: e.target.value }, 'Updated')}>
                      <option value="open">to call</option><option value="called">called</option><option value="lost">lost</option><option value="converted">ordered</option>
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
