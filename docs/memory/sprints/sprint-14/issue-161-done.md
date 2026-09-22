# Issue #161 — Frontend CVE bumps (axios/next/form-data) — DONE

## Résultat
Commit `d6745f5` (:lock: bump axios/next/form-data — correctifs CVE).
- axios 1.8.4 → 1.18.1
- next 15.2.4 → 15.5.20
- form-data 4.0.2 → 4.0.6
- `package.json` ranges INCHANGÉES (npm update ciblé a suffi ; seul `package-lock.json` diff).

## Vérifications
- `npm audit --production` : **0 critical / 0 high**. Restent 3 moderate transitifs (postcss via next + next-intl) — fix exigerait un next major, hors scope.
- `npm run build` : OK.
- `npm run test` : 70/70 verts (15 fichiers).

## Commits
- `d6745f5` — frontend/package-lock.json (618+/102-)

## Follow-ups / notes non bloquantes
- **RECOMMAND_FOLLOWUP** [triage S | domaine devops] : `npm audit` complet (avec devDeps) reste à 4 high + 1 critical sur la chaîne Storybook/Vitest (vite/vitest/flatted/minimatch/picomatch) — NON production, hors périmètre #161.
- **RECOMMAND_FOLLOWUP** [triage XS | domaine devops] : `frontend/next-env.d.ts` (tracké) est régénéré par Next 15.5 avec un `/// <reference path="./.next/types/routes.d.ts" />` que l'ESLint du projet (`@typescript-eslint/triple-slash-reference`) refuse au pre-commit → le fichier régénéré ne peut pas être commité. Ajouter `next-env.d.ts` à l'ignore ESLint/lint-staged (ou au .gitignore). Discardé ce sprint (régénéré au build, sans impact).

## Recommandations suite
Pas de RECOMMAND_SECURITY/DB/UI — bump de dépendances propre, build/tests/audit prod verts.

STATUS: COMPLETED
