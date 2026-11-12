import './globals.css';
import './extra.css';
import './v3.css';
import './v4.css';
import './v5.css';
import Providers from '@/components/Providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SiteChrome from '@/components/SiteChrome';
import { CARDS, FOOTERS, HEADERS, SHAPES, THEMES } from '@/lib/theme';
import { loadSettings, SITE } from '@/lib/seo';
import Analytics from '@/components/Analytics';
import CompareBar from '@/components/CompareBar';
import PromoPopup from '@/components/PromoPopup';
import ChatWidgets from '@/components/ChatWidgets';

// Site-wide SEO from Admin → SEO: default title, "%s | Store" template, description, sharing image and
// the Google Search Console / Bing / Facebook verification tags.
export async function generateMetadata() {
  const s = await loadSettings();
  const name = s?.store?.name || 'Desi Bazar';
  const seo = s?.seo || {};
  const ig = s?.integrations || {};
  const home = seo.pages?.home || {};
  const title = home.title || seo.title || `${name}${s?.store?.tagline ? ` - ${s.store.tagline}` : ''}`;
  const description = home.description || seo.description || 'Order online with delivery across all 64 districts of Bangladesh. Cash on delivery available.';
  const image = home.image || seo.image;
  return {
    metadataBase: new URL(SITE),
    title: { default: title, template: seo.titleTemplate || `%s · ${name}` },
    description,
    ...(seo.keywords && { keywords: seo.keywords }),
    applicationName: name,
    openGraph: { type: 'website', siteName: name, locale: 'en_BD', title, description, ...(image && { images: [{ url: image }] }) },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, ...(image && { images: [image] }) },
    robots: { index: true, follow: true },
    verification: {
      ...(ig.gscVerification && { google: ig.gscVerification }),
      other: {
        ...(ig.bingVerification && { 'msvalidate.01': ig.bingVerification }),
        ...(ig.fbDomainVerification && { 'facebook-domain-verification': ig.fbDomainVerification }),
      },
    },
  };
}
export const viewport = { themeColor: '#f2f3ee' };

const ok = (v, list, d) => (list.includes(v) ? v : d);

export default async function RootLayout({ children }) {
  // render the saved theme on the server so the page never flashes the default colours
  const settings = await loadSettings();
  const a = settings?.appearance || {};
  const style = {};
  if (/^#[0-9a-f]{6}$/i.test(a.accent || '')) style['--forest'] = a.accent;
  if (a.glass >= 0) style['--blur-px'] = `${a.glass}px`;
  const org = settings && {
    '@context': 'https://schema.org', '@type': 'OnlineStore', name: settings.store?.name, url: SITE,
    ...(settings.store?.phone && { telephone: settings.store.phone }), ...(settings.store?.email && { email: settings.store.email }),
    address: settings.store?.address ? { '@type': 'PostalAddress', streetAddress: settings.store.address, addressCountry: 'BD' } : undefined,
    potentialAction: { '@type': 'SearchAction', target: `${SITE}/shop?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
  };

  return (
    <html lang="en"
      data-theme={ok(a.theme, Object.keys(THEMES), 'sage')}
      data-shape={ok(a.shape, Object.keys(SHAPES), 'round')}
      data-header={ok(a.header, Object.keys(HEADERS), 'floating')}
      data-card={ok(a.card, Object.keys(CARDS), 'glass')}
      data-footer={ok(a.footer, Object.keys(FOOTERS), 'classic')}
      style={style}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {org && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org).replace(/</g, '\\u003c') }} />}
      </head>
      <body>
        <div className="ambient" aria-hidden="true"><i /><i /><i /></div>
        <Providers initialSettings={settings || undefined}>
          <SiteChrome><Header /></SiteChrome>
          <main className="wrap main">{children}</main>
          <SiteChrome><Footer settings={settings} /></SiteChrome>
          <CompareBar />
          <PromoPopup />
          <ChatWidgets />
        </Providers>
        <Analytics ig={settings?.integrations || {}} />
      </body>
    </html>
  );
}
