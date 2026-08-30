import type { Metadata } from 'next'

import GlobalNotFoundScreen from './global-not-found-screen'

/**
 * #413 (suite) — 404 des URL NON MATCHÉES, rendue hors de tout layout.
 *
 * POURQUOI CE FICHIER EXISTE. #413 a descendu `<html>` / `<body>` dans
 * `app/[locale]/layout.tsx` (seul endroit qui connaisse `locale`, pour que
 * `<html lang>` soit correct dans le HTML SERVI — WCAG 3.1.1). Or Next exige
 * que le layout RACINE fournisse le document pour servir la route interne
 * `/_not-found` : `app/layout.tsx` ne rendant plus que `{children}`, toute URL
 * non matchée (`/en/nope`) répondait bien 404 mais avec un document SANS
 * `<html>` ni `<body>` (`NEXT_MISSING_ROOT_TAGS`) — écran blanc.
 *
 * `global-not-found` est la seule forme Next qui REMPLACE le layout racine sur
 * `/_not-found` et rend donc son PROPRE document (cf.
 * `next/dist/build/webpack/loaders/next-app-loader` : « if global-not-found is
 * in definedFilePaths, remove root layout for /_not-found »). Elle exige
 * `experimental.globalNotFound: true` (cf. `next.config.mjs`).
 *
 * DEUX CONTOURNEMENTS MESURÉS INEFFICACES, ne pas les rejouer :
 *  - `app/not-found.tsx` portant son propre `<html>` : PRÉREND correctement
 *    (`_not-found.html` complet) mais N'EST PAS SERVI au runtime ;
 *  - attrape-tout `app/[locale]/[...rest]/page.tsx` appelant `notFound()` : la
 *    route est bien atteinte, mais `notFound()` ÉCHAPPE à
 *    `[locale]/not-found.tsx` et remonte au boundary racine.
 *
 * PÉRIMÈTRE. Ce fichier ne remplace PAS `app/[locale]/not-found.tsx`, qui reste
 * l'écran des `notFound()` déclenchés PAR une page (rendu, lui, dans le
 * `NextIntlClientProvider`, donc entièrement traduit). Celui-ci ne couvre que
 * ce qui n'atteint aucune route.
 *
 * ── POURQUOI CE FICHIER EST UN SERVER COMPONENT QUI NE REND (PRESQUE) RIEN ──
 *
 * Retirer le layout racine de `/_not-found` a AUSSI retiré la `metadata` qu'il
 * portait (`app/layout.tsx`, `title: 'Ma Timeline'`) : l'onglet de toute URL non
 * matchée n'avait plus de `<title>`. Régression réelle de #413, corrigée ici.
 *
 * Or seul un Server Component peut exporter `metadata`, et l'écran a besoin
 * d'un `useEffect` (résolution de la locale, cf. `global-not-found-screen.tsx`).
 * D'où la scission : ce fichier-ci porte `metadata`, l'enfant client porte tout
 * le rendu, `<html>` / `<body>` inclus — la stratégie de rendu est INCHANGÉE
 * (`/_not-found` reste PRÉRENDU statiquement, décompte `52/52`).
 *
 * ⚠ TITRE NON LOCALISÉ, ET C'EST UN CHOIX. `metadata` est résolue au BUILD, côté
 * serveur, sur une page statique unique servie pour les 4 locales : il n'y a ici
 * ni `params` ni URL. Les deux seules voies vers un titre localisé sont fermées —
 * `headers()` sortirait `/_not-found` du prérendu statique (mesuré sur #413), et
 * `generateMetadata()` n'y a pas davantage de locale. On restaure donc exactement
 * le titre d'avant #413. Ne pas « améliorer » ce point sans re-mesurer le
 * décompte `Generating static pages (52/52)`.
 */
export const metadata: Metadata = {
  title: 'Ma Timeline',
  description: 'Application de gestion de temps et événements',
}

export default function GlobalNotFound() {
  return <GlobalNotFoundScreen />
}
