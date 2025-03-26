/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  i18n: {
    locales: ['fr', 'en'],
    defaultLocale: 'fr',
    localeDetection: false
  },
  // Ignorer les erreurs TypeScript pendant le build
  typescript: {
    ignoreBuildErrors: true
  }
};

module.exports = nextConfig;