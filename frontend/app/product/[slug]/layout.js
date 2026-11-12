import { api } from '@/lib/api';

// Server-side SEO for product pages: title, description, social preview and Product structured data.
async function getProduct(slug) {
  try { return (await api('/products/' + slug)).product; } catch { return null; }
}

export async function generateMetadata({ params }) {
  const p = await getProduct(params.slug);
  if (!p) return { title: 'Product not found' };
  const description = (p.description || `Buy ${p.name} online`).slice(0, 160);
  return {
    title: p.name, description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name, description, images: p.image ? [{ url: p.image }] : [] },
  };
}

export default async function ProductLayout({ children, params }) {
  const p = await getProduct(params.slug);
  const prices = p?.variants?.length ? p.variants.map((v) => v.salePrice || v.price || p.price) : [p?.salePrice || p?.price];
  const ld = p && {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.description, image: [p.image, ...(p.images || [])].filter(Boolean),
    category: p.category?.name, sku: p._id,
    offers: { '@type': 'AggregateOffer', priceCurrency: 'BDT', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
    ...(p.numReviews ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.numReviews } } : {}),
  };
  return (
    <>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />}
      {children}
    </>
  );
}
