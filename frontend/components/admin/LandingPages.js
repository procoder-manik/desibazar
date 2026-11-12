'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../Providers';
import { CloseIcon, CopyIcon, DownIcon, EditIcon, ExternalIcon, EyeIcon, PlusIcon, TrashIcon, UpIcon } from '../Icons';
import ProductPicker from './ProductPicker';
import { SeoFields } from './Seo';
import { BLOCKS, newBlock, TEMPLATES } from './landingBlocks';
import { api, taka } from '@/lib/api';
import { fmtDate } from '@/lib/format';

const origin = () => (typeof window !== 'undefined' ? window.location.origin : '');
const fresh = (sections) => sections.map((s) => ({ ...JSON.parse(JSON.stringify(s)), id: newBlock(s.type).id }));

/* ---------- one block's fields ---------- */
function Field({ f: [key, kind, label, opts], value, onChange }) {
  const v = value ?? '';
  if (kind === 'bool') return <label className="f-row inline"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /><span className="box" /><span className="lbl">{label}</span></label>;
  if (kind === 'select') return <label>{label}<select value={v} onChange={(e) => onChange(e.target.value)}>{opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>;
  if (kind === 'textarea' || kind === 'markdown' || kind === 'lines') {
    return <label className="full">{label}<textarea rows={kind === 'markdown' ? 6 : kind === 'lines' ? 4 : 2} value={Array.isArray(v) ? v.join('\n') : v} onChange={(e) => onChange(e.target.value)} spellCheck={kind !== 'lines'} /></label>;
  }
  if (kind === 'datetime') return <label>{label}<input type="datetime-local" value={v ? String(v).slice(0, 16) : ''} onChange={(e) => onChange(e.target.value)} /></label>;
  if (kind === 'list') {
    const list = Array.isArray(value) ? value : [];
    const set = (i, patch) => onChange(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    return (
      <div className="full sublist">
        <span className="sublist-head">{label}</span>
        {list.map((item, i) => (
          <div key={i} className="subitem">
            <div className="fields">{opts.map((sf) => <Field key={sf[0]} f={sf} value={item[sf[0]]} onChange={(x) => set(i, { [sf[0]]: x })} />)}</div>
            <button type="button" className="iconbtn" aria-label="Remove" onClick={() => onChange(list.filter((_, j) => j !== i))}><TrashIcon size={15} /></button>
          </div>
        ))}
        <button type="button" className="btn ghost sm" onClick={() => onChange([...list, {}])}><PlusIcon size={14} /> Add</button>
      </div>
    );
  }
  return (
    <label className={kind === 'image' ? 'full' : ''}>{label}
      <span className={kind === 'image' ? 'img-input' : ''}>{kind === 'image' && v ? <img src={v} alt="" /> : null}<input value={v} onChange={(e) => onChange(e.target.value)} placeholder={kind === 'image' ? 'https://…' : ''} /></span>
    </label>
  );
}

function Block({ s, i, n, open, onOpen, onChange, onMove, onDelete, onCopy }) {
  const def = BLOCKS[s.type];
  const summary = s.title || s.text || s.url || def.hint;
  return (
    <div className={'lpb' + (open ? ' open' : '')}>
      <div className="lpb-head" onClick={onOpen}>
        <span className="lpb-type">{def.label}</span>
        <span className="lpb-sum">{String(summary || '').slice(0, 60)}</span>
        <span className="lpb-act" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="iconbtn" disabled={i === 0} onClick={() => onMove(-1)} aria-label="Move up"><UpIcon size={15} /></button>
          <button type="button" className="iconbtn" disabled={i === n - 1} onClick={() => onMove(1)} aria-label="Move down"><DownIcon size={15} /></button>
          <button type="button" className="iconbtn" onClick={onCopy} aria-label="Duplicate block"><CopyIcon size={15} /></button>
          <button type="button" className="iconbtn" onClick={onDelete} aria-label="Delete block"><TrashIcon size={15} /></button>
        </span>
      </div>
      {open && (
        <div className="lpb-body">
          {def.fields.length ? <div className="fields">{def.fields.map((f) => <Field key={f[0]} f={f} value={s[f[0]]} onChange={(x) => onChange({ ...s, [f[0]]: x })} />)}</div>
            : <p className="fine left">The product selection and order form appear here. Set the products and form options in the panel on the right.</p>}
        </div>
      )}
    </div>
  );
}

/* ---------- page editor ---------- */
function Editor({ page, onClose, onSaved }) {
  const { token, toast } = useApp();
  const [lp, setLp] = useState(() => ({
    title: '', slug: '', status: 'draft', accent: '', header: 'minimal', sections: [], products: [], seo: {},
    ...page, checkout: { mode: 'multi', title: '', button: '', allowQty: true, coupon: true, note: '', freeDelivery: false, lang: 'bn', ...(page.checkout || {}) },
  }));
  const [open, setOpen] = useState(lp.sections[0]?.id);
  const [side, setSide] = useState('products');
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setLp((x) => ({ ...x, ...patch }));
  const setCk = (patch) => setLp((x) => ({ ...x, checkout: { ...x.checkout, ...patch } }));
  const sec = (fn) => setLp((x) => ({ ...x, sections: fn(x.sections) }));
  const setProd = (i, patch) => setLp((x) => ({ ...x, products: x.products.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

  const save = async (status) => {
    setErr('');
    if (!lp.title.trim()) return setErr('Give the page a name');
    if (!lp.products.length) return setErr('Add at least one product for the order form');
    setBusy(true);
    try {
      const body = { ...lp, status: status || lp.status, products: lp.products.map((p) => ({ ...p, product: p.product._id || p.product })) };
      const r = await api(lp._id ? '/admin/landing/' + lp._id : '/admin/landing', { method: lp._id ? 'PUT' : 'POST', token, body });
      setLp((x) => ({ ...x, _id: r._id, slug: r.slug, status: r.status }));
      toast(r.status === 'published' ? 'Page published' : 'Draft saved'); onSaved();
      return r;
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
    return null;
  };
  const preview = async () => { const r = lp._id ? await save() : await save('draft'); if (r) window.open(`/lp/${encodeURIComponent(r.slug)}?preview=1`, '_blank'); };
  const link = lp.slug ? `${origin()}/lp/${lp.slug}` : '';

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Landing page editor">
      <div className="scrim on" onClick={onClose} />
      <div className="modal editor full">
        <div className="modal-head">
          <div className="grow"><span className="eyebrow">Landing page · {lp.status}</span>
            <input className="title-input" value={lp.title} onChange={(e) => set({ title: e.target.value })} placeholder="Page name, e.g. Himsagar mango offer" />
          </div>
          <button className="btn ghost sm" onClick={preview} disabled={busy}><EyeIcon size={15} /> Preview</button>
          <button className="iconbtn" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>
        <div className="modal-body">
          {err && <p className="err boxed">{err}</p>}
          <div className="lpe">
            <div className="lpe-blocks">
              <div className="row-title"><h3>Sections <small className="muted">(top to bottom)</small></h3><button className="btn sm" onClick={() => setAdding(!adding)}><PlusIcon size={15} /> Add section</button></div>
              {adding && (
                <div className="block-menu glass">
                  {Object.entries(BLOCKS).map(([k, b]) => (
                    <button key={k} type="button" onClick={() => { const nb = newBlock(k); sec((l) => [...l, nb]); setOpen(nb.id); setAdding(false); }}>
                      <b>{b.label}</b><small>{b.hint}</small>
                    </button>
                  ))}
                </div>
              )}
              {lp.sections.map((s, i) => (
                <Block key={s.id} s={s} i={i} n={lp.sections.length} open={open === s.id} onOpen={() => setOpen(open === s.id ? null : s.id)}
                  onChange={(nb) => sec((l) => l.map((x) => (x.id === s.id ? nb : x)))}
                  onMove={(d) => sec((l) => { const a = [...l]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); return a; })}
                  onCopy={() => sec((l) => { const a = [...l]; a.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(s)), id: newBlock(s.type).id }); return a; })}
                  onDelete={() => confirm(`Remove the ${BLOCKS[s.type].label} section?`) && sec((l) => l.filter((x) => x.id !== s.id))} />
              ))}
              {!lp.sections.some((s) => s.type === 'checkout') && <p className="fine left">No order form section: it will be added at the bottom automatically.</p>}
            </div>

            <div className="lpe-side">
              <div className="seg wrap">
                {[['products', 'Products & form'], ['design', 'Page'], ['seo', 'SEO'], ['ads', 'Ad link']].map(([k, l]) => <button key={k} type="button" className={side === k ? 'on' : ''} onClick={() => setSide(k)}>{l}</button>)}
              </div>

              {side === 'products' && (
                <section className="cf-sec">
                  <h3>Products in the order form</h3>
                  <p className="fine left">Tick “Selected” for products that start ticked. An offer price here only applies on this page.</p>
                  {lp.products.map((it, i) => {
                    const p = it.product;
                    return (
                      <div key={it._id || i} className="lp-prod">
                        <div className="mini"><span className="mimg"><img src={p.image} alt="" /></span><span className="mname">{p.name}<small>Store price {taka(p.salePrice || p.price)}</small></span>
                          <button type="button" className="iconbtn" aria-label="Remove" onClick={() => set({ products: lp.products.filter((_, j) => j !== i) })}><TrashIcon size={15} /></button></div>
                        <div className="fields">
                          <label>Name on this page<input value={it.label || ''} onChange={(e) => setProd(i, { label: e.target.value })} placeholder={p.name} /></label>
                          <label>Badge<input value={it.badge || ''} onChange={(e) => setProd(i, { badge: e.target.value })} placeholder="e.g. Best value" /></label>
                          <label>Offer price (৳)<input type="number" min="0" value={it.price ?? ''} onChange={(e) => setProd(i, { price: e.target.value === '' ? '' : +e.target.value })} placeholder="Store price" /></label>
                          <label>Start quantity<input type="number" min="1" value={it.qty || 1} onChange={(e) => setProd(i, { qty: +e.target.value || 1 })} /></label>
                          {p.variants?.length > 0 && (
                            <label className="full">Option<select value={it.variant || ''} onChange={(e) => setProd(i, { variant: e.target.value || undefined })}>
                              <option value="">Buyer chooses</option>{p.variants.map((v) => <option key={v._id} value={v._id}>{v.label}</option>)}
                            </select></label>
                          )}
                          <label className="f-row inline full"><input type="checkbox" checked={!!it.selected} onChange={(e) => setProd(i, { selected: e.target.checked })} /><span className="box" /><span className="lbl">Selected when the page opens</span></label>
                        </div>
                      </div>
                    );
                  })}
                  <ProductPicker exclude={lp.products.map((x) => x.product._id)} onPick={(p) => set({ products: [...lp.products, { product: p, qty: 1, selected: !lp.products.length }] })} />

                  <h3 style={{ marginTop: 18 }}>Order form</h3>
                  <div className="seg" style={{ marginBottom: 10 }}>
                    <button type="button" className={lp.checkout.mode === 'multi' ? 'on' : ''} onClick={() => setCk({ mode: 'multi' })}>Tick one or more</button>
                    <button type="button" className={lp.checkout.mode === 'single' ? 'on' : ''} onClick={() => setCk({ mode: 'single' })}>Choose only one</button>
                  </div>
                  <div className="fields">
                    <label className="full">Form title<input value={lp.checkout.title} onChange={(e) => setCk({ title: e.target.value })} placeholder="ফর্মটি পূরণ করে অর্ডার করুন" /></label>
                    <label>Button text<input value={lp.checkout.button} onChange={(e) => setCk({ button: e.target.value })} placeholder="অর্ডার কনফার্ম করুন" /></label>
                    <label>Form language<select value={lp.checkout.lang} onChange={(e) => setCk({ lang: e.target.value })}><option value="bn">বাংলা</option><option value="en">English</option></select></label>
                    <label className="full">Note above the form<textarea rows={2} value={lp.checkout.note} onChange={(e) => setCk({ note: e.target.value })} placeholder="e.g. ঢাকার বাইরে ডেলিভারি চার্জ অগ্রিম দিতে হবে" /></label>
                  </div>
                  <label className="f-row inline"><input type="checkbox" checked={lp.checkout.allowQty} onChange={(e) => setCk({ allowQty: e.target.checked })} /><span className="box" /><span className="lbl">Buyer can change quantity</span></label>
                  <label className="f-row inline"><input type="checkbox" checked={lp.checkout.coupon} onChange={(e) => setCk({ coupon: e.target.checked })} /><span className="box" /><span className="lbl">Show coupon box</span></label>
                  <label className="f-row inline"><input type="checkbox" checked={lp.checkout.freeDelivery} onChange={(e) => setCk({ freeDelivery: e.target.checked })} /><span className="box" /><span className="lbl">Free delivery on this page</span></label>
                  <p className="fine left">Payment options and the cash-on-delivery advance come from Settings → Payments.</p>
                </section>
              )}

              {side === 'design' && (
                <section className="cf-sec">
                  <h3>Page</h3>
                  <div className="fields one">
                    <label>Link<span className="prefix-input"><em>/lp/</em><input value={lp.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="made from the name" /></span></label>
                    <label>Top bar<select value={lp.header} onChange={(e) => set({ header: e.target.value })}><option value="minimal">Logo + phone + order button</option><option value="store">Logo links to the store</option><option value="none">No top bar</option></select></label>
                    <label>Page colour <small className="muted">(empty = store colour)</small>
                      <span className="colorpick"><input type="color" value={lp.accent || '#2f4a3a'} onChange={(e) => set({ accent: e.target.value })} /><input value={lp.accent} onChange={(e) => set({ accent: e.target.value })} placeholder="#2f4a3a" maxLength={7} /></span>
                    </label>
                  </div>
                </section>
              )}

              {side === 'seo' && (
                <section className="cf-sec">
                  <h3>SEO & sharing</h3>
                  <SeoFields value={lp.seo} onChange={(seo) => set({ seo })} fallbackTitle={lp.title} fallbackDescription={lp.sections.find((s) => s.type === 'hero')?.subtitle} path={`/lp/${lp.slug || 'new-page'}`} />
                </section>
              )}

              {side === 'ads' && (
                <section className="cf-sec">
                  <h3>Links for your ads</h3>
                  {!link ? <p className="muted">Save the page first.</p> : (
                    <>
                      {[['Facebook / Instagram', 'facebook', 'paid_social'], ['Google Ads', 'google', 'cpc'], ['TikTok', 'tiktok', 'paid_social']].map(([l, src, med]) => {
                        const url = `${link}?utm_source=${src}&utm_medium=${med}&utm_campaign=${encodeURIComponent(lp.slug)}`;
                        return <div key={src} className="copyrow"><small>{l}</small><code>{url}</code><button type="button" className="btn ghost sm" onClick={() => { navigator.clipboard?.writeText(url); toast('Link copied'); }}><CopyIcon size={14} /> Copy</button></div>;
                      })}
                      <p className="fine left">Orders from these links show the campaign in the order panel. Purchases are reported to every pixel automatically (Admin → Store & tracking).</p>
                    </>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          {link && lp.status === 'published' && <a className="link" href={link} target="_blank" rel="noreferrer">{link.replace(/^https?:\/\//, '')} <ExternalIcon size={13} /></a>}
          <span className="grow" />
          <button className="btn ghost" onClick={onClose}>Close</button>
          <button className="btn ghost" disabled={busy} onClick={() => save('draft')}>{lp.status === 'published' ? 'Unpublish' : 'Save draft'}</button>
          <button className="btn" disabled={busy} onClick={() => save('published')}>{lp.status === 'published' ? 'Update' : 'Publish'}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- list ---------- */
export default function LandingPages() {
  const { token, toast } = useApp();
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);
  const [choose, setChoose] = useState(false);
  const [err, setErr] = useState('');
  const load = useCallback(() => api('/admin/landing', { token }).then(setList).catch((e) => setErr(e.message)), [token]);
  useEffect(() => { load(); }, [load]);
  const open = async (p) => { try { setEdit(await api('/admin/landing/' + p._id, { token })); } catch (e) { setErr(e.message); } };
  const run = async (fn, msg) => { try { await fn(); toast(msg); load(); } catch (e) { setErr(e.message); } };

  return (
    <>
      <div className="row-title">
        <p className="muted lead">One page per offer for your ads: photos, video, benefits, reviews and an order form on the same page. Buyers pick one or more products and order without a cart.</p>
        <button className="btn" onClick={() => setChoose(true)}><PlusIcon size={16} /> Create landing page</button>
      </div>
      {err && <p className="err boxed">{err}</p>}
      {choose && (
        <div className="tpl-grid">
          {Object.entries(TEMPLATES).map(([k, t]) => (
            <button key={k} className="tpl glass" onClick={() => { setChoose(false); setEdit({ title: '', ...JSON.parse(JSON.stringify(t.page)), sections: fresh(t.page.sections), products: [] }); }}>
              <b>{t.label}</b><small>{t.desc}</small><span className="tpl-blocks">{t.page.sections.map((s) => BLOCKS[s.type].label.split(' (')[0]).join(' · ')}</span>
            </button>
          ))}
          <button className="btn ghost sm" onClick={() => setChoose(false)}>Cancel</button>
        </div>
      )}
      <div className="tablewrap glass">
        <table>
          <thead><tr><th>Page</th><th>Products</th><th>Visits</th><th>Orders</th><th>Conversion</th><th>Revenue</th><th>Not finished</th><th /></tr></thead>
          <tbody>
            {!list ? <tr><td colSpan={8} className="muted">Loading…</td></tr> : !list.length ? <tr><td colSpan={8} className="muted">No landing pages yet. Create one from a template.</td></tr> : list.map((p) => (
              <tr key={p._id}>
                <td><b>{p.title}</b> <span className={'pill-state' + (p.status === 'published' ? ' ok' : '')}>{p.status}</span><br /><small className="muted">/lp/{p.slug} · {fmtDate(p.updatedAt)}</small></td>
                <td><span className="thumbs">{p.products?.slice(0, 4).map((x, i) => x.product && <img key={i} src={x.product.image} alt={x.product.name} title={x.product.name} />)}</span></td>
                <td>{p.views || 0}</td>
                <td><b>{p.orders}</b></td>
                <td>{p.views ? `${((p.orders / p.views) * 100).toFixed(1)}%` : '–'}</td>
                <td>{taka(p.revenue)}</td>
                <td>{p.leads || 0}</td>
                <td className="nowrap">
                  <a className="iconbtn" href={`/lp/${encodeURIComponent(p.slug)}${p.status === 'published' ? '' : '?preview=1'}`} target="_blank" rel="noreferrer" aria-label="Open"><ExternalIcon size={15} /></a>
                  <button className="iconbtn" aria-label="Edit" onClick={() => open(p)}><EditIcon size={15} /></button>
                  <button className="iconbtn" aria-label="Duplicate" onClick={() => run(() => api(`/admin/landing/${p._id}/duplicate`, { method: 'POST', token }), 'Copied as a draft')}><CopyIcon size={15} /></button>
                  <button className="iconbtn" aria-label="Delete" onClick={() => confirm(`Delete "${p.title}"? Orders keep their history.`) && run(() => api('/admin/landing/' + p._id, { method: 'DELETE', token }), 'Page deleted')}><TrashIcon size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <Editor page={edit} onClose={() => { setEdit(null); load(); }} onSaved={load} />}
    </>
  );
}
