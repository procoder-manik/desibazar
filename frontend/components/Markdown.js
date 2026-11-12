// A small, safe Markdown renderer (no raw HTML): headings, paragraphs, **bold**, *italic*, [links](url),
// ![images](url), lists, > quotes, --- lines, and shortcodes on their own line:
//   [product:slug]        a product card (renderProduct is called with the slug)
//   [youtube:VIDEO_ID]    an embedded YouTube video
import { Fragment } from 'react';

const safeUrl = (u) => (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(u || '') ? u : '#');

function inline(text, key = 'i') {
  const out = [];
  const re = /(!\[([^\]]*)\]\(([^)\s]+)\))|(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let last = 0; let m; let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${n++}`;
    if (m[1]) out.push(<img key={k} src={safeUrl(m[3])} alt={m[2]} loading="lazy" />);
    else if (m[4]) { const href = safeUrl(m[6]); const ext = /^https?:/i.test(href); out.push(<a key={k} href={href} {...(ext && { target: '_blank', rel: 'noopener' })}>{inline(m[5], k)}</a>); }
    else if (m[7]) out.push(<strong key={k}>{inline(m[8], k)}</strong>);
    else if (m[9]) out.push(<em key={k}>{m[10]}</em>);
    else if (m[11]) out.push(<code key={k}>{m[12]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function productSlugs(md) {
  return [...String(md || '').matchAll(/^\s*\[product:([^\]\s]+)\]\s*$/gm)].map((m) => m[1]);
}

export default function Markdown({ text, renderProduct, className = 'md' }) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    const k = `b${i}`;
    if (!t) { i++; continue; }
    let m;
    if ((m = t.match(/^\[product:([^\]\s]+)\]$/))) { blocks.push(<div key={k} className="md-product">{renderProduct ? renderProduct(m[1]) : null}</div>); i++; continue; }
    if ((m = t.match(/^\[youtube:([A-Za-z0-9_-]{6,20})\]$/))) { blocks.push(<div key={k} className="md-video"><iframe src={`https://www.youtube-nocookie.com/embed/${m[1]}`} title="Video" loading="lazy" allowFullScreen allow="accelerometer; encrypted-media; picture-in-picture" /></div>); i++; continue; }
    if ((m = t.match(/^(#{1,4})\s+(.*)$/))) { const H = `h${Math.min(m[1].length + 1, 5)}`; blocks.push(<H key={k}>{inline(m[2], k)}</H>); i++; continue; }
    if (/^(-{3,}|\*{3,})$/.test(t)) { blocks.push(<hr key={k} />); i++; continue; }
    if (t.startsWith('>')) {
      const q = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) q.push(lines[i++].trim().replace(/^>\s?/, ''));
      blocks.push(<blockquote key={k}>{inline(q.join(' '), k)}</blockquote>);
      continue;
    }
    if (/^([-*+]|\d+[.)])\s+/.test(t)) {
      const ordered = /^\d/.test(t);
      const items = [];
      while (i < lines.length && /^([-*+]|\d+[.)])\s+/.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^([-*+]|\d+[.)])\s+/, ''));
      const L = ordered ? 'ol' : 'ul';
      blocks.push(<L key={k}>{items.map((x, j) => <li key={j}>{inline(x, `${k}-${j}`)}</li>)}</L>);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|[-*+]\s|\d+[.)]\s|\[product:|\[youtube:|-{3,}$)/.test(lines[i].trim())) para.push(lines[i++].trim());
    if (!para.length) { para.push(t); i++; }
    blocks.push(<p key={k}>{para.map((x, j) => <Fragment key={j}>{j > 0 && <br />}{inline(x, `${k}-${j}`)}</Fragment>)}</p>);
  }
  return <div className={className}>{blocks}</div>;
}
