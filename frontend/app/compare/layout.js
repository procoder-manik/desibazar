import { buildMeta } from '@/lib/seo';

// Title / description from Admin → SEO → Pages (compare).
export async function generateMetadata() {
  return buildMeta({ pageKey: 'compare', path: '/compare', own: { noindex: true }, fallback: { title: 'Compare products' } });
}

export default function Layout({ children }) { return children; }
