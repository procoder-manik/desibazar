'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../Providers';
import ProductEditor from './ProductEditor';
import { EditIcon, TrashIcon } from '../Icons';
import { api, taka } from '@/lib/api';
import { fmtDate } from '@/lib/format';

const blankP = { name: '', category: '', price: '', salePrice: '', stock: '', unit: '1 kg', image: '', description: '', featured: false };
const blankC = { code: '', type: 'percent', value: '', minSubtotal: '', maxDiscount: '', usageLimit: '', expiresAt: '' };
const num = (v) => (v === '' || v === null || v === undefined ? undefined : +v);

function ProductRow({ p, onDone, onError, onEdit }) {
  const { token } = useApp();
  const [e, setE] = useState({ price: p.price, salePrice: p.salePrice ?? '', stock: p.stock, featured: !!p.featured });
  const dirty = +e.price !== p.price || String(e.salePrice) !== String(p.salePrice ?? '') || +e.stock !== p.stock || e.featured !== !!p.featured;
  const save = async () => {
    try {
      await api('/products/' + p._id, { method: 'PUT', token, body: { price: +e.price, featured: e.featured, salePrice: e.salePrice === '' ? null : +e.salePrice, ...(!p.variants?.length && { stock: +e.stock }) } });
      onDone('Product updated');
    } catch (err) { onError(err.message); }
  };
  const del = async () => { if (confirm(`Delete ${p.name}?`)) { await api('/products/' + p._id, { method: 'DELETE', token }); onDone('Product deleted'); } };
  return (
    <tr>
      <td><img src={p.image} alt="" /></td>
      <td><Link href={`/product/${p.slug}`} className="link">{p.name}</Link>{p.active === false && <span className="pill-state off" style={{ marginLeft: 6 }}>hidden</span>}<br />
        <small className="muted">{p.category?.name} · {p.variants?.length ? `${p.variants.length} options` : p.unit}</small>
        {p.variants?.some((v) => v.hex) && <span className="cdots inline">{p.variants.filter((v) => v.hex).slice(0, 6).map((v) => <i key={v._id} style={{ background: v.hex }} title={v.label} />)}</span>}</td>
      <td><input className="cell" type="number" value={e.price} onChange={(x) => setE({ ...e, price: x.target.value })} /></td>
      <td><input className="cell" type="number" placeholder="–" value={e.salePrice} onChange={(x) => setE({ ...e, salePrice: x.target.value })} /></td>
      <td>{p.variants?.length ? <span className={p.stock < 10 ? 'warn-text' : ''} title="Edit stock per option">{p.stock}</span> : <input className={'cell' + (+e.stock < 10 ? ' warn' : '')} type="number" value={e.stock} onChange={(x) => setE({ ...e, stock: x.target.value })} />}</td>
      <td><label className="switch"><input type="checkbox" checked={e.featured} onChange={(x) => setE({ ...e, featured: x.target.checked })} /><span /></label></td>
      <td className="actions"><button className="btn sm" disabled={!dirty} onClick={save}>Save</button><button className="btn ghost sm" onClick={onEdit}><EditIcon size={14} /> Edit</button><button className="btn ghost sm danger" onClick={del}>Delete</button></td>
    </tr>
  );
}

