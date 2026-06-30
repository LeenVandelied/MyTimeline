[BRIEFING ISSUE #48]

## Issue
[CHORE] Introduire TanStack Query (state serveur)

## Contexte

L'état serveur du frontend est géré avec des appels Axios bruts, sans cache, sans déduplication des requêtes et sans mécanisme de refetch automatique. Cette approche crée des problèmes visibles : les données ne se rafraîchissent pas après une mutation, les requêtes identiques sont envoyées plusieurs fois en parallèle, et il n'y a aucune gestion de l'état de chargement ou d'erreur cohérente. TanStack Query v5 résout ces problèmes et est un prérequis indispensable pour les drawers et listes des Waves 3 à 5.

## À faire

1. Installer TanStack Query v5 (`@tanstack/react-query` + `@tanstack/react-query-devtools`).
2. Configurer `QueryClientProvider` au niveau du layout root (`frontend/app/layout.tsx` — voir contraintes ci-dessous, emplacement EXACT déjà préparé par #40).
3. Définir les conventions de query keys par domaine :
   - `['products']`, `['products', productId]`
   - `['events']`, `['events', eventId]`
   - `['categories']`, `['categories', categoryId]`
   - `['auth', 'me']`
4. Migrer 1 à 2 appels pilotes pour valider la mise en place :
   - Liste des produits (`GET /api/products/with-events`) → `useProductsWithEvents()`
   - Profil utilisateur courant (`GET /api/auth/me`) → `useCurrentUser()`
5. Documenter les conventions dans un fichier `frontend/src/lib/query-keys.ts`.

## Critères d'acceptation

- [ ] `@tanstack/react-query` v5 installé dans `package.json`
- [ ] `QueryClientProvider` configuré au layout root
- [ ] Fichier `frontend/src/lib/query-keys.ts` avec les conventions par domaine
- [ ] `useProductsWithEvents()` et `useCurrentUser()` fonctionnels avec TanStack Query
- [ ] `@tanstack/react-query-devtools` accessible en dev
- [ ] Les appels Axios pilotes migrés ne régressent pas (les données s'affichent comme avant)
- [ ] Coexistence axios brut / TanStack documentée (les anciens appels non migrés continuent de fonctionner)

## Risques techniques

- Coexistence temporaire des appels Axios bruts et TanStack Query pendant la migration progressive : risque de double fetch sur les mêmes endpoints. Documenter clairement quels appels ont été migrés.
- TanStack Query v5 a cassé l'API de v4 (hooks renommés, `cacheTime` → `gcTime`, etc.) — vérifier qu'aucune dépendance indirecte n'utilise déjà TanStack Query v4.

## Plan d'implémentation (architect, /sprint plan)
```yaml
issue_48:
  fichiers_cles:
    - "frontend/src/lib/query-keys.ts"          # NOUVEAU conventions clés
    - "frontend/app/layout.tsx"                 # +QueryClientProvider (PARTAGÉ avec #40 — déjà committé 24807b1)
    - "frontend/src/hooks/useProductsWithEvents.ts"
    - "frontend/src/hooks/useCurrentUser.ts"
    - "frontend/package.json"                   # @tanstack/react-query v5 + devtools
  couches_touchees: ["frontend-data"]
  strategie_test: "RTL : useProductsWithEvents/useCurrentUser ne régressent pas. Vérifier pas de double-fetch /me (coexistence axios documentée)."
  risque_regression: "MOYEN — double-fetch /me si useCurrentUser duplique AuthContext (#40). v5 API ≠ v4 (gcTime). layout.tsx partagé → APRÈS #40."
  ordre_ecriture: "install v5 → QueryClientProvider après AuthProvider → query-keys.ts → 2 hooks pilotes"
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: "aucune evidence — pas de @tanstack dans package.json (CONFIRMÉ) ; services axios bruts (apiClient/productService/eventService)."
```

## Triage
Taille: M
Modèle: opus
Effort: high

## Context-pack domaine (lire EN PRIORITE avant tout code)

<!-- ===== cp-frontend.md ===== -->
# Context-pack : Frontend Next.js 16 / TypeScript

> ⚠️ EXEMPLE Layer B (instance EdelWheels / Quarkus-Next). À RÉGÉNÉRER par /ai-env:setup pour ta stack. Voir REBUILD-PLAN.md §2.2.

> Reference maitre : `.claude/rules-jit/frontend.md`
> A charger pour TOUTE tache frontend

## Stack

le framework frontend + TypeScript strict + le framework CSS + la gestion d'état

## Conventions TypeScript

- **TypeScript strict** : zero `any`, zero `as` cast non justifie
- **Server Components** par defaut, `"use client"` uniquement si necessaire
- `"use client"` inutile sur fichiers type-only (pas de hooks React)
- **TanStack Query** cote client, `fetch` natif dans Server Components
- **Forms** : React Hook Form + Zod
- **Style** : Tailwind CSS + shadcn/ui UNIQUEMENT

## i18n (règle métier i18n) — langues configurées du projet

- TOUJOURS `useTranslations("namespace")` — jamais de strings FR hardcodees
- `useTranslations("ns")` separe par namespace (next-intl ne supporte pas `t("key", { ns })`)
- Zod schemas : factory function `createSchema(messages)` avec `useMemo`
- Module-level i18n : separer styles statiques + `buildConfig(t)` function

## Formatage locale (règle métier locale/devise)

- TOUJOURS `{{LOCALE_CONSTANT}}` de `@/lib/utils` — jamais `"{{LOCALE_CODE}}"` hardcode
- SSR : utiliser le helper de formatage locale du projet (deterministe) — jamais `Intl.NumberFormat` inline (hydration mismatch)
- `Intl.DateTimeFormat({{LOCALE_CONSTANT}}, ...)` pour dates

## Montants (règle métier devise)

- Tout montant avec code devise ISO 4217
- Utiliser `currency` du type response, JAMAIS hardcoder la devise du projet

## Accessibilite

- **Spinners** : `role="status"` + `aria-label` + `<span class="sr-only">`
- **Tables** : `aria-label` sur `<table>`, `scope="col"` sur `<th>`
- **Barres progression** : `role="progressbar"` + `aria-valuenow/min/max`
- **Boutons** : `focus:ring-2 focus:ring-accent`
- **Elements interactifs custom** : `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space) + `focus:ring-2`

## Charts Recharts

- TOUJOURS `useChartTheme()` — JAMAIS de hex inline
- Importer couleurs depuis `tokens.ts` ou `useChartTheme()`
- `Number(value)` pour Tooltip formatter

## Zod / DTO Synchronisation

Voir `.claude/rules-jit/zod-dto-sync.md` (ou Phase 2 : `cp-zod-dto-sync.md`).
Resume :
- `.nullable()` pour nullable backend
- `.optional()` pour absent
- JAMAIS `.nullish()` en code manuel (accepte dans code genere)
- Endpoint pagine : TOUJOURS `paginatedSchema(itemSchema)`, jamais `schema.array()`

## Design

- Consulter `la charte de design` et `les design tokens`
- **Theme-aware** : chaque composant fonctionne en clair ET sombre
- Mock data : format machine-readable, jamais strings FR hardcodees
- Animations : `duration-300` standard

## Tests — zero warning stderr (MEMO-007)

Tout test livre doit produire un run vitest sans aucune ligne stderr.
- **MockImage** : exclure `priority`, `fill`, `quality`, `placeholder`, `blurDataURL`, `loader`, `unoptimized` du spread `...rest` vers `<img>`
- **`act()` warning** : render avec effets async → test `async` + `await waitFor(() => stableCondition)`
- **Logs d'erreur intentionnels** : `vi.spyOn(console, "error").mockImplementation(() => {})` + `mockRestore()`

## Pitfalls frontend frequents

- `.nullish()` dans schema manuel → ZodError runtime (PIT-174)
- `validated()` avec schema genere sans overlay nullable → strip silencieusement (PIT-180)
- `Intl.NumberFormat('{{LOCALE_CODE}}')` inline → hydration mismatch SSR vs client (PIT-185)
- `validated()` en `select:` sur fallback non-conforme (PIT-186)
- `schema.array()` au lieu de `paginatedSchema()` → `.filter()` crash sur `{items, total, page, size}`

## Reference pour approfondir

`.claude/rules-jit/frontend.md` (rule versionnee)
`.claude/rules-jit/zod-dto-sync.md` (checklist DTO/Zod)
`docs/memory/pitfalls.md` (filtre par PIT-XX frontend)

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

## Dépendances intra-sprint
- DÉPEND DE #40 (committé en 24807b1, Vague 1). `layout.tsx` est partagé : #40 y a déjà placé `<AuthProvider>` à l'intérieur de `<ThemeProvider>` et un marqueur d'emplacement pour toi.
- ⚠ CHEMIN RÉEL : le layout root est `frontend/app/layout.tsx` (PAS `frontend/src/app/layout.tsx` — le mini-plan se trompait). Structure actuelle committée :
  ```
  <ThemeProvider ...>
    <AuthProvider>
      {/* <QueryClientProvider> (#48) viendra ici */}
      {children}
    </AuthProvider>
  </ThemeProvider>
  <Toaster position="top-right" />   ← frère, NE PAS déplacer
  ```
  → Enveloppe `{children}` d'un `<QueryClientProvider>` À CET EMPLACEMENT EXACT (entre `<AuthProvider>` et `{children}`). NE déplace NI `<ThemeProvider>` NI `<AuthProvider>` NI `<Toaster>`. Ordre final imposé : Theme > Auth > Query > children.
  → `QueryClientProvider` doit être dans un composant client (`"use client"`) — crée un petit wrapper `Providers`/`QueryProvider` client si layout.tsx est un Server Component, plutôt que de transformer tout le layout en client.

## ⚠ Point dur — double-fetch /me (BR-AUT, risque architect MOYEN)
- #40 a créé `AuthContext` qui détient déjà `user` et constitue la SOURCE UNIQUE de l'utilisateur courant côté app (il lit /me / localStorage). 
- Si `useCurrentUser()` (#48) refait un fetch `GET /api/auth/me` via TanStack en parallèle, tu crées un double-fetch /me sur les écrans qui consomment déjà AuthContext.
- ATTENDU : soit `useCurrentUser()` lit depuis AuthContext (pas de nouveau fetch réseau — il sert juste de pont vers le pattern Query), soit il fetch /me mais tu DOCUMENTES explicitement (dans le done.md ET un commentaire dans useCurrentUser.ts) qu'AuthContext reste la source d'auth et que `useCurrentUser` est le hook pilote de démonstration à ne PAS coupler aux écrans déjà sur AuthContext. NE casse PAS le flux d'auth livré par #40.

## Designer
Non applicable (chore infra, aucun composant visuel — sauf le panneau devtools, dev-only).

## Contraintes
- Branche cible : sprint/7 (déjà checkout, contient #40 24807b1 + #70 b9b334c). NE PAS créer/changer de branche.
- Commit : 1 commit logique gitmoji français (package.json + query-keys.ts + 2 hooks + layout.tsx + lockfile).
- Installer avec le gestionnaire de paquets du projet (vérifie : npm/pnpm/yarn via le lockfile présent). Committe le lockfile mis à jour.
- TanStack Query v5 STRICT (pas v4) : `gcTime` (pas `cacheTime`), `useQuery({ queryKey, queryFn })` forme objet. Vérifie via context7/docs si doute sur l'API v5.
- Tests inline OBLIGATOIRES : `./scripts/test-quiet.sh frontend`. Couvrir : `useProductsWithEvents`/`useCurrentUser` ne régressent pas ; pas de double-fetch /me. La suite #40 (8 tests) DOIT rester verte.
- Ne PAS toucher : backend (#70), ni régresser AuthContext/apiClient/useAuth (#40). Ne PAS committer `frontend/.eslintcache`.
- Coexistence axios brut documentée : indiquer quels appels sont migrés (2 pilotes) et que le reste reste en axios.

## Livrable attendu (format strict, MAX 500 tokens caveman)
Écrire le retour DANS docs/memory/sprints/sprint-7/issue-48-done.md. Format :
RETOUR :
- commits: [SHA1, ...]
- resume: <objectif + version TanStack installée + query-keys conventions + 2 hooks pilotes + résolution double-fetch /me + tests passés/total>
- [MEMORY:*] signaux: <liste si applicable — ex [MEMORY:pattern] conventions query-keys, [MEMORY:decision] coexistence axios/Query>
- recommandations suite: <RECOMMAND_* explicites OU négation explicite>
- STATUS: COMPLETED en dernière ligne (ou STATUS: PARTIAL + BLOQUE_SUR si bloqué)
