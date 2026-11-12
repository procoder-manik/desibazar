'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../Providers';
import { QtyStepper } from '../CartDrawer';
import { CheckIcon, ShieldIcon, TagIcon, TruckIcon } from '../Icons';
import AdvancePay from '../AdvancePay';
import { track, gaItem } from '../Analytics';
import { api, taka } from '@/lib/api';
import { PAY_LABELS, validPhone } from '@/lib/bd';
import { vList, vPrice } from '@/lib/product';
import { saveLead } from '@/lib/attribution';
import { advanceDue, placeOrder } from '@/lib/placeOrder';

// Order form labels in Bangla or English (Admin → Landing pages → Checkout → Language).
const T = {
  bn: {
    pick: 'প্রোডাক্ট সিলেক্ট করুন', pickOne: 'একটি প্যাকেজ বেছে নিন', details: 'আপনার তথ্য দিন', name: 'আপনার নাম', phone: 'মোবাইল নাম্বার', address: 'সম্পূর্ণ ঠিকানা (বাসা, রোড, থানা, জেলা)',
    shipping: 'ডেলিভারি এরিয়া', payment: 'পেমেন্ট', summary: 'আপনার অর্ডার', subtotal: 'সাবটোটাল', delivery: 'ডেলিভারি চার্জ', free: 'ফ্রি', total: 'মোট', coupon: 'কুপন কোড', apply: 'প্রয়োগ',
    payNow: 'এখন পরিশোধ (অগ্রিম)', payRider: 'ডেলিভারির সময় দিবেন', none: 'অন্তত একটি প্রোডাক্ট সিলেক্ট করুন', phoneErr: 'সঠিক মোবাইল নাম্বার দিন (01XXXXXXXXX)', placing: 'অর্ডার হচ্ছে...',
    secure: 'নিরাপদ অর্ডার · ক্যাশ অন ডেলিভারি', option: 'অপশন', qty: 'পরিমাণ', advErr: (a) => `${a} অগ্রিম পাঠিয়ে নাম্বার ও ট্রানজেকশন আইডি দিন`,
  },
  en: {
    pick: 'Choose your products', pickOne: 'Choose one package', details: 'Your details', name: 'Your name', phone: 'Mobile number', address: 'Full address (house, road, thana, district)',
    shipping: 'Delivery area', payment: 'Payment', summary: 'Your order', subtotal: 'Subtotal', delivery: 'Delivery', free: 'Free', total: 'Total', coupon: 'Coupon code', apply: 'Apply',
    payNow: 'Pay now (advance)', payRider: 'Pay the rider', none: 'Select at least one product', phoneErr: 'Enter a valid mobile number (01XXXXXXXXX)', placing: 'Placing order...',
    secure: 'Secure order · Cash on delivery', option: 'Option', qty: 'Qty', advErr: (a) => `Send the ${a} advance and enter the number and transaction ID`,
  },
};

// The product's buyable price on this page: the page's offer price, else the chosen option's price.
export function linePrice(item, variant) {
  const p = item.product;
  const v = variant || null;
  const now = item.price > 0 ? item.price : vPrice(p, v);
  const listed = item.price > 0 ? vList(p, v) || vPrice(p, v) : vList(p, v);
  return { now, was: listed && listed > now ? listed : null };
}

