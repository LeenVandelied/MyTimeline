# Revue batch — Sprint 43

## Reviewer (diff origin/dev..HEAD)
- Tous garde-fous [OK] : #286 create pur INSERT + markConsumed findById→saveAndFlush (#143 intact) ;
  #290 handleEventConflict enrichi NON migré (verrouillé par test) ; #289 /me 401 générique ;
  #288 codes ErrorCode distincts + register collapse conflict ; #285 config test-only ; scope 19 fichiers, rien hors périmètre.
- 0 CRITIQUE, 0 MAJEUR.
- [MINEUR ×2] : (1) markConsumed orElseThrow→500 sur fenêtre TOCTOU théorique ; (2) dérive doc commentaire /me (RAS fonctionnel).

## Security-expert (diff auth #286/#288/#289)
- 0 CRITIQUE. Tous [OK] : /me zéro canal d'énumération (statut+body identiques) ; anti-TOCTOU #143 intact ;
  register conflict générique (discriminant field supprimé) ; forgot-password 200 neutre @Async, aucun PII/token loggé.
- [MINEUR] : identique au reviewer #1 (markConsumed 500 sur race) — jugé non-bloquant, exploitabilité nulle
  (purge ne supprime que tokens consommés/expirés, jamais un token de reset actif).
- CONFIRMÉ hors scope (déjà follow-up #289) : SignatureException sur /me → 500 (vs 401 sur /refresh), side-channel mineur.

## Résolution
- MINEUR convergent (markConsumed→500) : **traité par documentation** (commit f0d033c). Analyse : findById
  s'exécute dans la MÊME transaction que findByToken (cache L1) → non-empty garanti (même invariant que #143).
  L'IllegalStateException est une ASSERTION d'invariant ; fail-fast 500 assumé si rompu (ne pas masquer en 400).
  Aucun changement de comportement. Résolution alignée sur l'option "documenter" offerte par les deux reviewers.
- MINEUR #2 (doc /me) : RAS fonctionnel, pas d'action.
- Follow-up conservé pour triage Phase 4 (sprint end) : SignatureException sur /me → 500 [triage XS | auth].

STATUS: COMPLETED
