'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../Providers';
import { CheckIcon, TrashIcon } from '../Icons';
import { SaveBar, useSection } from './StoreSettings';
import { api, taka } from '@/lib/api';
import { fmtDate, orderNo } from '@/lib/format';

const TYPES = [['phone', 'Phone number', '01XXXXXXXXX'], ['ip', 'IP address', '203.0.113.5'], ['email', 'E-mail', 'name@example.com']];

// Fraud protection: the automatic checks, orders that need a second look, the blocklist and refused attempts.
export default function Fraud({ full, onSaved, goOrders }) {
  const { token, toast } = useApp();
  const s = useSection(full, 'fraud');
  const f = { enabled: true, flagScore: 40, blockScore: 80, maxOrdersPerPhone: 3, maxOrdersPerIp: 5, blockFakePhones: true, badHistory: 3, ...(s.v || {}) };
  const set = (patch) => s.setV({ ...f, ...patch });
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [add, setAdd] = useState({ type: 'phone', value: '', reason: '' });
  const load = useCallback(() => api('/fraud', { token }).then(setD).catch((e) => setErr(e.message)), [token]);
  useEffect(() => { load(); }, [load]);

  const call = async (path, opts, msg) => { setErr(''); try { await api(path, { token, ...opts }); toast(msg); load(); return true; } catch (e) { setErr(e.message); return false; } };
  const addBlock = async (e) => { e.preventDefault(); if (await call('/fraud/block', { method: 'POST', body: add }, 'Added to the blocklist')) setAdd({ ...add, value: '', reason: '' }); };
  const num = (k, min, max) => <input type="number" min={min} max={max} value={f[k]} onChange={(e) => set({ [k]: +e.target.value })} />;

  return (
    <>
      <div className="glass co-card">
        <div className="pay-row">
          <div><b>Automatic fraud checks</b><small>Every new order gets a risk score from 0 to 100. Low: placed normally. Medium: placed, but marked “needs review”. High: refused with a polite message and logged below. Customers never see the score.</small></div>
          <span className={'pill-state' + (f.enabled ? ' ok' : ' off')}>{f.enabled ? 'On' : 'Off'}</span>
          <label className="switch"><input type="checkbox" checked={!!f.enabled} onChange={(e) => set({ enabled: e.target.checked })} /><span /></label>
        </div>
        {f.enabled && (
          <>
            <div className="fields four" style={{ marginTop: 14 }}>
              <label>Mark for review at <small className="muted">(score)</small>{num('flagScore', 5, 99)}</label>
              <label>Refuse at <small className="muted">(score)</small>{num('blockScore', 10, 100)}</label>
              <label>Max orders per phone <small className="muted">(24 h)</small>{num('maxOrdersPerPhone', 1, 50)}</label>
              <label>Max orders per network <small className="muted">(1 h)</small>{num('maxOrdersPerIp', 1, 100)}</label>
              <label>Cancelled / returned before refusing{num('badHistory', 1, 20)}</label>
            </div>
            <label className="f-row inline"><input type="checkbox" checked={!!f.blockFakePhones} onChange={(e) => set({ blockFakePhones: e.target.checked })} /><span className="box" /><span className="lbl">Flag made-up phone numbers (01711111111, 01234567890…)</span></label>
            <p className="fine left">What raises the score: a made-up phone or name, many orders from one phone or one network, earlier cancelled or returned orders from the same phone, a repeat of a pending order, a very short address, and bots (a hidden form field is always checked). The blocklist below is always applied, even if these checks are off.</p>
          </>
        )}
      </div>
      <SaveBar s={s} onSaved={onSaved} />
      {err && <p className="err boxed">{err}</p>}

      <div className="glass co-card" style={{ marginTop: 16 }}>
        <div className="row-title"><h3>Orders that need a look {d?.review?.length ? `(${d.review.length})` : ''}</h3><button className="btn ghost sm" onClick={() => goOrders({ risk: 'review' })}>Open in Orders</button></div>
        <div className="tablewrap flat">
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Score</th><th>Why</th><th /></tr></thead>
            <tbody>
              {!d ? <tr><td colSpan={6} className="muted">Loading…</td></tr> : !d.review.length ? <tr><td colSpan={6} className="muted">Nothing to review. 🎉</td></tr> : d.review.map((o) => (
                <tr key={o._id}>
                  <td><b>{orderNo(o)}</b><br /><small className="muted">{fmtDate(o.createdAt)} · {o.status}</small></td>
                  <td>{o.shipping?.name}<br /><small className="muted">{o.shipping?.phone}</small></td>
                  <td><b>{taka(o.total)}</b></td>
                  <td><span className="risk-pill review">{o.risk?.score}</span></td>
                  <td><small>{(o.risk?.reasons || []).join(' · ')}</small></td>
                  <td className="nowrap">
                    <button className="btn ghost sm" onClick={() => call('/orders/' + o._id, { method: 'PATCH', body: { riskReviewed: true } }, 'Marked as checked')}><CheckIcon size={14} /> Looks fine</button>
                    <button className="btn ghost sm danger" onClick={() => confirm(`Block ${o.shipping?.phone} and cancel this order?`) && call('/fraud/block', { method: 'POST', body: { orderId: o._id, what: 'phone', cancel: true, reason: 'Fraud review' } }, 'Blocked and cancelled')}>Block & cancel</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Blocklist</h3>
        <form className="toolbar" onSubmit={addBlock}>
          <select value={add.type} onChange={(e) => setAdd({ ...add, type: e.target.value })} className="pillselect">{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <input value={add.value} onChange={(e) => setAdd({ ...add, value: e.target.value })} placeholder={TYPES.find(([k]) => k === add.type)[2]} style={{ flex: 1 }} required />
          <input value={add.reason} onChange={(e) => setAdd({ ...add, reason: e.target.value })} placeholder="Reason (optional)" style={{ flex: 1 }} />
          <button className="btn">Block</button>
        </form>
        <div className="tablewrap flat" style={{ marginTop: 10 }}>
          <table>
            <thead><tr><th>Type</th><th>Value</th><th>Reason</th><th>Added</th><th /></tr></thead>
            <tbody>
              {!d?.blocklist.length ? <tr><td colSpan={5} className="muted">Nobody is blocked.</td></tr> : d.blocklist.map((b) => (
                <tr key={b._id}><td><span className="pill-state">{b.type}</span></td><td><code>{b.value}</code></td><td><small>{b.reason || '–'}</small></td><td><small>{fmtDate(b.createdAt)}{b.by ? ` · ${b.by}` : ''}</small></td>
                  <td><button className="iconbtn" aria-label="Unblock" onClick={() => call('/fraud/block/' + b._id, { method: 'DELETE' }, 'Removed')}><TrashIcon size={15} /></button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fine left">Tip: block a phone number first. A network (IP) address is often shared by many people on mobile data, so block one only when the same attacker keeps coming back. A blocked person sees “We could not accept this order online. Please call us to place it.” You can also block a phone or network straight from an order.</p>
      </div>

      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Refused attempts {d ? <small className="muted">· {d.blocked7} in the last 7 days</small> : null}</h3>
        <div className="tablewrap flat">
          <table>
            <thead><tr><th>When</th><th>Who</th><th>Score</th><th>Why</th></tr></thead>
            <tbody>
              {!d?.log.length ? <tr><td colSpan={4} className="muted">No refused orders yet.</td></tr> : d.log.map((l) => (
                <tr key={l._id}><td><small>{new Date(l.createdAt).toLocaleString('en-GB')}</small></td><td>{l.name || '–'}<br /><small className="muted">{l.phone} · {l.ip}</small></td><td><span className="risk-pill block">{l.score}</span></td><td><small>{(l.reasons || []).join(' · ')}</small></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
