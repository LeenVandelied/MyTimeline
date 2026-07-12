import createMiddleware from 'next-intl/middleware';

import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/i18n/locales';

// Ce middleware gère la redirection basée sur la langue
export default createMiddleware({
  // Liste des langues supportées (source de vérité unique — #235)
  locales: [...SUPPORTED_LOCALES],

  // Langue par défaut
  defaultLocale: DEFAULT_LOCALE,

  // Préfixer tous les chemins avec la locale
  localePrefix: 'always'
});

export const config = {
  // Intercepter toutes les requêtes qui commencent par / sauf celles liées à API, assets, etc.
  matcher: ['/((?!api|_next|.*\\..*).*)']
}; 