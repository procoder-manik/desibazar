'use client';
import { useEffect, useState } from 'react';
import { useApp } from '../Providers';
import { CheckIcon, CloseIcon, PlusIcon, TrashIcon } from '../Icons';
import { api } from '@/lib/api';
import { applyAppearance, CARDS, CATEGORIES, FOOTERS, HEADERS, HEROES, LISTINGS, SHAPES, THEMES } from '@/lib/theme';

// One save button per section; every section edits a slice of the settings document.
export function useSection(full, slice) {
  const { token, toast, setSettings } = useApp();
  const [v, setV] = useState(full[slice]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => setV(full[slice]), [full, slice]);
  const dirty = JSON.stringify(v) !== JSON.stringify(full[slice]);
  const save = async (onSaved) => {
    setBusy(true); setErr('');
    try {
      const pub = await api('/settings', { method: 'PUT', token, body: { [slice]: v } });
      setSettings(pub); onSaved?.(v); toast('Settings saved');
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return { v, setV, busy, err, dirty, save };
}

export function SaveBar({ s, onSaved, onReset }) {
  return (
    <div className="savebar">
      {s.err && <p className="err">{s.err}</p>}
      {s.dirty && <span className="muted">Unsaved changes</span>}
      {onReset && s.dirty && <button className="btn ghost sm" onClick={onReset}>Discard</button>}
      <button className="btn" disabled={!s.dirty || s.busy} onClick={() => s.save(onSaved)}>{s.busy ? 'Saving…' : 'Save changes'}</button>
    </div>
  );
}

const Status = ({ ok, yes = 'Connected', no = 'Not configured' }) => <span className={'pill-state ' + (ok ? 'ok' : 'off')}>{ok ? <CheckIcon size={13} /> : <CloseIcon size={13} />}{ok ? yes : no}</span>;

export function Appearance({ full, onSaved }) {
  const s = useSection(full, 'appearance');
  const a = s.v;
  const set = (patch) => { const next = { ...a, ...patch }; s.setV(next); applyAppearance(next); };
  const reset = () => { s.setV(full.appearance); applyAppearance(full.appearance); };
  // leaving the page without saving restores the saved look
  useEffect(() => () => applyAppearance(full.appearance), [full.appearance]);

  return (
    <>
      <p className="muted lead">Changes preview live across the whole site. Every theme keeps the frosted glass finish.</p>
      <div className="glass co-card">
        <h3>Colour theme</h3>
        <div className="theme-grid">
          {Object.entries(THEMES).map(([k, t]) => (
            <button key={k} className={'theme-card' + (a.theme === k ? ' on' : '')} onClick={() => set({ theme: k, accent: '' })}>
              <span className="sw">{t.swatch.map((c) => <i key={c} style={{ background: c }} />)}</span>
              <b>{t.label}</b>{a.theme === k && <CheckIcon size={16} />}
            </button>
          ))}
        </div>
        <div className="accent-row">
          <label>Custom accent colour
            <span className="colorpick">
              <input type="color" value={a.accent || THEMES[a.theme]?.accent || '#2f4a3a'} onChange={(e) => set({ accent: e.target.value })} />
              <input value={a.accent || ''} placeholder={THEMES[a.theme]?.accent} onChange={(e) => set({ accent: e.target.value })} maxLength={7} />
            </span>
          </label>
          {a.accent && <button className="btn ghost sm" onClick={() => set({ accent: '' })}>Use theme colour</button>}
        </div>
      </div>

      <div className="bag-grid even" style={{ marginTop: 16 }}>
        <div className="glass co-card">
          <h3>Card & button shape</h3>
          <div className="shape-grid">
            {Object.entries(SHAPES).map(([k, label]) => (
              <button key={k} className={'shape-card ' + k + (a.shape === k ? ' on' : '')} onClick={() => set({ shape: k })}>
                <span className="demo"><i /><em /></span><b>{label}</b>
              </button>
            ))}
          </div>
          <label className="range">Glass blur <b>{a.glass ?? 24}px</b>
            <input type="range" min="0" max="40" value={a.glass ?? 24} onChange={(e) => set({ glass: +e.target.value })} />
          </label>
        </div>
        <div className="glass co-card">
          <h3>Home hero layout</h3>
          <div className="hero-grid">
            {Object.entries(HEROES).map(([k, label]) => (
              <button key={k} className={'hero-opt ' + k + (a.hero === k ? ' on' : '')} onClick={() => set({ hero: k })}>
                <span className="demo"><i /><i /><i /></span><b>{label}</b>
              </button>
            ))}
          </div>
          <p className="fine left">The hero slides through your Featured products. Edit its text in Content.</p>
        </div>
      </div>

      <div className="bag-grid even three" style={{ marginTop: 16 }}>
        <div className="glass co-card">
          <h3>Header style</h3>
          <div className="opt-list">
            {Object.entries(HEADERS).map(([k, label]) => (
              <button key={k} className={'opt-card' + (a.header === k ? ' on' : '')} onClick={() => set({ header: k })}>
                <span className={'mini-hdr ' + k}><i /><i /><i /></span><b>{label}</b>
              </button>
            ))}
          </div>
        </div>
        <div className="glass co-card">
          <h3>Product card</h3>
          <div className="opt-list">
            {Object.entries(CARDS).map(([k, label]) => (
              <button key={k} className={'opt-card' + (a.card === k ? ' on' : '')} onClick={() => set({ card: k })}>
                <span className={'mini-card ' + k}><i /><em /></span><b>{label}</b>
              </button>
            ))}
          </div>
        </div>
        <div className="glass co-card">
          <h3>Product lists on home</h3>
          <div className="opt-list">
            {Object.entries(LISTINGS).map(([k, label]) => (
              <button key={k} className={'opt-card' + (a.listing === k ? ' on' : '')} onClick={() => set({ listing: k })}>
                <span className={'mini-list ' + k}><i /><i /><i /><i /></span><b>{label}</b>
              </button>
            ))}
          </div>
          <p className="fine left">Carousel turns every product row into a swipeable slider.</p>
        </div>
      </div>
      <div className="bag-grid even" style={{ marginTop: 16 }}>
        <div className="glass co-card">
          <h3>Category section on home</h3>
          <div className="seg">{Object.entries(CATEGORIES).map(([k, l]) => <button key={k} className={(a.categories || 'carousel') === k ? 'on' : ''} onClick={() => set({ categories: k })}>{l}</button>)}</div>
        </div>
        <div className="glass co-card">
          <h3>Footer style</h3>
          <div className="seg">{Object.entries(FOOTERS).map(([k, l]) => <button key={k} className={(a.footer || 'classic') === k ? 'on' : ''} onClick={() => set({ footer: k })}>{l}</button>)}</div>
        </div>
        <div className="glass co-card">
          <div className="pay-row">
            <div><b>Floating bag button</b><small>A bag button on the right edge of every page with the item count and total. Opens the bag in one click.</small></div>
            <label className="switch"><input type="checkbox" checked={a.floatingCart !== false} onChange={(e) => set({ floatingCart: e.target.checked })} /><span /></label>
          </div>
        </div>
      </div>
      <SaveBar s={s} onSaved={onSaved} onReset={reset} />
    </>
  );
}

export function Shipping({ full, onSaved }) {
  const s = useSection(full, 'shipping');
  const sh = s.v;
  const setZone = (i, patch) => s.setV({ ...sh, zones: sh.zones.map((z, k) => (k === i ? { ...z, ...patch } : z)) });
  const couriers = full.couriers;

  return (
    <>
      <div className="glass co-card">
        <div className="card-head"><h3>Delivery zones & fees</h3>
          <button className="btn ghost sm" onClick={() => s.setV({ ...sh, zones: [...sh.zones, { key: 'zone' + (sh.zones.length + 1), name: 'New zone', fee: 100, eta: '2-3 days', active: true }] })}><PlusIcon size={15} /> Add zone</button>
        </div>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Zone name</th><th>Key</th><th>Fee (৳)</th><th>Delivery time</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {sh.zones.map((z, i) => (
                <tr key={i}>
                  <td><input value={z.name} onChange={(e) => setZone(i, { name: e.target.value })} /></td>
                  <td><input className="cell" value={z.key} onChange={(e) => setZone(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} /></td>
                  <td><input className="cell" type="number" min="0" value={z.fee} onChange={(e) => setZone(i, { fee: +e.target.value })} /></td>
                  <td><input className="cell wide" value={z.eta} onChange={(e) => setZone(i, { eta: e.target.value })} /></td>
                  <td><label className="switch"><input type="checkbox" checked={z.active !== false} onChange={(e) => setZone(i, { active: e.target.checked })} /><span /></label></td>
                  <td><button className="iconbtn" onClick={() => s.setV({ ...sh, zones: sh.zones.filter((_, k) => k !== i) })} aria-label="Remove zone"><TrashIcon size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fine left">Checkout picks <code>dhaka</code> for Dhaka district, <code>suburb</code> for Gazipur and Narayanganj, and <code>outside</code> for every other district. Customers can still change the zone.</p>
        <div className="fields" style={{ marginTop: 14 }}>
          <label>Free delivery over (৳) <small>0 turns it off</small><input type="number" min="0" value={sh.freeOver} onChange={(e) => s.setV({ ...sh, freeOver: +e.target.value })} /></label>
        </div>
      </div>
      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Couriers</h3>
        <div className="courier-grid">
          {couriers.map((c) => (
            <div key={c.key} className="courier-card">
              <b>{c.name}</b>
              {c.api ? <Status ok={full.integrations.steadfast} yes="API connected" no="API keys missing" /> : <span className="pill-state">Manual tracking</span>}
            </div>
          ))}
        </div>
        <p className="fine left">Steadfast orders are booked from the order panel in one click once <code>STEADFAST_API_KEY</code> and <code>STEADFAST_SECRET_KEY</code> are in <code>backend/.env</code>. For other couriers, book in their merchant panel and paste the consignment ID on the order.</p>
      </div>
      <SaveBar s={s} onSaved={onSaved} />
    </>
  );
}

export function Payments({ full, onSaved }) {
  const s = useSection(full, 'payments');
  const p = s.v;
  const ig = full.integrations;
  const row = (key, title, desc, status) => (
    <div className="pay-row">
      <div><b>{title}</b><small>{desc}</small></div>
      {status}
      <label className="switch"><input type="checkbox" checked={!!p[key]} onChange={(e) => s.setV({ ...p, [key]: e.target.checked })} /><span /></label>
    </div>
  );

  return (
    <>
      <div className="glass co-card">
        <h3>Payment methods</h3>
        {row('cod', 'Cash on delivery', 'Customer pays the rider. Marked paid automatically when delivered.', <span className="pill-state ok"><CheckIcon size={13} />Ready</span>)}
        {row('sslcommerz', 'SSLCommerz', `Cards, bKash, Nagad, Rocket, Upay and net banking on one hosted page${ig.sslSandbox ? ' (sandbox mode)' : ''}.`, <Status ok={ig.sslcommerz} />)}
        {row('bkash', 'bKash checkout', `Direct bKash tokenized payment${ig.bkashSandbox ? ' (sandbox mode)' : ''}.`, <Status ok={ig.bkash} />)}
        {row('manual', 'Send Money (manual)', 'Customer sends money to your number and enters the transaction ID. You verify it in Orders.', <span className="pill-state">Manual</span>)}
      </div>
      <div className="glass co-card" style={{ marginTop: 16 }}>
        <div className="pay-row">
          <div><b>Cash on delivery: take an advance first</b><small>The customer pays the delivery charge (or a fixed amount) by bKash / Nagad / Rocket before the order is confirmed, and the rest to the rider. Cuts fake orders and returns.</small></div>
          <span className={'pill-state' + (p.codAdvance?.enabled ? ' ok' : '')}>{p.codAdvance?.enabled ? 'On' : 'Off'}</span>
          <label className="switch"><input type="checkbox" checked={!!p.codAdvance?.enabled} onChange={(e) => s.setV({ ...p, codAdvance: { type: 'delivery', amount: 0, note: '', ...p.codAdvance, enabled: e.target.checked } })} /><span /></label>
        </div>
        {p.codAdvance?.enabled && (
          <div className="fields" style={{ marginTop: 12 }}>
            <label>Advance amount
              <select value={p.codAdvance.type || 'delivery'} onChange={(e) => s.setV({ ...p, codAdvance: { ...p.codAdvance, type: e.target.value } })}>
                <option value="delivery">The delivery charge</option><option value="fixed">A fixed amount</option>
              </select>
            </label>
            {p.codAdvance.type === 'fixed' && <label>Fixed amount (৳)<input type="number" min="1" value={p.codAdvance.amount || ''} onChange={(e) => s.setV({ ...p, codAdvance: { ...p.codAdvance, amount: +e.target.value } })} /></label>}
            <label className="full">Message at checkout <small className="muted">(optional)</small><input value={p.codAdvance.note || ''} onChange={(e) => s.setV({ ...p, codAdvance: { ...p.codAdvance, note: e.target.value } })} placeholder="ডেলিভারি চার্জ অগ্রিম পরিশোধ করে অর্ডার কনফার্ম করুন। বাকি টাকা পণ্য হাতে পেয়ে দিবেন।" /></label>
            <p className="fine left full">Customers can pay the advance to the Send Money numbers below{ig.bkash || ig.sslcommerz ? ', or online with bKash / SSLCommerz' : ''}. Verify it in Orders (manual) or it is verified automatically (online). Orders with free delivery need no advance when the type is “delivery charge”.</p>
          </div>
        )}
      </div>
      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Send Money numbers</h3>
        <div className="fields three">
          {['bkash', 'nagad', 'rocket'].map((k) => (
            <label key={k}>{k[0].toUpperCase() + k.slice(1)} personal/merchant number
              <input inputMode="tel" placeholder="Leave empty to hide" value={p.manualNumbers?.[k] || ''} onChange={(e) => s.setV({ ...p, manualNumbers: { ...p.manualNumbers, [k]: e.target.value } })} />
            </label>
          ))}
        </div>
      </div>
      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Connecting gateways</h3>
        <p className="muted">Gateway credentials are kept in <code>backend/.env</code>, never in the database. Add them and restart the API:</p>
        <pre className="envblock">{`SSLCZ_STORE_ID=your_store_id
SSLCZ_STORE_PASSWD=your_store_password
SSLCZ_SANDBOX=true        # false when you go live

BKASH_APP_KEY=...
BKASH_APP_SECRET=...
BKASH_USERNAME=...
BKASH_PASSWORD=...
BKASH_SANDBOX=true

API_URL=https://api.yourdomain.com   # public URL for payment callbacks`}</pre>
      </div>
      <SaveBar s={s} onSaved={onSaved} />
    </>
  );
}

export function Store({ full, onSaved }) {
  const s = useSection(full, 'store');
  const on = (k) => (e) => s.setV({ ...s.v, [k]: e.target.value });
  return (
    <>
      <div className="glass co-card">
        <h3>Store details</h3>
        <p className="muted">Shown in the header, footer and on every invoice.</p>
        <div className="fields">
          <label>Store name<input value={s.v.name} onChange={on('name')} /></label>
          <label>Tagline<input value={s.v.tagline} onChange={on('tagline')} /></label>
          <label>Phone<input value={s.v.phone} onChange={on('phone')} /></label>
          <label>Email<input type="email" value={s.v.email} onChange={on('email')} /></label>
          <label className="full">Address<textarea rows={2} value={s.v.address} onChange={on('address')} /></label>
        </div>
      </div>
      <SaveBar s={s} onSaved={onSaved} />
      <Marketing full={full} onSaved={onSaved} />
    </>
  );
}

// Tracking tags, live chat and floating chat buttons; the storefront loads whatever is filled in.
const TRACK_KEYS = ['gtmId', 'gaId', 'adsId', 'adsLabel', 'fbPixelId', 'fbCapiToken', 'fbTestCode', 'tiktokPixelId', 'clarityId', 'headScripts', 'chat', 'tawkProperty', 'tawkWidget', 'crispId', 'tidioKey', 'reveId', 'whatsapp', 'messenger'];
const CHAT_DEFAULTS = { chat: 'none', tawkWidget: 'default' };

function Marketing({ full, onSaved }) {
  const { user, token, toast, setSettings } = useApp();
  const base = { ...Object.fromEntries(TRACK_KEYS.map((k) => [k, CHAT_DEFAULTS[k] || ''])), ...(full.integrations || {}) };
  const [v, setV] = useState(base);
  const [s, setS] = useState({ busy: false, err: '' });
  useEffect(() => setV(base), [full]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setV({ ...v, [k]: k === 'headScripts' ? e.target.value : e.target.value.trim() });
  const changed = TRACK_KEYS.filter((k) => (v[k] || '') !== (base[k] || ''));
  // only send what changed; the Conversions API token is write-only
  const save = async () => {
    setS({ busy: true, err: '' });
    try {
      const pub = await api('/settings', { method: 'PUT', token, body: { integrations: Object.fromEntries(changed.map((k) => [k, v[k]])) } });
      setSettings(pub); toast('Tracking & chat saved'); setS({ busy: false, err: '' }); onSaved?.();
    } catch (e) { setS({ busy: false, err: e.message }); }
  };
  const owner = user?.role === 'admin';
  const Ok = ({ on }) => (on ? <span className="pill-state ok"><CheckIcon size={13} />On</span> : <span className="pill-state off">Off</span>);
  return (
    <>
      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Google</h3>
        <p className="muted">Page views, product views, add to bag, checkout and purchases are sent automatically to every tag you fill in.</p>
        <div className="fields">
          <label><span className="lbl-top">Google Tag Manager <Ok on={!!base.gtmId} /></span><input value={v.gtmId} onChange={set('gtmId')} placeholder="GTM-XXXXXXX" /></label>
          <label><span className="lbl-top">Google Analytics 4 <Ok on={!!base.gaId} /></span><input value={v.gaId} onChange={set('gaId')} placeholder="G-XXXXXXXXXX" /></label>
          <label><span className="lbl-top">Google Ads conversion ID <Ok on={!!base.adsId} /></span><input value={v.adsId} onChange={set('adsId')} placeholder="AW-123456789" /></label>
          <label>Google Ads purchase label<input value={v.adsLabel} onChange={set('adsLabel')} placeholder="AbC-D_efG123" /></label>
          <p className="fine left full">Using Tag Manager for GA4 too? Leave the GA4 box empty so visits are not counted twice. Every event is also pushed to <code>dataLayer</code> in the GA4 e-commerce format for your GTM tags.</p>
        </div>
      </div>
      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Meta (Facebook & Instagram)</h3>
        <div className="fields">
          <label><span className="lbl-top">Pixel ID <Ok on={!!base.fbPixelId} /></span><input value={v.fbPixelId} onChange={set('fbPixelId')} placeholder="123456789012345" /></label>
          <label><span className="lbl-top">Conversions API access token <Ok on={!!base.fbCapiSet} /></span><input type="password" autoComplete="off" value={v.fbCapiToken} onChange={set('fbCapiToken')} placeholder={base.fbCapiSet ? '•••••• saved (type to replace)' : 'Events Manager → Settings → Generate access token'} /></label>
          <label>Test event code <small className="muted">(only while testing)</small><input value={v.fbTestCode} onChange={set('fbTestCode')} placeholder="TEST12345" /></label>
          <p className="fine left full">With the access token, every purchase is also sent from the server, so ads keep getting conversions when the browser blocks the pixel. Both carry the same event ID, so Meta counts each order once.</p>
        </div>
      </div>
      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Other tracking</h3>
        <div className="fields">
          <label><span className="lbl-top">TikTok Pixel ID <Ok on={!!base.tiktokPixelId} /></span><input value={v.tiktokPixelId} onChange={set('tiktokPixelId')} placeholder="CABC123DEF456GHI789" /></label>
          <label><span className="lbl-top">Microsoft Clarity project ID<small className="muted"> (free heatmaps & recordings)</small> <Ok on={!!base.clarityId} /></span><input value={v.clarityId} onChange={set('clarityId')} placeholder="abc123xyz" /></label>
          <label className="full">Other head code <small className="muted">{owner ? '(any other tag, pasted as given; owner only)' : '(only the store owner can change this)'}</small>
            <textarea rows={3} value={v.headScripts} onChange={set('headScripts')} disabled={!owner} placeholder="<script>…</script>" spellCheck={false} />
          </label>
        </div>
      </div>
      <div className="glass co-card" style={{ marginTop: 16 }}>
        <h3>Live chat</h3>
        <p className="muted">Answer customers instantly from your phone. Pick one; each has a free plan or trial.</p>
        <div className="seg" style={{ marginBottom: 14 }}>
          {[['none', 'Off'], ['tidio', 'Tidio'], ['reve', 'REVE Chat'], ['tawk', 'tawk.to'], ['crisp', 'Crisp']].map(([k, l]) => <button key={k} className={v.chat === k ? 'on' : ''} style={{ textTransform: 'none' }} onClick={() => setV({ ...v, chat: k })}>{l}</button>)}
        </div>
        {v.chat === 'reve' && (
          <div className="fields one">
            <label>REVE Chat account ID<input value={v.reveId} onChange={set('reveId')} placeholder="e.g. 1234567" /></label>
            <p className="fine left">In REVE Chat: Settings → Website widget → Install code. Copy the number in <code>__revechat_account=&apos;…&apos;</code> and paste it here.</p>
          </div>
        )}
        {v.chat === 'tidio' && (
          <div className="fields one">
            <label>Tidio public key<input value={v.tidioKey} onChange={set('tidioKey')} placeholder="32-character key" /></label>
            <p className="fine left">In Tidio: Settings → Live chat → Installation → JavaScript. The script link looks like <code>code.tidio.co/YOUR_PUBLIC_KEY.js</code>; paste the part before <code>.js</code>.</p>
          </div>
        )}
        {v.chat === 'tawk' && (
          <div className="fields">
            <label>Property ID<input value={v.tawkProperty} onChange={set('tawkProperty')} placeholder="24-character code" /></label>
            <label>Widget ID<input value={v.tawkWidget} onChange={set('tawkWidget')} placeholder="default" /></label>
            <p className="fine left full">In tawk.to: Administration → Channels → Chat Widget → Direct chat link. The link looks like <code>tawk.to/chat/PROPERTY_ID/WIDGET_ID</code>.</p>
          </div>
        )}
        {v.chat === 'crisp' && (
          <div className="fields one"><label>Website ID<input value={v.crispId} onChange={set('crispId')} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label></div>
        )}
        <div className="fields" style={{ marginTop: 10 }}>
          <label>WhatsApp number <small>(floating button)</small><input value={v.whatsapp} onChange={set('whatsapp')} placeholder="8801711000000" /></label>
          <label>Facebook page username <small>(Messenger button)</small><input value={v.messenger} onChange={set('messenger')} placeholder="yourpage" /></label>
        </div>
      </div>
      <div className="savebar">
        {s.err && <p className="err">{s.err}</p>}
        {changed.length > 0 && <span className="muted">Unsaved changes</span>}
        <button className="btn" disabled={!changed.length || s.busy} onClick={save}>{s.busy ? 'Saving…' : 'Save tracking & chat'}</button>
      </div>
    </>
  );
}
