'use client';
import { useState } from 'react';

// Small SVG charts in the theme accent. One series each, recessive grid, hover tooltips.
const niceTop = (max) => { if (max <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(max))); const n = max / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
const short = (v) => (v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(+v.toFixed(1)));
const dayLabel = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// Area + line over time with a crosshair tooltip.
export function AreaChart({ data, value = 'revenue', format = (v) => v, label = dayLabel, height = 240 }) {
  const [h, setH] = useState(null);
  const W = 760, H = height, L = 46, B = 28, T = 14, R = 8;
  const vals = data.map((d) => d[value]);
  const top = niceTop(Math.max(...vals, 0));
  const x = (i) => L + (data.length < 2 ? 0 : (i / (data.length - 1)) * (W - L - R));
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[value]).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const step = Math.ceil(data.length / 7);
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setH(Math.max(0, Math.min(data.length - 1, Math.round(((px - L) / (W - L - R)) * (data.length - 1)))));
  };
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trend chart" onMouseMove={move} onMouseLeave={() => setH(null)}>
        <defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" className="area-top" /><stop offset="100%" className="area-bot" /></linearGradient></defs>
        {[0, top / 2, top].map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" /><text x={L - 8} y={y(t) + 4} className="axis" textAnchor="end">{short(t)}</text></g>)}
        <path d={area} fill="url(#areaFill)" />
        <path d={line} className="line" />
        {data.map((d, i) => (i % step === 0 || i === data.length - 1) && <text key={d.day || i} x={x(i)} y={H - 8} className="axis" textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>{label(d.day)}</text>)}
        {h !== null && <><line x1={x(h)} x2={x(h)} y1={T} y2={y(0)} className="cross" /><circle cx={x(h)} cy={y(data[h][value])} r="5" className="dot" /></>}
      </svg>
      {h !== null && (
        <div className="tip" style={{ left: `${(x(h) / W) * 100}%`, top: `${(y(data[h][value]) / H) * 100}%` }}>
          <b>{format(data[h][value])}</b><span>{label(data[h].day)}{data[h].orders !== undefined && value !== 'orders' ? ` · ${data[h].orders} orders` : ''}</span>
        </div>
      )}
    </div>
  );
}

// Vertical bars over time.
export function Bars({ data, value = 'orders', format = (v) => v, label = dayLabel, height = 200 }) {
  const [h, setH] = useState(null);
  const W = 760, H = height, L = 36, B = 28, T = 12;
  const top = niceTop(Math.max(...data.map((d) => d[value]), 0));
  const bw = (W - L) / data.length;
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const step = Math.ceil(data.length / 7);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bar chart">
        {[0, top / 2, top].map((t) => <g key={t}><line x1={L} x2={W} y1={y(t)} y2={y(t)} className="grid" /><text x={L - 8} y={y(t) + 4} className="axis" textAnchor="end">{short(t)}</text></g>)}
        {data.map((d, i) => {
          const bx = L + i * bw + Math.max(1, bw * 0.18), w = Math.max(2, bw * 0.64), bh = Math.max(0, y(0) - y(d[value]));
          const r = Math.min(4, w / 2, bh);
          return (
            <g key={d.day || i} onMouseEnter={() => setH(i)} onMouseLeave={() => setH(null)}>
              <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" />
              {bh > 0 && <path className={'bar' + (h === i ? ' on' : '')} d={`M${bx},${y(0)} v${-(bh - r)} q0,${-r} ${r},${-r} h${w - 2 * r} q${r},0 ${r},${r} v${bh - r} z`} />}
              {(i % step === 0 || i === data.length - 1) && <text x={L + i * bw + bw / 2} y={H - 8} className="axis" textAnchor="middle">{label(d.day)}</text>}
            </g>
          );
        })}
      </svg>
      {h !== null && <div className="tip" style={{ left: `${((L + h * bw + bw / 2) / W) * 100}%`, top: `${(y(data[h][value]) / H) * 100}%` }}><b>{format(data[h][value])}</b><span>{label(data[h].day)}</span></div>}
    </div>
  );
}

// Ranked horizontal bars (top products, categories, districts). Values are labelled directly.
export function HBars({ rows, value, format = (v) => v, sub }) {
  if (!rows.length) return <p className="muted">No data in this period yet.</p>;
  const max = Math.max(...rows.map((r) => r[value]), 1);
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div key={r.name} className="hbar" title={`${r.name}: ${format(r[value])}`}>
          <div className="hbar-top"><span>{r.name}</span><b>{format(r[value])}{sub ? <small> {sub(r)}</small> : null}</b></div>
          <div className="track"><span style={{ width: `${(r[value] / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
