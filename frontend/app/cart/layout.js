import { buildMeta } from '@/lib/seo';

// Title / description from Admin → SEO → Pages (cart).
export async function generateMetadata() {
  return buildMeta({ pageKey: 'cart', path: '/cart', own: { noindex: true }, fallback: { title: 'Your bag' } });
}

export default function Layout({ children }) { return children; }
