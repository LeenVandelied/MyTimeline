# Issue #164 — NPE Utils.calculateEndDate (BR-EVE-004) — DONE (no-op)

## Résultat
NO-OP : le fix demandé existe déjà sur `sprint/14` (commit `fa55669`, livré par #54 dans un sprint antérieur).
- `Utils.java` : null-guard présent avant le `switch` (~ligne 40-42) + `InvalidDurationUnitException`.
- `UtilsTest.java` : couvre déjà BR-EVE-003 (calcul par unité) ET BR-EVE-004 (unité inconnue + null → `doesNotNpeWhenDurationUnitNull_throwsInvalidDurationUnit`).
- Mécanisme réel : `GlobalExceptionHandler:119-128` mappe `InvalidDurationUnitException` → **HTTP 422** (pas 500). Plus de NPE.

## Écart / décision à trancher (RECOMMAND_PRODUCT_DECISION)
Issue #164 exige un **400** ; le code livré expose un **422** (choix assumé, commenté `DEC-S12-001`). Le cœur de l'issue (pas de 500, erreur métier claire) est SATISFAIT. Deux options :
- (a) Fermer #164 comme déjà résolu / doublon de #54 (accepter 422). ← recommandé
- (b) Trancher que le contrat doit passer à 400 (impacte `GlobalExceptionHandler`, hors scope XS "null-guard Utils.java").
→ À arbitrer en Phase 4 triage (sprint end).

## Commits
Aucun (rien à modifier — code déjà conforme).

## Anti-drift (leçon)
Le pack `br-events.md` était CORRECT ("✅ RÉSOLU S12 #54"). C'est l'annotation architect `etat_reel_du_code: "(aucune evidence)"` qui était fausse (grep nom d'exception ≠ lecture du fichier réel). L'agent a vérifié `git log -- Utils.java` avant de coder → a évité un faux respawn.

## Recommandations suite
- RECOMMAND_PRODUCT_DECISION : 400 vs 422 sur `InvalidDurationUnitException` (cf. ci-dessus).
- [MEMORY:pitfall] Architect Phase 0.5 : lire le fichier cible réel (pas seulement grep du nom d'exception) avant de marquer "aucune evidence" — sinon faux respawn.

STATUS: COMPLETED
