# Issue #288 — Unifier le vocabulaire du champ error d'AuthController sur ErrorCode

commits: [863b866]

resume:
- Contrat retenu: Option A — AuthController migré sur `ErrorCode`, forme PLATE `{"error": <code>}`
  conservée (pas de `message` ajouté), code au NIVEAU STATUT HTTP.
- ErrorCode ajoutés: `UNAUTHORIZED("unauthorized")`, `CONFLICT("conflict")`, `INTERNAL_ERROR("internal_error")`.
  Javadoc màj ("à arbitrer S38" → "AuthController migré #288").
- Mapping: 401→unauthorized (login badcreds, /me ×5, /refresh ×5), 409→conflict (register), 500→internal_error (catch).
- Register/frontend: `register/page.tsx` mappe le 409 par STATUT HTTP seul (pas le champ `field`)
  → collapse `conflict` SÛR ; discriminant username/email (bloc `field` mort) supprimé du body.
- Cohérent avec SecurityConfig handlers (`unauthorized`/`forbidden`) — aucun handler touché.
- BR-AUT-005 (login neutre) préservé. Hors scope respecté: GlobalExceptionHandler (#290), SecurityConfig, UserController.
- Tests màj verts: AuthControllerSecurityTest (11), AuthControllerErrorContractTest (5),
  SessionRevocationIntegrationTest (8), AuthErrorContractIntegrationTest (3) = 30 OK (scope ciblé).

[MEMORY:decision] Champ `error` d'AuthController mélangeait anglais/snake_case/français. Décision #288:
migration sur enum `ErrorCode`, codes stables snake_case au niveau STATUT (`unauthorized`/`conflict`/
`internal_error`), forme plate `{"error":<code>}` inchangée. Register 409 collapse en `conflict` (frontend
mappe par statut seul). Contrat d'erreur prévisible, un seul vocabulaire, cohérent SecurityConfig + ErrorCode existant.

recommandations suite: aucun (#290 étendra aussi ErrorCode.java en fin d'enum — pas de collision, codes déjà posés).

STATUS: COMPLETED
