# issue-200-done

commits: [276e3ca763826884c53c5501e09383dfe0588f6c, 050176b31f3474af8e1ab357b8abff757edc7da2, a0401ad74cdb8b1a4cdc32656abd83587c863685]

## resume
OBJECTIF: conflit edition concurrente event -> 409 (etait 500 non mappe).
DETERMINISME (a0401ad): la version 2-threads+barriere restait FLAKY (~2/4 runs KO en suite
complete, timing-sensible). Remplacee par une SIMULATION DETERMINISTE de version perimee (aucun
thread): detache une vue de l'event a version 0, commit 1er update (0->1), puis merge la vue
perimee (version 0)+flush -> UPDATE ... WHERE version=0 -> 0 ligne -> conflit systematique a chaque
run. Assert famille optimistic-lock (isOptimisticLockFailure, chaine de causes) + resultat observable
non-ecrasement (titre 1er update garde, version=1). Mapping 409 verrouille par le slice MockMvc.
Suite complete (280 tests) relancee 3x d'affilee: 0 fail a chaque run (BUILD SUCCESS x3).
FIX: `@ExceptionHandler(ObjectOptimisticLockingFailureException.class)` ajoute dans
GlobalExceptionHandler (infrastructure/adapters/controllers). Scope au type PRECIS
`org.springframework.orm.ObjectOptimisticLockingFailureException` (pas un supertype
fourre-tout, cf PIT-S10-002). PersistenceExceptionTranslationPostProcessor traduit
l'OptimisticLockException JPA en ce type Spring sur les @Repository -> handler l'attrape.

CONTRAT 409 (consomme par #77 Vague 2):
- statut: HTTP 409 Conflict
- corps: plat `{"error": "resource was modified concurrently, please retry"}`
- pas de champ version/entite (message neutre, cohérent CategoryNameConflict).
- s'applique a TOUTE entite @Version (Event/Product/Category/User) sans requalifier
  d'autres erreurs (le type ne recouvre QUE le conflit optimiste).

FICHIERS CLES:
- backend/.../controllers/GlobalExceptionHandler.java (handler +19 lignes)
- backend/.../repositories/EventOptimisticLockConflictIntegrationTest.java (NEW, integ 2 threads)
- backend/.../controllers/GlobalExceptionHandlerOptimisticLockTest.java (NEW, slice 409+corps)

CATEGORY/PRODUCT: aucun mapping local de cette exception (verifie grep). Pas de doublon/conflit.
FRONTEND: non touche (deja fait, EventContent.tsx:103-106 mappe 409->conflict).

TESTS: full suite `./scripts/test-quiet.sh backend` = 277 run, 0 fail, BUILD SUCCESS.
- integ: 2 updates concurrents (course reelle 2 threads + barriere CountDownLatch) ->
  2e leve ObjectOptimisticLockingFailureException + titre gagnant preserve (non-ecrasement). PASS.
- slice: PATCH -> 409 + corps plat {"error":...} (pas timestamp/status). PASS.

## [MEMORY:*]
[MEMORY:pattern] Probleme: exception optimistic-lock non mappee -> 500. Solution:
@ExceptionHandler scope au type PRECIS ObjectOptimisticLockingFailureException (Spring,
pas JPA brute) -> 409. Anti-pattern: handler global sur supertype (DataIntegrityViolation)
qui masque d'autres violations (retire #153).
[MEMORY:business-rule] BR-EVE-015: edition concurrente d'un event (@Version) -> 409, corps
plat {"error":...}. Contrat stable consomme par #77.

## recommandations suite
- RECOMMAND_TEST_RUNNER: NON (277 tests, ~<1min, sous seuils).
- RECOMMAND_DB_EXPERT: NON.
- RECOMMAND_FOLLOWUP: le slice test reutilise l'entite JPA EventEntity dans le ctor
  ObjectOptimisticLockingFailureException (test only, sans impact prod). Aucun hors-scope
  bloquant repere cote #200.
- NOTE worktree partage: fichiers M de #201 (EventUpdateCommand 9->11 args, EventServiceImpl,
  EventController, EventUpdateRequest) et #188 (frontend) presents non commites; NON stages
  par moi (seuls mes 3 fichiers commites). #201 doit committer sa migration de EventUpdateCommand
  (le test EventPatchAndRecurrenceIntegrationTest a ete adapte par #201).

STATUS: COMPLETED
