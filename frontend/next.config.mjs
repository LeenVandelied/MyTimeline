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
