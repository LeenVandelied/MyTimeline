# Issue #95 — EventServiceImpl.findEventById : supprimer le double-hit DB et le printStackTrace

> Sprint 12 — Vague 2. Fullstack-dev opus/high. ~2,3 min, 16 tool uses.

## Commits
- c50a341

## Résumé
Refactor `EventServiceImpl.findEventById` : retiré `existsById` redondant (double-hit → 1 seul `findEventById`) + supprimé `try/catch`+`printStackTrace` (MEMO-007). Corps final `return eventRepository.findEventById(id);`. Contrat `Optional<Event>` **préservé** → `updateEvent` (#54, l.64 `.orElseThrow`) compile.

Tests `EventServiceImplTest.java` : nettoyé 8 stubs `existsById` stale (UnnecessaryStubbing sous strict stubbing) + 1 stub dans `updateEvent_notFound` migré vers `findEventById → empty` ; ajouté 3 tests `findEventById` (single hit `verify(times(1))` + `existsById never()`, empty pass-through, propagation d'exception).

Suite backend : **182 passed / 0 failed**.

## Signaux [MEMORY:*]
- **[MEMORY:pitfall]** Retirer un `existsById` d'une méthode service casse les tests qui le stubbaient encore ailleurs (`updateEvent` stubbait `existsById=true`) via Mockito strict stubbing (`UnnecessaryStubbingException`), pas via la logique. Solution : purger les stubs devenus inutiles dans TOUS les tests appelant la méthode refactorée. Prévention : après suppression d'un appel repo, grep les stubs de cette méthode dans le fichier de test.

## Recommandations suite
- **RECOMMAND_FOLLOWUP** : `EventServiceImpl.deleteById` (l.133-138) présente le même double-hit (`existsById` puis `deleteById`). Hors scope #95. [triage XS | domaine events]. Nuance : ici `existsById` sert à lever `EventNotFoundException` (404) → le fix n'est pas une simple suppression (garder le contrat 404 via `findEventById(...).orElseThrow` puis delete, ou s'appuyer sur le retour de `deleteById`).

STATUS: COMPLETED