export default function OnePageCheckout({ lp }) {
  const { settings, token, toast, user } = useApp();
  const router = useRouter();
  const c = lp.checkout || {};
  const t = T[c.lang === 'en' ? 'en' : 'bn'];
  const single = c.mode === 'single';
  const items = lp.products || [];
  const pay = settings.payments;
  const zones = settings.shipping.zones;
  const methods = useMemo(() => [pay.cod && 'cod', pay.bkash && 'bkash', pay.sslcommerz && 'sslcommerz', ...Object.keys(pay.manual || {}).map((k) => `manual_${k}`)].filter(Boolean), [pay]);

  const firstVariant = (it) => (it.variant ? it.product.variants?.find((v) => String(v._id) === String(it.variant)) : it.product.variants?.find((v) => v.stock > 0)) || null;
  const [sel, setSel] = useState(() => Object.fromEntries(items.map((it, i) => [it._id, {
    on: single ? (it.selected || (!items.some((x) => x.selected) && i === 0)) : !!it.selected || items.length === 1,
    qty: it.qty || 1, variant: firstVariant(it),
  }])));
  const [f, setF] = useState({ name: '', phone: '', address: '', zone: zones[0]?.key || '' });
  const [method, setMethod] = useState(methods[0] || 'cod');
  const [trx, setTrx] = useState({ sender: '', trxId: '' });
  const [adv, setAdv] = useState({});
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const began = useRef(false);

  useEffect(() => { if (user) setF((x) => ({ ...x, name: x.name || user.name || '', phone: x.phone || user.phone || '', address: x.address || user.address || '' })); }, [user]);

  const lines = items.filter((it) => sel[it._id]?.on).map((it) => {
    const s = sel[it._id];
    const { now } = linePrice(it, s.variant);
    return { it, product: it.product._id, _id: it.product._id, name: it.label || it.product.name, variant: s.variant?._id, variantLabel: s.variant?.label, qty: s.qty, price: now, stock: s.variant ? s.variant.stock : it.product.stock };
  });
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = coupon?.discount || 0;
  const zone = zones.find((z) => z.key === f.zone) || zones[0];
  const fee = !lines.length || c.freeDelivery ? 0 : settings.shipping.freeOver && subtotal >= settings.shipping.freeOver ? 0 : zone?.fee || 0;
  const total = Math.max(0, subtotal - discount) + fee;
  const advance = advanceDue(pay, method, fee, total);
  const manualNo = method.startsWith('manual_') ? pay.manual?.[method.replace('manual_', '')] : null;

  useEffect(() => { setCoupon(null); setCouponMsg(''); }, [subtotal]);
  useEffect(() => { saveLead({ ...f, landing: lp._id, items: lines }); }, [f.name, f.phone, f.address, subtotal]); // eslint-disable-line react-hooks/exhaustive-deps
  const startOnce = () => { if (!began.current) { began.current = true; track('begin_checkout', { value: subtotal, items: lines.map(gaItem) }); } };

  const toggle = (id) => setSel((s) => (single
    ? Object.fromEntries(Object.entries(s).map(([k, v]) => [k, { ...v, on: k === id }]))
    : { ...s, [id]: { ...s[id], on: !s[id].on } }));
  const patch = (id, p) => setSel((s) => ({ ...s, [id]: { ...s[id], ...p } }));
  const on = (k) => (e) => { startOnce(); setF({ ...f, [k]: e.target.value }); };

  const applyCoupon = async () => {
    setCouponMsg('');
    try { const r = await api('/coupons/validate', { method: 'POST', body: { code, subtotal } }); setCoupon(r); setCouponMsg(`${r.code} ✓ −${taka(r.discount)}`); }
    catch (e) { setCoupon(null); setCouponMsg(e.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!lines.length) return setError(t.none);
    if (!validPhone(f.phone)) return setError(t.phoneErr);
    if (manualNo && (!trx.sender || !trx.trxId)) return setError(t.advErr(taka(total)));
    const advMethod = adv.method || (advance ? [...Object.keys(pay.manual || {}).map((k) => `manual_${k}`), pay.bkash && 'bkash', pay.sslcommerz && 'sslcommerz'].filter(Boolean)[0] : '');
    if (advance && advMethod?.startsWith('manual_') && (!adv.sender || !adv.trxId)) return setError(t.advErr(taka(advance)));
    setBusy(true);
    try {
      await placeOrder({
        token, toast, router,
        body: {
          items: lines.map((l) => ({ product: l.product, variant: l.variant, qty: l.qty })),
          shipping: { name: f.name, phone: f.phone, address: f.address, zone: f.zone, district: '' }, coupon: coupon?.code, paymentMethod: method,
          ...(manualNo ? trx : {}), ...(advance ? { advanceMethod: advMethod, advanceSender: adv.sender, advanceTrxId: adv.trxId } : {}),
        },
        sourceExtra: { kind: 'landing', landing: lp._id },
      });
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <form className="opc glass" onSubmit={submit} id="order">
      <div className="opc-head">
        <h2>{c.title || 'Fill in the form to order'}</h2>
        {c.note && <p className="opc-note">{c.note}</p>}
      </div>

      <section className="opc-sec">
        <h3>{single ? t.pickOne : t.pick}</h3>
        <div className="opc-products">
          {items.map((it) => {
            const s = sel[it._id];
            const p = it.product;
            const { now, was } = linePrice(it, s.variant);
            const stock = s.variant ? s.variant.stock : p.stock;
            const out = stock < 1;
            const choose = !it.variant && p.variants?.length > 0;
            return (
              <div key={it._id} className={'opc-item' + (s.on ? ' on' : '') + (out ? ' out' : '')}>
                <label className="opc-pick">
                  <input type={single ? 'radio' : 'checkbox'} name="opc-pick" checked={s.on} disabled={out} onChange={() => { startOnce(); toggle(it._id); }} />
                  <span className="opc-tick">{s.on && <CheckIcon size={14} />}</span>
                  <img src={s.variant?.image || p.image} alt="" />
                  <span className="opc-name">
                    {it.badge && <em className="opc-badge">{it.badge}</em>}
                    <b>{it.label || p.name}</b>
                    <span className="opc-price">{taka(now)}{was && <s>{taka(was)}</s>}{out && <small className="err"> · Out of stock</small>}</span>
                  </span>
                </label>
                {(choose || c.allowQty !== false) && s.on && (
                  <div className="opc-opts">
                    {choose && (
                      <select aria-label={t.option} value={s.variant?._id || ''} onChange={(e) => patch(it._id, { variant: p.variants.find((v) => String(v._id) === e.target.value) })}>
                        {p.variants.map((v) => <option key={v._id} value={v._id} disabled={v.stock < 1}>{v.label}{it.price > 0 ? '' : ` · ${taka(vPrice(p, v))}`}{v.stock < 1 ? ' (sold out)' : ''}</option>)}
                      </select>
                    )}
                    {c.allowQty !== false && <QtyStepper small value={s.qty} max={stock} onChange={(q) => patch(it._id, { qty: Math.max(1, Math.min(q, stock || 1)) })} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="opc-grid">
        <section className="opc-sec">
          <h3>{t.details}</h3>
          <div className="fields one">
            <label>{t.name}<input required autoComplete="name" value={f.name} onChange={on('name')} /></label>
            <label>{t.phone}<input required type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={on('phone')} /></label>
            <label>{t.address}<textarea required rows={2} autoComplete="street-address" value={f.address} onChange={on('address')} /></label>
          </div>
          {!c.freeDelivery && zones.length > 1 && (
            <>
              <h3 style={{ marginTop: 16 }}>{t.shipping}</h3>
              <div className="options">
                {zones.map((z) => (
                  <label key={z.key} className={'option' + (f.zone === z.key ? ' on' : '')}>
                    <input type="radio" name="opc-zone" checked={f.zone === z.key} onChange={() => setF({ ...f, zone: z.key })} />
                    <TruckIcon size={18} /><span><b>{z.name}</b><small>{z.eta}</small></span><em>{taka(z.fee)}</em>
                  </label>
                ))}
              </div>
            </>
          )}
          {methods.length > 1 && (
            <>
              <h3 style={{ marginTop: 16 }}>{t.payment}</h3>
              <div className="seg wrap">
                {methods.map((m) => <button type="button" key={m} className={method === m ? 'on' : ''} onClick={() => setMethod(m)}>{PAY_LABELS[m] || m}</button>)}
              </div>
            </>
          )}
          {advance > 0 && <AdvancePay pay={pay} amount={advance} value={adv} onChange={setAdv} />}
          {manualNo && (
            <div className="manual-pay">
              <p>Send <b>{taka(total)}</b> to <b className="mono-num">{manualNo}</b> (Send Money):</p>
              <div className="fields">
                <label>Paid from<input required inputMode="tel" placeholder="01XXXXXXXXX" value={trx.sender} onChange={(e) => setTrx({ ...trx, sender: e.target.value })} /></label>
                <label>Transaction ID<input required value={trx.trxId} onChange={(e) => setTrx({ ...trx, trxId: e.target.value.toUpperCase() })} /></label>
              </div>
            </div>
          )}
        </section>

        <aside className="opc-sec opc-summary">
          <h3>{t.summary}</h3>
          <table className="opc-table">
            <tbody>
              {lines.map((l) => <tr key={l.it._id}><td>{l.name}{l.variantLabel && <small> · {l.variantLabel}</small>} <small>× {l.qty}</small></td><td>{taka(l.price * l.qty)}</td></tr>)}
              {!lines.length && <tr><td colSpan={2} className="muted">{t.none}</td></tr>}
            </tbody>
          </table>
          {c.coupon !== false && (
            <div className="coupon">
              <div className="coupon-row">
                <TagIcon size={17} />
                <input placeholder={t.coupon} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} aria-label={t.coupon} />
                <button type="button" className="btn sm" onClick={applyCoupon} disabled={!code || !subtotal}>{t.apply}</button>
              </div>
              {couponMsg && <p className={coupon ? 'ok' : 'err'}>{couponMsg}</p>}
            </div>
          )}
          <div className="srow"><span>{t.subtotal}</span><b>{taka(subtotal)}</b></div>
          {discount > 0 && <div className="srow ok"><span>{coupon.code}</span><b>−{taka(discount)}</b></div>}
          <div className="srow"><span>{t.delivery}</span><b>{fee ? taka(fee) : t.free}</b></div>
          <div className="srow total"><span>{t.total}</span><b>{taka(total)}</b></div>
          {advance > 0 && <><div className="srow ok"><span>{t.payNow}</span><b>{taka(advance)}</b></div><div className="srow"><span>{t.payRider}</span><b>{taka(total - advance)}</b></div></>}
          {error && <p className="err boxed">{error}</p>}
          <button className="btn lg block opc-btn" disabled={busy}>{busy ? t.placing : `${c.button || 'Confirm order'} · ${taka(total)}`}</button>
          <p className="fine"><ShieldIcon size={13} /> {t.secure}</p>
        </aside>
      </div>
    </form>
  );
}
