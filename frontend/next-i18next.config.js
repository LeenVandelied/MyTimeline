/**
 * Configuration pour next-i18next
 */
module.exports = {
  i18n: {
    // Langues supportées
    locales: ['fr', 'en'],
    // Langue par défaut
    defaultLocale: 'fr',
    // Désactiver la détection automatique pour éviter des problèmes de restitution
    localeDetection: false
  },
  // Configuration minimale pour éviter les erreurs avec React
  react: {
    useSuspense: false
  }
}; 