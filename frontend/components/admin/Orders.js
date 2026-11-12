'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../Providers';
import { CloseIcon, ExternalIcon, PrintIcon, SearchIcon, TruckIcon } from '../Icons';
import { api, taka } from '@/lib/api';
import { fmtDate, orderNo } from '@/lib/format';
import { PAY_LABELS } from '@/lib/bd';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
const PAY = ['unpaid', 'submitted', 'paid', 'failed', 'refunded'];

function OrderPanel({ o, couriers, steadfastReady, onSaved, onClose }) {
  const { token, toast, user } = useApp();
  const perms = user?.permissions || [];
  const [c, setC] = useState({ name: o.courier?.name || '', consignmentId: o.courier?.consignmentId || '', trackingCode: o.courier?.trackingCode || '', trackingUrl: o.courier?.trackingUrl || '' });
  const [note, setNote] = useState(o.adminNote || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const locked = ['cancelled', 'returned'].includes(o.status);
  const [refund, setRefund] = useState(o.payment?.refundAmount || o.total);

  const patch = async (body, msg) => {
    setBusy(true); setErr('');
    try { onSaved(await api('/orders/' + o._id, { method: 'PATCH', token, body })); toast(msg); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const blockCustomer = async (what) => {
    if (!confirm(`Block ${o.shipping.phone}${what === 'both' ? ' and this network' : ''} from ordering?${what === 'both' ? '\n\nCareful: many customers on mobile data share one network address, so blocking it can stop innocent people too. Block the phone only unless you are sure.' : ''}${o.status === 'pending' ? '\n\nThis pending order will be cancelled.' : ''}`)) return;
    setBusy(true); setErr('');
    try { await api('/fraud/block', { method: 'POST', token, body: { orderId: o._id, what, cancel: true, reason: 'Blocked from order ' + orderNo(o) } }); toast('Blocked'); onSaved(await api('/orders/' + o._id, { token })); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const book = async () => {
    setBusy(true); setErr('');
    try { onSaved(await api(`/orders/${o._id}/book`, { method: 'POST', token, body: { courier: 'steadfast' } })); toast('Booked with Steadfast'); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const refresh = async () => {
    try { onSaved(await api(`/orders/${o._id}/courier-status`, { method: 'POST', token })); } catch (e) { setErr(e.message); }
  };

  return (
    <aside className="opanel">
      <div className="drawer-head">
        <h3>{orderNo(o)} <small>{fmtDate(o.createdAt)}</small></h3>
        <button className="iconbtn" onClick={onClose} aria-label="Close"><CloseIcon /></button>
      </div>
      <div className="opanel-body">
        {err && <p className="err boxed">{err}</p>}
        <section>
          <h5>Status</h5>
          <div className="seg">
            {STATUSES.map((s) => <button key={s} disabled={busy || (locked && o.status === s)} className={o.status === s ? 'on ' + s : ''} onClick={() => { if (locked && o.status !== s && !confirm(`Reopen this ${o.status} order as ${s}? Stock will be taken again.`)) return; patch({ status: s }, `Marked ${s}`); }}>{s}</button>)}
          </div>
        </section>
        <section>
          <h5>Payment · {PAY_LABELS[o.paymentMethod] || o.paymentMethod}</h5>
          <div className="srow"><span>Status</span>
            <select value={o.payment?.status} disabled={busy} onChange={(e) => patch({ paymentStatus: e.target.value }, 'Payment updated')} className="statussel">
              {PAY.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          {o.payment?.sender && <div className="srow"><span>Sent from</span><b>{o.payment.sender}</b></div>}
          {o.payment?.trxId && <div className="srow"><span>Transaction ID</span><code>{o.payment.trxId}</code></div>}
          {o.payment?.status === 'paid' && (
            <div className="refund-box">
              <label>Refund amount (৳)<input type="number" min="1" max={o.total} value={refund} onChange={(e) => setRefund(e.target.value)} /></label>
              <button className="btn ghost sm danger" disabled={busy} onClick={() => confirm(`Refund ৳${refund} to the customer?`) && patch({ paymentStatus: 'refunded', refundAmount: +refund, ...(!['returned', 'cancelled'].includes(o.status) && { status: 'returned' }) }, 'Refund recorded')}>Refund & mark returned</button>
            </div>
          )}
          {o.payment?.status === 'refunded' && <p className="fine left">Refunded ৳{o.payment.refundAmount || o.total}{o.payment.refundedAt ? ` on ${new Date(o.payment.refundedAt).toLocaleDateString('en-GB')}` : ''}. Change the status above to take it back (e.g. back to Paid).</p>}
          {o.payment?.status === 'submitted' && <button className="btn sm block" disabled={busy} onClick={() => patch({ paymentStatus: 'paid', ...(o.status === 'pending' && { status: 'confirmed' }) }, 'Payment verified')}>Verify payment & confirm</button>}
        </section>
        {o.risk?.score > 0 && (
          <section>
            <h5>Fraud check <span className={'risk-pill ' + (o.risk.level === 'review' && !o.risk.reviewed ? 'review' : 'ok')}>{o.risk.score} / 100</span></h5>
            {o.risk.reasons?.length ? <ul className="hist">{o.risk.reasons.map((r, k) => <li key={k}>{r}</li>)}</ul> : <p className="fine left">No warning signs.</p>}
            {o.risk.ip && <p className="fine left">Network: {o.risk.ip}</p>}
            <div className="btnrow left" style={{ marginTop: 8 }}>
              {o.risk.level === 'review' && !o.risk.reviewed && <button className="btn ghost sm" disabled={busy} onClick={() => patch({ riskReviewed: true }, 'Marked as checked')}>Looks fine</button>}
              {perms.includes('fraud') && <button className="btn ghost sm danger" disabled={busy} onClick={() => blockCustomer('phone')}>Block this phone</button>}
              {perms.includes('fraud') && o.risk.ip && <button className="btn ghost sm danger" disabled={busy} onClick={() => blockCustomer('both')}>Block phone + network</button>}
            </div>
          </section>
        )}
        {o.advance?.required && (
          <section>
            <h5>Advance · {PAY_LABELS[o.advance.method] || o.advance.method}</h5>
            <div className="srow"><span>Amount</span><b>{taka(o.advance.amount)}</b></div>
            <div className="srow"><span>Status</span>
              <select value={o.advance.status} disabled={busy} onChange={(e) => patch({ advanceStatus: e.target.value }, 'Advance updated')} className="statussel">
                {['unpaid', 'submitted', 'paid', 'failed'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            {o.advance.sender && <div className="srow"><span>Sent from</span><b>{o.advance.sender}</b></div>}
            {o.advance.trxId && <div className="srow"><span>Transaction ID</span><code>{o.advance.trxId}</code></div>}
            <div className="srow"><span>Rider collects</span><b>{taka(o.total - (o.advance.status === 'paid' ? o.advance.amount : 0))}</b></div>
            {o.advance.status === 'submitted' && <button className="btn sm block" disabled={busy} onClick={() => patch({ advanceStatus: 'paid', ...(o.status === 'pending' && { status: 'confirmed' }) }, 'Advance verified')}>Verify advance & confirm</button>}
          </section>
        )}
        {(o.source?.landingSlug || o.source?.utm?.source || o.source?.fbclid || o.source?.gclid || o.source?.referrer) && (
          <section>
            <h5>Source</h5>
            {o.source.landingSlug && <div className="srow"><span>Landing page</span><a className="link" href={`/lp/${encodeURIComponent(o.source.landingSlug)}`} target="_blank" rel="noreferrer">/lp/{o.source.landingSlug}</a></div>}
            {o.source.utm?.source && <div className="srow"><span>Campaign</span><b>{[o.source.utm.source, o.source.utm.medium, o.source.utm.campaign].filter(Boolean).join(' / ')}</b></div>}
            {(o.source.fbclid || o.source.gclid) && <div className="srow"><span>Ad click</span><b>{o.source.fbclid ? 'Facebook / Instagram' : 'Google Ads'}</b></div>}
            {o.source.referrer && <div className="srow"><span>Referrer</span><small>{o.source.referrer.replace(/^https?:\/\//, '').slice(0, 40)}</small></div>}
          </section>
        )}
        <section>
          <h5>Customer</h5>
          <p className="addr"><b>{o.shipping.name}</b> · <a className="link" href={`tel:${o.shipping.phone}`}>{o.shipping.phone}</a><br />{o.shipping.address}{o.shipping.district ? `, ${o.shipping.district}` : ''}<br /><small>{o.shipping.zoneName || o.shipping.area}</small>{o.shipping.note && <><br /><small>Note: {o.shipping.note}</small></>}</p>
        </section>
        <section>
          <h5>Items</h5>
          {o.items.map((i, k) => <div key={k} className="srow"><span>{i.name}{i.variantLabel ? ` (${i.variantLabel})` : ""} × {i.qty}</span><b>{taka(i.price * i.qty)}</b></div>)}
          <div className="srow muted"><span>Delivery{o.discount ? ` · discount −${taka(o.discount)}` : ''}</span><span>{taka(o.deliveryFee)}</span></div>
          <div className="srow total"><span>Total</span><b>{taka(o.total)}</b></div>
        </section>
        <section>
          <h5>Shipping & courier</h5>
          {o.courier?.consignmentId && (
            <div className="courier-box">
              <TruckIcon size={20} />
              <div><b>{couriers.find((x) => x.key === o.courier.name)?.name || o.courier.name}</b><small>{o.courier.consignmentId}{o.courier.status ? ` · ${o.courier.status}` : ''}</small></div>
              {o.courier.name === 'steadfast' && <button className="btn ghost sm" onClick={refresh}>Refresh</button>}
              {o.courier.trackingUrl && <a className="btn ghost sm" href={o.courier.trackingUrl} target="_blank" rel="noreferrer"><ExternalIcon size={14} /></a>}
            </div>
          )}
          {!o.courier?.consignmentId && !locked && (
            <button className="btn sm block" disabled={busy || !steadfastReady} onClick={book} title={steadfastReady ? '' : 'Add Steadfast API keys in backend/.env'}>
              <TruckIcon size={16} /> {steadfastReady ? 'Book with Steadfast (API)' : 'Steadfast API not configured'}
            </button>
          )}
          <div className="fields" style={{ marginTop: 12 }}>
            <label>Courier<select value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })}><option value="">Choose…</option>{couriers.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</select></label>
            <label>Consignment / tracking ID<input value={c.consignmentId} onChange={(e) => setC({ ...c, consignmentId: e.target.value })} /></label>
            <label className="full">Tracking link <small>(optional)</small><input type="url" value={c.trackingUrl} onChange={(e) => setC({ ...c, trackingUrl: e.target.value })} placeholder="https://..." /></label>
          </div>
          <button className="btn ghost sm" disabled={busy || !c.name} onClick={() => patch({ courier: c, ...(c.consignmentId && ['pending', 'confirmed', 'processing'].includes(o.status) && { status: 'shipped' }) }, 'Courier saved')}>Save courier details</button>
        </section>
        <section>
          <h5>Internal note</h5>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only visible to admins" />
          <button className="btn ghost sm" style={{ marginTop: 8 }} disabled={busy || note === (o.adminNote || '')} onClick={() => patch({ adminNote: note }, 'Note saved')}>Save note</button>
        </section>
        <section>
          <h5>History</h5>
          <ul className="hist">{[...(o.history || [])].reverse().map((h, k) => <li key={k}><b>{h.status}</b>{h.note ? ` · ${h.note}` : ''}<small>{new Date(h.at).toLocaleString('en-GB')}</small></li>)}</ul>
        </section>
        <Link href={`/orders/${o._id}/invoice`} target="_blank" className="btn ghost block"><PrintIcon size={16} /> Print invoice</Link>
      </div>
    </aside>
  );
}

export default function Orders({ initial = {}, couriers, steadfastReady, onChanged }) {
  const { token } = useApp();
  const [f, setF] = useState({ status: '', payment: '', q: '', risk: '', ...initial });
  const [q, setQ] = useState(initial.q || '');
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    api('/orders?' + qs, { token }).then(setList).catch(() => setList([]));
  }, [f, token]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => setF((x) => ({ ...x, q })), 300); return () => clearTimeout(t); }, [q]);

  const saved = (o) => { setList((l) => l.map((x) => (x._id === o._id ? { ...x, ...o } : x))); setOpen(o); onChanged?.(); };

  return (
    <>
      <div className="toolbar">
        <label className="search glass"><SearchIcon size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, #order or consignment" /></label>
        <select value={f.payment} onChange={(e) => setF({ ...f, payment: e.target.value })} className="pillselect"><option value="">All payments</option>{PAY.map((p) => <option key={p} value={p}>{p === 'submitted' ? 'awaiting verification' : p}</option>)}</select>
      </div>
      <div className="chips">
        <button className={!f.status ? 'on' : ''} onClick={() => setF({ ...f, status: '' })}>All</button>
        {STATUSES.map((s) => <button key={s} className={f.status === s ? 'on' : ''} onClick={() => setF({ ...f, status: s })}>{s}</button>)}
        <button className={f.risk ? 'on' : ''} onClick={() => setF({ ...f, risk: f.risk ? '' : 'review' })}>Needs review</button>
      </div>
      <div className="tablewrap glass">
        <table>
          <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Courier</th><th>Status</th></tr></thead>
          <tbody>
            {!list ? <tr><td colSpan={6} className="muted">Loading…</td></tr> : list.length === 0 ? <tr><td colSpan={6} className="muted">No orders match.</td></tr> : list.map((o) => (
              <tr key={o._id} className="clickrow" onClick={() => setOpen(o)}>
                <td><b>{orderNo(o)}</b><br /><small className="muted">{fmtDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.qty, 0)} items</small></td>
                <td>{o.shipping?.name}<br /><small className="muted">{o.shipping?.phone} · {o.shipping?.district || o.shipping?.zoneName || o.shipping?.area}</small></td>
                <td><b>{taka(o.total)}</b></td>
                <td><small>{PAY_LABELS[o.paymentMethod] || o.paymentMethod}</small><br /><span className={'paystatus ' + o.payment?.status}>{o.payment?.status === 'submitted' ? 'verify' : o.payment?.status}</span>
                  {o.advance?.required && <><br /><span className={'paystatus ' + o.advance.status}>advance {o.advance.status === 'submitted' ? 'verify' : o.advance.status}</span></>}
                  {o.source?.kind === 'landing' && <><br /><small className="muted">landing page</small></>}
                  {o.risk?.level === 'review' && <><br /><span className={'risk-pill review' + (o.risk.reviewed ? ' done' : '')} title={(o.risk.reasons || []).join(' · ')}>{o.risk.reviewed ? 'checked' : 'review'} {o.risk.score}</span></>}</td>
                <td><small>{o.courier?.name ? (couriers.find((x) => x.key === o.courier.name)?.name || o.courier.name) : '–'}</small>{o.courier?.consignmentId && <><br /><small className="muted">{o.courier.consignmentId}</small></>}</td>
                <td><span className={'status ' + o.status}>{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <>
          <div className="scrim on" onClick={() => setOpen(null)} />
          <OrderPanel key={open._id + open.updatedAt} o={open} couriers={couriers} steadfastReady={steadfastReady} onSaved={saved} onClose={() => setOpen(null)} />
        </>
      )}
    </>
  );
}
