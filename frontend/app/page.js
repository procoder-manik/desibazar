import Link from 'next/link';
import Hero from '@/components/Hero';
import ProductRail from '@/components/ProductRail';
import CategoryRail from '@/components/CategoryRail';
import { ArrowIcon, LeafIcon, ReturnIcon, ShieldIcon, TruckIcon } from '@/components/Icons';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';
const PERK_ICONS = [TruckIcon, ShieldIcon, LeafIcon, ReturnIcon];
const list = (path) => api(path).then((r) => r.items).catch(() => []);

export default async function Home() {
  let cats;
  try {
    cats = await api('/categories');
  } catch {
    return <div className="apidown glass"><h2>We can&apos;t reach the store right now</h2><p>The API is not responding. Start the backend and refresh this page.</p></div>;
  }
  const [fresh, loved, sale, catInfo, settings] = await Promise.all([
    list('/products?limit=8'),
    list('/products?featured=true&limit=8'),
    list('/products?sale=true&limit=4'),
    Promise.all(cats.map((c) => api(`/products?category=${c.slug}&limit=1`).catch(() => ({ items: [], total: 0 })))),
    api('/settings').catch(() => null),
  ]);
  const c = settings?.content || {};
  const sec = c.sections || {};
  const promo = c.promo || {};
  const bests = loved.length ? loved : fresh;
  const slides = [...loved, ...fresh.filter((p) => !loved.some((l) => l._id === p._id))];
  const productCount = catInfo.reduce((s, x) => s + (x.total || 0), 0);
  const stats = [[`${productCount}+`, 'Pure products'], ['64', 'Districts served'], ['4.8★', 'Average rating'], ['7 days', 'Easy returns']];

  return (
    <div className="home">
      <Hero items={slides} stats={stats} />

      {c.perksEnabled !== false && (c.perks || []).length > 0 && (
        <section className="perks">
          {c.perks.map((pk, i) => {
            const Icon = PERK_ICONS[i % PERK_ICONS.length];
            return <div key={i} className="perk glass"><span className="perk-ico"><Icon size={20} /></span><div><b>{pk.title}</b><small>{pk.text}</small></div></div>;
          })}
        </section>
      )}

      <section className="sect">
        <div className="sect-head"><div><span className="eyebrow">Browse</span><h2>{sec.categories || 'Shop by category'}</h2></div><Link href="/shop">All products <ArrowIcon size={15} /></Link></div>
        <CategoryRail cats={cats.map((cat, i) => ({ _id: cat._id, slug: cat.slug, name: cat.name, img: cat.image || catInfo[i]?.items?.[0]?.image || '', count: catInfo[i]?.total ?? 0 }))} />
      </section>

      {bests.length > 0 && (
        <section className="sect">
          <div className="sect-head"><div><span className="eyebrow">Most loved</span><h2>{sec.best || 'Best sellers'}</h2></div><Link href="/shop?sort=-sold">View all <ArrowIcon size={15} /></Link></div>
          <ProductRail items={bests.slice(0, 8)} />
        </section>
      )}

      {promo.enabled !== false && sale.length > 0 && (
        <section className="promo glass">
          <div className="promo-text">
            {promo.eyebrow && <span className="eyebrow">{promo.eyebrow}</span>}
            <h2>{promo.title}</h2>
            <p>{promo.text}</p>
            <Link href={promo.ctaLink || '/shop?sale=true'} className="btn">{promo.ctaLabel || 'Shop the sale'} <ArrowIcon size={16} /></Link>
          </div>
          <div className="promo-items">{sale.slice(0, 3).map((p) => <Link key={p._id} href={`/product/${p.slug}`}><img src={p.image} alt={p.name} /></Link>)}</div>
        </section>
      )}

      {fresh.length > 0 && (
        <section className="sect">
          <div className="sect-head"><div><span className="eyebrow">Just in</span><h2>{sec.fresh || 'New arrivals'}</h2></div><Link href="/shop">View all <ArrowIcon size={15} /></Link></div>
          <ProductRail items={fresh} />
        </section>
      )}
    </div>
  );
}
