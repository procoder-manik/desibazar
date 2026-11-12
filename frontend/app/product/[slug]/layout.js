import { api } from '@/lib/api';
import { buildMeta, enc, SITE, slugOf } from '@/lib/seo';

// Server-side SEO for product pages: title, description, social preview and Product structured data.
async function getProduct(slug) {
  try { return (await api('/products/' + enc(slug))).product; } catch { return null; }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: 'Product not found', robots: { index: false } };
  return buildMeta({
    own: p.seo || {}, path: `/product/${slugOf(slug)}`,
    fallback: { title: p.name, description: p.description || `Buy ${p.name} online in Bangladesh. Cash on delivery available.`, image: p.image },
  });
}

export default async function ProductLayout({ children, params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  const prices = p?.variants?.length ? p.variants.map((v) => v.salePrice || v.price || p.price) : [p?.salePrice || p?.price];
  const ld = p && [{
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.seo?.description || p.description, image: [p.image, ...(p.images || [])].filter(Boolean),
    category: p.category?.name, sku: p._id, url: `${SITE}/product/${p.slug}`,
    offers: { '@type': 'AggregateOffer', priceCurrency: 'BDT', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
    ...(p.numReviews ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.numReviews } } : {}),
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE}/shop` },
      ...(p.category ? [{ '@type': 'ListItem', position: 3, name: p.category.name, item: `${SITE}/shop?category=${encodeURIComponent(p.category.slug)}` }] : []),
      { '@type': 'ListItem', position: p.category ? 4 : 3, name: p.name, item: `${SITE}/product/${p.slug}` },
    ],
  }];
  return (
    <>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />}
      {children}
    </>
  );
}
