'use client';
import { useEffect } from 'react';

// Extra tags the store owner pasted in Admin → Store & tracking → "Other head code".
// createContextualFragment makes <script> tags run, which plain innerHTML would not.
export default function HeadScripts({ html }) {
  useEffect(() => {
    if (!html || document.head.querySelector('[data-gb-head]')) return;
    try {
      const frag = document.createRange().createContextualFragment(html);
      frag.childNodes.forEach((n) => n.nodeType === 1 && n.setAttribute('data-gb-head', ''));
      document.head.appendChild(frag);
    } catch { /* invalid markup: ignore */ }
  }, [html]);
  return null;
}
