'use client';
import { useState } from 'react';
import { useApp } from '../Providers';
import { CheckIcon, ExternalIcon } from '../Icons';
import { SaveBar, useSection } from './StoreSettings';

const PAGES = {
  home: 'Home page', shop: 'Shop (all products)', blog: 'Blog', help: 'Help & FAQ', cart: 'Bag', checkout: 'Checkout',
  login: 'Sign in', register: 'Create account', wishlist: 'Wishlist', compare: 'Compare',
};
const site = () => (typeof window !== 'undefined' ? window.location.origin : '');

// How the page will look in Google results.
export function SerpPreview({ title, description, path = '/' }) {
  return (
    <div className="serp">
      <small>{site().replace(/^https?:\/\//, '')}{path === '/' ? '' : ` › ${path.replace(/^\//, '').split('/').join(' › ')}`}</small>
      <b>{(title || 'Page title').slice(0, 65)}{(title || '').length > 65 ? '…' : ''}</b>
      <span>{(description || 'Add a description so Google shows your own text here.').slice(0, 160)}{(description || '').length > 160 ? '…' : ''}</span>
    </div>
  );
}

// Title / description / image fields with live length counters. Used by products, posts, landing pages and here.
export function SeoFields({ value = {}, onChange, fallbackTitle, fallbackDescription, path, noindex = true }) {
  const v = value || {};
  const set = (k) => (e) => onChange({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const len = (s, max) => <small className={(s || '').length > max ? 'err' : 'muted'}>{(s || '').length}/{max}</small>;
  return (
    <div className="seo-fields">
      <div className="fields one">
        <label>SEO title {len(v.title, 60)}<input value={v.title || ''} onChange={set('title')} placeholder={fallbackTitle || 'Uses the page name when empty'} /></label>
        <label>Meta description {len(v.description, 160)}<textarea rows={2} value={v.description || ''} onChange={set('description')} placeholder={fallbackDescription ? fallbackDescription.slice(0, 150) : 'One or two sentences that make people click'} /></label>
        <label>Keywords <small className="muted">(comma separated, optional)</small><input value={v.keywords || ''} onChange={set('keywords')} placeholder="mango, himsagar mango, buy mango online" /></label>
        <label>Social sharing image <small className="muted">(1200 × 630, for Facebook / WhatsApp)</small><input value={v.image || ''} onChange={set('image')} placeholder="https://…" /></label>
        {'canonical' in v || noindex ? <label>Canonical URL <small className="muted">(only if this page is a copy of another)</small><input value={v.canonical || ''} onChange={set('canonical')} placeholder="Leave empty" /></label> : null}
      </div>
      {noindex && <label className="f-row inline"><input type="checkbox" checked={!!v.noindex} onChange={set('noindex')} /><span className="box" /><span className="lbl">Hide from Google (noindex)</span></label>}
      <SerpPreview title={v.title || fallbackTitle} description={v.description || fallbackDescription} path={path} />
    </div>
  );
}

function Verification({ full, onSaved }) {
  const s = useSection(full, 'integrations');
  const v = s.v || {};
  const set = (k) => (e) => s.setV({ ...v, [k]: e.target.value });
  const keys = ['gscVerification', 'bingVerification', 'fbDomainVerification'];
  const dirty = keys.some((k) => (v[k] || '') !== (full.integrations?.[k] || ''));
  return (
    <div className="glass co-card" style={{ marginTop: 16 }}>
      <h3>Search engine & domain verification</h3>
      <p className="muted">Paste the whole <code>&lt;meta …&gt;</code> tag or just the code. It is added to every page automatically.</p>
      <div className="fields one">
        <label>Google Search Console <small className="muted">(Settings → Ownership verification → HTML tag)</small><input value={v.gscVerification || ''} onChange={set('gscVerification')} placeholder='<meta name="google-site-verification" content="…" />' /></label>
        <label>Bing Webmaster Tools<input value={v.bingVerification || ''} onChange={set('bingVerification')} placeholder="msvalidate.01 code" /></label>
        <label>Facebook domain verification <small className="muted">(Business settings → Brand safety → Domains)</small><input value={v.fbDomainVerification || ''} onChange={set('fbDomainVerification')} placeholder="facebook-domain-verification code" /></label>
      </div>
      <div className="savebar">
        {s.err && <p className="err">{s.err}</p>}
        <button className="btn" disabled={!dirty || s.busy} onClick={() => s.save(onSaved)}>Save verification</button>
      </div>
    </div>
  );
}

export default function Seo({ full, onSaved }) {
  const { settings } = useApp();
  const s = useSection(full, 'seo');
  const v = s.v || {};
  const [page, setPage] = useState('home');
  const pages = v.pages || {};
  const setPageSeo = (val) => s.setV({ ...v, pages: { ...pages, [page]: val } });
  const name = settings.store?.name || 'Store';
  const canStore = full.permissions?.includes('store');

  return (
    <>
      <div className="glass co-card">
        <h3>Whole site</h3>
        <div className="fields">
          <label>Home page title<input value={v.title || ''} onChange={(e) => s.setV({ ...v, title: e.target.value })} placeholder={`${name} - ${settings.store?.tagline || ''}`} /></label>
          <label>Title template <small className="muted">(%s = page title)</small><input value={v.titleTemplate || ''} onChange={(e) => s.setV({ ...v, titleTemplate: e.target.value })} placeholder={`%s · ${name}`} /></label>
          <label className="full">Default meta description<textarea rows={2} value={v.description || ''} onChange={(e) => s.setV({ ...v, description: e.target.value })} placeholder="Shown by Google for pages without their own description" /></label>
          <label>Keywords<input value={v.keywords || ''} onChange={(e) => s.setV({ ...v, keywords: e.target.value })} placeholder="organic food, honey, dates, Bangladesh" /></label>
          <label>Default sharing image<input value={v.image || ''} onChange={(e) => s.setV({ ...v, image: e.target.value })} placeholder="https://… (1200 × 630)" /></label>
        </div>
      </div>

      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Pages</h3>
        <p className="muted">Set a title and description for each storefront page. Products, categories, blog posts and landing pages have their own SEO box in their editors.</p>
        <div className="seg wrap" style={{ marginBottom: 14 }}>
          {Object.entries(PAGES).map(([k, l]) => <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}>{l}{pages[k]?.title || pages[k]?.description ? <CheckIcon size={13} /> : null}</button>)}
        </div>
        <SeoFields key={page} value={pages[page] || {}} onChange={setPageSeo} fallbackTitle={page === 'home' ? v.title || name : PAGES[page]} fallbackDescription={v.description} path={page === 'home' ? '/' : `/${page}`} noindex={!['cart', 'checkout', 'login', 'register', 'wishlist', 'compare'].includes(page)} />
      </div>
      <SaveBar s={s} onSaved={onSaved} />

      {canStore && <Verification full={full} onSaved={onSaved} />}

      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Automatic SEO (already on)</h3>
        <ul className="checks">
          <li><CheckIcon size={15} /> Sitemap with every product, category and blog post: <a className="link" href="/sitemap.xml" target="_blank" rel="noreferrer">/sitemap.xml <ExternalIcon size={12} /></a>. Submit it in Search Console → Sitemaps.</li>
          <li><CheckIcon size={15} /> <a className="link" href="/robots.txt" target="_blank" rel="noreferrer">robots.txt</a> keeps admin, cart and checkout out of Google.</li>
          <li><CheckIcon size={15} /> Product, breadcrumb, article and store structured data (rich results with price, stock and stars).</li>
          <li><CheckIcon size={15} /> Open Graph and Twitter cards for Facebook, WhatsApp and Messenger previews.</li>
          <li><CheckIcon size={15} /> Bangla URLs: a product called “হিমসাগর আম” gets <code>/product/হিমসাগর-আম</code>.</li>
        </ul>
      </div>
    </>
  );
}
