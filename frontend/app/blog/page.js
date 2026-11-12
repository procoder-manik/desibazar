import Link from 'next/link';
import PostGrid from '@/components/PostGrid';
import { api } from '@/lib/api';
import { buildMeta } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  if (sp?.tag) return { title: `Articles about ${String(sp.tag).slice(0, 40)}`, alternates: { canonical: `/blog?tag=${encodeURIComponent(sp.tag)}` } };
  return buildMeta({ pageKey: 'blog', path: '/blog', fallback: { title: 'Blog', description: 'Tips, recipes and buying guides from our team.' } });
}

export default async function Blog({ searchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page, 10) || 1);
  const tag = sp?.tag ? String(sp.tag) : '';
  const r = await api(`/posts?limit=12&page=${page}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`).catch(() => ({ items: [], pages: 0 }));
  const href = (p) => `/blog?${new URLSearchParams({ ...(tag && { tag }), ...(p > 1 && { page: String(p) }) })}`;
  return (
    <div className="blog">
      <div className="page-title">
        <span className="eyebrow">Journal</span>
        <h1>{tag ? `#${tag}` : 'Stories, tips & guides'}</h1>
        <p>{tag ? <Link href="/blog" className="link">All articles</Link> : 'How we source, how to use it, and what to look for when you buy.'}</p>
      </div>
      {r.items.length ? <PostGrid posts={r.items} /> : <div className="empty glass"><h3>No articles yet</h3><p>Check back soon.</p><Link href="/shop" className="btn">Shop now</Link></div>}
      {r.pages > 1 && (
        <nav className="pager" aria-label="Pages">
          {page > 1 && <Link className="btn ghost sm" href={href(page - 1)}>Newer</Link>}
          <span className="muted">Page {page} of {r.pages}</span>
          {page < r.pages && <Link className="btn ghost sm" href={href(page + 1)}>Older</Link>}
        </nav>
      )}
    </div>
  );
}
