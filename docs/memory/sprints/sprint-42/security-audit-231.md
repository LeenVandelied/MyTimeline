# Audit sécurité — Sprint 42 / issue #231 (corps 409 enrichi)

> security-expert, 2026-07-13. Diff audité : commit `0bc144f`. **Verdict : SÛR** (aucun correctif bloquant).

## Points vérifiés
- [OK] `EventController` — `checkEventOwnership` exécuté AVANT le try/catch et toute sérialisation serveur.
  Ordre check → refetch → sérialisation respecté. Pas de TOCTOU (refetch sur le MÊME id path-param déjà validé).
- [OK] `EventResponse` (serverEvent) = strictement la projection GET/PATCH existante — aucun `ownerId`/user/champ interne.
- [OK] Event supprimé entre check et flush → 404 (`EventNotFoundException`), pas de leak silencieux.
- [OK] `EventConflictException` domaine pur, `serverEvent` transient, jamais sérialisé Java.
- [OK] Aucun log sur ce chemin → pas de fuite via logs.
- [MINEUR] Pas de rate-limit dédié sur le retry `onKeepMine` → boucle possible sous forte contention, mais
  self-DoS (ownership déjà requis), PAS un vecteur cross-user. Non bloquant.
- [ASSUMED / hors scope #231] Violation ownership → 403 (pas 404 comme la convention anti-énumération le
  suggère). Comportement PRÉ-EXISTANT (BR-AUT-007 / #119), non introduit par #231.

## Invariant à mémoriser (→ pitfalls au /sprint end)
[MEMORY:pitfall] 409 enrichi (ou toute réponse d'erreur portant un état serveur) : vérifier que
l'ownership-check s'exécute AVANT le catch(OptimisticLockingFailureException) et AVANT tout
refetch/sérialisation — sinon le corps devient un oracle de fuite cross-owner.

## Suivi
- MINEUR rate-limit : candidat RECOMMAND_FOLLOWUP (résilience, non bloquant sprint).
