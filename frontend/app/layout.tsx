import { ReactNode } from 'react'

/**
 * Layout RACINE — volontairement TRANSPARENT depuis #413.
 *
 * Le `<html>` / `<body>` et l'intégralité des providers vivent désormais dans
 * `app/[locale]/layout.tsx`. RAISON : ce layout-ci est rendu AU-DESSUS du
 * segment dynamique `[locale]`, et Next.js ne lui passe pas les `params` d'un
 * segment enfant — `locale` y est donc structurellement inaccessible. Tant que
 * la balise `<html>` était posée ici, son `lang` ne pouvait être qu'un littéral
 * (`"fr"`), et toute page `/en/*` `/es/*` `/de/*` était annoncée comme
 * francophone aux technologies d'assistance (violation WCAG 3.1.1).
 *
 * Voies écartées, ne pas les réintroduire :
 *  - lire la locale via `headers()` ici : bascule l'app en rendu DYNAMIQUE et
 *    annule le `generateStaticParams()` de `app/[locale]/layout.tsx` ;
 *  - poser `document.documentElement.lang` après hydratation : le HTML SSR
 *    resterait `fr`, ce qui ne satisfait pas WCAG 3.1.1.
 *
 * Conséquence à connaître : un composant monté ICI n'aurait ni CSS du DS, ni
 * providers, ni `<body>`. C'est aussi pourquoi l'ancien `app/error.tsx` est
 * devenu `app/global-error.tsx` (il rend son propre `<html>`/`<body>`).
 *
 * `metadata` reste ici : Next agrège les métadonnées de TOUS les layouts de la
 * branche et les injecte dans le `<head>`, quel que soit le layout qui porte le
 * `<html>`.
 */
export const metadata = {
  title: 'Ma Timeline',
  description: 'Application de gestion de temps et événements',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
