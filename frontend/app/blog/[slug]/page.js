import Link from 'next/link';
import { notFound } from 'next/navigation';
import Markdown, { productSlugs } from '@/components/Markdown';
import PostGrid, { postDate } from '@/components/PostGrid';
import ProductCard from '@/components/ProductCard';
import { api } from '@/lib/api';
import { buildMeta, enc, SITE, slugOf } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const getPost = (slug, preview) => api(`/posts/${enc(slug)}${preview ? '?preview=1' : ''}`).catch(() => null);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const d = await getPost(slug);
  if (!d) return { title: 'Article not found', robots: { index: false } };
  const p = d.post;
  const meta = await buildMeta({ own: p.seo || {}, path: `/blog/${slugOf(slug)}`, type: 'article', fallback: { title: p.title, description: p.excerpt || p.content?.slice(0, 200), image: p.cover } });
  return { ...meta, openGraph: { ...meta.openGraph, type: 'article', publishedTime: p.publishedAt, modifiedTime: p.updatedAt, ...(p.author && { authors: [p.author] }), tags: p.tags } };
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const d = await getPost(slug);
  if (!d) notFound();
  const { post: p, related } = d;
  const inline = productSlugs(p.content);
  const extra = inline.length ? await api(`/posts-products?slugs=${inline.map(encodeURIComponent).join(',')}`).catch(() => []) : [];
  const bySlug = Object.fromEntries([...(p.products || []), ...extra].map((x) => [x.slug, x]));
  const targets = (p.products || []).filter((x) => !inline.includes(x.slug));
  const ld = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.seo?.description || p.excerpt,
    image: p.seo?.image || p.cover || undefined, datePublished: p.publishedAt, dateModified: p.updatedAt,
    author: { '@type': p.author ? 'Person' : 'Organization', name: p.author || 'Store team' },
    mainEntityOfPage: `${SITE}/blog/${p.slug}`, keywords: p.tags?.join(', '),
  };

  return (
    <article className="post">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <div className="crumbs"><Link href="/">Home</Link><span>/</span><Link href="/blog">Blog</Link><span>/</span><b>{p.title}</b></div>
      <header className="post-head">
        {p.tags?.length ? <div className="post-tags">{p.tags.map((t) => <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="chip">{t}</Link>)}</div> : null}
        <h1>{p.title}</h1>
        {p.excerpt && <p className="lead">{p.excerpt}</p>}
        <span className="muted">{postDate(p.publishedAt)}{p.author ? ` · ${p.author}` : ''}</span>
      </header>
      {p.cover && <div className="post-hero glass"><img src={p.cover} alt={p.title} /></div>}
      <div className="post-layout">
        <div className="post-content glass">
          <Markdown text={p.content} renderProduct={(s) => (bySlug[s] ? <div className="md-card"><ProductCard p={bySlug[s]} /></div> : null)} />
        </div>
        {targets.length > 0 && (
          <aside className="post-aside">
            <span className="eyebrow">Mentioned in this article</span>
            {targets.map((x) => <ProductCard key={x._id} p={x} />)}
          </aside>
        )}
      </div>
      {related?.length > 0 && (
        <section className="sect">
          <div className="sect-head"><div><span className="eyebrow">Keep reading</span><h2>Related articles</h2></div></div>
          <PostGrid posts={related} />
        </section>
      )}
    </article>
  );
}
