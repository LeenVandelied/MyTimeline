import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

/**
 * #163 — Proxy même-origine pour l'E2E (et le dev cross-port si souhaité).
 *
 * En dev/E2E le front tourne sur :3000 et l'API Spring sur :8080. Le cookie de
 * session `jwt` est posé en `SameSite=Lax` (profil dev). Or `Lax` n'envoie PAS le
 * cookie sur une requête POST/PATCH/DELETE cross-site initiée par XHR/fetch : le
 * navigateur considère :3000 -> :8080 comme cross-site pour les cookies. Résultat :
 * les GET authentifiés passent (Lax autorise les méthodes sûres) mais les POST
 * (création produit/événement) reçoivent 401. En PRODUCTION le problème n'existe
 * pas (front et API servis sur le même domaine).
 *
 * Pour que l'E2E exerce le VRAI parcours UI sans contourner l'auth, on rend les
 * appels API MÊME-ORIGINE : quand `E2E_API_PROXY_TARGET` est défini (ex.
 * `http://localhost:8080`), Next réécrit `/<proxy>/api/*` vers le backend. Le front
 * pointe alors `NEXT_PUBLIC_API_URL` sur `/api` (même origine :3000) -> le cookie
 * est same-origin et TOUJOURS envoyé. Hors E2E (var absente), aucun rewrite : le
 * comportement de build/prod est INCHANGÉ.
 */
const apiProxyTarget = process.env.E2E_API_PROXY_TARGET

/** @type {import('next').NextConfig} */
const nextConfig = {
  // #37 — build autonome pour l'image Docker : `.next/standalone` embarque un
  // serveur Node minimal + uniquement les deps runtime nécessaires, sans copier
  // tout node_modules dans l'image finale. Neutre hors conteneur (dev/CI inchangés).
  output: 'standalone',
  // #413 (suite) — DRAPEAU EXPÉRIMENTAL ASSUMÉ. #413 a descendu `<html>`/`<body>`
  // sous `app/[locale]/layout.tsx` pour que `<html lang>` suive la locale de la
  // route (WCAG 3.1.1). Effet de bord mesuré : Next exige que le layout RACINE
  // fournisse le document pour servir `/_not-found`, or `app/layout.tsx` ne rend
  // plus que `{children}` → toute URL non matchée répondait 404 avec un document
  // SANS `<html>` ni `<body>` (`NEXT_MISSING_ROOT_TAGS`), écran blanc.
  // Ce drapeau active `app/global-not-found.tsx`, la seule forme Next qui
  // REMPLACE le layout racine sur cette route et rend son propre document.
  // Alternative écartée : remonter `<html>` en racine et lire la locale via
  // `headers()` — cela bascule toute l'app en rendu dynamique et annule le
  // `generateStaticParams()` de `[locale]/layout.tsx` (perte du SSG, 52 pages).
  // Instable par nature : à re-vérifier à chaque bump de Next (15.5.22 ici).
  //
  // ⚠ `package.json` déclare `"next": "^15.2.4"`, une PLAGE : un `npm i` peut
  // installer une version où ce drapeau expérimental a été renommé ou retiré.
  // Next ignore alors silencieusement la clé `experimental` inconnue — pas
  // d'erreur, pas de warning bloquant — et `/_not-found` redevient un document
  // SANS `<html>` (`NEXT_MISSING_ROOT_TAGS`).
  // LE FILET EST UN E2E, PAS L'ÉPINGLAGE : `frontend/e2e/document-lang.spec.ts`
  // (describe « #413 — 404 des URL non matchées ») fait un GET RÉEL sur
  // `/fr/nope`, `/en/nope`, `/es/nope`, `/de/nope` et assert, sur le HTML SERVI
  // avant hydratation : statut 404, balise `<html …lang="…">` présente,
  // `data-testid="global-not-found-screen"` présent, et `<title>` NON VIDE égal
  // à « Ma Timeline ». La disparition du drapeau fait donc rougir 4 tests du
  // job CI `e2e` (check requis). Ne pas supprimer ces tests en croyant qu'ils
  // ne couvrent que #413 : ils sont AUSSI la sentinelle de ce drapeau.
  experimental: {
    globalNotFound: true,
  },
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  ...(apiProxyTarget
    ? {
        async rewrites() {
          return [
            {
              source: '/api/:path*',
              destination: `${apiProxyTarget}/api/:path*`,
            },
          ]
        },
      }
    : {}),
}

export default withNextIntl(nextConfig)
