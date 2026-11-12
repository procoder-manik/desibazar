'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { CloseIcon, FilterIcon } from '@/components/Icons';
import { api } from '@/lib/api';

const LIMIT = 12;
const SORTS = [['-createdAt', 'Newest first'], ['-sold', 'Best selling'], ['-rating', 'Top rated'], ['price', 'Price: low to high'], ['-price', 'Price: high to low'], ['name', 'Name A-Z']];

function Skeletons() {
  return <div className="sgrid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skel glass"><span /><i /><i /></div>)}</div>;
}

function Shop() {
  const sp = useSearchParams();
  const router = useRouter();
  const category = sp.get('category') || '';
  const q = sp.get('q') || '';
  const sort = sp.get('sort') || '-createdAt';
  const page = +(sp.get('page') || 1);
  const minPrice = sp.get('minPrice') || '';
  const maxPrice = sp.get('maxPrice') || '';
  const sale = sp.get('sale') === 'true';
  const inStock = sp.get('inStock') === 'true';
  const color = sp.get('color') || '';
  const [colors, setColors] = useState([]);
  useEffect(() => { api('/colors').then(setColors).catch(() => {}); }, []);
  const [cats, setCats] = useState([]);
  const [counts, setCounts] = useState({});
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [range, setRange] = useState({ min: minPrice, max: maxPrice });
  const [panel, setPanel] = useState(false);

  useEffect(() => {
    api('/categories').then((cs) => {
      setCats(cs);
      cs.forEach((c) =>
        api(`/products?category=${c.slug}&limit=1`).then((r) => setCounts((x) => ({ ...x, [c.slug]: r.total }))).catch(() => {}));
    }).catch(() => {});
  }, []);

  useEffect(() => { setRange({ min: minPrice, max: maxPrice }); }, [minPrice, maxPrice]);

  useEffect(() => {
    setData(null); setError('');
    const qs = new URLSearchParams({
      sort, page, limit: LIMIT,
      ...(category && { category }), ...(q && { q }),
      ...(minPrice && { minPrice }), ...(maxPrice && { maxPrice }),
      ...(sale && { sale: 'true' }), ...(inStock && { inStock: 'true' }), ...(color && { color }),
    });
    api('/products?' + qs).then(setData).catch((e) => setError(e.message));
  }, [category, q, sort, page, minPrice, maxPrice, sale, inStock, color]);

  const set = (patch) => {
    const n = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    router.push('/shop?' + n, { scroll: false });
  };
  const active = cats.find((c) => c.slug === category);
  const title = q ? `Results for “${q}”` : active ? active.name : sale ? 'On sale' : 'All products';
  const from = data && data.total ? (page - 1) * LIMIT + 1 : 0;
  const to = data ? Math.min(page * LIMIT, data.total) : 0;
  const chips = [
    q && ['q', `“${q}”`], active && ['category', active.name], sale && ['sale', 'On sale'], inStock && ['inStock', 'In stock'], color && ['color', color],
    (minPrice || maxPrice) && ['price', `৳${minPrice || 0} – ${maxPrice ? '৳' + maxPrice : 'any'}`],
  ].filter(Boolean);

  return (
    <div className="shop">
      <div className="crumbs"><Link href="/">Home</Link><span>/</span>{active ? <><Link href="/shop">Shop</Link><span>/</span><b>{active.name}</b></> : <b>Shop</b>}</div>
      <div className="page-title">
        <h1>{title}</h1>
        <p>{data ? `${data.total} ${data.total === 1 ? 'product' : 'products'}, carefully sourced.` : 'Loading products...'}</p>
      </div>

      <div className="shop-body">
        <aside className={'filters glass' + (panel ? ' open' : '')}>
          <div className="f-head">
            <span>Filters</span>
            <button onClick={() => router.push('/shop')}>Clear all</button>
            <button className="iconbtn f-close" onClick={() => setPanel(false)} aria-label="Close filters"><CloseIcon /></button>
          </div>

          <div className="f-block">
            <h4>Category</h4>
            {cats.map((c) => (
              <label key={c._id} className="f-row">
                <input type="checkbox" checked={category === c.slug} onChange={() => set({ category: category === c.slug ? '' : c.slug, page: '' })} />
                <span className="box" /><span className="lbl">{c.name}</span><em>{counts[c.slug] ?? ''}</em>
              </label>
            ))}
          </div>

          <div className="f-block">
            <h4>Availability</h4>
            <label className="f-row"><input type="checkbox" checked={inStock} onChange={() => set({ inStock: inStock ? '' : 'true', page: '' })} /><span className="box" /><span className="lbl">In stock only</span></label>
            <label className="f-row"><input type="checkbox" checked={sale} onChange={() => set({ sale: sale ? '' : 'true', page: '' })} /><span className="box" /><span className="lbl">On sale</span></label>
          </div>

          {colors.length > 0 && (
            <div className="f-block">
              <h4>Colour</h4>
              <div className="f-colors">
                {colors.map((c) => (
                  <button key={c.name} className={'swatch' + (color.toLowerCase() === c.name.toLowerCase() ? ' on' : '')} style={{ '--sw': c.hex || '#ccc' }}
                    title={`${c.name} (${c.count})`} aria-label={c.name} aria-pressed={color.toLowerCase() === c.name.toLowerCase()}
                    onClick={() => set({ color: color.toLowerCase() === c.name.toLowerCase() ? '' : c.name, page: '' })} />
                ))}
              </div>
            </div>
          )}

          <div className="f-block">
            <h4>Price (৳)</h4>
            <form className="f-price" onSubmit={(e) => { e.preventDefault(); set({ minPrice: range.min, maxPrice: range.max, page: '' }); setPanel(false); }}>
              <input type="number" min="0" inputMode="numeric" placeholder="Min" value={range.min} onChange={(e) => setRange({ ...range, min: e.target.value })} />
              <span>–</span>
              <input type="number" min="0" inputMode="numeric" placeholder="Max" value={range.max} onChange={(e) => setRange({ ...range, max: e.target.value })} />
              <button className="btn sm">Apply</button>
            </form>
          </div>
        </aside>

        <section>
          <div className="s-bar">
            <button className="btn ghost sm f-toggle" onClick={() => setPanel(true)}><FilterIcon size={16} /> Filters</button>
            <span className="s-count">{data ? (data.total ? `Showing ${from}–${to} of ${data.total}` : '') : ''}</span>
            <label className="sort glass">
              <span>Sort</span>
              <select value={sort} onChange={(e) => set({ sort: e.target.value, page: '' })}>
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>

          {chips.length > 0 && (
            <div className="chips">
              {chips.map(([k, l]) => (
                <button key={k} onClick={() => set(k === 'price' ? { minPrice: '', maxPrice: '', page: '' } : { [k]: '', page: '' })}>{l} <CloseIcon size={13} /></button>
              ))}
            </div>
          )}

          {error && <p className="err">{error}</p>}
          {!data && !error ? <Skeletons /> : data && data.items.length === 0 ? (
            <div className="empty glass"><h3>No products match</h3><p>Try removing a filter or searching for something else.</p><Link href="/shop" className="btn">Clear filters</Link></div>
          ) : data && (
            <div className="sgrid">{data.items.map((p) => <ProductCard key={p._id} p={p} />)}</div>
          )}

          {data && data.pages > 1 && (
            <nav className="pager" aria-label="Pages">
              <button disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>‹</button>
              {Array.from({ length: data.pages }, (_, i) => (
                <button key={i} className={page === i + 1 ? 'on' : ''} aria-current={page === i + 1 ? 'page' : undefined} onClick={() => set({ page: String(i + 1) })}>{i + 1}</button>
              ))}
              <button disabled={page >= data.pages} onClick={() => set({ page: String(page + 1) })}>›</button>
            </nav>
          )}
        </section>
      </div>
      {panel && <div className="scrim on" onClick={() => setPanel(false)} />}
    </div>
  );
}

export default function ShopPage() {
  return <Suspense fallback={<Skeletons />}><Shop /></Suspense>;
}
