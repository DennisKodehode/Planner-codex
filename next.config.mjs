import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.pusher.com https://static.cloudflareinsights.com; connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://api.openweathermap.org https://api.open-meteo.com https://maps.googleapis.com https://maps.gstatic.com https://api.openstreetmap.org https://api.opentripmap.com https://api.upstash.io https://api.openai.com https://eu.posthog.com https://app.posthog.com; img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.mapbox.com; style-src 'self' 'unsafe-inline'; font-src 'self' data: https://fonts.gstatic.com; frame-ancestors 'self';",
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'maps.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.opentripmap.com' },
      { protocol: 'https', hostname: 'api.mapbox.com' },
      { protocol: 'https', hostname: 'eu.posthog.com' },
    ],
  },
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
