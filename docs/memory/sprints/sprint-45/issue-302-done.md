# Issue #302 — Garde serveur (middleware) pour les routes connectées — DONE

**Sprint :** 45 · **Vague :** 1 · **Taille :** M · **Modèle :** opus/high · **Domaine :** auth
**Commit :** `f6a3556`

## Objectif

Un anonyme sur `/fr/dashboard` recevait le HTML complet du shell applicatif avant la redirection JS.
Désormais : `307` vers `/<locale>/login`, zéro octet de page protégée rendu.

## Décision appliquée (tranchée par le lead avant spawn)

Vérification de la **présence** du cookie `jwt` uniquement, dans le middleware.
`JwtService` signe en HMAC **symétrique** → partager le secret avec l'Edge y mettrait un secret de
**frappe** de jetons. Appel `/api/auth/me` rejeté (RTT à chaque navigation).
**Limite assumée et écrite dans l'ADR** : un cookie présent mais expiré/forgé passe le middleware ;
`JwtFilter` (401) + `useAuthGuard` rattrapent. **Ce n'est pas une frontière d'autorisation.**

## Fichiers clés

- `frontend/middleware.ts` — **compose** avec `createMiddleware` next-intl (appelé en aval, pas écrasé)
- `frontend/src/lib/auth-guard-paths.ts` — logique pure, zéro import `next/server`/`fs` → Edge-safe et testable sans mock
- `frontend/middleware.test.ts`, `frontend/src/lib/auth-guard-paths.test.ts`, `frontend/e2e/auth-guard.spec.ts`
- `docs/adr/ADR-004-garde-serveur-middleware.md`
- `frontend/vitest.config.mts`, `frontend/vitest.setup.ts`

## BR touchées

BR-AUT-007 (cookie `jwt` — nom **vérifié** dans `JwtFilter.java:48`, non deviné), BR-AUT-011.
Aucune modification backend.

## ÉCART AU PLAN — à trancher par le lead

Segments protégés listés depuis `app/[locale]/(app)/` : `dashboard`, `products`, `timeline`.
**Le subagent a AJOUTÉ `settings`** — hors groupe `(app)`, shell dédié, mais porteur de la même garde
client (`page.tsx:35-39`). Isolé dans une constante séparée `PROTECTED_EXTRA_SEGMENTS` → retrait trivial.
→ **Soumis au security-expert (point e) et au reviewer.**

## Tests

- 47 nouveaux (24 middleware composé + 23 chemins)
- Suite frontend **544/544**, 67/67 fichiers, 12 s, zéro stderr
- `tsc --noEmit` vert ; `next build` vert ; bundle Edge du middleware 46.1 kB
- ⚠ **E2E JAMAIS EXÉCUTÉE** (stack docker down) → le job CI `e2e` est le seul gate réel

## [MEMORY:*] signaux

- `[MEMORY:decision]` Garde serveur = présence cookie `jwt` seule ; secret HMAC symétrique → pas de vérif Edge ; `/auth/me` rejeté (RTT). Limite assumée. Cf. ADR-004.
- `[MEMORY:pitfall]` vitest `server.deps.inline` compare le motif à l'**ID complet** du module — une regex ancrée sur le nom de package (`/^next-intl/`) ne matche jamais ; utiliser `/node_modules[\\/]next-intl[\\/]/`.
- `[MEMORY:pitfall]` Un setup vitest partagé doit garder `typeof window` — sinon tout test `@vitest-environment node` échoue **à la collecte**.
- `[MEMORY:pitfall]` `node_modules` n'est pas partagé entre worktrees → `npm ci` préalable obligatoire.
- `[MEMORY:pitfall]` **RTK ment** sur vitest ET prettier : « PASS (23) FAIL (0) » alors que `success:false` + suite en échec de collecte ; prettier « All files formatted » avec exit 1. Toujours `rtk proxy` ou reporter JSON.
- `[MEMORY:pattern]` Prouver une redirection **serveur** en E2E : `page.request.get({maxRedirects:0})` + assert `307`/`location`. Un `goto` + `expect(url)` passe aussi avec une redirection **client** → ne teste rien.

## Recommandations suite

**RECOMMAND_SECURITY** — auditer :
(a) absence d'open-redirect (query string volontairement non reportée, pas de `?redirect=`)
(b) `new URL(path, request.url)` derrière proxy — risque Host header
(c) exhaustivité des segments protégés (oubli = garde silencieusement inactive)
(d) matcher inchangé `'/((?!api|_next|.*\..*).*)'` — vérifier qu'aucune route protégée n'y échappe via un point dans l'URL
(e) valider/invalider l'ajout de `settings`

**RECOMMAND_FOLLOWUP** —
1. Rien ne synchronise `PROTECTED_APP_SEGMENTS` avec le FS : une nouvelle route sous `(app)` sera non gardée, silencieusement (le test est un rappel, pas un filet).
2. JWT asymétrique (RS256) rendrait la vérification de signature Edge possible.
3. `frontend/.eslintcache` (tracké) réapparaît supprimé dans l'arbre partagé — probablement #283 en concurrence, à trancher au commit.

STATUS: COMPLETED
