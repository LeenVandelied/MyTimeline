# Issue #54 — Backend : service de récurrence (hebdo/mensuel/annuel + fin de série)

> Sprint 12 — Vague 1. Fullstack-dev opus/xhigh. Durée ~10 min, 66 tool uses.

## Commits
- fa55669d741b01574a89dd930b111707e147f456

## Résumé
Service expansion bornée + recalcul endDate PATCH + null-guard + validation conditionnelle + migration V9.
- **BR-EVE-002** : recalc `endDate` au PATCH quand `type`/`durationValue`/`durationUnit` change.
- **BR-EVE-004** : null-guard `Utils.calculateEndDate` + `InvalidDurationUnitException` → 422 (plus de NPE/500).
- **BR-EVE-006** : `@AssertTrue` recurrenceUnit requis si `isRecurring=true` → 400.

Fichiers clés : `RecurrenceExpansionService(Impl)` (nouveau port+impl, plafond 4000, flag `capped`, WEEK/MONTH/YEAR, report calendaire), `RecurrenceExpansion` (record occurrences+capped), `Utils` (surcharge par champs primitifs réutilisée au PATCH), `EventServiceImpl.updateEvent` (recalc), `EventRepositoryJpaImpl.save` (fix update-in-place), `GlobalExceptionHandler` (422), `EventCreationRequest` (@AssertTrue), `InvalidDurationUnitException`, migration `V9__neutralize_invalid_recurrence_unit.sql` (alias élargis weekly/monthly/hebdo/… → enum, reste → NULL, CHECK reposé).

Pitfall rencontré : PIT-S10-003 — `EventRepositoryJpaImpl.save` reconstruisait une entité détachée (version=null) → "uninitialized version value" au PATCH (bug préexistant du chemin update events). Corrigé par update-in-place, aligné sur `ProductRepositoryJpaImpl.save`.

Tests scope #54 : **34 passed / 0 failed** (Utils 7, RecurrenceExpansion 11, EventServiceImpl recalc 4, validation BR-EVE-006, intégration PATCH+V9 2, + ownership/handler existants). Tous critères d'acceptation couverts par test.

## Signaux [MEMORY:*]
- **[MEMORY:pitfall]** `EventRepositoryJpaImpl.save` reconstruisait une EventEntity détachée (version=null) via mapper → au PATCH, `SimpleJpaRepository.save` route vers `persist()` → "uninitialized version value" (500). Récurrence de PIT-S10-003, non couverte par tests events jusqu'ici. Solution : update-in-place (`super.findById` → recopie champs mutables → save). Prévention : tout `*RepositoryJpaImpl.save` doit charger l'entité gérée en UPDATE ; les domain models sans `@Version` = piège systémique.
- **[MEMORY:decision]** `InvalidDurationUnitException` → 422 dédiée (pas de mapping global `IllegalArgumentException`→422, trop large). 422 = donnée bien formée mais incalculable, distinct du 400 (Bean Validation) et du 500 (bug).
- **[MEMORY:pattern]** Validation conditionnelle DTO via getter dérivé `@AssertTrue @JsonIgnore isRecurrenceUnitConsistent()` → 400 via MethodArgumentNotValidException. Anti-pattern : validation dans le controller/service.

## Recommandations suite
- **RECOMMAND_DB_EXPERT** : migration V9 à reviewer (neutralisation → NULL des `recurrence_unit` invalides = perte contrôlée ; V7 avait déjà posé le CHECK + pré-vol qui ABORTE sur valeur non convertible — V9 défensive/idempotente post-V7, alias élargis échappés au pré-vol via import/restore ; vérifier sémantique "V9 après V7" + rollback documenté).
- **RECOMMAND_FOLLOWUP** : 2 tests `ProductArchivedFilterIntegrationTest.createProduct_*_endToEnd` échouent dans la suite complète avec le même bug version=null sur `ProductEntity` (chemin createProduct). Hors scope #54, même PIT-S10-003 côté CREATE produit — à traiter côté #158. [domaine products]
- Flag `capped` exposé dans `RecurrenceExpansion` (record public), prêt pour #67 (Vague 2). Aucun endpoint REST d'expansion n'existe encore — l'intégration DTO HTTP exposant `capped` reste à câbler (non demandé par #54).
- Pas de RECOMMAND_TEST_RUNNER : suite backend 181 tests, < 3 min, exécutée inline.

STATUS: COMPLETED
