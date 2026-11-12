import Script from 'next/script';
import HeadScripts from './HeadScripts';

// Tracking tags from Admin → Store & tracking: Google Tag Manager, Google Analytics 4, Google Ads,
// Meta Pixel, TikTok Pixel and Microsoft Clarity. Each one loads only when its ID is filled in.
const valid = {
  ga: (v) => /^G-[A-Z0-9]{4,15}$/i.test(v || ''),
  gtm: (v) => /^GTM-[A-Z0-9]{4,12}$/i.test(v || ''),
  ads: (v) => /^AW-\d{6,15}$/i.test(v || ''),
  label: (v) => /^[A-Za-z0-9_-]{4,40}$/.test(v || ''),
  px: (v) => /^\d{6,20}$/.test(v || ''),
  tt: (v) => /^[A-Z0-9]{10,30}$/i.test(v || ''),
  clarity: (v) => /^[a-z0-9]{6,20}$/i.test(v || ''),
};

export default function Analytics({ ig = {} }) {
  const ga = valid.ga(ig.gaId) ? ig.gaId : null;
  const gtm = valid.gtm(ig.gtmId) ? ig.gtmId : null;
  const ads = valid.ads(ig.adsId) ? ig.adsId : null;
  const label = ads && valid.label(ig.adsLabel) ? ig.adsLabel : null;
  const px = valid.px(ig.fbPixelId) ? ig.fbPixelId : null;
  const tt = valid.tt(ig.tiktokPixelId) ? ig.tiktokPixelId : null;
  const clarity = valid.clarity(ig.clarityId) ? ig.clarityId : null;
  const tagId = ga || ads;
  return (
    <>
      <Script id="gb-cfg" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];window.__gb=${JSON.stringify({ ads, label })};`}</Script>
      {gtm && (
        <>
          <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}</Script>
          <noscript><iframe src={`https://www.googletagmanager.com/ns.html?id=${gtm}`} height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} title="gtm" /></noscript>
        </>
      )}
      {tagId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${tagId}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());${ga ? `gtag('config','${ga}');` : ''}${ads ? `gtag('config','${ads}');` : ''}`}</Script>
        </>
      )}
      {px && (
        <Script id="fbpx" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${px}');fbq('track','PageView');`}</Script>
      )}
      {tt && (
        <Script id="ttpx" strategy="afterInteractive">{`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tt}');ttq.page();}(window,document,'ttq');`}</Script>
      )}
      {clarity && (
        <Script id="clarity" strategy="afterInteractive">{`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarity}");`}</Script>
      )}
      {ig.headScripts ? <HeadScripts html={ig.headScripts} /> : null}
    </>
  );
}

const FB = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', add_payment_info: 'AddPaymentInfo', purchase: 'Purchase', search: 'Search', lead: 'Lead' };
const TT = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', add_payment_info: 'AddPaymentInfo', purchase: 'CompletePayment', search: 'Search' };

// E-commerce events for every installed tag; safe to call when none is installed.
// data: { value, items: [{ item_id, item_name, price, quantity }], transaction_id }; opts.eventId de-duplicates with the server (Meta CAPI).
export function track(event, data = {}, { eventId } = {}) {
  if (typeof window === 'undefined') return;
  const items = data.items || [];
  const value = Number(data.value) || items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const ecommerce = { currency: 'BDT', value, items, ...(data.transaction_id && { transaction_id: data.transaction_id }), ...(data.coupon && { coupon: data.coupon }), ...(data.shipping !== undefined && { shipping: data.shipping }) };
  try { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ ecommerce: null }); window.dataLayer.push({ event, ecommerce }); } catch { /* ignore */ }
  try { window.gtag?.('event', event, ecommerce); } catch { /* ignore */ }
  try {
    const g = window.__gb || {};
    if (event === 'purchase' && g.ads && g.label) window.gtag?.('event', 'conversion', { send_to: `${g.ads}/${g.label}`, value, currency: 'BDT', transaction_id: data.transaction_id });
  } catch { /* ignore */ }
  try {
    if (FB[event] && window.fbq) {
      const payload = { value, currency: 'BDT', content_type: 'product', content_ids: items.map((i) => i.item_id), contents: items.map((i) => ({ id: i.item_id, quantity: i.quantity || 1, item_price: i.price })), num_items: items.reduce((n, i) => n + (i.quantity || 1), 0), ...(data.search_term && { search_string: data.search_term }) };
      if (eventId) window.fbq('track', FB[event], payload, { eventID: eventId }); else window.fbq('track', FB[event], payload);
    }
  } catch { /* ignore */ }
  try { if (TT[event]) window.ttq?.track(TT[event], { value, currency: 'BDT', content_type: 'product', contents: items.map((i) => ({ content_id: i.item_id, content_name: i.item_name, quantity: i.quantity || 1, price: i.price })) }, eventId ? { event_id: eventId } : undefined); } catch { /* ignore */ }
}

// GA4-style item from a cart line or product.
export const gaItem = (x) => ({ item_id: String(x.product || x._id), item_name: x.name, price: x.price, quantity: x.qty || 1, ...(x.variantLabel && { item_variant: x.variantLabel }) });
