// Appearance options. Every theme keeps the frosted-glass look; only the palette changes.
export const THEMES = {
  sage: { label: 'Sage', accent: '#2f4a3a', swatch: ['#f2f3ee', '#a9b8a4', '#2f4a3a'] },
  pine: { label: 'Pine', accent: '#1f3d34', swatch: ['#eef2ef', '#9bb3a7', '#1f3d34'] },
  olive: { label: 'Olive', accent: '#4e5a2b', swatch: ['#f3f3ea', '#c3c79a', '#4e5a2b'] },
  ocean: { label: 'Ocean', accent: '#24506b', swatch: ['#eef3f6', '#9db7c8', '#24506b'] },
  slate: { label: 'Slate', accent: '#3a4553', swatch: ['#f1f2f4', '#b3bac4', '#3a4553'] },
  lavender: { label: 'Lavender', accent: '#4f4577', swatch: ['#f3f2f7', '#bcb5d6', '#4f4577'] },
  rosewood: { label: 'Rosewood', accent: '#7b3b4a', swatch: ['#f7f1f1', '#d9b3b9', '#7b3b4a'] },
  clay: { label: 'Clay', accent: '#8a4b35', swatch: ['#f6f1ec', '#d5b5a2', '#8a4b35'] },
  espresso: { label: 'Espresso', accent: '#4a3328', swatch: ['#f5f1ed', '#cdb9a8', '#4a3328'] },
  honey: { label: 'Honey', accent: '#7a5520', swatch: ['#f7f3ea', '#e2c98e', '#7a5520'] },
  champagne: { label: 'Champagne', accent: '#7a6440', swatch: ['#f8f5ef', '#e3d4b5', '#7a6440'] },
  midnight: { label: 'Midnight (dark)', accent: '#7fb894', swatch: ['#13181a', '#2a3530', '#7fb894'] },
};
export const SHAPES = { round: 'Round', soft: 'Soft', sharp: 'Sharp' };
export const HEROES = {
  split: 'Split + card slider', center: 'Centered + ribbon', showcase: 'Showcase', editorial: 'Editorial mosaic', banner: 'Full banner slides', minimal: 'Minimal + stats', duo: 'Duo panels', gradient: 'Gradient + orbs',
};
export const HEADERS = { floating: 'Floating glass', classic: 'Classic bar', centered: 'Centered logo', bar: 'Accent bar' };
export const CARDS = { glass: 'Glass', minimal: 'Minimal', overlay: 'Overlay', elevated: 'Elevated', outline: 'Outline', tile: 'Tile' };
export const CATEGORIES = { carousel: 'Carousel', grid: 'Grid', pills: 'Pills' };
export const FOOTERS = { classic: 'Classic', minimal: 'Minimal', dark: 'Dark', centered: 'Centered' };
export const LISTINGS = { grid: 'Grid', carousel: 'Carousel' };

export function applyAppearance(a = {}) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.dataset.theme = THEMES[a.theme] ? a.theme : 'sage';
  el.dataset.shape = SHAPES[a.shape] ? a.shape : 'round';
  el.dataset.header = HEADERS[a.header] ? a.header : 'floating';
  el.dataset.card = CARDS[a.card] ? a.card : 'glass';
  el.dataset.footer = FOOTERS[a.footer] ? a.footer : 'classic';
  if (a.accent && /^#[0-9a-f]{6}$/i.test(a.accent)) el.style.setProperty('--forest', a.accent);
  else el.style.removeProperty('--forest');
  if (a.glass >= 0) el.style.setProperty('--blur-px', `${a.glass}px`);
}
