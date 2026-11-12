import { api } from './api';

// Server-side helpers that turn the SEO settings from Admin → SEO into Next.js metadata.
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function loadSettings() {
  return api('/settings').catch(() => null);
}

const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s || undefined);
const plain = (s) => String(s || '').replace(/[#*_>`[\]]/g, '').replace(/\s+/g, ' ').trim();

// Metadata for one page. `own` is the page's own SEO object (product, post, landing page...),
// `fallback` the automatic values, `pageKey` an entry of Admin → SEO → Pages.
export async function buildMeta({ pageKey, own = {}, fallback = {}, path, settings, type = 'website' } = {}) {
  const s = settings === undefined ? await loadSettings() : settings;
  const page = (pageKey && s?.seo?.pages?.[pageKey]) || {};
  const title = own.title || page.title || fallback.title;
  const description = clip(plain(own.description || page.description || fallback.description || s?.seo?.description), 300);
  const image = own.image || page.image || fallback.image || s?.seo?.image || undefined;
  const noindex = own.noindex || page.noindex;
  return {
    ...(title && { title }),
    ...(description && { description }),
    ...(own.keywords && { keywords: own.keywords }),
    alternates: own.canonical ? { canonical: own.canonical } : path ? { canonical: path } : undefined,
    openGraph: { type, ...(title && { title }), ...(description && { description }), ...(image && { images: [{ url: image }] }), ...(path && { url: path }) },
    twitter: { card: image ? 'summary_large_image' : 'summary', ...(title && { title }), ...(description && { description }), ...(image && { images: [image] }) },
    ...(noindex && { robots: { index: false, follow: true } }),
  };
}

export { slugOf, enc } from './slug';
