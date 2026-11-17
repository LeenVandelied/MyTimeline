# ISSUE #231 — DONE (fullstack, M)

commits: 66e98e4 (commit unique #231 sur sprint/42 ; SHA final = voir retour lead après amend)

## resume
Objectif: modale conflit 409 COMPARATIVE (diff serveur/local + garder/prendre). BR-EVE-015.
Backend d'abord (contrat 409 enrichi, ownership-safe), puis frontend synchro mot-pour-mot.

Fichiers clés:
- BACK: `EventConflictException.java` (NEW, domain, porte Event serveur + version).
  `EventController.updateEvent` try/catch `ObjectOptimisticLockingFailureException` APRÈS
  `checkEventOwnership` -> recharge état serveur GAGNANT (findEventById + findVersionById)
  -> throw EventConflictException. `GlobalExceptionHandler.handleEventConflict` (NEW, ADD
  seul; generic handleOptimisticLock INCHANGÉ pour Product/Category/User). Port
  `findVersionById` ajouté EventRepository/EventService (+impls) — expose @Version sans
  faire remonter EventEntity au domaine.
- FRONT: `types/event.ts` `eventConflictBodySchema` (serverEvent=eventSchema). `ConflictDialog.tsx`
  mode COMPARATIF (diff champs modifiés highlight token warning, garder/prendre) + legacy
  préservé. `EventContent.tsx` parse corps enrichi (safeParse), state conflict, onKeepMine
  (re-submit local, pas de boucle 409), onTakeServer (=reload). `EventEditForm.tsx` threade
  props. i18n conflictDialog x4 locales (comparativeDescription, keepMine, takeServer,
  fields.*, yes/no/empty/noChanges).

## contrat 409 final (shape JSON exact)
```json
{
  "error": "resource was modified concurrently, please retry",
  "serverVersion": 7,
  "serverEvent": {
    "id","title","type","durationValue","durationUnit","isRecurring","recurrenceUnit",
    "recurrenceEndDate","startDate","endDate","productId","isAllDay","color","archived"
  }
}
```
serverEvent = EventResponse.fromDomain (STRICTEMENT champs GET/PATCH proprio, 0 champ interne).
Pas de timestamp/status. `error` conservé (rétro-compat #77 + fallback legacy).

## pitfalls
- Ownership vérifié AVANT sérialisation état serveur (catch APRÈS checkEventOwnership) = 0 fuite autrui.
- Tx du update rollbackée -> refetch en tx readOnly fraîche lit l'état GAGNANT committé (pas de session poison).
- `serverVersion` peut être null -> HashMap (pas Map.of) côté handler.
- Corps 409 legacy/plat -> safeParse null -> ConflictDialog mode legacy (recharger), pas de crash.
- keep-mine ne boucle pas: PATCH backend recharge l'entité gérée (aucune version cliente consommée).

## testids ajoutés (pour #232)
- `conflict-dialog-keep-mine`
- `conflict-dialog-take-server`
- `conflict-dialog-diff-row` (attr `data-field=<champ>`)
- `conflict-dialog-diff` (conteneur), `conflict-dialog-diff-local`, `conflict-dialog-diff-server`
- `conflict-dialog-no-changes`
STABLES conservés: `event-form-conflict`, `conflict-dialog`, `conflict-dialog-reload` (mode legacy), `event-form-archived-toggle`.

## tests
- BACK: suite complète `./scripts/test-quiet.sh backend` = 400 passed / 0 failed. Slice
  `GlobalExceptionHandlerOptimisticLockTest` MAJ (contrat enrichi) OK. Integration
  `EventOptimisticLockConflictIntegrationTest` OK (inchangé).
- FRONT: vitest full = 459 passed / 0 failed. tsc: fichiers touchés 0 erreur. `next build`
  = app "Compiled successfully" (échec build local = deps worktree manquantes `pg` +
  `eslint-plugin-storybook`, DÉCLARÉES en package.json -> présentes en CI, hors périmètre).

## [MEMORY]
- [MEMORY:decision] Contrat 409 event ENRICHI (serverVersion+serverEvent=EventResponse) distinct
  du 409 plat générique (autres entités @Version). Ownership check AMONT du refetch = invariant sécurité.
- [MEMORY:pattern] Plumbing conflit optimiste: catch `ObjectOptimisticLockingFailureException` au
  CONTROLLER (tx rollbackée) -> refetch état gagnant en tx fraîche -> exception applicative dédiée
  sérialisée par le handler. Évite la session poison d'un catch intra-@Transactional.

## recommandations suite
- RECOMMAND_SECURITY (obligatoire): audit ownership/sérialisation corps 409 (fuite données autrui,
  serverVersion/serverEvent). Points: catch APRÈS checkEventOwnership; serverEvent=EventResponse only.
- RECOMMAND_FOLLOWUP: E2E #232 câbler les nouveaux testids (garder/prendre + diff-row).
- RECOMMAND_FOLLOWUP: pas de test e2e du vrai race commit->catch->refetch (mock slice + integration
  couvrent les 2 moitiés) — #232 pourra le couvrir.

## ABSORBED
Aucune.

STATUS: COMPLETED
