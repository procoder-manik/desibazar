'use client';
import { useEffect, useState } from 'react';
import Landing from './Landing';
import { useApp } from '../Providers';
import { api } from '@/lib/api';

// Draft preview for staff: fetched with the signed-in token.
export default function LandingPreview({ slug }) {
  const { token, ready } = useApp();
  const [lp, setLp] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!ready) return;
    if (!token) { setErr('Sign in as staff to preview this page.'); return; }
    api(`/landing/${encodeURIComponent(slug)}?preview=1`, { token }).then(setLp).catch((e) => setErr(e.message));
  }, [slug, token, ready]);
  if (err) return <div className="empty glass" style={{ marginTop: 28 }}><h3>Preview not available</h3><p>{err}</p></div>;
  if (!lp) return <div className="skel glass tall" />;
  return <Landing lp={lp} preview />;
}
