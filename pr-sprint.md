## Sprint 7 — Socle frontend : état serveur + auth context

Couche d'accès données + contexte auth, pré-requis de tout écran. Cohésion 0.45, milestone #7. Aucune migration Flyway.

### Issues livrées (3)

| # | Type | Résumé |
|---|------|--------|
| #70 | feature | Backend : endpoints profil `/api/me` (GET / PATCH + POST `/me/change-password`), `UserResponse` sans password, `@Transactional` sur `updateUser`, `changePassword` derrière le port `UserService` |
| #40 | refactor | `AuthContext` React (source unique), montage `<Toaster/>`, redirections 401 locale-aware, fix signature `register(name, username, …)`, migration des 4 consumers |
| #48 | chore | Introduction TanStack Query v5 (`QueryClientProvider`, conventions `query-keys.ts`, hooks pilotes `useCurrentUser`/`useProductsWithEvents`) |

**Vagues exécutées :** V1 (∥) = #70 (backend) + #40 (frontend) · V2 = #48 (après #40, `layout.tsx` partagé, ordre wrap Theme>Auth>Query>children).

### Changements clés
- **Backend** : `UserController` (`/api/me`), `UserServiceImpl.changePassword` (BCrypt verify + re-hash), `InvalidCredentialsException` → 400 via `GlobalExceptionHandler`, DTOs `UserResponse`/`UserUpdateRequest`/`ChangePasswordRequest`. Logique change-password placée **derrière le port** (correction DIP / anti-pattern A8 décidée en cours de sprint).
- **Frontend** : `AuthContext` + `QueryProvider` (client), `layout.tsx` réordonné (Theme>Auth>Query>children, `<Toaster/>` au root), `apiClient` redirections `/[locale]/login`, `useCurrentUser` lit AuthContext (**zéro double-fetch `/me`**), type `User` aligné sur le DTO backend (champ `name`).

### BR impactées
- **BR-AUT-001** — unicité username : PATCH `/me` → 409 si pris par un autre compte.
- **BR-AUT-008** — aucun password (même hashé) dans les réponses `/me`.
- **change-password** — 400 ancien pwd faux / 204 succès (≥6 car.).
- **BR-AUTH-003** — ROLE_USER visible dans le contexte auth.

### Audit tests (`docs/memory/audits/sprint-7-test-coverage.md`)
- **Backend** : 56/56 verts, 0 failed.
- **Frontend** : 6 fichiers / 12 tests verts (`vitest run`), `tsc --noEmit` clean.
- **E2E** : aucun nouveau spec — Playwright login **reporté Sprint 8** (report planifié dès la planification). Endpoints `/me` sans UI consommatrice ce sprint (Wave 3+).

### Sécurité (security-expert)
Aucun CRITIQUE. Pas d'IDOR (identité dérivée du cookie jwt seul), pas de fuite de hash, change-password BCrypt constant-time. Findings traités/reportés ci-dessous.

### Review (reviewer batch) — findings traités
- ✅ **[CRITIQUE]** `apiClient.ts` loggait `error.config.headers` (Authorization/cookie) en console → corrigé (`7e58162`), ne logge plus que url/method/status.
- ✅ **[MAJEUR]** drift DTO : type `User` frontend sans champ `name` → ajouté (interface + schéma Zod).
- ⏭ **[MAJEUR reporté]** `AuthContext` stocke le user en localStorage (lisible XSS) — pattern pré-existant (A17), changement du modèle de persistance hors scope → **follow-up** arbitré à la clôture.
- MINEURs acceptés : TOCTOU username (→ #42 contrainte DB), pas d'optimistic lock (risque faible), `authService` encore sur `/auth/me` (wiring FE des nouveaux endpoints prévu sprint suivant).

### Follow-ups identifiés (triage à `/sprint end`)
1. **Tooling** : `scripts/test-quiet.sh frontend` est un no-op (vitest non câblé) → les tests frontend ne tournent pas via l'outillage standard ni la CI. À câbler.
2. **Sécurité** : modèle de persistance auth (localStorage user → httpOnly-only) — décision A17.
3. **Anti-énumération** : 409 username (PATCH `/me` + register) révèle l'existence d'un compte — politique globale à décider.

### Coverage E2E
OK — aucun nouveau `data-testid` orphelin (sprint = providers/hooks, pas de nouvel élément UI).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
