'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/components/Providers';
import Dashboard from '@/components/admin/Dashboard';
import Orders from '@/components/admin/Orders';
import Content from '@/components/admin/Content';
import Data from '@/components/admin/Data';
import Popups from '@/components/admin/Popups';
import Import from '@/components/admin/Import';
import { Coupons, Products } from '@/components/admin/Catalog';
import { Customers, Emails } from '@/components/admin/People';
import { Appearance, Payments, Shipping, Store } from '@/components/admin/StoreSettings';
import { BoxIcon, CardIcon, ChartIcon, DatabaseIcon, EditIcon, GridIcon, MailIcon, PaletteIcon, StoreIcon, TagIcon, TruckIcon, UsersIcon } from '@/components/Icons';
import { api } from '@/lib/api';

const NAV = [
  ['Sales', [['dashboard', 'Dashboard', ChartIcon], ['orders', 'Orders', BoxIcon], ['customers', 'Customers', UsersIcon]]],
  ['Catalog', [['products', 'Products', GridIcon], ['coupons', 'Coupons', TagIcon]]],
  ['Storefront', [['content', 'Content', EditIcon], ['popups', 'Pop-ups', TagIcon], ['appearance', 'Appearance', PaletteIcon]]],
  ['Settings', [['shipping', 'Shipping', TruckIcon], ['payments', 'Payments', CardIcon], ['emails', 'E-mails', MailIcon], ['store', 'Store & tracking', StoreIcon], ['data', 'Data & backup', DatabaseIcon]]],
];
const ALL = NAV.flatMap(([, items]) => items);

export default function Admin() {
  const { user, token, ready } = useApp();
  const [tab, setTab] = useState('dashboard');
  const [orderFilter, setOrderFilter] = useState({});
  const [stats, setStats] = useState(null);
  const [full, setFull] = useState(null);
  const [error, setError] = useState('');

  const loadStats = useCallback(() => api('/orders/stats', { token }).then(setStats).catch(() => {}), [token]);
  const loadSettings = useCallback(() => api('/settings/admin', { token }).then(setFull).catch((e) => setError(e.message)), [token]);
  useEffect(() => { if (token && user?.role === 'admin') { loadStats(); loadSettings(); } }, [token, user, loadStats, loadSettings]);
  useEffect(() => { const h = window.location.hash.slice(1); if (ALL.some(([k]) => k === h)) setTab(h); }, []);
  const go = (k) => { setTab(k); window.history.replaceState(null, '', '#' + k); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  if (!ready) return null;
  if (user?.role !== 'admin') return <div className="empty glass" style={{ marginTop: 28 }}><h3>Admin access only</h3><Link href="/login?next=/admin" className="btn">Sign in as admin</Link></div>;
  const title = ALL.find(([k]) => k === tab)[1];
  const badge = { orders: stats?.byStatus?.pending, payments: stats?.awaitingVerification };

  return (
    <div className="admin">
      <aside className="aside glass">
        {NAV.map(([group, items]) => (
          <div key={group} className="aside-group">
            <span className="eyebrow">{group}</span>
            <nav>
              {items.map(([k, label, Icon]) => (
                <button key={k} className={tab === k ? 'on' : ''} onClick={() => { if (k === 'orders') setOrderFilter({}); go(k); }}>
                  <Icon size={18} /><span>{label}</span>{badge[k] ? <em>{badge[k]}</em> : null}
                </button>
              ))}
            </nav>
          </div>
        ))}
        <Link href="/" className="btn ghost sm block">View store</Link>
      </aside>

      <section className="admin-main">
        <div className="page-title row-title"><div><h1>{title}</h1>{tab === 'dashboard' && <p>Welcome back, {user.name.split(' ')[0]}.</p>}</div></div>
        {error && <p className="err boxed">{error}</p>}
        {tab === 'dashboard' && <Dashboard goOrders={(f) => { setOrderFilter(f); go('orders'); }} />}
        {tab === 'orders' && full && <Orders key={JSON.stringify(orderFilter)} initial={orderFilter} couriers={full.couriers} steadfastReady={full.integrations.steadfast} onChanged={loadStats} />}
        {tab === 'customers' && <Customers />}
        {tab === 'products' && <Products />}
        {tab === 'coupons' && <Coupons />}
        {tab === 'popups' && <Popups />}
        {full && tab === 'content' && <Content full={full} onSaved={loadSettings} />}
        {full && tab === 'appearance' && <Appearance full={full} onSaved={loadSettings} />}
        {full && tab === 'shipping' && <Shipping full={full} onSaved={loadSettings} />}
        {full && tab === 'payments' && <Payments full={full} onSaved={loadSettings} />}
        {full && tab === 'emails' && <Emails full={full} onSaved={loadSettings} />}
        {full && tab === 'store' && <Store full={full} onSaved={loadSettings} />}
        {tab === 'data' && <><Import /><div style={{ height: 16 }} /><Data /></>}
      </section>
    </div>
  );
}
