'use client';
import { useEffect, useState } from 'react';
import { useApp } from '../Providers';
import { SearchIcon } from '../Icons';
import { api, taka } from '@/lib/api';
import { fmtDate } from '@/lib/format';

export function Customers() {
  const { token, toast, user } = useApp();
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    const t = setTimeout(() => api('/admin/customers?q=' + encodeURIComponent(q), { token }).then(setList).catch((e) => setErr(e.message)), 250);
    return () => clearTimeout(t);
  }, [q, token]);
  const role = async (c, r) => {
    if (!confirm(`${r === 'admin' ? 'Give' : 'Remove'} admin access ${r === 'admin' ? 'to' : 'from'} ${c.name}?`)) return;
    try { const u = await api('/admin/customers/' + c._id, { method: 'PATCH', token, body: { role: r } }); setList((l) => l.map((x) => (x._id === u._id ? { ...x, role: u.role } : x))); toast('Role updated'); }
    catch (e) { setErr(e.message); }
  };
  const total = list?.reduce((s, c) => s + c.spent, 0) || 0;
  return (
    <>
      {err && <p className="err boxed">{err}</p>}
      <div className="kpis two">
        <div className="kpi glass"><small>Registered customers</small><b>{list ? list.filter((c) => c.role !== 'admin').length : '–'}</b><span>guests are in the Customers export</span></div>
        <div className="kpi glass"><small>Lifetime spend</small><b>{taka(total)}</b><span>by registered customers</span></div>
      </div>
      <div className="toolbar"><label className="search glass"><SearchIcon size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone or e-mail" /></label></div>
      <div className="tablewrap glass">
        <table>
          <thead><tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Spent</th><th>Last order</th><th>Joined</th><th>Role</th></tr></thead>
          <tbody>
            {!list ? <tr><td colSpan={7} className="muted">Loading…</td></tr> : list.map((c) => (
              <tr key={c._id}>
                <td><span className="avatar sm">{c.name[0]}</span> <b>{c.name}</b></td>
                <td><a className="link" href={`tel:${c.phone}`}>{c.phone}</a>{c.email && <><br /><small className="muted">{c.email}</small></>}</td>
                <td>{c.orders}</td><td><b>{taka(c.spent)}</b></td>
                <td><small>{c.lastOrder ? fmtDate(c.lastOrder) : '–'}</small></td><td><small>{fmtDate(c.createdAt)}</small></td>
                <td>{c._id === user?.id ? <span className="pill-state ok">you</span> : (
                  <select className="statussel" value={c.role} onChange={(e) => role(c, e.target.value)}><option value="customer">customer</option><option value="admin">admin</option></select>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const EVENTS = [
  ['welcome', 'Welcome', 'When someone creates an account'],
  ['login', 'New sign-in alert', 'Every time a customer signs in (off by default)'],
  ['orderPlaced', 'Order received + invoice', 'Right after checkout, with the full invoice'],
  ['confirmed', 'Order confirmed', 'When you mark an order confirmed'],
  ['shipped', 'Shipped', 'When the order is shipped, with courier & tracking'],
  ['delivered', 'Delivered', 'When the order is delivered'],
  ['cancelled', 'Cancelled', 'When the order is cancelled by you or the customer'],
  ['adminNewOrder', 'New order alert (to you)', 'Sent to the admin e-mail below'],
];

export function Emails({ full, onSaved }) {
  const { token, toast } = useApp();
  const [e, setE] = useState(full.emails || {});
  const [log, setLog] = useState(null);
  const [to, setTo] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setE(full.emails || {}), [full.emails]);
  useEffect(() => { api('/admin/emails', { token }).then(setLog).catch(() => {}); }, [token]);
  const dirty = JSON.stringify(e) !== JSON.stringify(full.emails || {});
  const save = async () => { setBusy(true); setErr(''); try { await api('/settings', { method: 'PUT', token, body: { emails: e } }); onSaved(); toast('E-mail settings saved'); } catch (x) { setErr(x.message); } setBusy(false); };
  const test = async () => { setErr(''); try { await api('/admin/emails/test', { method: 'POST', token, body: { to } }); toast('Test e-mail sent'); } catch (x) { setErr(x.message); } };

  return (
    <>
      {err && <p className="err boxed">{err}</p>}
      <div className="glass co-card">
        <div className="card-head"><h3>Mail server</h3><span className={'pill-state ' + (full.integrations.smtp ? 'ok' : 'off')}>{full.integrations.smtp ? 'SMTP connected' : 'SMTP not configured'}</span></div>
        <p className="muted">E-mails use your store colours and include the invoice. Add an SMTP account to <code>backend/.env</code> (Gmail app password, Zoho, Brevo, Mailgun, Hostinger mail…):</p>
        <pre className="envblock">{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourstore@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM="Ghorer Bazar <yourstore@gmail.com>"`}</pre>
        <div className="toolbar" style={{ marginTop: 12 }}>
          <input type="email" value={to} onChange={(x) => setTo(x.target.value)} placeholder="Send a test e-mail to…" style={{ flex: 1 }} />
          <button className="btn ghost" onClick={test} disabled={!full.integrations.smtp}>Send test</button>
        </div>
      </div>
      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Automatic e-mails</h3>
        {EVENTS.map(([k, t, d]) => (
          <div key={k} className="pay-row"><div><b>{t}</b><small>{d}</small></div><span /><label className="switch"><input type="checkbox" checked={!!e[k]} onChange={(x) => setE({ ...e, [k]: x.target.checked })} /><span /></label></div>
        ))}
        <div className="fields" style={{ marginTop: 10 }}><label>Admin e-mail for new-order alerts<input type="email" value={e.adminEmail || ''} onChange={(x) => setE({ ...e, adminEmail: x.target.value })} placeholder="owner@yourstore.com" /></label></div>
        <p className="fine left">Customers get order e-mails when they enter an e-mail at checkout or have one on their account.</p>
      </div>
      <div className="savebar">{dirty && <span className="muted">Unsaved changes</span>}<button className="btn" disabled={!dirty || busy} onClick={save}>Save changes</button></div>
      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Recent e-mails</h3>
        <div className="tablewrap">
          <table><thead><tr><th>When</th><th>To</th><th>Subject</th><th>Status</th></tr></thead>
            <tbody>{(log?.logs || []).map((l) => (
              <tr key={l._id}><td><small>{new Date(l.createdAt).toLocaleString('en-GB')}</small></td><td>{l.to}</td><td><small>{l.subject}</small></td>
                <td><span className={'paystatus ' + (l.status === 'sent' ? 'paid' : l.status === 'failed' ? 'failed' : '')} title={l.error || ''}>{l.status}</span></td></tr>
            ))}{!log?.logs?.length && <tr><td colSpan={4} className="muted">No e-mails yet.</td></tr>}</tbody></table>
        </div>
      </div>
    </>
  );
}
