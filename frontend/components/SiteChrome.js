'use client';
import { usePathname } from 'next/navigation';

// Landing pages (/lp/...) bring their own slim header and footer, so the store chrome is hidden there.
export default function SiteChrome({ children }) {
  const path = usePathname() || '';
  if (path.startsWith('/lp/')) return null;
  return children;
}
