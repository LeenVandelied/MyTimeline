# Audit tests — Sprint 15

> Généré en fin de Phase 6. `[MISSING]` bloque la Phase 9 PR. Aucun ici.
> Thème : contrat events v3 end-to-end (#165 backend → #150 frontend → #163 E2E).

## Couverture par BR-XX

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| #165 hexagonal | Port EventService pur + EventResponse + adapter découplé | NON | ✅ | ✅ (POST 201 + corps EventResponse) | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| BR-EVE-008 | Ownership PATCH/DELETE préservée | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| BR-EVE-009 | color unique (fusion bg/border/text) | NON | ✅ (S9) | ⚠ N/A | ✅ (event.test.ts) | ✅ (golden path) | ✅ |
| BR-EVE-010 | isAllDay (nom sérialisation) | NON | ⚠ N/A | ⚠ N/A | ✅ (event.test.ts) | ⚠ N/A | ⚠ N/A |
| BR-EVE-006 | recurrenceUnit WEEK/MONTH/YEAR + refine si isRecurring | NON | ✅ (S9/S12) | ✅ | ✅ (event.test.ts) | ⚠ N/A | ⚠ N/A |
| BR-EVE-012 | recurrenceEndDate nullable + refine >= startDate | NON | ✅ (S14) | ✅ | ✅ (event.test.ts) | ⚠ N/A | ⚠ N/A |
| BR-EVE-013/014 | archived + color au create | NON | ✅ | ✅ | ✅ (event.test.ts) | ⚠ N/A | ⚠ N/A |
| Golden path #163 | register→login→produit+event→timeline | **OUI** | ⚠ N/A | ⚠ N/A | ⚠ N/A | ✅ (golden-path.spec.ts) | ✅ (job CI e2e) |

Cross-system flow=OUI uniquement pour le golden path #163 (flux 4 étapes multi-systèmes) → E2E métier présent (`golden-path.spec.ts` + job CI `e2e`).

## Tests créés / modifiés ce sprint
- `backend/.../EventControllerOwnershipTest` (POST 201 + assertions corps EventResponse) — #165
- `frontend/src/types/event.test.ts` (15 tests Zod contrat v3 : color, recurrenceUnit enum, isAllDay, archived, recurrenceEndDate, refines) — #150
- `frontend/e2e/golden-path.spec.ts` (1 test E2E full-stack, data-testid uniquement) — #163
- `.github/workflows/ci.yml` (job `e2e` full-stack) — #163

## Résultats runs (lead, inline via wrapper)
- Backend : 238 tests, 238 passed, 0 failed (`./scripts/test-quiet.sh backend`, Testcontainers Postgres, Docker OK)
- Frontend : 85 tests / 16 fichiers, 85 passed, 0 failed (`npm run test` Vitest)
- Statique frontend #163 : `tsc --noEmit` OK, `npm run lint` OK, `next build` OK, `playwright test --list` = 1 test collecté
- E2E golden path : **run complet NON exécuté en local** (nécessite Postgres + backend + frontend simultanés hors contexte lead). Validation réelle = job CI `e2e` au 1er run de la PR. Spec vérifié statiquement (compile + collecte + testids présents dans les composants).

## Conclusion
Suites unit/integration backend + frontend **VERTES**. Aucun `[MISSING]`. Golden path E2E : test + harness CI livrés, validation end-to-end déléguée au job CI `e2e` sur la PR (à surveiller au 1er run). Prêt pour review batch (Phase 7) puis PR.
