import { buildMeta } from '@/lib/seo';

// Title / description from Admin → SEO → Pages (login).
export async function generateMetadata() {
  return buildMeta({ pageKey: 'login', path: '/login', own: { noindex: true }, fallback: { title: 'Sign in' } });
}

export default function Layout({ children }) { return children; }
