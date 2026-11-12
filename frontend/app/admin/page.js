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
import Leads from '@/components/admin/Leads';
import Staff from '@/components/admin/Staff';
import Seo from '@/components/admin/Seo';
import Blog from '@/components/admin/Blog';
import LandingPages from '@/components/admin/LandingPages';
import { Coupons, Products } from '@/components/admin/Catalog';
import { Customers, Emails } from '@/components/admin/People';
import { Appearance, Payments, Shipping, Store } from '@/components/admin/StoreSettings';
import { BookIcon, BoxIcon, CardIcon, ChartIcon, DatabaseIcon, EditIcon, GridIcon, KeyIcon, LayoutIcon, MailIcon, PaletteIcon, PhoneIcon, SearchIcon, StoreIcon, TagIcon, TruckIcon, UsersIcon } from '@/components/Icons';
import { api } from '@/lib/api';

// [tab, label, icon, permission needed]. "owner" = the store owner only.
const NAV = [
  ['Sales', [['dashboard', 'Dashboard', ChartIcon, 'dashboard'], ['orders', 'Orders', BoxIcon, 'orders'], ['leads', 'Incomplete orders', PhoneIcon, 'leads'], ['customers', 'Customers', UsersIcon, 'customers']]],
  ['Catalog', [['products', 'Products', GridIcon, 'products'], ['coupons', 'Coupons', TagIcon, 'coupons']]],
  ['Marketing', [['landing', 'Landing pages', LayoutIcon, 'landing'], ['blog', 'Blog', BookIcon, 'blog'], ['seo', 'SEO', SearchIcon, 'seo']]],
  ['Storefront', [['content', 'Content', EditIcon, 'content'], ['popups', 'Pop-ups', TagIcon, 'content'], ['appearance', 'Appearance', PaletteIcon, 'appearance']]],
  ['Settings', [['shipping', 'Shipping', TruckIcon, 'shipping'], ['payments', 'Payments', CardIcon, 'payments'], ['emails', 'E-mails', MailIcon, 'emails'], ['store', 'Store & tracking', StoreIcon, 'store'], ['staff', 'Staff & roles', KeyIcon, 'owner'], ['data', 'Data & backup', DatabaseIcon, ['data', 'products']]]],
];
const ALL = NAV.flatMap(([, items]) => items);

export default function Admin() {
  const { user, token, ready } = useApp();
  const perms = user?.permissions || [];
  const owner = user?.role === 'admin';
  const allowed = useCallback(([, , , need]) => (need === 'owner' ? owner : [].concat(need).some((p) => perms.includes(p))), [owner, perms]);
  const nav = NAV.map(([g, items]) => [g, items.filter(allowed)]).filter(([, items]) => items.length);
  const first = nav[0]?.[1][0]?.[0];
  const [tab, setTab] = useState(null);
  const [orderFilter, setOrderFilter] = useState({});
  const [stats, setStats] = useState(null);
  const [full, setFull] = useState(null);
  const [error, setError] = useState('');

  const can = (p) => perms.includes(p);
  const loadStats = useCallback(() => api('/orders/stats', { token }).then(setStats).catch(() => {}), [token]);
  const loadSettings = useCallback(() => api('/settings/admin', { token }).then(setFull).catch((e) => setError(e.message)), [token]);
  const isStaff = perms.length > 0;
  useEffect(() => {
    if (!token || !isStaff) return;
    if (perms.includes('dashboard') || perms.includes('orders')) loadStats();
    loadSettings();
  }, [token, isStaff]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isStaff) return;
    const h = window.location.hash.slice(1);
    const hit = ALL.find(([k]) => k === h);
    setTab(hit && allowed(hit) ? h : first);
  }, [isStaff, first]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (k) => { setTab(k); window.history.replaceState(null, '', '#' + k); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  if (!ready) return null;
  if (!isStaff) return <div className="empty glass" style={{ marginTop: 28 }}><h3>Staff access only</h3><p>Sign in with an owner or staff account.</p><Link href="/login?next=/admin" className="btn">Sign in</Link></div>;
  if (!tab) return null;
  const title = ALL.find(([k]) => k === tab)?.[1];
  const badge = { orders: stats?.byStatus?.pending, payments: stats?.awaitingVerification };

  return (
    <div className="admin">
      <aside className="aside glass">
        {!owner && <div className="staff-chip"><b>{user.name}</b><small>{user.staffRole || 'Staff'}</small></div>}
        {nav.map(([group, items]) => (
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
        {tab === 'leads' && <Leads />}
        {tab === 'customers' && <Customers />}
        {tab === 'products' && <Products />}
        {tab === 'coupons' && <Coupons />}
        {tab === 'landing' && <LandingPages />}
        {tab === 'blog' && <Blog />}
        {full && tab === 'seo' && <Seo full={full} onSaved={loadSettings} />}
        {tab === 'popups' && <Popups />}
        {full && tab === 'content' && <Content full={full} onSaved={loadSettings} />}
        {full && tab === 'appearance' && <Appearance full={full} onSaved={loadSettings} />}
        {full && tab === 'shipping' && <Shipping full={full} onSaved={loadSettings} />}
        {full && tab === 'payments' && <Payments full={full} onSaved={loadSettings} />}
        {full && tab === 'emails' && <Emails full={full} onSaved={loadSettings} />}
        {full && tab === 'store' && <Store full={full} onSaved={loadSettings} />}
        {tab === 'staff' && owner && <Staff />}
        {tab === 'data' && <>{can('products') && <Import />}{can('products') && can('data') && <div style={{ height: 16 }} />}{can('data') && <Data />}</>}
      </section>
    </div>
  );
}
