'use client';
import { taka } from '@/lib/api';
import { PAY_LABELS } from '@/lib/bd';
import { advanceMethods } from '@/lib/placeOrder';

// "Pay the delivery charge now" box shown under Cash on delivery when Admin → Payments → Advance is on.
export default function AdvancePay({ pay, amount, value, onChange }) {
  const methods = advanceMethods(pay);
  const m = value.method || methods[0];
  const number = m?.startsWith('manual_') ? pay.manual[m.replace('manual_', '')] : null;
  const set = (patch) => onChange({ ...value, method: m, ...patch });
  if (!amount) return null;
  return (
    <div className="advance-box">
      <div className="advance-head">
        <b>Pay {taka(amount)} now to confirm</b>
        <small>{pay.codAdvance?.note || `Cash on delivery orders are confirmed after the ${pay.codAdvance?.type === 'fixed' ? 'advance' : 'delivery charge'} is paid. You pay the rest to the rider.`}</small>
      </div>
      <div className="seg wrap">
        {methods.map((k) => <button type="button" key={k} className={m === k ? 'on' : ''} onClick={() => set({ method: k })}>{PAY_LABELS[k] || k}</button>)}
      </div>
      {number ? (
        <>
          <p className="fine left">Send <b>{taka(amount)}</b> to <b className="mono-num">{number}</b> with <b>Send Money</b>, then enter the details:</p>
          <div className="fields">
            <label>Paid from number<input required inputMode="tel" placeholder="01XXXXXXXXX" value={value.sender || ''} onChange={(e) => set({ sender: e.target.value })} /></label>
            <label>Transaction ID<input required placeholder="e.g. 9JH7K2L1MN" value={value.trxId || ''} onChange={(e) => set({ trxId: e.target.value.toUpperCase() })} /></label>
          </div>
        </>
      ) : m ? <p className="fine left">You will pay {taka(amount)} on the secure {m === 'bkash' ? 'bKash' : 'SSLCommerz'} page after placing the order.</p> : <p className="err">No advance payment method is set up yet.</p>}
    </div>
  );
}
