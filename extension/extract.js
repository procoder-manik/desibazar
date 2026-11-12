// Runs inside the shop page (injected by the popup) and returns everything it can find about the product.
// Order of sources: Shopify product JSON, schema.org JSON-LD, WooCommerce / common markup, Open Graph tags, then the page itself.
// It must stay self-contained: chrome.scripting serialises this one function.
async function extractProduct() {
  const abs = (u) => { try { return new URL(u, location.href).href; } catch { return null; } };
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const meta = (k) => document.querySelector(`meta[property="${k}"],meta[name="${k}"],meta[itemprop="${k}"]`)?.content?.trim() || '';
  const num = (v) => { const m = String(v ?? '').replace(/,/g, '').match(/\d+(\.\d+)?/); return m ? Number(m[0]) : null; };
  const clean = (html) => { const d = document.createElement('div'); d.innerHTML = String(html || ''); d.querySelectorAll('script,style,noscript').forEach((x) => x.remove()); return (d.innerText || d.textContent || '').replace(/\n{3,}/g, '\n\n').trim(); };
  // larger versions of common CDN thumbnails
  const big = (u) => (u || '').replace(/_(\d+x\d*|small|medium|thumb|compact)(\.\w+)(\?|$)/i, '$2$3').replace(/-\d{2,4}x\d{2,4}(\.\w+)(\?|$)/, '$1$2').replace(/_\d{2,4}x\d{2,4}q\d+(\.\w+)?/i, '');
  const out = { name: '', price: null, salePrice: null, currency: '', description: '', images: [], category: '', details: [], variants: [], sourceUrl: location.href, source: 'page' };
  const addImg = (u) => { const a = abs(big(u)); if (a && /^https?:/.test(a) && !out.images.includes(a)) out.images.push(a); };

  // 1) Shopify
  try {
    if (window.Shopify || meta('shopify-digital-wallet') || /\/products\//.test(location.pathname)) {
      const r = await fetch(location.pathname.replace(/\/$/, '') + '.js', { credentials: 'omit' });
      if (r.ok && (r.headers.get('content-type') || '').includes('json')) {
        const p = await r.json();
        out.source = 'shopify';
        out.name = p.title; out.description = clean(p.description);
        out.salePrice = p.price / 100; out.price = p.compare_at_price ? p.compare_at_price / 100 : null;
        if (!out.price) { out.price = out.salePrice; out.salePrice = null; }
        (p.images || []).forEach((u) => addImg(u.startsWith('//') ? 'https:' + u : u));
        out.category = p.type || '';
        if (p.variants?.length > 1) {
          out.variants = p.variants.map((v) => ({ label: v.title, size: [v.option1, v.option2, v.option3].filter(Boolean).join(' / '), price: (v.compare_at_price || v.price) / 100, salePrice: v.compare_at_price ? v.price / 100 : undefined, stock: v.available ? 10 : 0, image: v.featured_image?.src }));
        }
        if (p.vendor) out.details.push({ label: 'Brand', value: p.vendor });
      }
    }
  } catch { /* not Shopify */ }

  // 2) JSON-LD Product
  if (!out.name) {
    const nodes = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try { const j = JSON.parse(s.textContent); (Array.isArray(j) ? j : j['@graph'] || [j]).forEach((n) => nodes.push(n)); } catch { /* bad JSON */ }
    });
    const prod = nodes.find((n) => [].concat(n['@type']).some((t) => /Product/i.test(t)));
    if (prod) {
      out.source = 'schema.org';
      out.name = prod.name || '';
      out.description = clean(prod.description);
      [].concat(prod.image || []).forEach((im) => addImg(typeof im === 'string' ? im : im.url || im.contentUrl));
      const offers = [].concat(prod.offers || []).flatMap((o) => (o.offers ? [].concat(o.offers) : [o]));
      const o = offers[0] || {};
      out.price = num(o.price ?? o.lowPrice ?? o.highPrice);
      out.currency = o.priceCurrency || '';
      if (prod.brand) out.details.push({ label: 'Brand', value: typeof prod.brand === 'string' ? prod.brand : prod.brand.name });
      if (prod.sku) out.details.push({ label: 'SKU', value: String(prod.sku) });
      if (prod.category) out.category = String(prod.category).split(/[>/]/).pop().trim();
      if (offers.length > 1 && offers.every((x) => x.name)) out.variants = offers.map((x) => ({ label: x.name, price: num(x.price), stock: /OutOfStock/i.test(x.availability || '') ? 0 : 10 }));
    }
  }

  // 3) Common shop markup (WooCommerce, Daraz-like pages, most themes)
  const h1 = txt(document.querySelector('.product_title, [itemprop="name"], h1'));
  if (!out.name) out.name = h1 || meta('og:title') || document.title;
  if (out.price == null) {
    const del = document.querySelector('.price del .amount, .price del, [class*="price"] del, [class*="original-price"], [class*="old-price"], [class*="compare"]');
    const ins = document.querySelector('.price ins .amount, .price ins, [itemprop="price"], [class*="sale-price"], [class*="current-price"], .pdp-price, [class*="price"]');
    const p1 = num(ins?.getAttribute('content') || txt(ins)); const p0 = num(txt(del));
    if (p1) { if (p0 && p0 > p1) { out.price = p0; out.salePrice = p1; } else out.price = p1; }
  }
  if (out.price == null) out.price = num(meta('product:price:amount') || meta('og:price:amount'));
  if (!out.currency) out.currency = meta('product:price:currency') || meta('og:price:currency') || (/৳|Tk\.?|BDT/i.test(document.body.innerText.slice(0, 20000)) ? 'BDT' : '');
  if (!out.description) {
    const d = document.querySelector('#tab-description, .woocommerce-product-details__short-description, [itemprop="description"], .product-description, #description, [class*="description"]');
    out.description = clean(d?.innerHTML) || meta('og:description') || meta('description');
  }
  document.querySelectorAll('.woocommerce-product-gallery__image a[href], [data-large_image]').forEach((a) => addImg(a.getAttribute('data-large_image') || a.href));
  if (!out.images.length && meta('og:image')) addImg(meta('og:image'));
  // 4) any big picture on the page
  [...document.images]
    .filter((im) => (im.naturalWidth || im.width) >= 300 && (im.naturalHeight || im.height) >= 300 && !/logo|icon|sprite|avatar|banner/i.test(im.src))
    .sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight)
    .forEach((im) => addImg(im.currentSrc || im.src || im.dataset.src));
  if (!out.category) out.category = txt([...document.querySelectorAll('.breadcrumb a, nav[aria-label*="read" i] a, .woocommerce-breadcrumb a')].slice(-1)[0]);
  // spec tables
  if (!out.details.length) {
    document.querySelectorAll('.woocommerce-product-attributes tr, table.specs tr, [class*="spec"] tr').forEach((tr) => {
      const th = txt(tr.querySelector('th, td:first-child')); const td = txt(tr.querySelector('td:last-child'));
      if (th && td && th !== td && out.details.length < 20) out.details.push({ label: th.slice(0, 80), value: td.slice(0, 300) });
    });
  }
  out.name = out.name.replace(/\s*[|–-]\s*[^|–-]{2,40}$/, '').trim(); // drop " | Shop name"
  out.images = out.images.slice(0, 20);
  out.description = out.description.slice(0, 8000);
  return out;
}
