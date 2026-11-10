## Objectif

Axe « dépendances majeures » : débloquer les PR Dependabot frontend, passer Node 20 → 22, vitest 3 → 5 et Next.js 15 → 16.

Sprint **100 % frontend / outillage** : aucun commit `backend/`, aucune migration Flyway, aucune règle métier modifiée.

## Issues traitées

| # | Titre | Taille |
|---|---|---|
| #882 | Débloquer les PR Dependabot frontend et merger les montées mineures | S |
| #883 | Node 20 → 22 en CI et dans l'image frontend | S |
| #884 | vitest et @vitest/coverage-v8 en 5.x | M |
| #885 | Next.js 15 → 16 | L |

## Changements clés

**#882 — Dependabot.** Les 8 PR restaient rouges après `@dependabot rebase` (CI relue sur les SHA rebasés) : le lock régénéré par Dependabot perd `next-intl/node_modules/@swc/helpers` (pair optionnel) et `npm ci` le réclame. Montées mineures appliquées ici avec un lock régénéré par npm 10 : prettier-plugin-tailwindcss 0.8.1, tailwindcss + @tailwindcss/postcss 4.3.5, @radix-ui/react-popover 1.3.1, eslint-plugin-storybook 10.6.6, @testing-library/dom 10.4.2, follow-redirects 1.16.3 (avis élevé GHSA-mrwp-f3q8-3g9p, qui rougit `security` sur `dev`). #880 mergée dans `dev` ; #879 intégrée par cherry-pick (elle ne pouvait pas passer seule, `dev` étant rouge).

**#883 — Node 22.** `ci.yml` (3 `setup-node`, diff validé), `frontend/Dockerfile` (3 étapes), `engines.node >= 22.12.0`, `@types/node` ^22. Recherche des épinglages Node 20 hors `docs/` : seuls ces deux fichiers ; ni `.nvmrc`, ni `.node-version`.

**#884 — vitest 5.1.0** (avec coverage-v8 5.1.0). Ruptures v4 et v5 recensées depuis les guides officiels (tableau dans `docs/memory/sprints/sprint-118/issue-884-done.md`) ; seuls effets : 2 tests retypés (`Mock<() => Promise<void>>`), `.vitest/` ignoré. **177 fichiers / 2359 tests, identique avant/après** ; `coverage/lcov.info` produit.

**#885 — Next 16.4.6**, eslint-config-next 16.4.5, next-intl 4.14.9. React 18 conservé.
- `next lint` retiré → `lint` = `eslint .` ; config ESLint flat native ; clé `eslint` de next.config retirée.
- eslint-plugin-react-hooks 7 : 5 règles dérivées du React Compiler coupées (85 erreurs préexistantes), le reste du preset actif.
- Turbopack par défaut : `dev` = `next dev` ; **`build` = `next build --webpack`** (bundler de production inchangé dans cette montée).
- **SSG préservé** : sans `unstable_rootParams`, next-intl retombait sur `headers()` et les 12 routes `/[locale]/*` sortaient du prérendu → `setRequestLocale` dans le layout `[locale]`. Table des routes identique à Next 15 (48 pages ●).
- `middleware.ts` conservé (convention `proxy` recommandée, l'ancienne reste supportée) ; redirections de locale, garde d'auth et 404 global vérifiés.
- Sans objet : accès synchrones (déjà async), `next/image`, routes parallèles, AMP, `runtimeConfig`, `scroll-behavior` sur `<html>`.
- E2E : le préchargement par segment de Next 16 ne refait plus de requête RSC au clic sur une route SSG ; les portes de squelette (`sprint-90` #629, `sprint-106` dashboard) retiennent désormais le chunk `page-<hash>.js` ; le compte de préchargement de `sprint-106` ignore `/_tree`.

**Hors issue, nécessaire au vert :** `sprint-117-period-zoom-no-drift:196` rougissait sur `dev` depuis le 2026-11-09 sans changement de code (centrage au Trimestre borné par `maxScroll` selon la date) → oracle borné + annotation.

## BR impactées

Aucune.

## Audit tests

`docs/memory/audits/sprint-118-test-coverage.md` : Vitest 2359/2359 avant/après chaque montée ; lint, tsc, format:check, `next build` verts ; E2E ciblée locale 71/71 ×3 contre `next build` + `next start` ; vérification navigateur (connexion, tableau de bord, produits, détail produit, création d'événement, frise).

## Review batch

0 CRITIQUE / 2 MAJEUR / 8 MINEURS — docs et commentaires périmés, tous corrigés ou assumés (`docs/memory/sprints/sprint-118/review-batch.md`).

## À faire au merge (`/sprint end`)

- Fermer #882–#885 et #850 (renvoi vers cette PR) ; #879 se fermera quand son changement sera dans `dev`.
- Follow-ups proposés : lock Dependabot npm ; `middleware.ts` → `proxy.ts` ; build Turbopack ; règles react-hooks 7 ; React 19.

Cohésion : 1.00.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
