# Audit tests — Sprint 20 (Dashboard responsive)

> Généré en fin de Phase 6. Un marqueur de couverture manquante dans le tableau BR bloque la Phase 9 PR. Aucun marqueur de ce type ici (sprint UI sans BR).

## Couverture par BR-XX

**Aucune BR métier impactée** — sprint 100% UI/frontend (dashboard responsive : agrégation lecture seule d'endpoints events/products existants). Les 3 issues déclarent explicitement « BR impactées : Aucune ». Pas de cross-system flow, pas d'écriture, pas de nouveau endpoint → **pas d'E2E métier obligatoire**.

| BR | Description | Cross-system flow | Unit | Vitest RTL | E2E parcours |
|----|-------------|:---:|:---:|:---:|:---:|
| — | Aucune BR (UI pure) | NON | N/A | ✅ (composants) | ⚠ voir §Coverage E2E |

## Tests créés (Vitest + RTL)
- `frontend/src/components/dashboard/dashboard-components.test.tsx` (#80 — rendu 5 composants desktop)
- `frontend/src/components/dashboard/dashboard-lib.test.ts` (#80 — helpers purs `buildDensityBuckets`/`getWeekRange`/`getEventsInRange`)
- `frontend/src/components/dashboard/dashboard-mobile.test.tsx` (#83 — drawer a11y, carousel, agenda compact, rendu portrait)
- `frontend/src/components/dashboard/dashboard-landscape.test.tsx` (#85 — rail 64px a11y, 3 items, câblage handlers)

## Résultats runs (test-runner, Phase 6)
- **Vitest (runner réel du sprint) : 153 tests / 153 PASS / 0 FAIL** (~30s)
- **tsc** : 51 erreurs — TOUTES dans des fichiers `*.stories.tsx` (Storybook `@storybook/react-vite` Meta/StoryObj, TS2305/TS7006) **pré-existantes, hors périmètre sprint** (0 fichier stories touché). Zéro impact runtime/build.
- **Backend** : non exécuté — 0 diff backend ce sprint (aucune régression possible côté Java).
- **`next build`** : OK (22 pages générées, 0 erreur) — confirmé par les 3 fullstack-dev.
- **eslint** : 0 issue.

## Non-régression E2E (golden-path desktop)
Contrat préservé après refacto lourde de `page.tsx` (283→121 l. + switch ternaire) :
- `data-testid="dashboard"` toujours présent (page.tsx:100) ✓
- `TimelineResponsive` toujours rendu en mode desktop (page.tsx:205) → `timeline-view` / `timeline-resource-title` / `timeline-event` (assertés par `assertTimelineShowsProductAndEvent`) intacts ✓
- Playwright tourne en viewport desktop 1280×720 → branche desktop (ni portrait <768px, ni paysage <500px) ✓

## Coverage E2E (Phase 8 — heuristique testids)
- **28 nouveaux data-testid** introduits (drawer, carousel, rail, ribbon scroll, landscape…) **sans spec E2E** → **[COVERAGE-E2E] MAJEUR (non bloquant)**.
- Cause : `frontend/e2e/` ne contient que `golden-path.spec.ts` (desktop). Aucun runner E2E mobile portrait/paysage.
- **Plan** : `/create-e2e <PR>` après merge (review-protocol A.4). Suivi via follow-up Phase 4 (/sprint end) : E2E portrait 390px (#83) + paysage 812×375 (#85) — data-testids déjà en place, mutualisables.

## Conclusion
**Prêt pour PR.** Suite Vitest verte (153/0), build OK, lint OK, non-régression golden-path préservée, aucune couverture BR manquante bloquante (sprint UI sans BR). Dette E2E mobile documentée en follow-up non bloquant.
