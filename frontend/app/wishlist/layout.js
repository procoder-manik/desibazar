import { buildMeta } from '@/lib/seo';

// Title / description from Admin → SEO → Pages (wishlist).
export async function generateMetadata() {
  return buildMeta({ pageKey: 'wishlist', path: '/wishlist', own: { noindex: true }, fallback: { title: 'Wishlist' } });
}

export default function Layout({ children }) { return children; }
