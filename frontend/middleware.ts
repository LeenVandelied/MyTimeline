import createMiddleware from 'next-intl/middleware';

// Ce middleware gère la redirection basée sur la langue
export default createMiddleware({
  // Liste des langues supportées
  locales: ['fr', 'en'],
  
  // Langue par défaut
  defaultLocale: 'fr',

  // Préfixer tous les chemins avec la locale
  localePrefix: 'always'
});

export const config = {
  // Intercepter toutes les requêtes qui commencent par / sauf celles liées à API, assets, etc.
  matcher: ['/((?!api|_next|.*\\..*).*)']
}; 