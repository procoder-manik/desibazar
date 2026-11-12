// Small helpers shared by the routes.

// URL slug that keeps Bangla (and any other script) letters, e.g. "হিমসাগর আম 5kg" -> "হিমসাগর-আম-5kg".
const slugify = (s) => String(s || '').toLowerCase().trim()
  .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(/(^-|-$)/g, '').slice(0, 90);

// A slug that is not used by another document of the model yet ("name", "name-2", "name-3", ...).
async function uniqueSlug(Model, wanted, excludeId) {
  const base = slugify(wanted) || 'item-' + Date.now().toString(36);
  for (let i = 1; i < 200; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const hit = await Model.findOne({ slug, ...(excludeId && { _id: { $ne: excludeId } }) }).select('_id').lean();
    if (!hit) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const str = (v, max = 300) => (v === undefined || v === null ? undefined : String(v).slice(0, max));
const isId = (v) => /^[a-f0-9]{24}$/i.test(String(v || ''));
const normPhone = (p) => String(p || '').replace(/[\s-]/g, '').replace(/^\+?88/, '');

// Clean an SEO object coming from the admin panel.
function seoOf(v) {
  if (!v || typeof v !== 'object') return undefined;
  return {
    title: str(v.title, 120) || '', description: str(v.description, 320) || '', keywords: str(v.keywords, 300) || '',
    image: str(v.image, 600) || '', canonical: str(v.canonical, 600) || '', noindex: !!v.noindex,
  };
}

module.exports = { slugify, uniqueSlug, escapeRe, str, isId, normPhone, seoOf };
