import { api } from '@/lib/api';
import { SITE } from '@/lib/seo';

export const revalidate = 3600;

// Every active product (paged), category, and published blog post. Pages marked "noindex" in SEO are left out.
async function allProducts() {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const r = await api(`/products?limit=100&page=${page}`).catch(() => null);
    if (!r?.items?.length) break;
    out.push(...r.items);
    if (page >= r.pages) break;
  }
  return out;
}

export default async function sitemap() {
  const [cats, prods, posts] = await Promise.all([
    api('/categories').catch(() => []),
    allProducts(),
    api('/posts?limit=50').then((r) => r.items).catch(() => []),
  ]);
  const u = (path) => `${SITE}${path}`;
  return [
    { url: u('/'), changeFrequency: 'daily', priority: 1 },
    { url: u('/shop'), changeFrequency: 'daily', priority: 0.9 },
    { url: u('/blog'), changeFrequency: 'weekly', priority: 0.6 },
    { url: u('/help'), changeFrequency: 'monthly', priority: 0.3 },
    ...cats.filter((c) => !c.seo?.noindex).map((c) => ({ url: u(`/shop?category=${encodeURIComponent(c.slug)}`), changeFrequency: 'weekly', priority: 0.7 })),
    ...prods.filter((p) => !p.seo?.noindex).map((p) => ({ url: u(`/product/${encodeURIComponent(p.slug)}`), lastModified: p.updatedAt, changeFrequency: 'weekly', priority: 0.8, ...(p.image && { images: [p.image] }) })),
    ...posts.map((p) => ({ url: u(`/blog/${encodeURIComponent(p.slug)}`), lastModified: p.publishedAt, changeFrequency: 'monthly', priority: 0.6 })),
  ];
}
