import Script from 'next/script';

// Google Analytics 4 + Meta Pixel, switched on from Admin → Store → Marketing.
export default function Analytics({ gaId, pixelId }) {
  const ga = /^G-[A-Z0-9]{4,15}$/i.test(gaId || '') ? gaId : null;
  const px = /^\d{6,20}$/.test(pixelId || '') ? pixelId : null;
  return (
    <>
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}');`}</Script>
        </>
      )}
      {px && (
        <Script id="fbpx" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${px}');fbq('track','PageView');`}</Script>
      )}
    </>
  );
}

// Call from client code for e-commerce events; safe when neither tag is installed.
export function track(event, data = {}) {
  if (typeof window === 'undefined') return;
  const fb = { add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase', view_item: 'ViewContent' }[event];
  try { window.gtag?.('event', event, data); } catch { /* ignore */ }
  try { if (fb) window.fbq?.('track', fb, { value: data.value, currency: 'BDT' }); } catch { /* ignore */ }
}
