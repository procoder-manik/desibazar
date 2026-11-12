/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

// Fail the production build early if the API address is missing; otherwise the site silently
// falls back to http://localhost:5001/api and every page shows "Failed to fetch".
if (process.env.NODE_ENV === 'production') {
  const api = process.env.NEXT_PUBLIC_API_URL || '';
  const onCI = process.env.CI || process.env.CF_PAGES || process.env.VERCEL || process.env.WORKERS_CI;
  if (!api || (onCI && /localhost|127\.0\.0\.1/.test(api))) {
    throw new Error('NEXT_PUBLIC_API_URL must be set to your live API (e.g. https://api.shop.com/api) before building.');
  }
  if (!process.env.NEXT_PUBLIC_SITE_URL) console.warn('Warning: NEXT_PUBLIC_SITE_URL is not set; sitemap and SEO links will point to localhost.');
}

module.exports = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
