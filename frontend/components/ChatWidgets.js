'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useApp } from './Providers';

const WhatsApp = (p) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M3 21l1.7-5A9 9 0 1 1 8 19.300L3 21Z" /><path d="M9 8.500c0 3.500 3 6.500 6.500 6.500l1-1.500-2-1-1 .8c-.8-.3-1.800-1.300-2.100-2.100l.8-1-1-2L9 8.500Z" /></svg>;
const Messenger = (p) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M12 3C7 3 3 6.800 3 11.500c0 2.600 1.200 4.900 3.200 6.400V21l3-1.700c.9.200 1.800.4 2.800.4 5 0 9-3.800 9-8.500S17 3 12 3Z" /><path d="m7.500 13.500 3-3 2 2 3-3" /></svg>;

// Live-chat widget (tawk.to or Crisp) plus optional floating WhatsApp / Messenger buttons. Configured in Admin → Store & tracking.
export default function ChatWidgets() {
  const { settings } = useApp();
  const path = usePathname();
  const ig = settings.integrations || {};
  if (path.startsWith('/admin')) return null;
  const tawk = ig.chat === 'tawk' && /^[a-f0-9]{24}$/i.test(ig.tawkProperty || '');
  const crisp = ig.chat === 'crisp' && /^[a-f0-9-]{36}$/i.test(ig.crispId || '');
  const wa = /^\d{10,15}$/.test(ig.whatsapp || '') ? ig.whatsapp : null;
  const ms = /^[A-Za-z0-9.]{3,60}$/.test(ig.messenger || '') ? ig.messenger : null;
  return (
    <>
      {tawk && <Script id="tawk" strategy="lazyOnload">{`var Tawk_API=Tawk_API||{},Tawk_LoadStart=new Date();(function(){var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];s1.async=true;s1.src='https://embed.tawk.to/${ig.tawkProperty}/${/^[a-z0-9]{1,20}$/i.test(ig.tawkWidget || '') ? ig.tawkWidget : 'default'}';s1.charset='UTF-8';s1.setAttribute('crossorigin','*');s0.parentNode.insertBefore(s1,s0);})();`}</Script>}
      {crisp && <Script id="crisp" strategy="lazyOnload">{`window.$crisp=[];window.CRISP_WEBSITE_ID="${ig.crispId}";(function(){var d=document;var s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`}</Script>}
      {(wa || ms) && (
        <div className={'float-chat' + (tawk || crisp ? ' above' : '')}>
          {ms && <a href={`https://m.me/${ms}`} target="_blank" rel="noreferrer" className="fc messenger" aria-label="Chat on Messenger"><Messenger /></a>}
          {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent('Hello! I have a question about my order.')}`} target="_blank" rel="noreferrer" className="fc whatsapp" aria-label="Chat on WhatsApp"><WhatsApp /></a>}
        </div>
      )}
    </>
  );
}
