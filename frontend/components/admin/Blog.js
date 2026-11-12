'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../Providers';
import { CloseIcon, EditIcon, ExternalIcon, PlusIcon, TrashIcon } from '../Icons';
import Markdown from '../Markdown';
import ProductPicker from './ProductPicker';
import { SeoFields } from './Seo';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/format';

const blank = { title: '', slug: '', excerpt: '', content: '', cover: '', author: '', tags: '', products: [], status: 'draft', seo: {} };

// Toolbar snippets inserted at the cursor.
const SNIPPETS = [
  ['H2', '\n## Heading\n'], ['H3', '\n### Sub-heading\n'], ['Bold', '**bold text**'], ['List', '\n- First point\n- Second point\n'],
  ['Link', '[link text](https://)'], ['Image', '\n![description](https://image-url)\n'], ['Quote', '\n> A short quote\n'], ['YouTube', '\n[youtube:VIDEO_ID]\n'],
];

function Editor({ post, onClose, onSaved }) {
  const { token, toast } = useApp();
  const [p, setP] = useState({ ...blank, ...post, tags: (post?.tags || []).join(', '), seo: post?.seo || {} });
  const [tab, setTab] = useState('write');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const area = useRef(null);
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });
  const insert = (text) => {
    const el = area.current;
    const at = el ? el.selectionStart : p.content.length;
    const next = p.content.slice(0, at) + text + p.content.slice(el ? el.selectionEnd : at);
    setP({ ...p, content: next });
    requestAnimationFrame(() => { if (el) { el.focus(); el.selectionStart = el.selectionEnd = at + text.length; } });
  };
  const save = async (status) => {
    setErr(''); setBusy(true);
    try {
      const body = { ...p, status: status || p.status, products: p.products.map((x) => x._id || x) };
      const r = await api(post?._id ? '/admin/posts/' + post._id : '/admin/posts', { method: post?._id ? 'PUT' : 'POST', token, body });
      toast(body.status === 'published' ? 'Post published' : 'Draft saved'); onSaved(r);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const productMap = Object.fromEntries(p.products.map((x) => [x.slug, x]));

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Edit post">
      <div className="scrim on" onClick={onClose} />
      <div className="modal editor wide">
        <div className="modal-head"><div><span className="eyebrow">{post?._id ? 'Edit post' : 'New post'} · {p.status}</span><h3>{p.title || 'Untitled post'}</h3></div><button className="iconbtn" onClick={onClose} aria-label="Close"><CloseIcon /></button></div>
        <div className="modal-body">
          {err && <p className="err boxed">{err}</p>}
          <div className="bag-grid wide-left">
            <div>
              <div className="fields one">
                <label>Title<input value={p.title} onChange={set('title')} placeholder="আমের ১০টি উপকারিতা" /></label>
                <label>Short summary <small className="muted">(card text and default meta description)</small><textarea rows={2} value={p.excerpt} onChange={set('excerpt')} /></label>
              </div>
              <div className="seg" style={{ margin: '14px 0 8px' }}>
                <button type="button" className={tab === 'write' ? 'on' : ''} onClick={() => setTab('write')}>Write</button>
                <button type="button" className={tab === 'preview' ? 'on' : ''} onClick={() => setTab('preview')}>Preview</button>
              </div>
              {tab === 'write' ? (
                <>
                  <div className="md-toolbar">
                    {SNIPPETS.map(([l, t]) => <button type="button" key={l} onClick={() => insert(t)}>{l}</button>)}
                    {p.products.map((x) => <button type="button" key={x._id} className="accent" onClick={() => insert(`\n[product:${x.slug}]\n`)}>+ {x.name.slice(0, 18)}</button>)}
                  </div>
                  <textarea ref={area} className="md-area" rows={18} value={p.content} onChange={set('content')} placeholder={'Write in Bangla or English.\n\n## A heading\nA paragraph with **bold** text.\n\n- A list item\n\n[product:product-slug]   ← shows a product card with Add to bag'} spellCheck={false} />
                </>
              ) : (
                <div className="md-preview glass"><Markdown text={p.content} renderProduct={(s) => (productMap[s] ? <div className="md-pill">Product card: <b>{productMap[s].name}</b></div> : <div className="md-pill err">Unknown product “{s}”: add it under Target products</div>)} /></div>
              )}
            </div>
            <div>
              <section className="cf-sec">
                <h3>Target products</h3>
                <p className="fine left">Shown beside the article, and the product page links back to this post. Use the buttons above the editor to place a card inside the text.</p>
                {p.products.map((x) => (
                  <div key={x._id} className="mini"><span className="mimg"><img src={x.image} alt="" /></span><span className="mname">{x.name}</span>
                    <button type="button" className="iconbtn" aria-label="Remove" onClick={() => setP({ ...p, products: p.products.filter((y) => y._id !== x._id) })}><TrashIcon size={15} /></button></div>
                ))}
                <ProductPicker exclude={p.products.map((x) => x._id)} onPick={(x) => setP({ ...p, products: [...p.products, x] })} />
              </section>
              <section className="cf-sec" style={{ marginTop: 14 }}>
                <h3>Details</h3>
                <div className="fields one">
                  <label>Cover image URL<input value={p.cover} onChange={set('cover')} placeholder="https://…" /></label>
                  {p.cover && <img src={p.cover} alt="" className="cover-prev" />}
                  <label>Tags <small className="muted">(comma separated)</small><input value={p.tags} onChange={set('tags')} placeholder="mango, health, recipe" /></label>
                  <label>Author<input value={p.author} onChange={set('author')} /></label>
                  <label>URL slug<input value={p.slug} onChange={set('slug')} placeholder="Made from the title" /></label>
                </div>
              </section>
              <section className="cf-sec" style={{ marginTop: 14 }}>
                <h3>SEO</h3>
                <SeoFields value={p.seo} onChange={(seo) => setP({ ...p, seo })} fallbackTitle={p.title} fallbackDescription={p.excerpt} path={`/blog/${p.slug || 'new-post'}`} />
              </section>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn ghost" disabled={busy} onClick={() => save('draft')}>{p.status === 'published' ? 'Unpublish (draft)' : 'Save draft'}</button>
          <button className="btn" disabled={busy} onClick={() => save('published')}>{p.status === 'published' ? 'Update' : 'Publish'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Blog() {
  const { token, toast } = useApp();
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => api('/admin/posts', { token }).then(setList).catch((e) => setErr(e.message)), [token]);
  useEffect(() => { load(); }, [load]);
  const open = async (p) => { try { setEdit(p ? await api('/admin/posts/' + p._id, { token }) : {}); } catch (e) { setErr(e.message); } };
  const remove = async (p) => { if (!confirm(`Delete "${p.title}"?`)) return; await api('/admin/posts/' + p._id, { method: 'DELETE', token }); toast('Post deleted'); load(); };

  return (
    <>
      <div className="admin-intro"><p className="muted lead">Write articles that bring Google visitors and point them to a product. Each post can target products; they appear as cards with Add to bag.</p><button className="btn" onClick={() => open(null)}><PlusIcon size={16} /> New post</button></div>
      {err && <p className="err boxed">{err}</p>}
      <div className="tablewrap glass">
        <table>
          <thead><tr><th>Post</th><th>Targets</th><th>Status</th><th>Views</th><th>Updated</th><th /></tr></thead>
          <tbody>
            {!list ? <tr><td colSpan={6} className="muted">Loading…</td></tr> : !list.length ? <tr><td colSpan={6} className="muted">No posts yet. Write the first one.</td></tr> : list.map((p) => (
              <tr key={p._id}>
                <td><b>{p.title}</b><br /><small className="muted">/blog/{p.slug}</small></td>
                <td><small>{p.products?.map((x) => x.name).join(', ') || '–'}</small></td>
                <td><span className={'pill-state' + (p.status === 'published' ? ' ok' : '')}>{p.status}</span></td>
                <td>{p.views || 0}</td>
                <td><small>{fmtDate(p.updatedAt)}</small></td>
                <td className="nowrap">
                  {p.status === 'published' && <a className="iconbtn" href={`/blog/${encodeURIComponent(p.slug)}`} target="_blank" rel="noreferrer" aria-label="Open"><ExternalIcon size={15} /></a>}
                  <button className="iconbtn" aria-label="Edit" onClick={() => open(p)}><EditIcon size={15} /></button>
                  <button className="iconbtn" aria-label="Delete" onClick={() => remove(p)}><TrashIcon size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <Editor post={edit._id ? edit : null} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </>
  );
}
