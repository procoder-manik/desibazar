import ShopPage from '@/components/ShopPage';
import { api } from '@/lib/api';
import { buildMeta, enc } from '@/lib/seo';

// Shop and category listings. A category's own SEO (Admin → Products → Categories) is used on ?category=...
export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  if (sp?.category) {
    const c = await api('/categories/' + enc(sp.category)).catch(() => null);
    if (c) return buildMeta({ own: c.seo || {}, path: `/shop?category=${c.slug}`, fallback: { title: c.name, description: c.description || `Buy ${c.name} online in Bangladesh.`, image: c.image } });
  }
  if (sp?.q) return { title: `Search: ${String(sp.q).slice(0, 60)}`, robots: { index: false, follow: true } };
  return buildMeta({ pageKey: 'shop', path: '/shop', fallback: { title: 'Shop all products' } });
}

export default function Page() {
  return <ShopPage />;
}
