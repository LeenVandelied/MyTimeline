## Sprint 43 — Auth cleanup léger

Solde la dette contrat d'erreur / hygiène auth héritée des Sprints 37-38 (follow-ups). Sprint **backend-only**, **aucune migration**, cohésion 0.70 (epic dominant `auth`).

### Issues livrées (5)

| # | Objet | Type |
|---|-------|------|
| #285 | Cap `spring.datasource.hikari.maximum-pool-size=2` sur le profil test (évite « too many clients » Testcontainers, #139) | chore/config |
| #286 | Split du port `PasswordResetTokenRepository` en `create` (pur INSERT) / `markConsumed` (findById→saveAndFlush) — supprime le SELECT superflu du chemin forgot-password | perf/refactor |
| #289 | `GET /me` renvoie un **401 générique** au lieu de 404 « User not found » sur user-absent (anti-énumération, aligné `/refresh` #113) | security |
| #288 | Unifie le vocabulaire du champ `error` d'`AuthController` sur l'enum `ErrorCode` (un seul vocabulaire snake_case) | refactor |
| #290 | Route les 11 handlers plats restants de `GlobalExceptionHandler` via `buildBody` (`error`=code stable, `message`=texte) | refactor |

### Changements clés
- `ErrorCode` étendu : `UNAUTHORIZED`, `CONFLICT`, `INTERNAL_ERROR` (#288), `BAD_REQUEST` (#290) — taxonomie au niveau statut HTTP, cohérente avec l'existant.
- Contrat d'erreur backend désormais homogène (`{error: <code stable>, ...}`) sur `AuthController` + `GlobalExceptionHandler`.
- `/me` ne distingue plus « compte inexistant » de « token invalide ».

### Garde-fous respectés (vérifiés par revue + tests dédiés)
- **Verrou anti-TOCTOU #143** (PAT-S37-001) intact : `markConsumed` charge toujours l'entité managée `findById → saveAndFlush` (même transaction).
- **Corps enrichi 409 `EventConflict`** (#231 / S42, `serverVersion`+`serverEvent`) **non migré** — verrouillé par `GlobalExceptionHandlerContractTest`.
- Aucun fichier hors périmètre : `SecurityConfig /error` et validation event type (PR #291) non touchés.
- Register 409 : discriminant username/email retiré du body (frontend mappe par statut seul) — renforce l'anti-énumération.

### Tests
- **Suite backend complète : 411/411 verts** (0 failed / 0 error), pool=2 sans deadlock ni « too many clients ».
- Nouveaux : `PasswordResetTokenCreateStatisticsIntegrationTest` (prouve `loadCount==0` sur create), `GlobalExceptionHandlerContractTest` (5, dont non-régression EventConflict enrichi).
- Anti-TOCTOU #143 (`PasswordResetTokenConcurrencyIntegrationTest`) vert, comportement inchangé.
- Audit : `docs/memory/audits/sprint-43-test-coverage.md`.

### Revue
- Reviewer + security-expert : **0 CRITIQUE, 0 MAJEUR**. 1 MINEUR convergent (fail-fast `orElseThrow` de `markConsumed`) résolu par documentation d'invariant (commit `f0d033c`) — aucun changement de comportement.

### Follow-up (triage sprint end)
- `SignatureException` sur `/me` tombe en 500 (vs 401 sur `/refresh`) — side-channel mineur, hors scope #289 [XS | auth].

🤖 Generated with [Claude Code](https://claude.com/claude-code)
