import './globals.css';
import './extra.css';
import './v3.css';
import './v4.css';
import Providers from '@/components/Providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { api } from '@/lib/api';
import { CARDS, FOOTERS, HEADERS, SHAPES, THEMES } from '@/lib/theme';
import Analytics from '@/components/Analytics';
import CompareBar from '@/components/CompareBar';
import PromoPopup from '@/components/PromoPopup';
import ChatWidgets from '@/components/ChatWidgets';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Ghorer Bazar - Pure & Natural Foods', template: '%s · Ghorer Bazar' },
  description: 'Order pure honey, dates, nuts, ghee and spices. Delivery across all 64 districts of Bangladesh.',
  openGraph: { type: 'website', siteName: 'Ghorer Bazar', locale: 'en_BD' },
  robots: { index: true, follow: true },
};
export const viewport = { themeColor: '#f2f3ee' };

const ok = (v, list, d) => (list.includes(v) ? v : d);

export default async function RootLayout({ children }) {
  // render the saved theme on the server so the page never flashes the default colours
  const settings = await api('/settings').catch(() => null);
  const a = settings?.appearance || {};
  const style = {};
  if (/^#[0-9a-f]{6}$/i.test(a.accent || '')) style['--forest'] = a.accent;
  if (a.glass >= 0) style['--blur-px'] = `${a.glass}px`;

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
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="ambient" aria-hidden="true"><i /><i /><i /></div>
        <Providers initialSettings={settings || undefined}>
          <Header />
          <main className="wrap main">{children}</main>
          <Footer settings={settings} />
          <CompareBar />
          <PromoPopup />
          <ChatWidgets />
        </Providers>
        <Analytics gaId={settings?.integrations?.gaId} pixelId={settings?.integrations?.fbPixelId} />
      </body>
    </html>
  );
}
