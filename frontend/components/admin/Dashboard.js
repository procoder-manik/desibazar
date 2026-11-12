'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from '../Providers';
import { AreaChart, Bars, HBars } from './Charts';
import { api, taka } from '@/lib/api';
import { PAY_LABELS } from '@/lib/bd';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
const RANGES = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '12 months']];

function Delta({ now, prev }) {
  if (!prev) return <span className="delta flat">new</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  return <span className={'delta ' + (pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat')}>{pct > 0 ? '▲' : pct < 0 ? '▼' : '•'} {Math.abs(pct)}% vs previous</span>;
}

export default function Dashboard({ goOrders }) {
  const { token } = useApp();
  const [days, setDays] = useState(30);
  const [r, setR] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { setR(null); api(`/admin/report?days=${days}`, { token }).then(setR).catch((e) => setErr(e.message)); }, [days, token]);

  if (err) return <p className="err boxed">{err}</p>;
  return (
    <>
      <div className="toolbar spread">
        <div className="seg">{RANGES.map(([d, l]) => <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{l}</button>)}</div>
      </div>
      {!r ? <div className="skel glass" style={{ height: 320 }} /> : (
        <>
          <div className="kpis">
            <div className="kpi glass"><small>Revenue</small><b>{taka(r.revenue)}</b><Delta now={r.revenue} prev={r.prev.revenue} /></div>
            <div className="kpi glass"><small>Orders</small><b>{r.orders}</b><Delta now={r.orders} prev={r.prev.orders} /></div>
            <div className="kpi glass"><small>Avg. order value</small><b>{taka(r.aov)}</b><span>{r.items} items sold</span></div>
            <div className="kpi glass"><small>Customers</small><b>{r.customers}</b><span>+{r.newCustomers} new in period</span></div>
          </div>
          <div className="kpis two">
            <button className="kpi glass action" onClick={() => goOrders({ status: 'pending' })}><small>Needs action</small><b>{r.byStatus.pending || 0}</b><span>pending orders →</span></button>
            <button className="kpi glass action" onClick={() => goOrders({ payment: 'submitted' })}><small>Verify payments</small><b>{r.awaitingVerification || 0}</b><span>manual transfers →</span></button>
          </div>

          <div className="glass co-card">
            <div className="card-head"><h3>Revenue</h3><span className="muted">per day · excl. cancelled & returned</span></div>
            <AreaChart data={r.series} value="revenue" format={taka} />
          </div>
          <div className="bag-grid even" style={{ marginTop: 16 }}>
            <div className="glass co-card">
              <div className="card-head"><h3>Orders per day</h3></div>
              <Bars data={r.series} value="orders" format={(v) => `${v} orders`} />
            </div>
            <div className="glass co-card">
              <div className="card-head"><h3>Top products</h3><span className="muted">by revenue</span></div>
              <HBars rows={r.topProducts} value="revenue" format={taka} sub={(x) => `· ${x.qty} sold`} />
            </div>
          </div>
          <div className="bag-grid even three" style={{ marginTop: 16 }}>
            <div className="glass co-card"><h3>Sales by category</h3><HBars rows={r.byCategory} value="revenue" format={taka} /></div>
            <div className="glass co-card"><h3>Top districts</h3><HBars rows={r.byDistrict} value="n" format={(v) => `${v} orders`} /></div>
            <div className="glass co-card">
              <h3>Payment methods</h3>
              <HBars rows={r.byMethod.map((m) => ({ name: PAY_LABELS[m.method] || m.method, n: m.n, sum: m.sum }))} value="n" format={(v) => `${v}`} sub={(x) => `· ${taka(x.sum)}`} />
            </div>
          </div>
          <div className="bag-grid even" style={{ marginTop: 16 }}>
            <div className="glass co-card">
              <h3>Orders by status <small className="muted">(all time)</small></h3>
              {STATUSES.map((s) => {
                const n = r.byStatus[s] || 0; const all = Object.values(r.byStatus).reduce((a, b) => a + b, 0) || 1;
                return <button key={s} className="bar" onClick={() => goOrders({ status: s })}><span className={'status ' + s}>{s}</span><div className="track"><span style={{ width: (n / all) * 100 + '%' }} /></div><b>{n}</b></button>;
              })}
            </div>
            <div className="glass co-card">
              <h3>Low stock <small className="muted">({r.productCount} products)</small></h3>
              {r.lowStock.length === 0 ? <p className="muted">Everything is well stocked.</p> : r.lowStock.map((p) => (
                <div key={p._id} className="srow"><Link href={`/product/${p.slug}`} className="link">{p.name}</Link><b className={p.stock === 0 ? 'err' : ''}>{p.stock} left</b></div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
