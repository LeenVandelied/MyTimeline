# Review batch — Sprint 42 (reviewer)

> 2026-07-14. Diff origin/dev..sprint/42. **VERDICT : PRÊT MERGE** (0 CRITIQUE, 1 MAJEUR non bloquant + 3 MINEUR).

## OK (vérifiés)
- Check optimiste APRÈS ownership (`EventServiceImpl:88-102`, ownership `EventController:74/79`) — pas de fuite pré-ownership.
- `onKeepMine` réinjecte la version serveur avant re-submit (`useEventEditConflict:118-122`) — pas de boucle 409.
- `version==null` rétro-compat (`EventServiceImpl:88-90` + test `updateEvent_nullClientVersion_skipsConflictCheck`) — pas de trou silencieux.
- Hexagonal : `EventConflictException` domaine pur, conversion `EventResponse` en infra (handler), pas dans l'exception.
- Contrat Zod 409 sync mot-pour-mot (`types/event.ts:50-56` == `GlobalExceptionHandler:207-210`).
- i18n `conflictDialog.*` présent dans les 4 locales.
- E2E : testids exclusifs, `waitForResponse`, tous les testids assertés existent dans le code.

## À traiter (dispatch fix)
- **[MAJEUR] `EventContent.tsx:60-160`** : logique conflit 409 DUPLIQUÉE au lieu de réutiliser
  `useEventEditConflict` (le hook a été extrait POUR éviter la duplication). Drift-risk : tout fix futur ×2.
  → Fix : migrer `EventContent` sur `useEventEditConflict`. (Testé des 2 côtés, pas un bug fonctionnel.)
- **[MINEUR] `EventEditForm.tsx`** : champ `version` jamais registered (repose sur defaultValues RHF non-registered) ;
  fragile si futur `reset()/setValue`. → test explicite « submit → payload porte version » OU champ hidden Controller.
- **[MINEUR] `TimelineEditHost.tsx:42`** : `useEventEditConflict` appelle `useAuth()` ; monté sous AuthProvider
  (dashboard/ProductDetailView) mais pas de garde/test hors provider. → test de montage OU documenter l'invariant.

## Surfacé au dev (pas d'auto-fix)
- **[MINEUR] archunit_store `ff7c6079`** : nouvelle entrée frozen (`EventMapper.toDomain` → `EventEntity.getVersion()`,
  application→infra). Cohérent avec la violation mapper déjà gelée (pas un nouveau pattern), mais la freeze-list
  mériterait un œil mainteneur pour confirmer que ce n'est pas un contournement de règle. → à mentionner en PR.
