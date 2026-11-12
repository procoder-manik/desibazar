'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from './Providers';
import { CheckIcon, StarIcon, Stars } from './Icons';
import { api } from '@/lib/api';

export default function Reviews({ slug, rating, count, onPosted }) {
  const { token, user } = useApp();
  const [list, setList] = useState(null);
  const [f, setF] = useState({ rating: 0, comment: '' });
  const [hover, setHover] = useState(0);
  const [msg, setMsg] = useState({ text: '', ok: false });

  const load = () => api(`/products/${slug}/reviews`).then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    if (!f.rating) return setMsg({ text: 'Please choose a star rating', ok: false });
    try {
      await api(`/products/${slug}/reviews`, { method: 'POST', token, body: f });
      setMsg({ text: 'Thanks, your review is live.', ok: true });
      setF({ rating: 0, comment: '' });
      load(); onPosted?.();
    } catch (err) { setMsg({ text: err.message, ok: false }); }
  };
  const dist = [5, 4, 3, 2, 1].map((n) => [n, (list || []).filter((r) => r.rating === n).length]);

  return (
    <section className="sect reviews" id="reviews">
      <div className="sect-head"><div><span className="eyebrow">Reviews</span><h2>What customers say</h2></div></div>
      <div className="rev-grid">
        <div className="rev-list">
          {count > 0 && (
            <div className="rev-summary glass">
              <div><b>{rating?.toFixed(1)}</b><Stars value={rating} size={16} /><small>{count} reviews</small></div>
              <div className="rev-bars">{dist.map(([n, c]) => <div key={n}><span>{n}★</span><div className="track"><span style={{ width: `${list?.length ? (c / list.length) * 100 : 0}%` }} /></div><small>{c}</small></div>)}</div>
            </div>
          )}
          {list === null ? <p className="muted">Loading reviews...</p> : list.length === 0 ? <p className="muted">No reviews yet. Be the first to share your thoughts.</p> : list.map((r) => (
            <div key={r._id} className="rev glass">
              <div className="rev-top"><span className="avatar">{r.name?.[0] || '?'}</span><div><b>{r.name}</b>{r.verified && <span className="verified"><CheckIcon size={12} /> Verified buyer</span>}</div><Stars value={r.rating} size={13} /></div>
              {r.comment && <p>{r.comment}</p>}
              <small>{new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
            </div>
          ))}
        </div>
        <div className="rev-form glass">
          <h4>Write a review</h4>
          {!token ? <p className="muted"><Link href={`/login?next=/product/${slug}`} className="link">Sign in</Link> to review this product.</p> : (
            <form onSubmit={submit}>
              <div className="rate" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} onMouseEnter={() => setHover(n)} onClick={() => setF({ ...f, rating: n })} aria-label={`${n} star`}>
                    <StarIcon size={24} filled={(hover || f.rating) >= n} className={(hover || f.rating) >= n ? 'on' : ''} />
                  </button>
                ))}
              </div>
              <textarea rows={4} maxLength={1000} placeholder={`How was it, ${user?.name?.split(' ')[0] || 'friend'}?`} value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} />
              <button className="btn block">Post review</button>
              {msg.text && <p className={msg.ok ? 'ok' : 'err'}>{msg.text}</p>}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
