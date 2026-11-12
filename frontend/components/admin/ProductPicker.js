'use client';
import { useEffect, useState } from 'react';
import { useApp } from '../Providers';
import { PlusIcon, SearchIcon } from '../Icons';
import { api, taka } from '@/lib/api';

// Search the catalogue and pick a product (blog targets, landing page products).
export default function ProductPicker({ onPick, exclude = [], label = 'Add product' }) {
  const { token } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => api(`/products?all=true&limit=20&q=${encodeURIComponent(q)}`, { token }).then((r) => setList(r.items)).catch(() => setList([])), 200);
    return () => clearTimeout(t);
  }, [q, open, token]);
  if (!open) return <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}><PlusIcon size={14} /> {label}</button>;
  return (
    <div className="picker glass">
      <label className="search"><SearchIcon size={16} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" /></label>
      <div className="picker-list">
        {list.filter((p) => !exclude.includes(p._id)).map((p) => (
          <button type="button" key={p._id} onClick={() => { onPick(p); setOpen(false); setQ(''); }}>
            <img src={p.image} alt="" /><span><b>{p.name}</b><small>{taka(p.salePrice || p.price)}{p.variants?.length ? ` · ${p.variants.length} options` : ''}{p.active === false ? ' · hidden' : ''}</small></span>
          </button>
        ))}
        {!list.length && <p className="muted">No products found.</p>}
      </div>
      <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>Close</button>
    </div>
  );
}
