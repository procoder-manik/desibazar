'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/Providers';
import { CloseIcon, CompareIcon, Stars } from '@/components/Icons';
import { api, taka } from '@/lib/api';
import { options, priceInfo, totalStock } from '@/lib/product';

export default function Compare() {
  const { compare, toggleCompare, setViewing, buyNow, ready } = useApp();
  const [items, setItems] = useState(null);

  // fetch fresh data (price, stock, specs) for the saved list
  useEffect(() => {
    if (!ready) return;
    if (!compare.length) { setItems([]); return; }
    api('/products?limit=8&ids=' + compare.map((c) => c._id).join(',')).then((r) => {
      const byId = Object.fromEntries(r.items.map((p) => [p._id, p]));
      setItems(compare.map((c) => byId[c._id]).filter(Boolean));
    }).catch(() => setItems(compare));
  }, [compare, ready]);

  if (!ready || items === null) return <div className="skel glass" style={{ height: 300, marginTop: 28 }} />;
  if (!items.length) return (
    <div className="empty glass" style={{ marginTop: 28 }}><span className="empty-ico"><CompareIcon size={30} /></span><h3>Nothing to compare yet</h3><p>Tap the compare icon on up to 4 products to see them side by side.</p><Link href="/shop" className="btn">Browse products</Link></div>
  );

  const specLabels = [...new Set(items.flatMap((p) => (p.details || []).map((d) => d.label)))];
  const spec = (p, l) => p.details?.find((d) => d.label === l)?.value || '–';
  const minPrice = Math.min(...items.map((p) => priceInfo(p).price));
  const rows = [
    ['Price', (p) => { const i = priceInfo(p); return <span className={i.price === minPrice && items.length > 1 ? 'best' : ''}>{i.from ? 'from ' : ''}<b>{taka(i.price)}</b>{i.was ? <s> {taka(i.was)}</s> : null}</span>; }],
    ['Rating', (p) => (p.numReviews ? <Stars value={p.rating} count={p.numReviews} size={13} /> : <span className="muted">No reviews yet</span>)],
    ['Category', (p) => p.category?.name || '–'],
    ['Pack / size', (p) => (options(p).sizes.length ? options(p).sizes.join(', ') : p.unit)],
    ['Colours', (p) => { const c = options(p).colors; return c.length ? <span className="cdots">{c.map((x) => <i key={x.name} style={{ background: x.hex }} title={x.name} />)}</span> : '–'; }],
    ['Availability', (p) => { const s = totalStock(p); return <span className={'stock ' + (s < 1 ? 'out' : s <= 5 ? 'low' : 'in')}>{s < 1 ? 'Out of stock' : s <= 5 ? `Only ${s} left` : 'In stock'}</span>; }],
    ...specLabels.map((l) => [l, (p) => spec(p, l)]),
    ['About', (p) => <span className="muted small">{p.description}</span>],
  ];

  return (
    <div>
      <div className="crumbs"><Link href="/">Home</Link><span>/</span><b>Compare</b></div>
      <div className="page-title"><h1>Compare products</h1><p>{items.length} of 4 products side by side.</p></div>
      <div className="tablewrap glass cmp-table">
        <table>
          <thead>
            <tr>
              <th />
              {items.map((p) => (
                <th key={p._id}>
                  <div className="cmp-head">
                    <button className="iconbtn" onClick={() => toggleCompare(p)} aria-label={`Remove ${p.name}`}><CloseIcon size={15} /></button>
                    <Link href={`/product/${p.slug}`}><img src={p.image} alt="" /></Link>
                    <Link href={`/product/${p.slug}`}><b>{p.name}</b></Link>
                    <div className="btn-pair">
                      <button className="btn ghost sm" onClick={() => setViewing(p.slug)}>Quick view</button>
                      <button className="btn sm" disabled={totalStock(p) < 1} onClick={() => buyNow(p)}>Buy now</button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => <tr key={label}><th scope="row">{label}</th>{items.map((p) => <td key={p._id}>{fn(p)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
