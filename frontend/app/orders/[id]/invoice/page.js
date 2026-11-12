'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useApp } from '@/components/Providers';
import { LogoMark, PrintIcon } from '@/components/Icons';
import { api, taka } from '@/lib/api';
import { fmtDate, orderNo } from '@/lib/format';
import { PAY_LABELS } from '@/lib/bd';

function Invoice() {
  const { id } = useParams();
  const key = useSearchParams().get('key');
  const { token, ready, settings } = useApp();
  const [o, setO] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready || (!token && !key)) return;
    api(`/orders/${id}${key ? `?key=${key}` : ''}`, { token }).then(setO).catch((e) => setError(e.message));
  }, [id, key, token, ready]);
  useEffect(() => { if (o) document.title = `Invoice ${orderNo(o)}`; }, [o]);

  if (!ready) return null;
  if (!token && !key) return <div className="empty glass"><h3>Sign in to view this invoice</h3><Link className="btn" href={`/login?next=/orders/${id}/invoice`}>Sign in</Link></div>;
  if (error) return <div className="empty glass"><h3>{error}</h3></div>;
  if (!o) return <div className="skel glass" style={{ height: 500, marginTop: 28 }} />;

  const store = settings.store || {};
  const refunded = o.payment?.status === 'refunded';
  const closed = ['cancelled', 'returned'].includes(o.status);
  const paid = o.payment?.status === 'paid';
  const due = paid || refunded || closed ? 0 : o.total;
  const stamp = o.status === 'cancelled' ? ['Cancelled', 'void'] : refunded ? ['Refunded', 'refund'] : o.status === 'returned' ? ['Returned', 'void'] : paid ? ['Paid', 'paid'] : ['Payment due', 'due'];

  return (
    <div className="invoice-page">
      <div className="invoice-actions no-print">
        <Link href={`/orders/${o._id}${key ? `?key=${key}` : ''}`} className="btn ghost sm">← Back to order</Link>
        <button className="btn sm" onClick={() => window.print()}><PrintIcon size={16} /> Print / Save as PDF</button>
      </div>

      <article className="invoice">
        <header className="inv-head">
          <div className="inv-brand">
            <span className="logo-mark"><LogoMark /></span>
            <div><b>{store.name}</b><small>{store.address}<br />{store.phone} · {store.email}</small></div>
          </div>
          <div className="inv-title">
            <h1>Invoice</h1>
            <span className={'stamp ' + stamp[1]}>{stamp[0]}</span>
          </div>
        </header>

        <section className="inv-meta">
          <div><small>Billed to</small><b>{o.shipping.name}</b><span>{o.shipping.phone}{o.shipping.email ? <><br />{o.shipping.email}</> : null}<br />{o.shipping.address}{o.shipping.district ? `, ${o.shipping.district}` : ''}</span></div>
          <div><small>Invoice no.</small><b>{orderNo(o).replace('#', 'INV-')}</b><small>Order</small><span>{orderNo(o)}</span></div>
          <div><small>Date</small><b>{fmtDate(o.createdAt)}</b><small>Payment</small><span>{PAY_LABELS[o.paymentMethod] || o.paymentMethod}{o.payment?.trxId ? ` · ${o.payment.trxId}` : ''}</span></div>
        </section>

        <table className="inv-table">
          <thead><tr><th>#</th><th>Item</th><th>Unit</th><th className="r">Price</th><th className="r">Qty</th><th className="r">Amount</th></tr></thead>
          <tbody>
            {o.items.map((i, k) => (
              <tr key={k}><td>{k + 1}</td><td>{i.name}</td><td>{i.variantLabel || i.unit}</td><td className="r">{taka(i.price)}</td><td className="r">{i.qty}</td><td className="r">{taka(i.price * i.qty)}</td></tr>
            ))}
          </tbody>
        </table>

        <section className="inv-foot">
          <div className="inv-notes">
            <small>Delivery</small>
            <p>{o.shipping.zoneName || (o.shipping.area === 'outside' ? 'Outside Dhaka' : 'Inside Dhaka')}{o.courier?.name ? ` · ${o.courier.name.replace('_', ' ')}${o.courier.consignmentId ? ` (${o.courier.consignmentId})` : ''}` : ''}</p>
            <small>Thank you</small>
            <p>Questions about this order? Call {store.phone}. Returns accepted within 7 days of delivery.</p>
          </div>
          <div className="inv-totals">
            <div><span>Subtotal</span><b>{taka(o.subtotal)}</b></div>
            {o.discount > 0 && <div><span>Discount{o.coupon ? ` (${o.coupon})` : ''}</span><b>−{taka(o.discount)}</b></div>}
            <div><span>Delivery</span><b>{o.deliveryFee ? taka(o.deliveryFee) : 'Free'}</b></div>
            <div className="grand"><span>Total</span><b>{taka(o.total)}</b></div>
            <div><span>Paid</span><b>{taka(paid || refunded ? (o.payment.amount || o.total) : 0)}</b></div>
            {refunded && <div><span>Refunded</span><b>−{taka(o.payment.refundAmount || o.total)}</b></div>}
            <div className="due"><span>Amount due</span><b>{taka(due)}</b></div>
          </div>
        </section>
      </article>
    </div>
  );
}

export default function InvoicePage() {
  return <Suspense fallback={null}><Invoice /></Suspense>;
}
