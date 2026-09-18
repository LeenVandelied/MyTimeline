# Audit tests — Sprint 25

> Généré en fin de Phase 6. Sprint « Finalisation Events » (conflit 409 + contrat DTO dates + toggle archived).
> Verdict test-runner (suite complète, 4 runs) : VERT. Backend 280/280 (stable ×3 après déterminisme #200), Frontend 344/344.

## Couverture par BR

| BR | Description | Cross-system flow | Unit backend | Integration | Vitest/RTL frontend | E2E parcours | E2E métier |
|----|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| BR-EVE-002 | endDate ≥ startDate | NON | ✅ | ✅ | ✅ (refine Zod préexistant) | ⚠ N/A | ⚠ N/A |
| BR-EVE-003 | Dérivation endDate selon type (duration/single) | NON | ✅ | ✅ | ⚠ N/A | ⚠ N/A | ⚠ N/A |
| BR-EVE-013 | archived éditable en PATCH | NON | ✅ (préexistant) | ✅ | ✅ (#188 toggle + defaultValues) | ⚠ N/A | ⚠ N/A |
| BR-EVE-015 (NOUVELLE) | Édition concurrente event (@Version) → 409 | **OUI** | — | ✅ (déterministe, version stale simulée) + ✅ slice handler→409 | ✅ (#77 : 409→dialog, 400/404→pas de dialog) | ⚠ planifié | ⚠ **planifié /create-e2e** |

Cross-system flow=OUI si flux 2+ systèmes/rôles. BR-EVE-015 (backend émet 409 → frontend ouvre ConflictDialog → reload) est cross-system. Couverture unit+integration+RTL solide ; l'E2E métier « 2 onglets concurrents → 409 → dialog → recharger » nécessite 2 sessions simultanées (complexe) → **différé en follow-up /create-e2e post-merge** (Phase 8), PAS un trou de couverture comportementale (le comportement est vérifié par l'intégration déterministe + le slice + le RTL).

## Nouveau contrat / validation ajoutés
- `EventUpdateRequest` : startDate/endDate câblés + `@AssertTrue isEndDateConsistent` (paire payload → 400). (#201)
- `EventServiceImpl` : garde état-fusionné `endDate ≥ startDate` post-merge → `EndDateBeforeStartException` → **422** (ferme le trou PATCH endDate-seul, miroir BR-EVE-012). (#201, fix review MAJEUR-2)
- `GlobalExceptionHandler` : `@ExceptionHandler(ObjectOptimisticLockingFailureException)` → **409** corps `{"error":"resource was modified concurrently, please retry"}` ; `@ExceptionHandler(EndDateBeforeStartException)` → 422. (#200 + #201)

## Tests créés / modifiés
- backend/.../application/services/EventServiceImplTest.java (endDate-seul < startDate rejeté, borne == tolérée, flip type duration→single)
- backend/.../infrastructure/adapters/controllers/GlobalExceptionHandlerOptimisticLockTest.java (NEW — slice handler → 409 déterministe)
- backend/.../infrastructure/adapters/repositories/EventOptimisticLockConflictIntegrationTest.java (NEW — conflit optimiste déterministe, version stale simulée sans threads)
- backend/.../infrastructure/adapters/repositories/EventPatchAndRecurrenceIntegrationTest.java (scénario désaccord dates saisies vs enregistrées + endDate-seul → 422)
- frontend/src/components/shared/ConflictDialog.test.tsx (NEW — dialog 409, Échap/dismiss/reload)
- frontend/src/components/EventContent.test.tsx (NEW — 409→conflict, 400/404→pas de dialog, invalidation ciblée, defaultValues.archived)
- frontend/src/components/EventEditForm.test.tsx (toggle archived visible/pré-rempli/togglable + PATCH transmet archived)

## Résultats runs (test-runner, suite complète)
- Backend : 280 tests, 280 passed, 0 failed — STABLE sur 3 runs consécutifs (après déterminisme #200 commit a0401ad ; l'instabilité 2/4 antérieure éliminée).
- Frontend : 344 tests, 344 passed, 0 failed.
- E2E : 0 spec exécutée sur le périmètre sprint (aucune spec conflit/archived — cf. gap ci-dessous).

## Gap E2E (Phase 8) — non bloquant, planifié
Nouveaux data-testid de production sans spec E2E : `event-form-archived-toggle` (#188), `event-form-conflict` + `conflict-dialog` + `conflict-dialog-reload` (#77).
→ **Plan : `/create-e2e` post-merge** — spec Playwright « variante conflit 409 » (édition concurrente → dialog → recharger) + vérif toggle archived en édition. Inscrit dans le body PR. Cohérent avec le RECOMMAND_FOLLOWUP de #77.

## Conclusion
Prêt pour PR. Aucun trou de couverture comportementale bloquant : chaque BR est couverte par unit + integration + RTL. L'unique manque est l'E2E métier du flux conflit (cross-system), consciemment différé à `/create-e2e` post-merge (comportement déjà vérifié par l'intégration déterministe + le slice + le RTL). Reviews : 3 MAJEUR (2 backend contrat dates, 1 frontend defaultValues archived) tous RÉSOLU ; test flaky optimistic-lock rendu déterministe.
