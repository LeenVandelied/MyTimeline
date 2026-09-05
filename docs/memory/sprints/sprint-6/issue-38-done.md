# Issue #38 — done

**Commit :** `343461b` (:construction_worker: #38 — CI Actions (backend verify + frontend) + dependabot + CODEOWNERS)

## Résumé
- **`.github/workflows/ci.yml`** : 2 jobs **parallèles** (pas de `needs`).
  - backend : ubuntu-latest, setup-java@v4 temurin **java-21** `cache: maven`, `./mvnw --batch-mode --no-transfer-progress verify` (Testcontainers/Docker natif), env `SKIP_DELEGATION=1`.
  - frontend : setup-node@v4 **node-20** `cache: npm` (`cache-dependency-path: frontend/package-lock.json`), `npm ci` → `build` → `test` (Vitest) → `typecheck` → `lint`.
  - triggers : `pull_request` [dev,main] + `push` [dev,main] (couvre PR sprint/6→dev). `concurrency.cancel-in-progress`. `permissions: contents:read`.
- **`dependabot.yml`** : maven `/backend` + npm `/frontend` + github-actions `/`, weekly.
- **`CODEOWNERS`** : `@LeenVandelied` (défaut + /backend + /frontend + /.github).
- **Branch protection** : procédure `gh api` documentée en tête de ci.yml, **NON activée** (volontaire — l'activer avant 1er vert bloquerait la PR de ce sprint).
- Validation YAML faite (ci.yml + dependabot.yml parsés OK). Playwright/Storybook hors CI (0 spec E2E).

## Vérifs lead
- commit présent ✓ · 3 fichiers .github ✓ · YAML valides (ruby) ✓ · triggers PR+push dev/main ✓ · java21/node20 ✓ · concurrency ✓ · branch protection non activée ✓

## [MEMORY:*] signaux
- [MEMORY:pattern] CI monorepo backend+frontend < 10 min : 2 jobs parallèles sans `needs` + caches natifs (setup-java cache:maven, setup-node cache:npm) + `concurrency.cancel-in-progress`. Anti-pattern : chaîner avec `needs` ou Playwright install pour 0 spec.
- [MEMORY:pitfall] activer branch protection AVANT 1er run vert bloque tous les merges (dont la PR qui pose la CI) → documenter `gh api`, activer manuellement après 1er vert.
- [MEMORY:pitfall] header commitlint ≤ 100c (gitmoji #29) : message 104c rejeté → raccourcir le header dès le départ.

## Recommandations suite (→ triage Phase 4 /sprint end)
- RECOMMAND_FOLLOWUP : **activer branch protection** sur `dev` et `main` après le 1er run vert (statut CI backend+frontend requis + 1 review). [triage XS | devops] — action dev post-merge.
- RECOMMAND_FOLLOWUP : ajouter Playwright à la CI quand des specs E2E existeront (S8). [triage S | devops]

## Note
CI non exécutable en local — **premier vrai run au push de la PR sprint/6→dev** (Phase 9). À surveiller : Testcontainers/Docker sur le runner, durée < 10 min.

STATUS: COMPLETED
