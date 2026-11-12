'use client';
import { useApp } from './Providers';

// Top bar: one static line, a right-to-left news ticker of all messages + live offers, or hidden.
export default function AnnouncementBar() {
  const { settings } = useApp();
  const c = settings.content || {};
  const mode = c.bar?.mode || 'static';
  const msgs = (c.barMessages?.length ? c.barMessages : [c.announcement]).filter(Boolean);
  if (mode === 'off' || !msgs.length) return null;
  if (mode !== 'ticker') return <div className="announce">{msgs[0]}</div>;
  const loop = [...msgs, ...msgs];
  return (
    <div className="announce ticker" role="marquee" aria-label={msgs.join('. ')}>
      <div className="ticker-track" style={{ '--dur': `${Math.max(18, msgs.join(' ').length / 6)}s` }} aria-hidden="true">
        {loop.map((m, i) => <span key={i}>{m}<i>✦</i></span>)}
      </div>
    </div>
  );
}
