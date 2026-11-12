import Link from 'next/link';

const date = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// Blog post cards (blog index, related posts, product page "Read before you buy").
export default function PostGrid({ posts }) {
  return (
    <div className="post-grid">
      {posts.map((p) => (
        <Link key={p._id} href={`/blog/${encodeURIComponent(p.slug)}`} className="post-card glass">
          <span className="post-cover">{p.cover ? <img src={p.cover} alt="" loading="lazy" /> : <i>{p.title.slice(0, 1)}</i>}</span>
          <span className="post-body">
            {p.tags?.length ? <span className="eyebrow">{p.tags[0]}</span> : null}
            <b>{p.title}</b>
            {p.excerpt && <small>{p.excerpt}</small>}
            <em>{date(p.publishedAt)}{p.author ? ` · ${p.author}` : ''}</em>
          </span>
        </Link>
      ))}
    </div>
  );
}

export { date as postDate };
