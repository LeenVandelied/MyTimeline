# Issue #882 — Débloquer les PR Dependabot frontend et merger les montées mineures

## Résumé

Fait par le lead (pas de fullstack-dev : config pure, aucun code métier).

**Diagnostic.** Après `@dependabot rebase` (2026-11-09 22:28), CI relue sur les SHA rebasés : les 8 PR frontend
restent rouges (`frontend` + `e2e`, et `security` sur 6 d'entre elles). Cause : la régénération du lock par
Dependabot retire `next-intl/node_modules/@swc/helpers` (pair optionnel de `@swc/core`), que `npm ci` (npm 10 en CI)
réclame (`Missing: @swc/helpers@0.5.24 from lock file`). Chaque rebase reproduit l'erreur : merger en l'état est
impossible. `security` : avis élevé `follow-redirects` 1.16.0-1.16.1 (GHSA-mrwp-f3q8-3g9p), présent aussi sur `dev`.

**Correction.** Les 5 montées mineures appliquées dans le sprint avec un lock régénéré par npm 10 (`204d3b58`) :
prettier-plugin-tailwindcss 0.8.1 (2 fichiers reformatés, `scrollbar-none` trié), tailwindcss +
@tailwindcss/postcss 4.3.5 (alignés), @radix-ui/react-popover 1.3.1, eslint-plugin-storybook 10.6.6,
@testing-library/dom 10.4.2, follow-redirects 1.16.3.
`base-layer.test.ts` : Tailwind 4.2+ émet `@layer properties;` avant `@layer theme, base, components, utilities;` ;
l'ordre des layers est désormais lu sur toutes les instructions (règle CSS de première apparition).

**PR Dependabot.** #846 #848 #851 #852 #854 fermées avec le diagnostic et un renvoi vers #887 (accord explicite de
l'utilisateur). #880 mergée dans `dev`. #879 : rebasée, puis rouge sur les deux défauts préexistants de `dev`
(e2e daté + follow-redirects) ; son commit est cherry-pické dans le sprint (`55a89660`). Sa fermeture a été refusée par
le garde-fou (l'accord portait sur un merge) : elle reste ouverte, Dependabot la fermera quand #887 sera dans `dev`.

**`dev` rouge à la reprise.** e2e du merge S117 (`52a099db`) rouge sur un téléchargement Google Fonts (`next/font`,
réseau), puis rouge déterministe depuis le 2026-11-09 sur `sprint-117-period-zoom-no-drift:196` (oracle dépendant de
la date, corrigé dans le sprint, `73a98a23`).

## Tests
Vitest 177 fichiers / 2359 tests (identique à la base) ; lint, typecheck, format:check verts ; `npm audit --omit=dev
--audit-level=high` : 0.

## Recommandations suite
- Pas de RECOMMAND_DB_EXPERT / SECURITY / UI_DESIGN : aucune migration, aucune surface auth, aucun composant neuf.
- RECOMMAND_FOLLOWUP: Dependabot régénère un lock que `npm ci` refuse (pair optionnel imbriqué) — toute future PR npm
  rougira de même ; piste : `versioning-strategy`/regroupement, ou fixer `@swc/helpers` en dépendance directe [S | devops]

[MEMORY:pitfall] PR Dependabot npm rouges après rebase : le lock régénéré par Dependabot perd un pair optionnel imbriqué
(`next-intl/node_modules/@swc/helpers`) que `npm ci` exige → appliquer la montée en local (`npm install`) au lieu de
re-rebaser.

STATUS: COMPLETED