export function Products() {
  const { toast } = useApp();
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // product, or {} for new
  const [error, setError] = useState('');
  const { token } = useApp();
  const load = useCallback(() => Promise.all([api('/products?limit=100&all=true', { token }), api('/categories')]).then(([p, c]) => { setProducts(p.items); setCats(c); }).catch((e) => setError(e.message)), [token]);
  useEffect(() => { load(); }, [load]);
  const done = (m) => { toast(m); setError(''); load(); };
  const shown = q ? products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : products;

  return (
    <>
      {error && <p className="err boxed">{error}</p>}
      <div className="toolbar">
        <label className="search glass"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${products.length} products`} /></label>
        <button className="btn" onClick={() => setEditing({})}>+ New product</button>
      </div>
      <div className="tablewrap glass">
        <table>
          <thead><tr><th></th><th>Product</th><th>Price</th><th>Sale</th><th>Stock</th><th>Featured</th><th></th></tr></thead>
          <tbody>{shown.map((p) => <ProductRow key={p._id + p.updatedAt} p={p} onDone={done} onError={setError} onEdit={() => setEditing(p)} />)}</tbody>
        </table>
      </div>
      <Categories cats={cats} onChange={load} />
      {editing && <ProductEditor product={editing._id ? editing : null} cats={cats} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function Categories({ cats, onChange }) {
  const { token, toast } = useApp();
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const run = async (fn, msg) => { setErr(''); try { await fn(); toast(msg); onChange(); } catch (e) { setErr(e.message); } };
  return (
    <div className="glass co-card" style={{ marginTop: 16 }}>
      <h3>Categories</h3>
      {err && <p className="err boxed">{err}</p>}
      <div className="catman">
        {cats.map((c) => (
          <div key={c._id} className="catrow">
            <input defaultValue={c.name} onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && run(() => api('/categories/' + c._id, { method: 'PUT', token, body: { name: e.target.value.trim(), image: c.image } }), 'Category renamed')} />
            <input defaultValue={c.image || ''} placeholder="Image URL (optional)" onBlur={(e) => e.target.value !== (c.image || '') && run(() => api('/categories/' + c._id, { method: 'PUT', token, body: { name: c.name, image: e.target.value } }), 'Image saved')} />
            <button className="iconbtn" onClick={() => confirm(`Delete ${c.name}?`) && run(() => api('/categories/' + c._id, { method: 'DELETE', token }), 'Category deleted')} aria-label={`Delete ${c.name}`}><TrashIcon size={15} /></button>
          </div>
        ))}
      </div>
      <form className="toolbar" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) run(() => api('/categories', { method: 'POST', token, body: { name: name.trim() } }), 'Category added').then(() => setName('')); }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" style={{ flex: 1 }} />
        <button className="btn ghost">Add category</button>
      </form>
    </div>
  );
}

export function Coupons() {
  const { token, toast } = useApp();
  const [coupons, setCoupons] = useState([]);
  const [cf, setCf] = useState(blankC);
  const [error, setError] = useState('');
  const load = useCallback(() => api('/coupons', { token }).then(setCoupons).catch((e) => setError(e.message)), [token]);
  useEffect(() => { load(); }, [load]);
  const done = (m) => { toast(m); setError(''); load(); };
  const add = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api('/coupons', { method: 'POST', token, body: { code: cf.code, type: cf.type, value: +cf.value, minSubtotal: num(cf.minSubtotal) || 0, maxDiscount: num(cf.maxDiscount), usageLimit: num(cf.usageLimit), expiresAt: cf.expiresAt || undefined } });
      setCf(blankC); done('Coupon created');
    } catch (err) { setError(err.message); }
  };
  const on = (k) => (e) => setCf({ ...cf, [k]: e.target.value });

  return (
    <>
      {error && <p className="err boxed">{error}</p>}
      <form className="glass co-card" onSubmit={add}>
        <h3>Create coupon</h3>
        <div className="fields three">
          <label>Code<input required value={cf.code} onChange={(e) => setCf({ ...cf, code: e.target.value.toUpperCase() })} placeholder="EID20" /></label>
          <label>Type<select value={cf.type} onChange={on('type')}><option value="percent">Percent off</option><option value="flat">Flat ৳ off</option></select></label>
          <label>{cf.type === 'percent' ? 'Percent (%)' : 'Amount (৳)'}<input required type="number" min="1" value={cf.value} onChange={on('value')} /></label>
          <label>Min. order (৳)<input type="number" min="0" value={cf.minSubtotal} onChange={on('minSubtotal')} /></label>
          <label>Max discount (৳)<input type="number" min="0" value={cf.maxDiscount} onChange={on('maxDiscount')} placeholder="no cap" /></label>
          <label>Usage limit<input type="number" min="1" value={cf.usageLimit} onChange={on('usageLimit')} placeholder="unlimited" /></label>
          <label>Expires<input type="date" value={cf.expiresAt} onChange={on('expiresAt')} /></label>
        </div>
        <button className="btn">Create coupon</button>
      </form>
      <div className="tablewrap glass" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th>Code</th><th>Discount</th><th>Min. order</th><th>Used</th><th>Expires</th><th>Active</th><th>In top bar</th><th></th></tr></thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c._id}>
                <td><code>{c.code}</code></td>
                <td>{c.type === 'percent' ? `${c.value}%` : taka(c.value)}{c.maxDiscount ? <small className="muted"> (max {taka(c.maxDiscount)})</small> : null}</td>
                <td>{c.minSubtotal ? taka(c.minSubtotal) : '–'}</td>
                <td>{c.used}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                <td>{c.expiresAt ? fmtDate(c.expiresAt) : 'Never'}</td>
                <td><label className="switch"><input type="checkbox" checked={c.active} onChange={async () => { await api('/coupons/' + c._id, { method: 'PATCH', token, body: { active: !c.active } }); done(c.active ? 'Coupon paused' : 'Coupon activated'); }} /><span /></label></td>
                <td><label className="switch"><input type="checkbox" checked={!!c.showInBar} onChange={async () => { await api('/coupons/' + c._id, { method: 'PATCH', token, body: { showInBar: !c.showInBar } }); done(c.showInBar ? 'Removed from top bar' : 'Now shown in the top bar'); }} /><span /></label></td>
                <td className="actions"><button className="btn ghost sm danger" onClick={async () => { if (confirm(`Delete ${c.code}?`)) { await api('/coupons/' + c._id, { method: 'DELETE', token }); done('Coupon deleted'); } }}>Delete</button></td>
              </tr>
            ))}
            {coupons.length === 0 && <tr><td colSpan={8} className="muted">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
