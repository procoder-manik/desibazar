import Link from 'next/link';
import { Logo } from './Header';
import Newsletter from './Newsletter';
import { LeafIcon, ReturnIcon, ShieldIcon, TruckIcon } from './Icons';
import { FREE_OVER, taka } from '@/lib/api';

const cols = [
  ['Shop', [['All products', '/shop'], ['Honey', '/shop?category=honey'], ['Dates', '/shop?category=dates'], ['Ghee & Oil', '/shop?category=ghee-oil'], ['On sale', '/shop?sale=true']]],
  ['Account', [['My account', '/account'], ['My orders', '/orders'], ['Wishlist', '/wishlist'], ['Compare', '/compare'], ['Bag', '/cart']]],
  ['Help', [['Blog & guides', '/blog'], ['Delivery info', '/help#delivery'], ['Returns & refunds', '/help#returns'], ['Payment', '/help#payment'], ['FAQ', '/help#faq']]],
];

export const perks = (freeOver = FREE_OVER) => [
  freeOver ? [TruckIcon, 'Free delivery', `On orders over ${taka(freeOver)}`] : [TruckIcon, 'Nationwide delivery', 'All 64 districts'],
  [ShieldIcon, 'Secure payment', 'COD, bKash, Nagad, cards'],
  [LeafIcon, '100% pure', 'Lab-checked sourcing'],
  [ReturnIcon, 'Easy returns', 'Within 7 days'],
];

export default function Footer({ settings }) {
  const store = settings?.store || {};
  const variant = settings?.appearance?.footer || 'classic';
  return (
    <footer className={'footer f-' + variant}>
      <div className="wrap">
        {variant !== 'minimal' && <div className="footer-news">
          <div>
            <h3>{settings?.content?.newsletter?.title || 'Get 10% off your first order'}</h3>
            <p>{settings?.content?.newsletter?.text || 'Seasonal harvests, restocks and members-only offers. No spam.'}</p>
          </div>
          <Newsletter />
        </div>}
        <div className="footer-grid">
          <div className="footer-about">
            <Logo name={store.name} tagline={store.tagline} />
            <p>Pure honey, dates, nuts, ghee and spices, carefully sourced and delivered across Bangladesh.</p>
            {(store.phone || store.email) && <p className="contact">{store.phone}<br />{store.email}<br />{store.address}</p>}
          </div>
          {cols.map(([h, links]) => (
            <div key={h}>
              <h4>{h}</h4>
              {links.map(([l, href]) => <Link key={l} href={href}>{l}</Link>)}
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {store.name || 'Ghorer Bazar'}. All rights reserved.</span>
          <span className="paychips"><i>Cash on delivery</i><i>bKash</i><i>Nagad</i><i>Rocket</i><i>Visa</i><i>Mastercard</i><i>SSLCommerz</i></span>
        </div>
      </div>
    </footer>
  );
}
