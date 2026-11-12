import { api } from '@/lib/api';

export const revalidate = 3600;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default async function sitemap() {
  const [cats, prods] = await Promise.all([api('/categories').catch(() => []), api('/products?limit=100').then((r) => r.items).catch(() => [])]);
  return [
    { url: SITE, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/help`, changeFrequency: 'monthly', priority: 0.3 },
    ...cats.map((c) => ({ url: `${SITE}/shop?category=${c.slug}`, changeFrequency: 'weekly', priority: 0.7 })),
    ...prods.map((p) => ({ url: `${SITE}/product/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'weekly', priority: 0.8 })),
  ];
}
