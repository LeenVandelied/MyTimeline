import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    // Désactiver la vérification ESLint pendant la compilation
    ignoreDuringBuilds: true,
  }
};

export default withNextIntl(nextConfig); 