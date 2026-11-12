import { SITE } from '@/lib/seo';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/checkout', '/orders', '/cart', '/*?preview=1'] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
