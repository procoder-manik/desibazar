'use client';
import { useState } from 'react';
import { useApp } from '../Providers';
import { CloseIcon, PlusIcon, TrashIcon } from '../Icons';
import { api } from '@/lib/api';
import { SeoFields } from './Seo';

const blank = { name: '', category: '', price: '', salePrice: '', stock: 0, unit: '1 kg', image: '', images: [], description: '', details: [], variants: [], featured: false, active: true, advanceShipping: 'default' };
const emptyVariant = { color: '', hex: '#9fb59a', size: '', price: '', salePrice: '', stock: 0, image: '' };

// Full product editor: gallery, specifications and colour / size variants with their own price & stock.
export default function ProductEditor({ product, cats, onClose, onSaved }) {
  const { token, toast } = useApp();
  const [p, setP] = useState(() => (product ? {
    ...blank, ...product, category: product.category?._id || product.category || '',
    salePrice: product.salePrice ?? '', images: product.images || [], details: product.details || [], variants: (product.variants || []).map((v) => ({ ...emptyVariant, ...v, salePrice: v.salePrice ?? '', price: v.price ?? '' })),
  } : blank));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setP({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setArr = (k, i, patch) => setP({ ...p, [k]: p[k].map((x, j) => (j === i ? (typeof x === 'string' ? patch : { ...x, ...patch }) : x)) });
  const del = (k, i) => setP({ ...p, [k]: p[k].filter((_, j) => j !== i) });
  const hasVariants = p.variants.length > 0;

  const save = async () => {
    setErr('');
    if (!p.name.trim() || !p.category || p.price === '') return setErr('Name, category and price are required');
    setBusy(true);
    try {
      const body = {
        ...p, price: +p.price, salePrice: p.salePrice === '' ? null : +p.salePrice, stock: +p.stock || 0,
        images: p.images.filter(Boolean), details: p.details.filter((d) => d.label && d.value),
        variants: p.variants.map((v) => ({ ...v, label: undefined })), // server rebuilds "Colour / Size" labels
      };
      const r = await api(product ? '/products/' + product._id : '/products', { method: product ? 'PUT' : 'POST', token, body });
      toast(product ? 'Product saved' : 'Product created');
      onSaved(r);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Edit product">
      <div className="scrim on" onClick={onClose} />
      <div className="modal editor">
        <div className="modal-head">
          <div><span className="eyebrow">{product ? 'Edit product' : 'New product'}</span><h3>{p.name || 'Untitled product'}</h3></div>
          <button className="iconbtn" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>
        <div className="modal-body">
          {err && <p className="err boxed">{err}</p>}
          <section className="cf-sec">
            <h3>Basics</h3>
            <div className="fields three">
              <label className="full">Name<input value={p.name} onChange={set('name')} /></label>
              <label>Category<select value={p.category} onChange={set('category')}><option value="">Choose…</option>{cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
              <label>Unit / pack<input value={p.unit} onChange={set('unit')} /></label>
              <label>Base price (৳)<input type="number" min="0" value={p.price} onChange={set('price')} /></label>
              <label>Sale price (৳)<input type="number" min="0" value={p.salePrice} onChange={set('salePrice')} placeholder="optional" /></label>
              <label>{hasVariants ? 'Stock (total of options)' : 'Stock'}<input type="number" min="0" value={hasVariants ? p.variants.reduce((s, v) => s + (+v.stock || 0), 0) : p.stock} disabled={hasVariants} onChange={set('stock')} /></label>
              <label className="full">Advance delivery charge <small className="muted">(cash on delivery; the switch is in Shipping)</small>
                <select value={p.advanceShipping || 'default'} onChange={set('advanceShipping')}>
                  <option value="default">Follow the store setting</option>
                  <option value="require">Always take the delivery charge in advance for this product</option>
                  <option value="exempt">Never ask for an advance for this product</option>
                </select>
              </label>
              <label className="full">Description<textarea rows={3} value={p.description} onChange={set('description')} /></label>
            </div>
            <div className="btnrow left">
              <label className="f-row inline"><input type="checkbox" checked={p.featured} onChange={set('featured')} /><span className="box" /><span className="lbl">Featured (best sellers & hero)</span></label>
              <label className="f-row inline"><input type="checkbox" checked={p.active !== false} onChange={set('active')} /><span className="box" /><span className="lbl">Visible in shop</span></label>
            </div>
          </section>

          <section className="cf-sec">
            <div className="card-head"><h3>Images</h3><button className="btn ghost sm" onClick={() => setP({ ...p, images: [...p.images, ''] })}><PlusIcon size={14} /> Add image</button></div>
            <p className="fine left">The main image shows on cards. Extra images appear in the product gallery. Paste image links (Cloudinary, ImgBB, your CDN…).</p>
            <div className="img-rows">
              <div className="img-row"><span className="thumb">{p.image ? <img src={p.image} alt="" /> : null}</span><input value={p.image} onChange={set('image')} placeholder="Main image URL" /><span className="tag">Main</span></div>
              {p.images.map((u, i) => (
                <div key={i} className="img-row"><span className="thumb">{u ? <img src={u} alt="" /> : null}</span><input value={u} onChange={(e) => setArr('images', i, e.target.value)} placeholder="https://…" />
                  <button className="iconbtn" onClick={() => del('images', i)} aria-label="Remove image"><TrashIcon size={15} /></button></div>
              ))}
            </div>
          </section>

          <section className="cf-sec">
            <div className="card-head"><h3>Options: colour & size</h3><button className="btn ghost sm" onClick={() => setP({ ...p, variants: [...p.variants, { ...emptyVariant, price: p.price }] })}><PlusIcon size={14} /> Add option</button></div>
            <p className="fine left">Leave empty for a simple product. Each option has its own price, stock and (optional) image. Customers must pick one before buying.</p>
            {hasVariants && (
              <div className="tablewrap">
                <table className="vtable">
                  <thead><tr><th>Colour</th><th>Swatch</th><th>Size</th><th>Price</th><th>Sale</th><th>Stock</th><th>Image URL</th><th /></tr></thead>
                  <tbody>
                    {p.variants.map((v, i) => (
                      <tr key={i}>
                        <td><input className="cell" value={v.color} onChange={(e) => setArr('variants', i, { color: e.target.value })} placeholder="e.g. Sage" /></td>
                        <td><input type="color" className="swpick" value={v.hex || '#cccccc'} onChange={(e) => setArr('variants', i, { hex: e.target.value })} /></td>
                        <td><input className="cell" value={v.size} onChange={(e) => setArr('variants', i, { size: e.target.value })} placeholder="e.g. 500 g" /></td>
                        <td><input className="cell" type="number" min="0" value={v.price} onChange={(e) => setArr('variants', i, { price: e.target.value })} /></td>
                        <td><input className="cell" type="number" min="0" value={v.salePrice} onChange={(e) => setArr('variants', i, { salePrice: e.target.value })} /></td>
                        <td><input className="cell" type="number" min="0" value={v.stock} onChange={(e) => setArr('variants', i, { stock: e.target.value })} /></td>
                        <td><input value={v.image || ''} onChange={(e) => setArr('variants', i, { image: e.target.value })} placeholder="optional" /></td>
                        <td><button className="iconbtn" onClick={() => del('variants', i)} aria-label="Remove option"><TrashIcon size={15} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="cf-sec">
            <div className="card-head"><h3>Specifications</h3><button className="btn ghost sm" onClick={() => setP({ ...p, details: [...p.details, { label: '', value: '' }] })}><PlusIcon size={14} /> Add row</button></div>
            <p className="fine left">Shown on the product page and in Compare (e.g. Origin, Weight, Shelf life).</p>
            {p.details.map((d, i) => (
              <div key={i} className="spec-row">
                <input value={d.label} onChange={(e) => setArr('details', i, { label: e.target.value })} placeholder="Label" />
                <input value={d.value} onChange={(e) => setArr('details', i, { value: e.target.value })} placeholder="Value" />
                <button className="iconbtn" onClick={() => del('details', i)} aria-label="Remove row"><TrashIcon size={15} /></button>
              </div>
            ))}
          </section>

          <section className="cf-sec">
            <h3>SEO</h3>
            <div className="fields">
              <label className="full">URL slug <small className="muted">(/product/…, Bangla is fine)</small><input value={p.slug || ''} onChange={set('slug')} placeholder="Made from the name when empty" /></label>
            </div>
            <SeoFields value={p.seo || {}} onChange={(seo) => setP({ ...p, seo })} fallbackTitle={p.name} fallbackDescription={p.description} path={`/product/${p.slug || 'new-product'}`} />
            {p.sourceUrl && <p className="fine left">Imported from <a className="link" href={p.sourceUrl} target="_blank" rel="noreferrer">{p.sourceUrl.replace(/^https?:\/\//, '').slice(0, 60)}</a></p>}
          </section>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : product ? 'Save product' : 'Create product'}</button>
        </div>
      </div>
    </div>
  );
}
