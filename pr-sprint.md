## Sprint 13 — Backend Auth/Sessions & Compte (Wave 5 back)

Révocation des JWT stateless (registre de sessions + jti) et suppression de compte RGPD. Cohésion 0.70 (100 % `epic:auth`).

### Issues livrées
- **#73 — Sessions actives + révocation JWT (jti)** (L) — `d3a776f`
- **#78 — Suppression de compte `DELETE /api/me` (RGPD)** (M) — `e5c8ffd`

### Vagues exécutées
- **V1** : #73 (fondation révocation) — expose `SessionService.revokeAllSessions()`.
- **V2** : #78 (consomme la révocation de #73) — séquencé car dépendance + conflit `AuthController`/`UserController`.

### Changements clés

**#73 — Révocation de session**
- Table `sessions` (jti, user_id, device_info, ip_address tronquée, last_activity, created_at, expires_at, revoked_at) — migration **V10** (index UNIQUE `jti`, FK `user_id` ON DELETE CASCADE, index `user_id`).
- `JwtService.generateToken` embarque un `jti` (UUID) + `extractJti`. `JwtFilter` vérifie `isSessionActive(jti)` à chaque requête authentifiée (lookup indexé, BR-AUT-011).
- `GET /api/sessions` (sessions du caller), `DELETE /api/sessions/{id}` (ownership → 404 anti-énumération), `DELETE /api/sessions/others`. `POST /logout` révoque le jti courant (BR-AUT-010) ; `POST /refresh` rejette un jti révoqué (BR-AUT-009).
- RGPD : `ClientIpAnonymizer` tronque le dernier octet IPv4 ; IPv6 non anonymisable → null. `jti` jamais exposé (DTO).
- Architecture hexagonale stricte : port `SessionService`/`SessionRepository` (domain), impl `@Service`/`@Repository`, `SessionController` injecte les PORTS.

**#78 — Suppression de compte**
- `DELETE /api/me` (`UserController` existant, #70) avec confirmation par re-saisie du username. Identité dérivée du JWT, jamais du body. Mismatch/absent → 400 ; succès → 204 + cookie effacé (MaxAge=0) ; 2e appel → 401.
- Suppression cascade transactionnelle : `revokeAllSessions` → events → products → categories(owner) → user. **SQL natif bindé** pour purger products/events y compris archivés (contourne `@SQLRestriction(archived=false)` qui laisserait des FK résiduelles bloquant le DELETE user). Catégories système (`owner_id NULL`) préservées.
- Découverte schéma : `events` n'a pas de colonne `user_id` — appartenance transitive via `product_id → products.user_id` (sous-select natif). Aucune migration nécessaire.

### BR impactées
- BR-AUT-002/009/010/011 (révocation, refresh, logout, JwtFilter), BR-AUT-001 (ownership suppression).

### Review & corrections (`fd91d9f`)
- **security-expert** — 1 MAJEUR : `GET /api/auth/me` ne vérifiait pas la révocation (route sous le bypass `/api/auth/**` du JwtFilter) → un token révoqué/déconnecté restait accepté, vidant #73 de sa substance. **Corrigé** + test de non-régression.
- **reviewer** — 2 MAJEUR : `JwtFilter` loggait en `error`/`warn` sur des cas nominaux (token expiré côté client, requête anonyme) → pollution stderr (MEMO-007). **Corrigés** (distinction `JwtException` attendue → debug vs anomalie technique → error). MINEUR NPE guard `SessionResponse` (`Objects.equals`) corrigé.
- **db-expert** — migration V10 APPROUVÉE.

### Audit tests
- **Backend : 220 / 220 verts, 0 échec** (`./scripts/test-quiet.sh backend`, Testcontainers Postgres 16). +33 tests sur la baseline S12 (187).
- Nouveaux : `SessionServiceImplTest`, `ClientIpAnonymizerTest`, `SessionRevocationIntegrationTest` (dont `/me` après révocation → 401), `UserControllerTest`, `AccountDeletionIntegrationTest`.
- Frontend inchangé (aucun `.tsx`/`.ts`) → coverage E2E N/A ce sprint.
- Détail : `docs/memory/audits/sprint-13-test-coverage.md`.

### Dette identifiée (hors scope, à ticketer)
- Purge des sessions expirées/révoquées (croissance monotone de la table) — db-expert.
- A8 : `AuthController` injecte `UserServiceImpl` concret (port manquant) — préexistant.
- Extraction d'un `JwtCookieFactory` partagé (`buildJwtCookie` dupliqué AuthController/UserController).
- **Bug préexistant hors sprint** : inscription réelle cassée (`UserMapper.toEntity` setId + `@Version` null → « Detached entity », PIT-S10-003) — signalé en tâche séparée par le fullstack-dev #73, impacte le flux register en prod.

### Cohésion
0.70 — mono-domaine `epic:auth`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
