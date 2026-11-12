// Helpers for products that may have colour / size variants.
export const vPrice = (p, v) => (v ? v.salePrice || v.price || p.salePrice || p.price : p.salePrice || p.price);
export const vList = (p, v) => (v ? (v.salePrice ? v.price || p.price : null) : p.salePrice ? p.price : null);

export function priceInfo(p) {
  if (!p.variants?.length) return { from: false, price: p.salePrice || p.price, was: p.salePrice ? p.price : null };
  const prices = p.variants.map((v) => vPrice(p, v));
  const min = Math.min(...prices);
  const cheapest = p.variants[prices.indexOf(min)];
  return { from: new Set(prices).size > 1, price: min, was: vList(p, cheapest) };
}

export const discount = (p) => {
  const { price, was } = priceInfo(p);
  return was ? Math.round(100 - (price / was) * 100) : 0;
};

// unique colours (with swatch) and sizes across a product's variants
export function options(p) {
  const colors = []; const sizes = [];
  for (const v of p.variants || []) {
    if (v.color && !colors.some((c) => c.name.toLowerCase() === v.color.toLowerCase())) colors.push({ name: v.color, hex: v.hex || '#ccc' });
    if (v.size && !sizes.includes(v.size)) sizes.push(v.size);
  }
  return { colors, sizes };
}

export const findVariant = (p, color, size) =>
  (p.variants || []).find((v) => (!color || (v.color || '').toLowerCase() === color.toLowerCase()) && (!size || v.size === size));

export const totalStock = (p) => (p.variants?.length ? p.variants.reduce((s, v) => s + (v.stock || 0), 0) : p.stock);
