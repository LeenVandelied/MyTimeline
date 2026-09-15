# Audit tests — Sprint 26

> Généré en fin de Phase 6 (/sprint start). Résilience réseau + pages d'états système.
> Les deux issues sont **transversales frontend, 0 BR métier** → pas de flux cross-system,
> donc pas d'exigence E2E métier bloquante. Aucun marqueur bloquant de couverture BR ici.

## Couverture par BR-XX

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest/RTL frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| — | #76 bus réseau + bannière offline/timeout/500 | NON | ⚠ N/A | ⚠ N/A | ✅ | ⏳ suivi | N/A |
| — | #57 pages d'états 404/403/500/vide/loading | NON | ⚠ N/A | ⚠ N/A | ✅ | ⏳ suivi | N/A |

Aucune BR impactée (features transversales UI, hors domaine métier). Cross-system flow = NON pour les deux → E2E métier non requis. E2E parcours = **suivi post-merge** (`/create-e2e`, cf. §Coverage E2E).

## Tests créés (frontend, Vitest + RTL)
- `frontend/src/components/shared/OfflineBanner.test.tsx` (#76) — 8 tests : offline→role=status+pas de bouton, timeout/5xx→role=alert+Réessayer, priorité offline, retour online efface sans action, retrying visible, retry résout.
- `frontend/src/services/apiClient.test.ts` (#76) — +2 tests classification timeout(ECONNABORTED)/server-error(≥500) ; exemption multipart (#215) préservée.
- `frontend/src/components/shared/EmptyState.test.tsx`, `LoadingSkeleton.test.tsx`, `StateScreen.test.tsx` (#57).
- `frontend/app/[locale]/not-found.test.tsx`, `frontend/app/[locale]/error.test.tsx`, `frontend/app/error.test.tsx` (#57) — rendu 404/403/500, reset câblé, clair+sombre.

## Résultats runs (post-fixups review, HEAD 6032d97)
- Backend : 280 tests, 280 passed, 0 failed (inchangé — sprint 100% frontend).
- Frontend : **383 tests, 383 passed, 0 failed** (base dev = 344 → +39 tests S26).
- `next build` : **exit 0, 26/26 pages statiques générées**, 0 erreur prerender (régression SSG #76 détectée puis corrigée, cf. commit 7ad5f36).
- E2E Playwright : **non exécutable en local** (binaire navigateur absent — `npx playwright install`). Tourne en CI (job `test:e2e` de ci.yml). 10 specs existants (auth/settings/golden-path) — aucun ne couvre les composants S26.

## Coverage E2E (Phase 8 — heuristique review-protocol A.4)
10 nouveaux `data-testid` livrés, **0 couvert par un spec `frontend/e2e/`** :
`network-banner`, `network-banner-retry`, `error-retry`, `error-home-link`, `global-error-retry`, `global-error-home-link`, `not-found-home-link`, `state-screen-code`, `loading-skeleton-item`, `empty-icon`.
→ **Suivi (non bloquant) : `/create-e2e <PR>` après merge** — parcours offline réel (mode avion) + pages 404/500. Aligné RECOMMAND_FOLLOWUP #76 (E2E offline).

## Reviews (batch Phase 7)
- reviewer : 0 CRITIQUE / 1 MAJEUR / 4 MINEUR. MAJEUR = mismatch locales layout (`fr,en`) vs middleware (`fr,en,es,de`) — **pré-existant** (origin/dev identique), es/de JSON S26 inatteignables → follow-up. 3 MINEUR corrigés (6032d97), 2 MINEUR + MAJEUR → follow-up triage Phase 4 (/sprint end).
- ui-design : APPROUVÉ AVEC RÉSERVES. RÉSERVE 1 (LoadingSkeleton token) corrigée (6032d97). RÉSERVE 2 (app/error.tsx strings inline hors NextIntlClientProvider) = exception i18n justifiée → [MEMORY:decision] à consigner.

## Conclusion
**Prêt pour PR.** Aucun marqueur de couverture BR bloquant (0 BR cross-system). Suite unit verte (backend 280 + frontend 383), build SSG vert (26/26). E2E des nouveaux écrans = follow-up `/create-e2e` post-merge (documenté). CI (build + vitest + typecheck + lint + e2e) = gate final sur la PR.
