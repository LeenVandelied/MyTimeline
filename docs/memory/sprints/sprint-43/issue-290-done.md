# Issue #290 — Router les handlers plats de GlobalExceptionHandler via buildBody

commits: [a9fe3bd]

resume:
- MIGRÉS (11 handlers plats → buildBody, `error`=code, `message`=texte) :
  409 CONFLICT: handleCategoryNameConflict, handleCategoryInUse, handleCategoryReassignTargetInvalid, handleOptimisticLock.
  400 BAD_REQUEST: handleExportFormatNotSupported, handleInvalidCredentials, handleInvalidAvatar,
  handleSamePassword, handleAccountDeletionMismatch, handleInvalidPasswordResetToken, handleRecurrenceUnitRequired, handleMaxUploadSize.
- ErrorCode: ajout `BAD_REQUEST("bad_request")` seul ; CONFLICT (#288) réutilisé.
- ⛔ GARDE-FOU RESPECTÉ : handleEventConflict (409 enrichi #231) NON touché — `error` texte mot-pour-mot
  + serverVersion + serverEvent intacts (vérifié par test de non-régression).
- FRONTEND: aucun consommateur ne lit la VALEUR texte de `error`. handleOptimisticLock (#77) → front lit
  statut 409 seul (ProductDrawer.tsx). Event PATCH conflict → intercepté par EventController amont
  (EventConflictException enrichi), jamais le handler générique. Messages dynamiques (CategoryInUse/
  InvalidAvatar/reassign) → toasts i18n locaux, pas le texte serveur. Migration non régressive.
- BR touchées: contrat d'erreur (BR-CAT, BR-EVE 409/422) — forme homogénéisée, sémantique inchangée.

tests:
- NEW GlobalExceptionHandlerContractTest (5, unit direct : export/maxUpload/recurrenceUnit/optimisticLock
  générique + verrou non-régression EventConflict enrichi).
- MAJ assertions `$.error`→code + `$.message`→texte : UserControllerTest (4), CategoryControllerTest (4),
  PasswordResetEndpointsIntegrationTest (1).
- 50 tests (contract+optimistic+user+category) + 5 integration = tous verts (scope ciblé).

[MEMORY:pattern] Handlers d'erreur incohérents (corps plat `{error:texte}` vs structuré) → router tout via
buildBody, `error`=code stable ErrorCode niveau-statut, texte→`message`. Exception assumée: corps ENRICHI
verrouillé par le front (EventConflict #231) reste plat + `error`=texte mot-pour-mot.

recommandations suite: aucun

STATUS: COMPLETED
