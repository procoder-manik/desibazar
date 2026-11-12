'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './Providers';
import { FreeBar, QtyStepper } from './CartDrawer';
import { ShieldIcon, TagIcon, TruckIcon } from './Icons';
import { api, taka } from '@/lib/api';
import { DIVISIONS, PAY_LABELS, validPhone, zoneFor } from '@/lib/bd';

// Shared by the /checkout page and the quick-checkout pop-up.
export default function CheckoutForm({ compact = false, onDone }) {
  const { cart, setQty, user, token, clearCart, toast, settings, feeFor } = useApp();
  const router = useRouter();
  const zones = settings.shipping.zones;
  const pay = settings.payments;
  const methods = useMemo(() => [
    pay.cod && 'cod', pay.sslcommerz && 'sslcommerz', pay.bkash && 'bkash',
    ...Object.keys(pay.manual || {}).map((k) => `manual_${k}`),
  ].filter(Boolean), [pay]);

  const [f, setF] = useState({ name: '', phone: '', email: '', district: '', zone: zones[0]?.key || '', address: '', note: '' });
  const [method, setMethod] = useState(methods[0] || 'cod');
  const [trx, setTrx] = useState({ sender: '', trxId: '' });
  const [save, setSave] = useState(true);
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = coupon?.discount || 0;
  const fee = feeFor(subtotal, f.zone);
  const total = subtotal - discount + fee;
  const manualNo = method.startsWith('manual_') ? pay.manual?.[method.replace('manual_', '')] : null;

  useEffect(() => {
    if (user) setF((x) => ({ ...x, name: x.name || user.name || '', phone: x.phone || user.phone || '', email: x.email || user.email || '', address: x.address || user.address || '' }));
  }, [user]);
  useEffect(() => { if (!methods.includes(method) && methods[0]) setMethod(methods[0]); }, [methods, method]);
  useEffect(() => { setCoupon(null); setCouponMsg(''); }, [subtotal]);

  const on = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pickDistrict = (e) => {
    const district = e.target.value;
    const z = zoneFor(district);
    setF({ ...f, district, zone: zones.some((x) => x.key === z) ? z : zones[zones.length - 1]?.key });
  };

  const applyCoupon = async () => {
    setCouponMsg('');
    try { const r = await api('/coupons/validate', { method: 'POST', body: { code, subtotal } }); setCoupon(r); setCouponMsg(`${r.code} applied, you save ${taka(r.discount)}`); }
    catch (e) { setCoupon(null); setCouponMsg(e.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validPhone(f.phone)) return setError('Enter a valid mobile number, e.g. 01712345678');
    if (manualNo && (!trx.sender || !trx.trxId)) return setError('Enter the number you paid from and the transaction ID');
    setBusy(true);
    try {
      const o = await api('/orders', { method: 'POST', token, body: {
        items: cart.map((i) => ({ product: i._id, variant: i.variant, qty: i.qty })), shipping: f, coupon: coupon?.code,
        paymentMethod: method, saveAddress: save, ...(manualNo ? trx : {}),
      } });
      clearCart();
      onDone?.();
      if (method === 'sslcommerz' || method === 'bkash') {
        toast('Redirecting to secure payment...');
        const r = await api(`/payments/${method}/init`, { method: 'POST', token, body: { orderId: o._id, key: o.accessKey } });
        window.location.href = r.url;
        return;
      }
      toast('Order placed successfully');
      router.push(`/orders/${o._id}?key=${o.accessKey}&placed=1`);
    } catch (err) { setError(err.message); setBusy(false); }
  };

  if (!cart.length) return <div className="empty"><h3>Your bag is empty</h3><Link href="/shop" className="btn" onClick={onDone}>Shop now</Link></div>;

  return (
    <form className={'cform' + (compact ? ' compact' : '')} onSubmit={submit}>
      <div className="cf-main">
        <section className="cf-sec">
          <h3><span className="num">1</span>Delivery details</h3>
          {!token && <p className="fine left">Checking out as a guest. <Link className="link" href="/login?next=/checkout" onClick={onDone}>Sign in</Link> to save your address.</p>}
          <div className="fields">
            <label>Full name<input required autoComplete="name" value={f.name} onChange={on('name')} /></label>
            <label>Mobile number<input required type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={on('phone')} /></label>
            <label>District
              <select required value={f.district} onChange={pickDistrict}>
                <option value="">Choose district</option>
                {Object.entries(DIVISIONS).map(([div, ds]) => <optgroup key={div} label={div}>{ds.map((d) => <option key={d}>{d}</option>)}</optgroup>)}
              </select>
            </label>
            <label>Email<input type="email" autoComplete="email" placeholder="Optional, for your receipt" value={f.email} onChange={on('email')} /></label>
            <label className="full">Full address<textarea required rows={compact ? 2 : 3} autoComplete="street-address" placeholder="House, road, area, thana" value={f.address} onChange={on('address')} /></label>
            {!compact && <label className="full">Note for the rider<input placeholder="Optional, e.g. call before arriving" value={f.note} onChange={on('note')} /></label>}
          </div>
          {token && <label className="f-row inline"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /><span className="box" /><span className="lbl">Save this address to my account</span></label>}
        </section>

        <section className="cf-sec">
          <h3><span className="num">2</span>Delivery</h3>
          <div className="options">
            {zones.map((z) => (
              <label key={z.key} className={'option' + (f.zone === z.key ? ' on' : '')}>
                <input type="radio" name="zone" value={z.key} checked={f.zone === z.key} onChange={on('zone')} />
                <TruckIcon size={19} />
                <span><b>{z.name}</b><small>{z.eta}</small></span>
                <em>{feeFor(subtotal, z.key) ? taka(z.fee) : 'Free'}</em>
              </label>
            ))}
          </div>
        </section>

        <section className="cf-sec">
          <h3><span className="num">3</span>Payment</h3>
          <div className="options">
            {methods.map((m) => (
              <label key={m} className={'option' + (method === m ? ' on' : '')}>
                <input type="radio" name="pay" value={m} checked={method === m} onChange={() => setMethod(m)} />
                <span className={'paylogo ' + m.replace('manual_', '')}>{m === 'cod' ? '৳' : m === 'sslcommerz' ? 'SSL' : m.replace('manual_', '').slice(0, 1).toUpperCase()}</span>
                <span><b>{PAY_LABELS[m]}</b><small>{m === 'cod' ? 'Pay the rider when it arrives' : m === 'sslcommerz' ? 'Visa, Mastercard, Amex, bKash, Nagad, Rocket, net banking' : m === 'bkash' ? 'Pay instantly with your bKash account' : `Send money to ${pay.manual[m.replace('manual_', '')]}`}</small></span>
              </label>
            ))}
          </div>
          {manualNo && (
            <div className="manual-pay">
              <p>Send <b>{taka(total)}</b> to <b className="mono-num">{manualNo}</b> using <b>Send Money</b>, then enter the details below. We confirm your order after checking the payment.</p>
              <div className="fields">
                <label>Paid from number<input required inputMode="tel" placeholder="01XXXXXXXXX" value={trx.sender} onChange={(e) => setTrx({ ...trx, sender: e.target.value })} /></label>
                <label>Transaction ID<input required placeholder="e.g. 9JH7K2L1MN" value={trx.trxId} onChange={(e) => setTrx({ ...trx, trxId: e.target.value.toUpperCase() })} /></label>
              </div>
            </div>
          )}
        </section>
      </div>

      <aside className="cf-side">
        <div className="summary">
          <h4>Order summary</h4>
          <div className="mini-items">
            {cart.map((i) => (
              <div key={i.key} className="mini">
                <span className="mimg"><img src={i.image} alt="" /></span>
                <span className="mname">{i.name}<small>{i.variantLabel || i.unit}</small>{compact && <QtyStepper small value={i.qty} max={i.stock} onChange={(q) => setQty(i.key, q)} />}</span>
                <b>{taka(i.price * i.qty)}</b>
              </div>
            ))}
          </div>
          <div className="coupon">
            <div className="coupon-row">
              <TagIcon size={17} />
              <input placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} aria-label="Coupon code" />
              <button type="button" className="btn sm" onClick={applyCoupon} disabled={!code}>Apply</button>
            </div>
            {couponMsg && <p className={coupon ? 'ok' : 'err'}>{couponMsg}</p>}
          </div>
          <FreeBar subtotal={subtotal} />
          <div className="srow"><span>Subtotal</span><b>{taka(subtotal)}</b></div>
          {discount > 0 && <div className="srow ok"><span>Discount ({coupon.code})</span><b>−{taka(discount)}</b></div>}
          <div className="srow"><span>Delivery</span><b>{fee ? taka(fee) : 'Free'}</b></div>
          <div className="srow total"><span>Total</span><b>{taka(total)}</b></div>
          {error && <p className="err boxed">{error}</p>}
          <button className="btn lg block" disabled={busy}>
            {busy ? 'Placing order...' : method === 'sslcommerz' || method === 'bkash' ? `Pay ${taka(total)}` : `Place order · ${taka(total)}`}
          </button>
          <p className="fine"><ShieldIcon size={13} /> Secure checkout · 7-day easy returns</p>
        </div>
      </aside>
    </form>
  );
}
