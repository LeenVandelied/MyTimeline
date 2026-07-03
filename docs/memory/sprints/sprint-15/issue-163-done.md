# Issue #163 — DONE

**Titre :** [FEATURE] E2E Playwright golden-path + job CI
**Vague :** V3 | **Taille :** M | **Modèle :** opus-high
**Commits :** 952533a
**Note recovery :** subagent crashé 2× (API Error: Overloaded). Travail partiel récupéré depuis le working tree + finalisé/vérifié par le lead (spawn-ref-163.txt + briefing conservés).

## Résumé
Golden path E2E full-stack : inscription → connexion → produit + événement (single) → vérif timeline. Plus job CI `e2e` qui lève la stack complète.

## Fichiers
- `frontend/e2e/golden-path.spec.ts` (NEW, 1 test, data-testid uniquement)
- `.github/workflows/ci.yml` (nouveau job `e2e` ; jobs backend/frontend inchangés)
- testids ajoutés (runtime) :
  - dashboard : `dashboard`, `dashboard-products-count`
  - produits : `add-product-button`, `product-drawer-form`, `product-name-input`, `product-category-trigger`, `product-category-option-${id}`, `product-first-event-date`, `product-submit`
  - timeline : `timeline-calendar`, `timeline-resource-row`, `timeline-resource-title`, `timeline-event`
  - auth : réutilise ceux de S8 #53 (register-*/login-*)

## Design job CI `e2e`
- Postgres 16 en service container (DB `eventmanager`, user `eventuser`, healthcheck pg_isready).
- Backend : `mvnw -DskipTests package` puis `java -jar` en fond, profil `dev`, port 8080, env DB_* + JWT_SECRET explicites. Flyway rejoue V1..Vn.
- Readiness poll sur `GET /api/auth/me` (401 = up) avant Playwright, timeout ~90s.
- Frontend lancé par le `webServer` Playwright (`npm run dev`), `NEXT_PUBLIC_API_URL=http://localhost:8080/api` au runtime.
- `npx playwright install --with-deps chromium`. Upload report + backend.log en cas d'échec.
- Ne modifie pas les jobs existants, n'active pas la branch protection.

## Workaround catégorie (documenté dans le spec)
Aucune catégorie seedée par Flyway + pas d'UI de création de catégorie → un user neuf a 0 catégorie et ne peut pas créer de produit via l'UI seule. Le spec seed 1 catégorie via `page.request.post('/api/categories')` (cookie JWT du login UI partagé) — setup de test, hors parcours UI.

## Vérifications (lead)
- `tsc --noEmit` : OK
- `npm run lint` : OK (après revert d'un churn auto-généré `next-env.d.ts`)
- `next build` : OK (warning bénin workspace-root multi-lockfiles)
- `playwright test --list` : 1 test collecté OK
- ⚠ **Run E2E complet NON exécuté en local** (nécessite Docker Postgres + backend + frontend simultanés ; non monté dans le contexte lead). Validation réelle = job CI `e2e` sur la PR. À surveiller au 1er run PR.

## [MEMORY:*] signaux
- [MEMORY:pattern] E2E full-stack en CI GitHub Actions : Postgres service container + backend jar en fond (profil dev, DB_*/JWT_SECRET explicites) + readiness poll sur endpoint 401 + frontend via webServer Playwright. NEXT_PUBLIC_* lu au runtime en `next dev`.
- [MEMORY:pitfall] `next dev`/`next build` réécrit `next-env.d.ts` (ajout `/// <reference path="./.next/types/routes.d.ts" />`) → casse `npm run lint` (@typescript-eslint/triple-slash-reference). Revert le fichier avant commit.

## Recommandations suite
- RECOMMAND_FOLLOWUP: pas d'UI de création de catégorie — un user neuf ne peut pas créer de produit sans seed API. Envisager une catégorie système seedée par Flyway OU une UI de création de catégorie. [triage M | domaine categories]
- RECOMMAND_FOLLOWUP: surveiller le 1er run du job `e2e` sur la PR (flaky potentiel, run E2E jamais exécuté end-to-end en local). [triage S | domaine transversal]

STATUS: COMPLETED
