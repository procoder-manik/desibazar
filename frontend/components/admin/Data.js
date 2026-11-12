'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../Providers';
import { DatabaseIcon, DownloadIcon } from '../Icons';
import { api, apiBase } from '@/lib/api';
import { fmtDate } from '@/lib/format';

const EXPORTS = [
  ['orders', 'All orders', 'One row per order with customer, payment and courier'],
  ['items', 'Order items', 'One row per product sold (for stock & accounting)'],
  ['daily', 'Daily sales report', 'Orders, items, discounts, delivery and total per day'],
  ['customers', 'Customers', 'Registered and guest buyers with order count and spend'],
  ['products', 'Products & stock', 'Every product and option with price and stock'],
  ['subscribers', 'Newsletter', 'E-mail subscribers'],
];

// Authenticated download: fetch the file with the admin token, then save it.
async function download(path, token, filename) {
  const r = await fetch(apiBase() + path, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Download failed');
  const blob = await r.blob();
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}

export default function Data() {
  const { token, toast } = useApp();
  const [range, setRange] = useState({ from: '', to: '' });
  const [bk, setBk] = useState(null);
  const [audit, setAudit] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const file = useRef(null);
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(() => {
    api('/admin/backups', { token }).then(setBk).catch((e) => setErr(e.message));
    api('/admin/audit', { token }).then(setAudit).catch(() => {});
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const run = async (key, fn, msg) => { setErr(''); setBusy(key); try { await fn(); if (msg) toast(msg); } catch (e) { setErr(e.message); } setBusy(''); };
  const qs = new URLSearchParams(Object.entries(range).filter(([, v]) => v)).toString();

  const restore = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    const word = prompt('Restoring REPLACES all current products, orders, customers and settings with the backup.\nA safety copy of the current data is saved first.\n\nType RESTORE to continue:');
    if (word !== 'RESTORE') return;
    await run('restore', async () => {
      const data = JSON.parse(await f.text());
      const r = await api('/admin/restore?confirm=RESTORE', { method: 'POST', token, body: data });
      toast(`Restored: ${r.counts.Product} products, ${r.counts.Order} orders, ${r.counts.User} users`);
      setTimeout(() => window.location.reload(), 1200);
    });
  };

  return (
    <>
      {err && <p className="err boxed">{err}</p>}
      <div className="glass co-card">
        <div className="card-head"><h3>Export to Excel / CSV</h3>
          <div className="toolbar tight">
            <label className="mini-field">From<input type="date" max={today} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
            <label className="mini-field">To<input type="date" max={today} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
          </div>
        </div>
        <p className="fine left">Files open directly in Excel or Google Sheets. The date range applies to orders, items and daily sales.</p>
        <div className="export-grid">
          {EXPORTS.map(([k, t, d]) => (
            <button key={k} className="export-card" disabled={busy === k} onClick={() => run(k, () => download(`/admin/export/${k}${qs ? '?' + qs : ''}`, token, `${k}-${today}.csv`))}>
              <DownloadIcon size={20} /><span><b>{t}</b><small>{d}</small></span>
            </button>
          ))}
        </div>
      </div>

      <div className="glass co-card" style={{ marginTop: 16 }}>
        <div className="card-head"><h3>Backup & restore</h3><DatabaseIcon size={20} /></div>
        <p className="muted">A backup is one file with every product, order, customer, coupon, review and setting. Keep copies somewhere safe (Google Drive, email). If the site is ever damaged, restore it here or with <code>npm run restore -- file.json --yes</code>.</p>
        <div className="btnrow left">
          <button className="btn" disabled={busy === 'dl'} onClick={() => run('dl', () => download('/admin/backup', token, `ghorerbazar-backup-${today}.json`), 'Backup downloaded')}><DownloadIcon size={16} /> Download full backup</button>
          <button className="btn ghost" disabled={busy === 'now'} onClick={() => run('now', async () => { await api('/admin/backups/now', { method: 'POST', token }); load(); }, 'Backup saved on the server')}>Save backup on server</button>
          <button className="btn ghost danger" disabled={busy === 'restore'} onClick={() => file.current?.click()}>Restore from file…</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={restore} />
        </div>
        {bk && (
          <>
            <label className="f-row inline" style={{ marginTop: 14 }}>
              <input type="checkbox" checked={bk.auto} onChange={(e) => run('auto', async () => { await api('/settings', { method: 'PUT', token, body: { backups: { auto: e.target.checked } } }); load(); }, e.target.checked ? 'Daily backups on' : 'Daily backups off')} />
              <span className="box" /><span className="lbl">Automatic daily backup on the server (keeps the last 14){bk.lastAt ? ` · last: ${new Date(bk.lastAt).toLocaleString('en-GB')}` : ''}</span>
            </label>
            {bk.files.length > 0 && (
              <div className="tablewrap" style={{ marginTop: 10 }}>
                <table><thead><tr><th>Server backups</th><th>Size</th><th /></tr></thead>
                  <tbody>{bk.files.slice(0, 10).map((f) => (
                    <tr key={f.name}><td><code>{f.name}</code></td><td>{(f.size / 1024).toFixed(0)} KB</td>
                      <td className="actions"><button className="btn ghost sm" onClick={() => run(f.name, () => download(`/admin/backups/${encodeURIComponent(f.name)}`, token, f.name))}><DownloadIcon size={14} /> Download</button></td></tr>
                  ))}</tbody></table>
              </div>
            )}
          </>
        )}
      </div>

      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Admin activity log</h3>
        <p className="fine left">Every change made in the admin panel, newest first.</p>
        <div className="tablewrap">
          <table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Result</th><th>IP</th></tr></thead>
            <tbody>{audit.slice(0, 50).map((a) => (
              <tr key={a._id}><td><small>{new Date(a.createdAt).toLocaleString('en-GB')}</small></td><td>{a.userName}</td><td><code>{a.method}</code> <small>{a.path.replace('/api', '')}</small></td>
                <td><span className={'paystatus ' + (a.status < 400 ? 'paid' : 'failed')}>{a.status}</span></td><td><small className="muted">{a.ip}</small></td></tr>
            ))}{!audit.length && <tr><td colSpan={5} className="muted">No admin changes recorded yet.</td></tr>}</tbody></table>
        </div>
        {audit[0] && <p className="fine left">Showing {Math.min(50, audit.length)} of the latest {audit.length} · since {fmtDate(audit[audit.length - 1].createdAt)}</p>}
      </div>
    </>
  );
}
