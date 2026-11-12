// Route params can arrive percent-encoded (Bangla slugs); slugOf returns the readable slug, enc the URL-safe one.
export const slugOf = (s) => { try { return decodeURIComponent(s || ''); } catch { return s || ''; } };
export const enc = (s) => encodeURIComponent(slugOf(s));
