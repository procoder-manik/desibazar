import { notFound } from 'next/navigation';
import Landing from '@/components/landing/Landing';
import LandingPreview from '@/components/landing/LandingPreview';
import { api } from '@/lib/api';
import { buildMeta, enc, slugOf } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const getPage = (slug) => api('/landing/' + enc(slug)).catch(() => null);

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const lp = await getPage(slug);
  if (!lp) return { title: sp?.preview ? 'Preview' : 'Page not found', robots: { index: false } };
  const hero = lp.sections?.find((s) => s.type === 'hero') || {};
  const first = lp.products?.[0]?.product;
  return buildMeta({
    own: lp.seo || {}, path: `/lp/${slugOf(slug)}`,
    fallback: { title: lp.title, description: hero.subtitle || first?.description, image: hero.image || first?.image },
  });
}

export default async function LandingPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const lp = await getPage(slug);
  // drafts are only visible to signed-in staff; their token lives in the browser, so load those client-side
  if (!lp) return sp?.preview ? <LandingPreview slug={slugOf(slug)} /> : notFound();
  return <Landing lp={lp} />;
}
