import { buildMeta } from '@/lib/seo';

// Title / description from Admin → SEO → Pages (register).
export async function generateMetadata() {
  return buildMeta({ pageKey: 'register', path: '/register', own: { noindex: true }, fallback: { title: 'Create account' } });
}

export default function Layout({ children }) { return children; }
