'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useApp } from '@/components/Providers';
import { BoxIcon, CheckIcon, ExternalIcon, HomeIcon, PrintIcon, TruckIcon } from '@/components/Icons';
import { api, taka } from '@/lib/api';
import { fmtDate, orderNo } from '@/lib/format';
import { PAY_LABELS } from '@/lib/bd';

const FLOW = [['pending', 'Placed', BoxIcon], ['confirmed', 'Confirmed', CheckIcon], ['processing', 'Packed', BoxIcon], ['shipped', 'On the way', TruckIcon], ['delivered', 'Delivered', HomeIcon]];
const PAYMENT_MSG = {
  success: ['ok', 'Payment received. Thank you!'],
  failed: ['err', 'The payment did not go through. You can try again below or choose cash on delivery by contacting us.'],
  cancelled: ['err', 'You cancelled the payment. You can try again below.'],
};

function Order() {
  const { id } = useParams();
  const sp = useSearchParams();
  const key = sp.get('key');
  const placed = sp.get('placed');
  const payResult = sp.get('payment');
  const { token, ready, toast } = useApp();
  const [o, setO] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const qs = key ? `?key=${key}` : '';

  useEffect(() => {
    if (!ready) return;
    if (!token && !key) return;
    api(`/orders/${id}${qs}`, { token }).then(setO).catch((e) => setError(e.message));
  }, [id, token, ready, key, qs]);

  if (!ready) return null;
  if (!token && !key) return <div className="empty glass"><h3>Sign in to view this order</h3><Link href={`/login?next=/orders/${id}`} className="btn">Sign in</Link></div>;
  if (error && !o) return <div className="empty glass"><h3>{error}</h3><Link href="/" className="btn">Go home</Link></div>;
  if (!o) return <div className="skel glass" style={{ height: 300, marginTop: 28 }} />;

  const step = FLOW.findIndex(([s]) => s === o.status);
  const when = (s) => o.history?.find((h) => h.status === s)?.at;
  const online = ['sslcommerz', 'bkash'].includes(o.paymentMethod);
  const canRetry = online && o.payment?.status !== 'paid' && o.status !== 'cancelled';
  const cancel = async () => {
    if (!confirm('Cancel this order?')) return;
    setBusy(true);
    try { setO(await api(`/orders/${o._id}/cancel${qs}`, { method: 'PATCH', token })); toast('Order cancelled'); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };
  const retry = async () => {
    setBusy(true);
    try { const r = await api(`/payments/${o.paymentMethod}/init`, { method: 'POST', token, body: { orderId: o._id, key } }); window.location.href = r.url; }
    catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <div className="order">
      <div className="crumbs">{token ? <><Link href="/account">Account</Link><span>/</span><Link href="/orders">Orders</Link></> : <Link href="/">Home</Link>}<span>/</span><b>{orderNo(o)}</b></div>

      {placed && o.status !== 'cancelled' && (
        <div className="placed glass">
          <span className="placed-ico"><CheckIcon size={26} /></span>
          <div>
            <h2>Thank you, your order is placed!</h2>
            <p>We&apos;ll call {o.shipping.phone} to confirm.{o.paymentMethod === 'cod' ? ` Pay ${taka(o.total)} when it arrives.` : ''} {!token && 'Bookmark this page to track your order.'}</p>
          </div>
        </div>
      )}
      {payResult && PAYMENT_MSG[payResult] && <p className={`${PAYMENT_MSG[payResult][0]} boxed banner`}>{PAYMENT_MSG[payResult][1]}</p>}
      {error && <p className="err boxed">{error}</p>}

      <div className="page-title row-title">
        <div><h1>Order {orderNo(o)}</h1><p>Placed on {fmtDate(o.createdAt)}</p></div>
        <div className="btnrow">
          <span className={'status lg ' + o.status}>{o.status}</span>
          <Link href={`/orders/${o._id}/invoice${qs}`} className="btn ghost sm"><PrintIcon size={16} /> Invoice</Link>
        </div>
      </div>

      {['cancelled', 'returned'].includes(o.status) ? (
        <div className="glass co-card"><p className="muted">This order was {o.status}{when(o.status) ? ` on ${fmtDate(when(o.status))}` : ''}. Any reserved stock has been released.</p></div>
      ) : (
        <div className="timeline glass">
          {FLOW.map(([s, label, Icon], i) => (
            <div key={s} className={'tl' + (i <= step ? ' done' : '') + (i === step ? ' now' : '')}>
              <span className="tl-dot"><Icon size={18} /></span>
              <b>{label}</b>
              <small>{when(s) ? fmtDate(when(s)) : ''}</small>
            </div>
          ))}
        </div>
      )}

      <div className="bag-grid">
        <div className="glass co-card">
          <h3>Items</h3>
          {o.items.map((i, k) => (
            <div key={k} className="mini"><span className="mimg"><img src={i.image} alt="" /><em>{i.qty}</em></span><span className="mname">{i.name}<small>{i.variantLabel || i.unit} · {taka(i.price)} each</small></span><b>{taka(i.price * i.qty)}</b></div>
          ))}
          {o.courier?.name && (
            <div className="courier-box">
              <TruckIcon size={20} />
              <div><b>Shipped with {o.courier.name.replace('_', ' ')}</b><small>{o.courier.consignmentId ? `Consignment ${o.courier.consignmentId}` : ''}{o.courier.status ? ` · ${o.courier.status}` : ''}</small></div>
              {o.courier.trackingUrl && <a className="btn ghost sm" href={o.courier.trackingUrl} target="_blank" rel="noreferrer">Track <ExternalIcon size={14} /></a>}
            </div>
          )}
        </div>
        <aside>
          <div className="summary glass">
            <h4>Payment</h4>
            <div className="srow"><span>Subtotal</span><b>{taka(o.subtotal)}</b></div>
            {o.discount > 0 && <div className="srow ok"><span>Discount {o.coupon ? `(${o.coupon})` : ''}</span><b>−{taka(o.discount)}</b></div>}
            <div className="srow"><span>Delivery</span><b>{o.deliveryFee ? taka(o.deliveryFee) : 'Free'}</b></div>
            <div className="srow total"><span>Total</span><b>{taka(o.total)}</b></div>
            <div className="srow"><span>{PAY_LABELS[o.paymentMethod] || o.paymentMethod}</span><span className={'paystatus ' + o.payment?.status}>{o.payment?.status === 'submitted' ? 'verifying' : o.payment?.status}</span></div>
            {o.payment?.trxId && <p className="fine left">Transaction: {o.payment.trxId}</p>}
            {canRetry && <button className="btn block" style={{ marginTop: 12 }} onClick={retry} disabled={busy}>Pay {taka(o.total)} now</button>}
          </div>
          <div className="summary glass" style={{ marginTop: 16 }}>
            <h4>Delivering to</h4>
            <p className="addr"><b>{o.shipping.name}</b><br />{o.shipping.phone}<br />{o.shipping.address}{o.shipping.district ? `, ${o.shipping.district}` : ''}<br /><small>{o.shipping.zoneName || (o.shipping.area === 'outside' ? 'Outside Dhaka' : 'Inside Dhaka')}</small></p>
            {o.shipping.note && <p className="fine left">Note: {o.shipping.note}</p>}
          </div>
          {o.status === 'pending' && <button className="btn ghost danger block" style={{ marginTop: 16 }} onClick={cancel} disabled={busy}>{busy ? 'Please wait...' : 'Cancel order'}</button>}
        </aside>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return <Suspense fallback={null}><Order /></Suspense>;
}
