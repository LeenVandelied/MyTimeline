# Issue #885 — Next.js 15 → 16

## Résumé

Fait par le lead. Commit `c6bf4801`. `next` 15.5.28 → 16.4.6, `eslint-config-next` 15.1.7 → 16.4.5 (épinglé exact),
`next-intl` 4.13.2 → 4.14.9 (peer `next ^16`). React 18 conservé (Next 16 l'accepte, avertissement de dépréciation au
build ; montée React hors périmètre).

**Ruptures du guide officiel** (`docs/01-app/02-guides/upgrading/version-16.mdx`, tag v16.4.2) :
| Rupture | Traitement |
|---|---|
| Node ≥ 20.9, TS ≥ 5.1 | Node 22 (#883), TS 5.8 |
| Turbopack par défaut (`dev` et `build`) | `dev` = `next dev` ; `build` = `next build --webpack` : bundler de production inchangé dans cette montée (le passage du build à Turbopack = follow-up) ; recette locale `playwright.config.ts` → `next dev --webpack` |
| Accès synchrones `params`/`searchParams`/`cookies`/`headers` retirés | sans objet : tout est déjà `await`/`use()` |
| `unstable_rootParams` retiré | **cause d'une régression mesurée** : next-intl retombait sur `headers()`, les 12 routes `/[locale]/*` passaient de ● (SSG) à ƒ. `setRequestLocale(locale)` dans `app/[locale]/layout.tsx` ; `next/root-params` inapplicable (`[locale]` n'est pas paramètre racine, le layout racine est `app/layout.tsx`, #413). Table des routes identique à Next 15 : 48 pages ●, seul `products/[productId]` ƒ |
| `middleware` → `proxy` | `middleware.ts` conservé (convention dépréciée mais supportée ; runtime inchangé). Redirections locale et garde d'auth vérifiées (curl + E2E CI) ; renommage = follow-up |
| `next lint` retiré, clé `eslint` de next.config retirée | `lint` = `eslint .` ; clé retirée ; config flat native (`eslint-config-next/core-web-vitals` + `/typescript`), `FlatCompat` et `@eslint/eslintrc` supprimés |
| eslint-plugin-react-hooks 7 (embarqué) | 85 erreurs préexistantes sur 5 règles dérivées du React Compiler (refs 57, set-state-in-effect 18, preserve-manual-memoization 6, purity 4, incompatible-library 4 avert.) → coupées avec justification ; les autres règles du preset restent actives |
| `next/image` (query strings, `minimumCacheTTL`, `imageSizes`, `qualities`, IP locale, redirections) | sans objet : `next/image` non utilisé |
| Routes parallèles : `default.js` obligatoire | sans objet (aucun slot `@`) |
| `scroll-behavior` sur `<html>` plus surchargé | sans objet : `smooth` seulement sur `.mt-tlv__scroll` |
| `.next/dev` séparé, verrou dev/build | `tsconfig.json` inclut `.next/dev/types` (écrit par Next, figé pour ne plus être réécrit) |
| `next-env.d.ts` (imports `.next/types/*`) | régénéré et ajouté à `.prettierignore` : le job CI `frontend` build avant `format:check` |
| AMP, `runtimeConfig`, `devIndicators`, `dynamicIO`/`useCache` | sans objet |
| `experimental.globalNotFound` | toujours honoré : `/fr/nope` → 404 avec `<html lang="fr">` et `global-not-found-screen` |

## Tests
- Vitest 2359/2359 ; lint, typecheck, format:check verts ; `next build` OK (deux fois, sans réécriture de tsconfig).
- curl contre `next start` : `/` → 307 `/fr` ; `/fr/timeline` anonyme → 307 `/fr/login` ; `/fr/nope` → 404 global.
- Vérification navigateur (navigateur intégré, `next build`+`next start` :3100, backend e2e :8085) : connexion,
  tableau de bord, liste produits, création produit, détail produit, création d'événement, frise produit, frise
  principale ; console sans erreur hors le 401 attendu avant connexion.
- E2E CI : voir audit.

## Recommandations suite
- RECOMMAND_FOLLOWUP: renommer `middleware.ts` → `proxy.ts` (runtime Node imposé, à valider contre la garde d'auth et `middleware.test.ts`) [S | auth/frontend]
- RECOMMAND_FOLLOWUP: passer `next build` à Turbopack (retirer `--webpack`), avec comparaison des références visuelles Linux [S | frontend]
- RECOMMAND_FOLLOWUP: adopter les 5 règles react-hooks 7 coupées (85 occurrences) [M | frontend]
- RECOMMAND_FOLLOWUP: React 18 → 19 (déprécié par Next 16, retiré en 17) [L | frontend]
- Pas de RECOMMAND_SECURITY : la garde d'auth (`middleware.ts`) est inchangée, couverte par `middleware.test.ts` et l'E2E `auth-guard`.

[MEMORY:pitfall] Next 16 + next-intl sans paramètre racine : sans `setRequestLocale`, `NextIntlClientProvider` serveur lit
la locale via `headers()` et TOUTE la branche `[locale]` sort du SSG en silence (build vert) → comparer la table des
routes de `next build` avant/après toute montée de Next.
[MEMORY:decision] Montée Next 16 : `next build --webpack` gardé pour isoler le changement de framework du changement de
bundler ; `middleware.ts` gardé (pas `proxy.ts`).

STATUS: COMPLETED
