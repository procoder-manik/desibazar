'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/Providers';
import { ArrowIcon, BoxIcon } from '@/components/Icons';
import { api, taka } from '@/lib/api';
import { fmtDate, orderNo } from '@/lib/format';

export default function Orders() {
  const { token, ready } = useApp();
  const [orders, setOrders] = useState(null);
  useEffect(() => { if (token) api('/orders/mine', { token }).then(setOrders).catch(() => setOrders([])); }, [token]);

  if (!ready) return null;
  if (!token) return <div className="empty glass"><h3>Sign in to see your orders</h3><Link href="/login?next=/orders" className="btn">Sign in</Link></div>;

  return (
    <div>
      <div className="crumbs"><Link href="/">Home</Link><span>/</span><Link href="/account">Account</Link><span>/</span><b>Orders</b></div>
      <div className="page-title"><h1>My orders</h1><p>Track deliveries and view past purchases.</p></div>
      {!orders ? <div className="skel glass" style={{ height: 120 }} /> : orders.length === 0 ? (
        <div className="empty glass"><span className="empty-ico"><BoxIcon size={30} /></span><h3>No orders yet</h3><p>When you place an order it will appear here.</p><Link href="/shop" className="btn">Start shopping</Link></div>
      ) : (
        <div className="olist">
          {orders.map((o) => (
            <Link href={`/orders/${o._id}`} key={o._id} className="ocard glass">
              <div className="othumbs">{o.items.slice(0, 3).map((i, k) => <img key={k} src={i.image} alt="" />)}{o.items.length > 3 && <span>+{o.items.length - 3}</span>}</div>
              <div className="ometa">
                <b>Order {orderNo(o)}</b>
                <small>{fmtDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.qty, 0)} items</small>
              </div>
              <span className={'status ' + o.status}>{o.status}</span>
              <b className="ototal">{taka(o.total)}</b>
              <ArrowIcon size={18} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
