# Issue #889 — `middleware.ts` → `proxy.ts`

## Résumé
Fait par le lead. Commit `d3839c13`. `git mv` de `middleware.ts`/`middleware.test.ts` vers
`proxy.ts`/`proxy.test.ts`, export nommé `proxy` (guide Next 16 + codemod `middleware-to-proxy`). Aucun flag
`skipMiddlewareUrlNormalize`/`experimental.middleware*` dans `next.config.mjs`. Le proxy tourne sur le runtime **Node**
(non configurable) : en-tête ajouté dans `proxy.ts` (les mentions « Edge » des modules importés décrivent une contrainte
de portabilité qu'ils respectent toujours). Références de fichier mises à jour (18 fichiers, dont specs E2E et libs),
ADR-004 amendé. `ci.yml` cite encore `middleware.ts` dans 2 commentaires : non modifié (workflow = accord explicite requis).

## Tests
- `proxy.test.ts` + `src/lib` + `src/i18n` : 493/493.
- `next build` : `ƒ Proxy (Middleware)` ; `next start` : `/` → 307 `/fr`, `/fr/timeline` anonyme → 307 `/fr/login`,
  `/dashboard` → `/fr/dashboard`, `/fr/%64ashboard` → login, `/fr/nope` → 404.
- E2E `auth-guard`, `auth-signature` : suite complète (audit).

## Recommandations suite
- Pas de RECOMMAND_SECURITY : logique de garde, matcher et vérification RS256 inchangés ; seul le runtime change (Node).
- RECOMMAND_FOLLOWUP: retirer `middleware.ts` des 2 commentaires de `.github/workflows/ci.yml` (accord workflow requis) [XS | devops]

STATUS: COMPLETED
