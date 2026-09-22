# Review PR #287 — rapport consolidé (/review-pr, 2026-07-13)

> Mode TEAM (555 lignes, auth) — back-reviewer + security-expert en parallèle (Agent() natif).
> Diff : c8fc800 (#127), 5cf7b2a (#126), 8e9e0fd (#125), 6474c91 (absorption), + artefacts docs.

## Verdict : MERGE_OK (0 CRITIQUE, 1 MAJEUR non bloquant arbitré, 1 MINEUR pré-existant)

### Findings

- [MAJEUR — non bloquant, arbitré follow-up] `AuthController.java` (l.140/228/320 et al.) — vocabulaire du champ `error` incohérent (`authentication_failed` snake_case vs `An error occurred` phrase EN vs `an_error_occurred` vs FR `token expiré ou invalide`) alors que #127 introduit le contrat stable `ErrorCode` le même sprint. Arbitrage : l'AC de #125 imposait des messages humains ; documenté dans la javadoc `ErrorCode.java`. Fix proposé : migrer `AuthController` vers `ErrorCode` (ou documenter un contrat séparé versionné).
- [MINEUR — pré-existant, hors scope PR] `GlobalExceptionHandler.java:41-134` — 7 handlers (`CategoryNameConflictException`, `InvalidAvatarException`, etc.) construisent leur corps `{"error":...}` sans passer par `buildBody`/`ErrorCode`. Étendre `ErrorCode` à ces handlers pour cohérence totale.

### OK (confirmations)

- Sécurité (contre-audit indépendant) : RAS — pas de fuite d'internes (bodies 500 statiques, pas de `e.getMessage()`), statuts HTTP/contrôle d'accès inchangés, échappement Jackson validé par test avec payload malveillant (`json.size()==1` anti-injection de clé), énumérations pré-existantes non aggravées, pas de PII nouvelle en logs, fixtures sans données réelles.
- Compile + test-compile clean ; BR-AUT-005/007/009 non affectées ; MEMO-007 respecté.
- Les 2 MINEURS de la review interne pré-PR : RESOLU (FQN `Map.of` grep clean ; newline EOF `SecurityConfig` confirmée hexdump).
- Refactor `ErrorCode`/`buildBody` cohérent sur les 5 call sites ; hexagonal OK (couplage A8 pré-existant non touché).
- Coverage E2E : OK (aucun nouveau `data-testid`, backend pur).

### Follow-ups (à trier en /sprint end 38, Phase 4)

RECOMMAND_FOLLOWUP: unifier le vocabulaire du champ `error` d'AuthController sur ErrorCode (ou contrat documenté) [triage S | domaine auth] (review PR #287 — MAJEUR arbitré)
RECOMMAND_FOLLOWUP: étendre ErrorCode/buildBody aux 7 handlers restants de GlobalExceptionHandler [triage S | domaine transversal] (review PR #287 — MINEUR pré-existant)

### Signaux mémoire
Aucun nouveau (vocab documenté dans javadoc ErrorCode ; pitfall RTK diff déjà en mémoire).
