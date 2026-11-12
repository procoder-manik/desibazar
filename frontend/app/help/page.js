import Link from 'next/link';
import { api, taka } from '@/lib/api';

import { buildMeta } from '@/lib/seo';

export async function generateMetadata() {
  return buildMeta({ pageKey: 'help', path: '/help', fallback: { title: 'Help & FAQ' } });
}

const FAQ = [
  ['How do I know the honey is pure?', 'We buy directly from beekeepers and farms we know, and batches are checked before they are packed.'],
  ['Can I change my order after placing it?', 'You can cancel a pending order yourself from My orders. For changes, cancel and order again, or call us.'],
  ['Do you deliver outside Dhaka?', 'Yes, we deliver across Bangladesh through courier partners in 2-4 days.'],
  ['How do coupons work?', 'Enter the code at checkout. The discount is checked against your bag total and applied before delivery.'],
];

export const dynamic = 'force-dynamic';

export default async function Help() {
  const s = await api('/settings').catch(() => null);
  const zones = s?.shipping?.zones || [];
  const freeOver = s?.shipping?.freeOver;
  return (
    <div className="help">
      <div className="crumbs"><Link href="/">Home</Link><span>/</span><b>Help</b></div>
      <div className="page-title"><h1>Help & FAQ</h1><p>Everything about delivery, payment and returns.</p></div>
      <div className="help-grid">
        <section id="delivery" className="glass co-card">
          <h3>Delivery</h3>
          <p>{zones.map((z) => <span key={z.key}>{z.name}: {taka(z.fee)}, {z.eta}.<br /></span>)}{freeOver ? <>Free delivery on orders over {taka(freeOver)}.</> : null}<br />We ship to all 64 districts through Steadfast, Pathao, RedX, Sundarban and other trusted couriers.</p>
        </section>
        <section id="payment" className="glass co-card">
          <h3>Payment</h3>
          <p>Cash on delivery everywhere. You can also pay online by card, bKash, Nagad or Rocket through SSLCommerz, with bKash directly, or by Send Money with your transaction ID.</p>
        </section>
        <section id="returns" className="glass co-card">
          <h3>Returns & refunds</h3>
          <p>If a product arrives damaged or is not as described, tell us within 7 days and we will replace it or refund you.</p>
        </section>
      </div>
      <section id="faq" className="sect">
        <div className="sect-head"><div><span className="eyebrow">FAQ</span><h2>Common questions</h2></div></div>
        <div className="faq">
          {FAQ.map(([q, a]) => <details key={q} className="glass"><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </section>
    </div>
  );
}
