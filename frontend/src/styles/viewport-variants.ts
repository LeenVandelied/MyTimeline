import plugin from 'tailwindcss/plugin'

// Chemin relatif : Tailwind charge ce fichier hors de Next, sans l'alias `@/`.
import { DASHBOARD_LANDSCAPE_QUERY, DASHBOARD_LANDSCAPE_VARIANT } from '../lib/breakpoints'

/**
 * #643 — Variantes Tailwind tirées des seuils de hauteur de `lib/breakpoints.ts`
 * (chargé par `@plugin` dans `globals.css`). Une feuille CSS ne peut pas lire une
 * constante TS : la requête est construite une seule fois, dans le module des seuils.
 */
export default plugin(({ addVariant }) => {
  addVariant(DASHBOARD_LANDSCAPE_VARIANT, `@media ${DASHBOARD_LANDSCAPE_QUERY}`)
})
