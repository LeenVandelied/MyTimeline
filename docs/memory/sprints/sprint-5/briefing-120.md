[BRIEFING ISSUE #120]

## Issue
[SECURITY] Externaliser/durcir CORS et cookie par profil (origins, exposedHeaders, SameSite)

## Contexte

La configuration CORS et cookie du backend (`SecurityConfig`) présente trois points à durcir, identifiés lors du triage de clôture du Sprint 4 (PR #113) :

1. **Origins CORS hardcodées** : `allowedOrigins("http://localhost:3000")` est en dur dans le code — l'origine de production n'est pas configurée, et il n'y a pas de séparation dev/prod.
2. **`Authorization` dans `exposedHeaders`** : depuis la migration vers les cookies JWT (#104), le header `Authorization` n'est plus utilisé. L'exposer côté CORS est inutile et légèrement bruyant.
3. **`SameSite=Lax`** : pour une API pure (pas de navigation cross-site), `SameSite=Strict` offre une protection CSRF renforcée sans inconvénient fonctionnel.

**Source :** `docs/memory/sprints/sprint-4/` — triage de clôture PR #113.

## À faire

1. Externaliser `allowedOrigins` par profil : lire depuis une propriété `app.cors.allowed-origins` configurée dans `application-dev.properties` et `application-prod.properties`
2. Retirer `Authorization` de la liste `exposedHeaders` dans la configuration CORS
3. Évaluer et documenter la décision de passer `SameSite=Strict` (si aucun flux cross-site légitme n'est identifié, appliquer le changement)

## BR impactées

Aucune fonctionnellement.

## Critères d'acceptation

- [ ] `allowedOrigins` n'est plus hardcodé dans `SecurityConfig` — lu depuis une propriété externalisée
- [ ] `application-dev.properties` contient `app.cors.allowed-origins=http://localhost:3000`
- [ ] `application-prod.properties` contient la valeur de production (ou la variable d'environnement correspondante)
- [ ] `Authorization` est retiré de `exposedHeaders`
- [ ] La décision sur `SameSite` (Lax ou Strict) est documentée dans un commentaire ou dans le runbook, avec justification

## Piste technique

- `src/main/java/.../config/SecurityConfig.java`
- `src/main/resources/application-dev.properties`
- `src/main/resources/application-prod.properties`

## Dépendances

- #99 (externalisation config cookies — terminé, même pattern à appliquer)
- #104 (migration cookie-only JWT — terminé, justifie le retrait d'`Authorization`)

## Risques techniques

- S'assurer que la propriété `app.cors.allowed-origins` est bien définie dans tous les environnements (local, CI, prod) avant de déployer — une valeur manquante bloquerait toutes les requêtes CORS frontend.
- `SameSite=Strict` peut rompre des flux d'authentification initiés depuis un lien externe (email de confirmation, lien partagé). À vérifier avant d'appliquer.

## Estimation

S — configuration externalisée + nettoyage + décision documentée.


## Plan d'implementation
Follow-up S4. Le body de l'issue ci-dessus EST le plan. Trois durcissements CORS/cookie dans SecurityConfig :
1. Externaliser `allowedOrigins` (aujourd'hui en dur "http://localhost:3000") → lire une propriété `app.cors.allowed-origins` ; valeur dev dans application-dev.properties (http://localhost:3000), valeur prod dans application-prod.properties (ou var d'env). Même pattern d'externalisation que #99 (cookies). Supporter une liste (séparée par virgules) si plusieurs origines.
2. Retirer `Authorization` de `exposedHeaders` (plus utilisé depuis le passage cookie-only JWT, #104).
3. Évaluer/documenter SameSite : passer Lax→Strict SI aucun flux cross-site légitime ; sinon justifier le maintien de Lax. Documenter la décision (commentaire + runbook).
ATTENTION : #119 (vague 1, déjà committé) a déjà touché SecurityConfig.java (accessDeniedHandler) — pars de l'état ACTUEL du fichier sur HEAD. Tu ne touches QUE le bean CORS / cookie / exposedHeaders, PAS l'accessDeniedHandler.

## Triage
Taille: S
Modele: opus
Effort: high

## Context-pack domaine (lire EN PRIORITE avant tout code)

<!-- ===== cp-hexagonal.md ===== -->
# Context-pack : Architecture hexagonale

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

> Reference maitre : `.claude/rules/hexagonal.md`
> A charger pour TOUTE tache backend touchant `{{JAVA_PACKAGE}}.*`

## Structure obligatoire

```
{{JAVA_PACKAGE}}/
├── domain/            # Couche metier pure (Java pur, 0 framework)
├── application/       # Ports (interfaces) et use cases
└── infrastructure/    # Adapters techniques (JPA, REST, Quarkus)
```

## Imports interdits — AUDIT AUTOMATIQUE par hook `check-hexagonal.sh`

### `domain/` NE DOIT JAMAIS importer :
- `jakarta.*` (sauf annotations validation : `@NotNull`, `@Valid`, `@Size`)
- `io.quarkus.*`
- `javax.*`
- `{{JAVA_PACKAGE}}.infrastructure.*`
- `{{JAVA_PACKAGE}}.application.*` (sauf interfaces de ports)

### `application/` NE DOIT JAMAIS importer :
- `{{JAVA_PACKAGE}}.infrastructure.*`
- `io.quarkus.*` (sauf annotations CDI basiques : `@ApplicationScoped`, `@Inject`)

### `infrastructure/` peut importer tout :
- `{{JAVA_PACKAGE}}.domain.*`
- `{{JAVA_PACKAGE}}.application.*`
- Tous les frameworks necessaires

## DEC-009 — Ports obligatoires

- `application/` ne touche JAMAIS `infrastructure/` directement
- Les ports (interfaces) sont definis dans `application/`
- Les implementations (adapters) sont dans `infrastructure/`

## Anti-patterns a proscrire

- Entite JPA dans `domain/` → deplacer vers `infrastructure/persistence/`
- `@Path`, `@GET`, `@POST` dans `domain/` ou `application/`
- `l'ORMRepository` dans `application/` → port + adapter infra
- Static method call vers `application` depuis `domain`

## Checklist implementation

- [ ] La logique metier est dans `domain/` (pure)
- [ ] Les use cases sont dans `application/` via ports
- [ ] Les adapters (REST, JPA, HTTP client) sont dans `infrastructure/`
- [ ] Le hook `check-hexagonal.sh` passe sans erreur

## Reference pour approfondir

`.claude/rules/hexagonal.md` (rule versionnee)
`docs/memory/decisions.md#DEC-009`

<!-- ===== cp-backend.md ===== -->
# Context-pack : Backend le langage backend / Quarkus

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

> Reference maitre : `.claude/rules-jit/backend.md`
> A charger pour TOUTE tache backend

## Stack

le langage backend + le framework backend + l'ORM + l'outil de migration + le provider d'identité + la base de données

## Conventions le langage backend

- **Records** pour DTOs (request/response immuables)
- **Sealed Classes** pour etats metier
- **Pattern Matching**, Streams
- **Validation** : `@Valid` + Bean Validation sur tous les `@RequestBody`
- **Reponses** : `Response.ok(dto).build()` ou `Response.created(uri).build()`
- **Erreurs** : le format d'erreur
- **Logging** : le logger injecte — jamais `System.out`
- **Config** : `@ConfigProperty` pour valeurs externalisees
- **JPA constructeurs** : `public Entity() {}` (pas protected)

## Regles transversales entites

- **Soft delete** (règle métier suppression) : champ `deleted_at` obligatoire, JAMAIS de DELETE physique
- **UUID v7** (règle métier clés primaires) sur toutes les cles primaires
- **Ownership** (règle métier ownership) : verifier l'identifiant propriétaire sur chaque endpoint GET/PUT/DELETE securise, admins bypassent via `isAdmin`

## Securite

- `@RolesAllowed` sur chaque endpoint protege
- Aucune donnee sensible dans les logs
- Aucune concatenation SQL
- `l'identité de sécurité` (pas `JsonWebToken`) avec le provider d'identite

## Migrations l'outil de migration

- `db/migration/V{n}__{description}.sql`
- Rollback commente dans chaque fichier
- JAMAIS modifier une migration deja appliquee
- Derniere migration : `ls {{MIGRATIONS_DIR}}/V*.sql | sort -V | tail -1` (hook `check-stack-drift.sh` avertit en cas de drift)

## l'ORM

- `persist()` = INSERT only. Pour upsert → `getEntityManager().merge()`
- `TranslationRepository` implemente directement par `l'ORMRepository`

## Null safety

- `orElseThrow()` quand l'entite DOIT exister — jamais `orElse(null)` + null checks downstream
- Fallback explicite obligatoire pour les valeurs nullable externes (locale, enum)

## Tests `@QuarkusTest`

- **`@TestTransaction`** (pas `@Transactional`) pour rollback automatique — `@Transactional` commit et pollue les tests suivants. **PIT recurrent**.
- Test data : valeurs uniques par test (generateur AtomicInteger ou UUID), jamais de constantes partagees entre tests

## Qualite du code

- Methodes > 20 lignes → decomposer
- Complexite cyclomatique > 5 → refactorer
- Pas de magic numbers/strings
- Nommage explicite
- **Risque N+1** : `fetch join` ou `@BatchSize`
- Toute liste paginee
- Index DB prevus pour colonnes filtrees/triees

## Pitfalls backend frequents

- `@Transactional` dans tests → pollue tests suivants. Toujours `@TestTransaction`.
- `orElse(null)` + null check downstream → NPE cache. `orElseThrow()`.
- `persist()` pour update → INSERT duplique. `getEntityManager().merge()`.
- Concatenation SQL → injection. Query params obligatoires.
- Migration modifiee apres deploiement → cluster inconsistant. Creer V{n+1}.

## Reference pour approfondir

`.claude/rules-jit/backend.md` (rule versionnee)
`docs/memory/pitfalls.md` (filtre par PIT-XX backend)

<!-- ===== br-auth.md ===== -->
# Context-pack domaine : `auth`

> Domaine : `auth` — inscription, authentification JWT (cookie HttpOnly + Bearer), session courante et refresh de token pour les utilisateurs MyTimeline.
> Acteurs principaux : `anonymous` (visiteur non authentifié), `ROLE_USER` (utilisateur authentifié), `ROLE_ADMIN` (déclaré mais inutilisé), `system` (filtre JWT, refresh périodique frontend).

---

## 1. Lifecycles (machines à états)

### Entité `User`

CRUD simple côté persistance — **pas de lifecycle d'état métier** sur `User` (aucun champ `status`/`state`, pas de soft-delete, pas d'activation/désactivation). Le seul cycle réel est celui de la **session JWT**, porté par le cookie `jwt`, non par l'entité.

### Session JWT (état dérivé du token, non persisté)

| Etat | Description | Transitions sortantes |
|------|-------------|-----------------------|
| `ANONYME` | Aucun cookie `jwt` / pas de Bearer | → `AUTHENTIFIÉ` via `POST /login` (succès) ou `POST /register` puis login |
| `AUTHENTIFIÉ` | Token valide présent (cookie ou header), `validateToken` OK | → `EXPIRÉ` après MaxAge (2 jours) ; → `ANONYME` via `POST /logout` ; → `AUTHENTIFIÉ` (renouvelé) via `POST /refresh` |
| `EXPIRÉ` | `ExpiredJwtException` levée à l'extraction | → `ANONYME` ; ✅ depuis S4 #105 `POST /refresh` bloque le token expiré/invalide (401, voir BR-AUT-009) |

> ⚠️ `CustomUserDetails.isAccountNonExpired / isAccountNonLocked / isCredentialsNonExpired / isEnabled` renvoient tous `true` en dur (commentaire `need to implement logic`). Aucun verrouillage / désactivation de compte n'existe.

---

## 2. Actions x Acteurs

| Action | anonymous | ROLE_USER | ROLE_ADMIN | system | Notes |
|--------|:--------:|:---------:|:----------:|:------:|-------|
| `POST /api/auth/register` | ✅ | ✅ | ✅ | — | `permitAll`, rôle forcé `ROLE_USER` (BR-AUT-006) |
| `POST /api/auth/login` | ✅ | ✅ | ✅ | — | `permitAll`, pose cookie HttpOnly ; body = `{"message":...}` sans JWT depuis S4 #104 (BR-AUT-007) |
| `POST /api/auth/logout` | ✅ | ✅ | ✅ | — | `permitAll`, efface cookie (MaxAge=0) |
| `POST /api/auth/refresh` | ⚠️ | ✅ | ✅ | ✅ (toutes les 6h frontend) | `permitAll` ; valide expiration+signature avant ré-émission depuis S4 #105 (BR-AUT-009) |
| `GET /api/auth/me` | ❌ | ✅ | ✅ | — | `permitAll` mais exige cookie `jwt` ; ⚠️ renvoie l'objet `User` domaine avec mot de passe hashé (BR-AUT-008) |
| Accès `/api/users/**`, `/api/products/**`, `/api/events/**` | ❌ | ✅ | ✅ | — | exige token valide (JwtFilter) |
| Endpoints `hasAuthority('ROLE_ADMIN')` | ❌ | ❌ | ❌ | — | ⚠️ rôle ADMIN mort, aucun endpoint ne l'utilise |

---

## 3. Business Rules atomiques

### BR-AUT-001 — Unicité du username à l'inscription
**Règle** : Le `system` MUST refuser un `register` quand un `User` avec le même `username` existe déjà (réponse `409 CONFLICT`).
**Pourquoi** : Le username est l'identifiant de connexion ; un doublon rendrait l'authentification ambiguë.
**Implémentation** : `AuthController.register` (l.106-110) via `userService.findDomainUserByUsername`.
**Test attendu** : `AuthControllerTest#register_shouldReturn409_whenUsernameAlreadyExists`.
> ⚠️ **NON IMPLÉMENTÉ au niveau DB** : `UserEntity` n'a pas de `@Column(unique=true)` sur `username` → doublon possible en cas de course concurrente (check applicatif seul, non atomique). `email` n'a aucun contrôle d'unicité ni applicatif ni DB.

### BR-AUT-002 — Hachage du mot de passe avant persistance
**Règle** : Le `system` MUST hacher le mot de passe (BCrypt) avant de construire et persister le `User`.
**Pourquoi** : Aucun mot de passe en clair ne doit être stocké.
**Implémentation** : `AuthController.register` (l.112) `passwordEncoder.encode(...)`.
**Test attendu** : `AuthControllerTest#register_shouldStoreBcryptHash_notPlaintext`.

### BR-AUT-003 — Validation des champs d'inscription
**Règle** : Le `system` MUST rejeter un `register` dont `name`/`username` ne font pas 3..20 caractères, `email` non valide, ou `password` < 6 caractères.
**Pourquoi** : Garantir des credentials exploitables et un email correct.
**Implémentation** : annotations Bean Validation sur `RegisterRequest` (`@NotBlank`, `@Size(min=3,max=20)`, `@Email`, `@Size(min=6)`).
**Test attendu** : `AuthControllerTest#register_shouldReturn400_whenPasswordTooShort`.
> ⚠️ **NON IMPLÉMENTÉ (code mort)** : `@Valid` ABSENT sur `@RequestBody RegisterRequest` (`AuthController.register` l.104). Toutes les annotations de `RegisterRequest` ne sont JAMAIS déclenchées → aucune validation serveur. Côté frontend, `RegisterData` n'a pas de schéma Zod → aucune validation client non plus. **Fix attendu : ajouter `@Valid`.**

### BR-AUT-004 — Validation des credentials de login
**Règle** : Le `system` MUST rejeter un `login` dont `username` < 3 ou `password` < 6 caractères.
**Pourquoi** : Cohérence avec les contraintes d'inscription, éviter des requêtes d'auth triviales.
**Implémentation** : `AuthRequest` côté backend ; `LoginSchema` Zod côté frontend (`username z.string().min(3)`, `password z.string().min(6)`).
**Test attendu** : `AuthControllerTest#login_shouldReject_whenUsernameTooShort`.
> ⚠️ **NON IMPLÉMENTÉ côté backend** : `AuthRequest` ne porte AUCUNE annotation de validation et `@Valid` est absent. Seul le frontend (Zod) contraint ces champs.

### BR-AUT-005 — Échec d'authentification → 401, jamais de fuite interne
**Règle** : Le `system` MUST renvoyer `401 UNAUTHORIZED` (`"Invalid username or password"`) sur mauvais credentials et NE MUST PAS exposer de détail interne d'exception.
**Pourquoi** : Ne pas divulguer si l'utilisateur existe ; éviter la fuite de stack trace.
**Implémentation** : `AuthController.login` (l.68-72), délégation à `AuthenticationManager`, catch `BadCredentialsException`.
**Test attendu** : `AuthControllerTest#login_shouldReturn401_onBadCredentials`.
> ⚠️ **VIOLATION** : le `catch (Exception e)` (l.71) renvoie `ResponseEntity.status(500).body(e)` — l'objet exception est sérialisé dans le body → fuite potentielle d'informations internes. **À corriger.**

### BR-AUT-006 — Rôle forcé à `ROLE_USER` à l'inscription
**Règle** : Le `system` MUST assigner `ROLE_USER` à tout nouvel utilisateur ; un `anonymous` NE MUST PAS pouvoir choisir son rôle.
**Pourquoi** : Empêcher l'auto-élévation de privilèges (ex. s'inscrire en ADMIN).
**Implémentation** : `AuthController.register` (l.119) — littéral String `"ROLE_USER"`.
**Test attendu** : `AuthControllerTest#register_shouldAlwaysAssignRoleUser`.
> ⚠️ Le rôle est un `String` brut (pas l'enum `Role`). L'enum `Role(USER, ADMIN)` existe mais n'est jamais utilisée pour la persistance ni le typage → pas de type safety, pas de contrainte DB.

### BR-AUT-007 — Émission du token et cookie HttpOnly au login
**Règle** : Au login réussi, le `system` MUST poser un cookie `jwt` HttpOnly, `Path=/`, `SameSite=Lax`, MaxAge 2 jours, contenant les authorities en claim `role`.
**Pourquoi** : Session navigateur protégée contre l'accès JS (XSS).
**Implémentation** : `AuthController.login` (l.56-66) ; `JwtService.generateToken(Authentication)` embarque les authorities.
**Test attendu** : `AuthControllerTest#login_shouldSetHttpOnlyJwtCookie`.
> ✅ **RÉSOLU Sprint 4** : (a) #104 — le login renvoie `{"message":"Authentification réussie"}`, plus de JWT en body (token en cookie HttpOnly seul) ; (b)+(c) #99 — `Secure`/`Domain` externalisés en `@Value("${app.cookie.*}")`, defaults base fail-safe (`secure=${COOKIE_SECURE:true}`, `domain=${COOKIE_DOMAIN:}` host-only), profils dev (false/localhost) / prod (true). Helper unique `buildJwtCookie` → attributs cohérents login/refresh/logout (cf. BR-AUT-010). (Sprint 4 #104/#99)

### BR-AUT-008 — `/me` retourne l'utilisateur courant sans secret
**Règle** : `GET /me` MUST renvoyer les données de l'utilisateur identifié par le token et NE MUST PAS exposer le mot de passe (même hashé).
**Pourquoi** : Un hash ne doit jamais transiter par l'API (risque de cassage offline, surface inutile).
**Implémentation** : `AuthController.getUserDetails` (l.75-101) — extrait username, `validateToken`, renvoie l'utilisateur.
**Test attendu** : `AuthControllerTest#me_shouldNotExposePasswordHash`.
> ⚠️ **VIOLATION CRITIQUE** : l.93 renvoie directement l'objet domaine `User.get()` → le champ `password` (hash) est sérialisé dans la réponse HTTP. **Fix attendu : projection / DTO sans password.**

### BR-AUT-009 — Refresh exige un token encore valide
**Règle** : `POST /refresh` MUST vérifier que le token courant est valide (non expiré) avant d'émettre un nouveau token, sinon `401`.
**Pourquoi** : Un token expiré ne doit pas pouvoir prolonger indéfiniment une session.
**Implémentation** : `AuthController.refreshToken` (l.147-185).
**Test attendu** : `AuthControllerTest#refresh_shouldReturn401_whenTokenExpired`.
> ✅ **RÉSOLU Sprint 4 (#105)** : `refreshToken` appelle `jwtService.validateToken(token, userDetails)` AVANT `generateToken` (→ 401 si false) ; catch élargi à `JwtException` (couvre Expired/Signature/Malformed) → 401 `{"error":"token expiré ou invalide"}`, plus de 500. Le cas `user.isEmpty()` renvoie le MÊME 401 générique (anti-énumération, fix review #113) au lieu d'un 404. Tests : `AuthControllerSecurityTest` (valide/expiré/signature/user-inconnu).

### BR-AUT-010 — Logout invalide la session navigateur
**Règle** : `POST /logout` MUST effacer le cookie `jwt` (MaxAge=0) pour terminer la session côté navigateur.
**Pourquoi** : Permettre la déconnexion explicite.
**Implémentation** : `AuthController.logout` (l.131-145).
**Test attendu** : `AuthControllerTest#logout_shouldExpireJwtCookie`.
> ⚠️ Incohérence de config : le cookie de logout est `Secure=true` (l.136) alors que login/refresh posent `Secure=false` (l.60/172) → attributs asymétriques, l'effacement peut ne pas matcher le cookie posé selon le navigateur. JWT non révoqué côté serveur (stateless) : le token reste valide jusqu'à expiration si déjà capturé.

### BR-AUT-011 — JwtFilter accepte cookie OU Bearer et bypass /api/auth/**
**Règle** : Le `system` (JwtFilter) MUST authentifier les requêtes via le cookie `jwt` OU l'en-tête `Authorization: Bearer`, et NE MUST PAS filtrer les routes `/api/auth/**`.
**Pourquoi** : Permettre login/register sans token tout en protégeant le reste de l'API.
**Implémentation** : `JwtFilter.shouldNotFilter` (bypass `/api/auth/**`) + lecture cookie/Bearer.
**Test attendu** : `JwtFilterTest#shouldAuthenticate_fromCookieOrBearer` / `shouldSkip_authPaths`.

---

## 4. Dépendances inter-domaines

- **Aucune relation JPA** : `UserEntity` est une table `users` autonome (pas de `@OneToMany`/`@ManyToOne`).
- **Dépendances logiques sortantes** : `users`, `products`, `events` exigent un `User` authentifié (`ROLE_USER`) via JwtFilter — le domaine `auth` est producteur de l'identité consommée par ces domaines (notamment `userId` dans `/api/users/{userId}/products/**`).
- **Couplage infrastructure (à surveiller)** : `AuthController` importe et injecte des classes infra (`UserServiceImpl` concret, `JwtService`, `CustomUserDetailsService`, `CustomUserDetails`) — voir anti-patterns.
- **Frontend** : `useAuth` (state d'auth, localStorage) et `apiClient` (intercepteur axios 401/403 → redirect `/login`, refresh périodique) dépendent des contrats de ce domaine.

---

## 5. Anti-patterns documentés

| # | Anti-pattern | Localisation | Gravité |
|---|--------------|--------------|:-------:|
| A1 | `/me` renvoie l'objet domaine `User` → hash de mot de passe exposé en HTTP | `AuthController` l.93 | CRITIQUE |
| A2 | `@Valid` absent sur `@RequestBody RegisterRequest` → toutes les Bean Validations sont du code mort | `AuthController` l.104 | CRITIQUE |
| A3 | ~~JWT brut renvoyé dans le body du login~~ → ✅ RÉSOLU S4 #104 (body `{"message":...}`) | `AuthController` | ~~HAUTE~~ |
| A4 | `catch (Exception)` renvoie l'objet exception dans le body (500) → fuite d'internes ⚠️ partiel : login/refresh renvoient désormais `{"error":...}` générique (#113) mais `catch` toujours présent | `AuthController` | MOYENNE |
| A5 | ~~`refresh` n'invalide pas un token expiré avant ré-émission~~ → ✅ RÉSOLU S4 #105 (`validateToken` avant `generateToken`) | `AuthController` | ~~HAUTE~~ |
| A6 | ~~`Secure=false` en dur, config asymétrique~~ → ✅ RÉSOLU S4 #99 (`@Value` externalisé, defaults fail-safe, helper unique) | `AuthController` | ~~HAUTE~~ |
| A7 | ~~`domain="localhost"` en dur~~ → ✅ RÉSOLU S4 #99 (`@Value("${app.cookie.domain}")`, prod host-only) | `AuthController` | ~~HAUTE~~ |
| A8 | `AuthController` injecte `UserServiceImpl` concret + importe classes infra → viole hexagonal/DIP | l.24-28, 38 | MOYENNE |
| A9 | `role` stocké en `String` (domaine + entité) ; enum `Role` inutilisée → pas de type safety ni contrainte DB | `UserEntity`, `User` | MOYENNE |
| A10 | `UserEntity` sans `@Column(unique=true)` ni contraintes (nullable, length) → doublons username/email possibles, VARCHAR(255) nullable par défaut | `UserEntity` | MOYENNE |
| A11 | `useAuth.register` passe `username` comme `name` ET premier argument → le champ `name` vaut toujours `username`, l'input `name` réel est ignoré | `useAuth.ts` l.54 | MOYENNE |
| A12 | `RegisterData` sans schéma Zod → aucune validation client à l'inscription | frontend register flow | MOYENNE |
| A13 | Refresh périodique via `setInterval` (6h) au chargement du module, sans cleanup ni vérif d'auth réelle | `apiClient.ts` l.22 | BASSE |
| A14 | `CustomUserDetails` : `isAccountNonExpired/NonLocked/CredentialsNonExpired/isEnabled` renvoient `true` en dur (`need to implement logic`) | `CustomUserDetails` | BASSE |
| A15 | `UserServiceImpl.updateUser` sans `@Transactional` (alors que `createUser` l'a) | `UserServiceImpl` | BASSE |
| A16 | Enum `Role.ADMIN` jamais référencée par un `hasAuthority` → rôle ADMIN mort | sécurité globale | BASSE |
| A17 | `useAuth` lit l'utilisateur depuis `localStorage` au montage sans vérification serveur | `useAuth.ts` | BASSE |

---

## Référence

- Coverage actuelle : `coverage-auth.md`
- Backend : `backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` (+ `application/dtos/RegisterRequest.java`, `AuthRequest.java`, `infrastructure/entities/UserEntity.java`, `infrastructure/security/{JwtService,JwtFilter,CustomUserDetails,CustomUserDetailsService}.java`, `domain/models/User.java`, `domain/models/Role.java`)
- Frontend : `frontend/src/hooks/useAuth.ts`, `frontend/src/services/apiClient.ts` (+ schémas Zod `LoginSchema`, `UserSchema`)

<!-- CACHE_CONTROL_BREAKPOINT -->


## Dependances intra-sprint
- #119 (vague 1) déjà committé : SecurityConfig.accessDeniedHandler en place — n'y touche pas, pars de l'état HEAD.
- #111 (vague 1) a édité application.properties (profil) — toi tu édites application-dev.properties et application-prod.properties (CORS), fichiers différents.
- Tu PRÉCÈDES #118 (vague 4) qui ajoutera COOKIE_DOMAIN dans application-prod.properties — laisse le fichier propre.

## Designer
Non applicable (config sécurité backend).

## Contraintes
- Branche sprint/5 déjà checkout. 1 commit gitmoji français.
- Tests OBLIGATOIRES : ./scripts/test-quiet.sh unit. Vérifie que les tests CORS/headers existants (RateLimitingAndHeadersIntegrationTest) passent toujours avec l'origine externalisée — fournis la propriété app.cors.allowed-origins au profil de test si nécessaire.
- INTERDIT de toucher : accessDeniedHandler de SecurityConfig (#119), AuthController.java, GlobalExceptionHandler.java, migrations, application.properties (profil = #111).
- Sujet sécurité (CORS/CSRF/SameSite) → signale RECOMMAND_SECURITY.
- IMPORTANT worktree partagé : commit par chemins explicites, jamais `git add -A` ni `git stash` global.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA]
- resume: origins externalisées (dev+prod) + Authorization retiré + décision SameSite (valeur + justification) + tests
- [MEMORY:*] signaux (décision SameSite, pattern externalisation CORS)
- recommandations suite: RECOMMAND_SECURITY / RECOMMAND_FOLLOWUP
- STATUS: COMPLETED en dernière ligne (ou PARTIAL + BLOQUE_SUR)
