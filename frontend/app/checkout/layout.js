import { buildMeta } from '@/lib/seo';

// Title / description from Admin → SEO → Pages (checkout).
export async function generateMetadata() {
  return buildMeta({ pageKey: 'checkout', path: '/checkout', own: { noindex: true }, fallback: { title: 'Checkout' } });
}

export default function Layout({ children }) { return children; }
