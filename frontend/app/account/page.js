'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/Providers';
import { ArrowIcon, BoxIcon, HeartIcon, UserIcon } from '@/components/Icons';
import { api } from '@/lib/api';

export default function Account() {
  const { user, setUser, token, ready, logout, wish, toast } = useApp();
  const router = useRouter();
  const [f, setF] = useState({ name: '', email: '', address: '', area: 'inside' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState({ profile: '', pw: '' });
  const [orders, setOrders] = useState(null);

  useEffect(() => { if (user) setF({ name: user.name || '', email: user.email || '', address: user.address || '', area: user.area || 'inside' }); }, [user]);
  useEffect(() => { if (token) api('/orders/mine', { token }).then(setOrders).catch(() => setOrders([])); }, [token]);

  if (!ready) return null;
  if (!token) return <div className="empty glass"><h3>Sign in to your account</h3><Link href="/login?next=/account" className="btn">Sign in</Link></div>;
  if (!user) return <div className="skel glass" style={{ height: 240, marginTop: 28 }} />;

  const saveProfile = async (e) => {
    e.preventDefault(); setMsg({ ...msg, profile: '' });
    try { const r = await api('/auth/me', { method: 'PATCH', token, body: f }); setUser(r.user); toast('Profile saved'); }
    catch (err) { setMsg({ ...msg, profile: err.message }); }
  };
  const savePw = async (e) => {
    e.preventDefault(); setMsg({ ...msg, pw: '' });
    try { await api('/auth/me', { method: 'PATCH', token, body: pw }); setPw({ currentPassword: '', newPassword: '' }); toast('Password updated'); }
    catch (err) { setMsg({ ...msg, pw: err.message }); }
  };
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const active = orders?.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length || 0;

  return (
    <div className="account">
      <div className="crumbs"><Link href="/">Home</Link><span>/</span><b>Account</b></div>
      <div className="acc-hero glass">
        <span className="avatar xl">{user.name[0]}</span>
        <div><h1>Hello, {user.name.split(' ')[0]}</h1><p>{user.phone}{user.email ? ` · ${user.email}` : ''}</p></div>
        <button className="btn ghost" onClick={() => { logout(); router.push('/'); }}>Log out</button>
      </div>

      <div className="tiles">
        <Link href="/orders" className="tile glass"><BoxIcon /><div><b>{orders ? orders.length : '–'}</b><small>Orders{active ? ` · ${active} active` : ''}</small></div><ArrowIcon size={16} /></Link>
        <Link href="/wishlist" className="tile glass"><HeartIcon /><div><b>{wish.length}</b><small>Saved items</small></div><ArrowIcon size={16} /></Link>
        <Link href="/shop" className="tile glass"><UserIcon /><div><b>Member</b><small>Code WELCOME10 for 10% off</small></div><ArrowIcon size={16} /></Link>
      </div>

      <div className="bag-grid even">
        <form className="glass co-card" onSubmit={saveProfile}>
          <h3>Profile & address</h3>
          <div className="fields">
            <label>Full name<input required value={f.name} onChange={on('name')} /></label>
            <label>Email<input type="email" value={f.email} onChange={on('email')} placeholder="optional" /></label>
            <label className="full">Default delivery address<textarea rows={3} value={f.address} onChange={on('address')} placeholder="House, road, area, city" /></label>
            <label className="full">Area
              <select value={f.area} onChange={on('area')}><option value="inside">Inside Dhaka</option><option value="outside">Outside Dhaka</option></select>
            </label>
          </div>
          {msg.profile && <p className="err">{msg.profile}</p>}
          <button className="btn">Save changes</button>
        </form>

        <form className="glass co-card" onSubmit={savePw}>
          <h3>Change password</h3>
          <div className="fields one">
            <label>Current password<input type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></label>
            <label>New password<input type="password" required minLength={8} autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></label>
          </div>
          {msg.pw && <p className="err">{msg.pw}</p>}
          <button className="btn ghost">Update password</button>
        </form>
      </div>
    </div>
  );
}
