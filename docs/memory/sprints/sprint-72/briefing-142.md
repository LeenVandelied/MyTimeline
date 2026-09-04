[BRIEFING ISSUE #142]

## Garde-fou repertoire (LIRE EN PREMIER)
Tu travailles dans un WORKTREE. Avant toute action :
  cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-69-d576fe
Verifie : `git rev-parse --show-toplevel` doit rendre ce chemin exact, et
`git branch --show-current` doit rendre `claude/sprint-start-72-320b8d`.
Si ce n'est pas le cas, STOP et remonte l'ecart. Ne travaille JAMAIS dans
/Users/herrh/VSProjects/MyTimeline (repo principal).

## Issue
[FEATURE] i18n du template email de reset (EN/DE/ES)

L'application supporte fr/en/es/de, mais l'email de reinitialisation de mot de passe
est toujours redige en francais.

A faire : une abstraction de locale pour l'envoi d'email + le template de
reinitialisation traduit en EN/DE/ES en plus du FR existant.

Criteres d'acceptation de l'issue :
- Le service d'envoi determine la langue et selectionne le bon template
- Templates traduits disponibles en fr/en/de/es
- Test verifiant la selection du bon template selon la langue

## Etat reel du code (verifie par le lead sur HEAD — ne pas le re-decouvrir)
- `BrevoEmailService.buildPayload` fige le sujet ET le corps HTML en francais.
- `EmailService.sendPasswordResetEmail(String, String, String)` n'a pas de parametre locale.
- Appelant unique en production : `PasswordResetServiceImpl.java:120`.
- **`User.java` (domain/models) n'a AUCUN champ locale. Aucune colonne DB. Le
  `LanguageSelector` frontend est purement URL (`/de/...`), il ne persiste RIEN
  cote serveur.** Ne pars pas du principe qu'une locale utilisateur existe : elle n'existe pas.
- `POST /api/auth/forgot-password` est NON authentifie.
- `ForgotPasswordRequest` (application/dtos) ne porte aujourd'hui que `email`.
- Frontend : `frontend/src/services/authService.ts:43-44` poste `{ email }`.
- Les traductions frontend vivent dans `frontend/public/locales/<locale>/*.json`
  (fr, en, es, de) — utile comme reference de ton et de vocabulaire.

## Decision d'architecture DEJA PRISE par le dev (ne pas rouvrir)
La locale transite par le DTO : `ForgotPasswordRequest` gagne un champ `locale`
**optionnel**, le frontend y met la locale courante (`useLocale()` de next-intl).
Repli sur `fr` si absent, vide, ou non supporte.
- **Ni** `Accept-Language`, **ni** migration Flyway, **ni** colonne `users.locale`.
- Locales supportees : `fr`, `en`, `es`, `de` (cf. `frontend/src/i18n/locales.ts`).

## Plan d'implementation
1. `ForgotPasswordRequest` : champ `locale` optionnel (pas de `@NotBlank`).
2. Port `EmailService` : ajouter la locale a la signature. Mets a jour la javadoc,
   qui affirme aujourd'hui « template FR ».
3. `BrevoEmailService` : sortir sujet + corps des 4 langues d'un catalogue, avec
   resolution defensive (null / vide / inconnue -> fr). L'echappement HTML du nom et
   du lien (`HtmlUtils.htmlEscape`) doit etre conserve dans les 4 langues — c'est
   une protection XSS existante, pas un detail de mise en forme.
4. `PasswordResetServiceImpl` : passer la locale recue jusqu'au port.
5. Frontend `authService.ts` : envoyer la locale. Regarde comment les autres appels
   du fichier recuperent la locale avant d'inventer un mecanisme.
6. Tests unitaires : selection du bon sujet/corps pour chacune des 4 locales,
   + repli sur `fr` pour null / `""` / `"zz"`.

## Contrainte metier non negociable
BR-AUT-005 : `POST /api/auth/forgot-password` repond **200 quoi qu'il arrive**
(anti-enumeration de comptes). Aucune locale — meme absurde — ne doit lever une
exception ni changer le code de reponse ou le timing. Verifie que les tests existants
`PasswordResetServiceImplTest` et `ForgotPasswordAsyncTest` restent verts.

## Triage
Taille: S
Modele: opus
Effort: high

## Context-pack domaine (lire EN PRIORITE avant tout code)

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
| `GET /api/auth/me` | ❌ | ✅ | ✅ | — | `permitAll` mais exige cookie `jwt` ; renvoie `UserResponse` (DTO sans password, ✅ RÉSOLU S9, BR-AUT-008) |
| Accès `/api/users/**`, `/api/products/**`, `/api/events/**` | ❌ | ✅ | ✅ | — | exige token valide (JwtFilter) |
| Endpoints `hasAuthority('ROLE_ADMIN')` | ❌ | ❌ | ❌ | — | ⚠️ rôle ADMIN mort, aucun endpoint ne l'utilise |

---

## 3. Business Rules atomiques

### BR-AUT-001 — Unicité du username à l'inscription
**Règle** : Le `system` MUST refuser un `register` quand un `User` avec le même `username` existe déjà (réponse `409 CONFLICT`).
**Pourquoi** : Le username est l'identifiant de connexion ; un doublon rendrait l'authentification ambiguë.
**Implémentation** : `AuthController.register` (l.106-110) via `userService.findDomainUserByUsername`.
**Test attendu** : `AuthControllerTest#register_shouldReturn409_whenUsernameAlreadyExists`.
> ⚠️ **PARTIEL au niveau DB** : `UserEntity` n'a pas de `@Column(unique=true)` sur `username` → doublon possible en cas de course concurrente (check applicatif seul, non atomique). En revanche `email` a une contrainte DB `uq_users_email` (migration V2 #32) → lookup email NON ambigu (corrigé S8 : l'ancienne note « email sans unicité » était périmée).

### BR-AUT-002 — Hachage du mot de passe avant persistance
**Règle** : Le `system` MUST hacher le mot de passe (BCrypt) avant de construire et persister le `User`.
**Pourquoi** : Aucun mot de passe en clair ne doit être stocké.
**Implémentation** : `AuthController.register` (l.112) `passwordEncoder.encode(...)`.
**Test attendu** : `AuthControllerTest#register_shouldStoreBcryptHash_notPlaintext`.

### BR-AUT-003 — Politique de mot de passe (unique) + validation des champs d'inscription
**Règle** : Le `system` MUST rejeter un `register` dont `name`/`username` ne font pas 3..20 caractères ou dont l'`email` est invalide. Et sur TOUT chemin de **création ou de modification** d'un mot de passe (`register`, `reset-password`, `change-password`), le `system` MUST rejeter un mot de passe qui ne fait pas **8..100 caractères, avec au moins une majuscule et au moins un chiffre**.
**Pourquoi** : une politique unique. Avant #148, trois règles coexistaient (form register : min 6 + majuscule + chiffre ; form reset : min 6 ; backend : `@Size(min=6)` nu) — un même mot de passe était accepté à un endroit et refusé à un autre.
**Périmètre — CRÉATION / MODIFICATION UNIQUEMENT** : la politique NE S'APPLIQUE PAS au login. `AuthRequest` ne porte ni longueur minimale ni règle de complexité, et `createLoginSchema` reste à `min(6)` avec la clé de message dédiée `validation.password.loginMin`. Sans cette exemption, tout compte créé avant #148 (mot de passe à 6 caractères) serait **verrouillé**. Idem pour `ChangePasswordRequest.oldPassword`, non contraint : sinon un compte historique ne pourrait pas se mettre en conformité.
**Implémentation** : annotation composée `@StrongPassword` (`application/validation/StrongPassword.java` + `StrongPasswordValidator.java`, `MIN_LENGTH=8`, `MAX_LENGTH=100`) posée sur `RegisterRequest.password`, `ResetPasswordRequest.newPassword` et `ChangePasswordRequest.newPassword`, + `@Valid` sur `@RequestBody`. Côté frontend, `PASSWORD_POLICY` + `passwordField()` (`frontend/src/lib/schemas/auth.ts`) alimentent `createRegisterFormSchema`, `createResetPasswordFormSchema`, `RegisterSchema`, `ResetPasswordSchema` et `createChangePasswordSchema` (`schemas/settings.ts`). Messages i18n : `validation.password.{min,max,uppercase,number,loginMin}` dans `public/locales/{fr,en,es,de}/validation.json` (namespace vivant) et `register.json`.
**Tests** : `PasswordPolicyTest` (29, dont l'égalité des verdicts entre les 3 endpoints et la non-application au login) ; `AuthControllerLegacyPasswordLoginTest` (3, comptes legacy : login à 6 caractères OK, register du même mot de passe refusé, mise en conformité par change-password) ; `frontend/src/lib/schemas/password-policy.test.ts` (49).
> ✅ RÉSOLU (Sprint 9) : `@Valid` présent sur `register` (`AuthController.java:151`) → les Bean Validations de `RegisterRequest` sont déclenchées (validation serveur active).
> ⚠️ **AMENDÉE Sprint 71 (#148) — le backend est désormais la SOURCE DE VÉRITÉ de la politique.** Durcissement 6 -> 8 caractères + majuscule + chiffre, appliqué à l'identique sur les 3 DTOs de création/modification et répliqué (non réinventé) par les schémas Zod. Ajout d'une **borne haute à 100** : sans elle, on pouvait créer un mot de passe que le login (`AuthRequest`, `@Size(max=100)`) refusait ensuite de recevoir. Aucune migration de données : les hash existants ne sont pas touchés, la règle ne s'applique qu'au prochain changement.

### BR-AUT-004 — Validation des credentials de login
**Règle** : Le `system` MUST rejeter un `login` dont `username` < 3 ou `password` < 6 caractères.
**Pourquoi** : Cohérence avec les contraintes d'inscription, éviter des requêtes d'auth triviales.
**Implémentation** : `AuthRequest` côté backend + `@Valid` sur `login` (`AuthController.java:97`) ; `LoginSchema` Zod côté frontend (`username z.string().min(3)`, `password z.string().min(6)`).
**Test attendu** : `AuthControllerTest#login_shouldReject_whenUsernameTooShort`.
> ✅ RÉSOLU (Sprint 9) : `@Valid` présent sur `login` (`AuthController.java:97`) — également sur forgot/reset password. La validation backend est active (plus uniquement Zod frontend).
> ⚠️ **CORRIGÉ Sprint 71 (#148) — l'énoncé ci-dessus surdécrivait le backend.** `AuthRequest` n'a JAMAIS porté de longueur minimale : seulement `@NotBlank` + `@Size(max=100)` sur les deux champs. Le `min(6)` de `LoginSchema` est donc une contrainte purement client. Elle est **conservée volontairement** (et NON alignée sur les 8 caractères de BR-AUT-003) : durcir le login verrouillerait les comptes antérieurs à #148. Preuve : `AuthControllerLegacyPasswordLoginTest#login_withPreExistingSixCharPassword_stillSucceeds_andIssuesJwtCookie`.

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
> ⚠️ **AMENDÉE Sprint 50 (#323) — le cookie `jwt` est signé en RS256, plus en HS256.** `JwtService` émet avec une clé privée RSA (`JWT_PRIVATE_KEY`, PKCS#8 Base64, modulus ≥ 2048) et valide avec la clé publique **dérivée** de la privée — une seule variable serveur, donc pas de paire dépareillable côté backend. Conséquence fonctionnelle : **la signature et l'`exp` du cookie sont désormais vérifiables par tout porteur de la clé publique**, ce qui permet au middleware Next de le contrôler en Edge (`AUTH_JWT_PUBLIC_KEY`, SPKI Base64) sans jamais détenir de secret d'émission. `JWT_SECRET` (HS256) **n'existe plus** ; `ExportTokenService` a migré sur un secret HMAC dédié `EXPORT_TOKEN_SECRET` (cf. DEC-S50-003). L'algorithme est figé à l'émission ET à la vérification des deux côtés — `alg: none` et HS256-forgé-avec-la-clé-publique sont rejetés (cf. PIT-S50-001). ⚠️ **La garde middleware n'est toujours PAS une frontière d'autorisation** : la révocation `jti` reste hors de l'Edge, `JwtFilter` en demeure le seul juge. Bascule sèche, sans double émission (DEC-S50-002). Tests : `JwtServiceRs256Test`, `auth-token-verify.test.ts`, `e2e/auth-signature.spec.ts` (12 cas, fail-closed prouvé).

### BR-AUT-008 — `/me` retourne l'utilisateur courant sans secret
**Règle** : `GET /me` MUST renvoyer les données de l'utilisateur identifié par le token et NE MUST PAS exposer le mot de passe (même hashé).
**Pourquoi** : Un hash ne doit jamais transiter par l'API (risque de cassage offline, surface inutile).
**Implémentation** : `AuthController.getUserDetails` — extrait username, `validateToken`, renvoie `UserResponse.fromDomain(...)` (`AuthController.java:140`).
**Test attendu** : `AuthControllerTest#me_shouldNotExposePasswordHash`.
> ✅ RÉSOLU (Sprint 9) : `/me` renvoie `UserResponse.fromDomain(...)` (`AuthController.java:140`), DTO sans champ `password` (`UserResponse.java`). Le hash n'est plus sérialisé dans la réponse HTTP (cf. A1).
> ✅ **Étendu Sprint 43 (#289) — anti-énumération** : la branche `user.isEmpty()` sur token signé valide renvoie **401 générique** `{"error":"token expiré ou invalide"}` (aligné `/refresh` #113), plus jamais 404 « User not found ». Analyse d'exploitabilité : distinction 404/401 non atteignable sans le secret JWT (`parseSignedClaims` échoue AVANT la branche) — correctif défensif par cohérence. Tests : `AuthControllerSecurityTest#me_withUnknownUserInValidToken_returns401Generic_notFound`, `AuthControllerErrorContractTest` (404→401). Reste ouvert (follow-up S43) : `SignatureException` sur `/me` tombe dans le catch générique → 500 (vs 401 sur `/refresh`).

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

### BR-AUT-012 — Mot de passe oublié : token à usage unique, expiration courte, anti-énumération (Sprint 8 #49)
**Règle** : `POST /api/auth/forgot-password {email}` MUST répondre **200 systématiquement** (email connu ou non) et sans side-channel de timing (traitement `@Async` — lookup/INSERT/envoi email déportés). `POST /api/auth/reset-password {token,newPassword}` MUST vérifier token existant + non expiré (**15 min**) + non consommé (`used_at`), re-hasher le mot de passe (BCrypt, BR-AUT-002), marquer `used_at` ; token invalide/expiré/consommé/non-UUID → **400 générique unique** (pas de distinction = anti-énumération).
**Pourquoi** : ne pas divulguer l'existence d'un compte (ni par code retour, ni par timing) ; token éphémère et non rejouable.
**Implémentation** : `PasswordResetService` (port domaine) + `PasswordResetServiceImpl` (`@Async requestReset`, `Clock` injectable), `BrevoEmailService` (port `EmailService`, RestClient), table `password_reset_tokens` (migration V6, FK CASCADE, `token` UUID unique). `RateLimitingFilter` : forgot 5/min/IP. Config `brevo.api.key=${BREVO_API_KEY}` (jamais en dur). Durée configurable `app.password-reset.token-validity-minutes`.
**Test attendu** : `PasswordResetServiceImplTest` (inexistant/expiré/consommé), `ForgotPasswordAsyncTest` (retour immédiat), `PasswordResetEndpointsIntegrationTest`.
> Follow-ups ouverts : fail-fast prod si `BREVO_API_KEY` absente, lockout par token, TTL/purge des tokens, i18n template email. Cf. DEC-S8-001/002.

---

## 4. Dépendances inter-domaines

- **Aucune relation JPA** : `UserEntity` est une table `users` autonome (pas de `@OneToMany`/`@ManyToOne`).
- **Dépendances logiques sortantes** : `users`, `products`, `events` exigent un `User` authentifié (`ROLE_USER`) via JwtFilter — le domaine `auth` est producteur de l'identité consommée par ces domaines (notamment `userId` dans `/api/users/{userId}/products/**`).
- **Couplage infrastructure (à surveiller)** : `AuthController` importe et injecte des classes infra (`UserServiceImpl` concret, `JwtService`, `CustomUserDetailsService`, `CustomUserDetails`) — voir anti-patterns.
- **Frontend** : `AuthContext` (state d'auth via re-fetch `GET /api/auth/me` au montage, cookie HttpOnly seul, plus de localStorage depuis #135/S9 ; `useAuth` = ré-export) et `apiClient` (intercepteur axios 401/403 → redirect `/login`, refresh périodique) dépendent des contrats de ce domaine.

---

## 5. Anti-patterns documentés

| # | Anti-pattern | Localisation | Gravité |
|---|--------------|--------------|:-------:|
| A1 | ✅ RÉSOLU (S9) : `/me` renvoie `UserResponse.fromDomain(...)` (DTO sans password) — hash plus exposé | `AuthController.java:140` | ~~CRITIQUE~~ |
| A2 | ✅ RÉSOLU (S9, #BR-AUT-003) : `@Valid` présent sur `register` → Bean Validations actives | `AuthController.java:151` | ~~CRITIQUE~~ |
| A3 | ~~JWT brut renvoyé dans le body du login~~ → ✅ RÉSOLU S4 #104 (body `{"message":...}`) | `AuthController` | ~~HAUTE~~ |
| A4 | `catch (Exception)` renvoie l'objet exception dans le body (500) → fuite d'internes ⚠️ partiel : login/refresh renvoient désormais `{"error":...}` générique (#113) mais `catch` toujours présent | `AuthController` | MOYENNE |
| A5 | ~~`refresh` n'invalide pas un token expiré avant ré-émission~~ → ✅ RÉSOLU S4 #105 (`validateToken` avant `generateToken`) | `AuthController` | ~~HAUTE~~ |
| A6 | ~~`Secure=false` en dur, config asymétrique~~ → ✅ RÉSOLU S4 #99 (`@Value` externalisé, defaults fail-safe, helper unique) | `AuthController` | ~~HAUTE~~ |
| A7 | ~~`domain="localhost"` en dur~~ → ✅ RÉSOLU S4 #99 (`@Value("${app.cookie.domain}")`, prod host-only) | `AuthController` | ~~HAUTE~~ |
| A8 | `AuthController` injecte `UserServiceImpl` concret + importe classes infra → viole hexagonal/DIP | l.24-28, 38 | MOYENNE |
| A9 | `role` stocké en `String` (domaine + entité) ; enum `Role` inutilisée → pas de type safety ni contrainte DB | `UserEntity`, `User` | MOYENNE |
| A10 | ✅ RÉSOLU (S9) : `@Column(unique = true)` présent sur `username` (`UserEntity.java:23`) — doublon bloqué au niveau DB. `email` : `uq_users_email` (V2 #32). | `UserEntity.java:23` | ~~MOYENNE~~ |
| A11 | ✅ RÉSOLU (S9) : `authService.registerUser(name, username, email, password)` mappe correctement `name` et `username` séparément (`authService.ts:24-31`) | `authService.ts:24-31` | ~~MOYENNE~~ |
| A12 | ✅ RÉSOLU (S9) : `RegisterSchema` Zod existe (`frontend/src/lib/schemas/auth.ts:47`) → validation client à l'inscription | `frontend/src/lib/schemas/auth.ts:47` | ~~MOYENNE~~ |
| A13 | Refresh périodique via `setInterval` (6h) au chargement du module, sans cleanup ni vérif d'auth réelle | `apiClient.ts:31` | BASSE |
| A14 | `CustomUserDetails` : `isAccountNonExpired/NonLocked/CredentialsNonExpired/isEnabled` renvoient `true` en dur (`need to implement logic`) | `CustomUserDetails.java:40-59` | BASSE |
| A15 | ✅ RÉSOLU (S9) : `@Transactional` présent sur `updateUser` (`UserServiceImpl.java:37`) | `UserServiceImpl.java:37` | ~~BASSE~~ |
| A16 | Enum `Role.ADMIN` jamais référencée par un `hasAuthority` → rôle ADMIN mort | sécurité globale | BASSE |
| A17 | ✅ RÉSOLU (#135, S9) : plus aucun localStorage — `AuthContext.tsx:34-39,60-64,108-111` re-fetch `GET /api/auth/me` au montage (cookie HttpOnly seul). `useAuth.ts` = simple ré-export. Réf DEC-S9-002. | `AuthContext.tsx`, `useAuth.ts` | ~~BASSE~~ |
| A18 | Champ `avatar` sur `User`/`UserEntity` (V7, #44, S9) présent backend (`UserEntity.java:32`, `User.java:12`) mais ABSENT du contrat frontend (`UserResponse` ne l'expose pas, `UserSchema` `frontend/src/types/user.ts` ne l'a pas) → avatar backend non exposé au front, dette **issue #151 (Sprint 13)** | `UserEntity.java:32`, `frontend/src/types/user.ts` | MOYENNE |

---

## Référence

- Coverage actuelle : `coverage-auth.md`
- Backend : `backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` (+ `application/dtos/RegisterRequest.java`, `AuthRequest.java`, `infrastructure/entities/UserEntity.java`, `infrastructure/security/{JwtService,JwtFilter,CustomUserDetails,CustomUserDetailsService}.java`, `domain/models/User.java`, `domain/models/Role.java`)
- Frontend : `frontend/src/hooks/useAuth.ts`, `frontend/src/services/apiClient.ts` (+ schémas Zod `LoginSchema`, `UserSchema`)

<!-- CACHE_CONTROL_BREAKPOINT -->

## Packs a LIRE toi-meme avec l outil Read (chemins reels dans ce worktree)
Non inlines ici (volume). Ouvre-les avec Read AVANT de coder :
- `.ai-env/context-packs/cp-backend.md` (8750 octets)
- `.ai-env/context-packs/cp-hexagonal.md` (5310 octets)
- `.ai-env/context-packs/pit-backend.md` (66031 octets)
- `.ai-env/context-packs/coverage-auth.md` (5044 octets)

Dans ton rapport, ajoute une ligne `fichiers de contexte lus:` enumerant ceux
que tu as reellement ouverts. Si tu n en as lu aucun, dis-le.

## Dependances intra-sprint
Aucune. L'issue #72 tourne en parallele mais ne touche QUE `frontend/src/components/**`
et `frontend/src/styles/**`. Ton seul fichier frontend est
`frontend/src/services/authService.ts` — elle n'y touche pas.

## Fichiers a NE PAS toucher (appartiennent a #72, en cours en parallele)
- `frontend/src/components/**`
- `frontend/src/styles/**`
Si tu penses avoir besoin d'y toucher, remonte-le plutot que de le faire.

## Designer
Non applicable (aucune surface UI nouvelle).

## Contraintes
- Branche cible : `claude/sprint-start-72-320b8d` (deja checkout, ne pas en changer).
- Commit : 1 commit logique, message gitmoji en francais.
- `git add` CIBLE sur tes fichiers. **JAMAIS `git add -A` ni `git add .`** — un autre
  agent commite en parallele dans le meme working tree.
- Tests : `./scripts/test-quiet.sh` (ou `backend/./mvnw`) — obligatoire, et rapporte
  les chiffres reels (passed/failed), pas une impression.
- Ne PAS creer de migration Flyway. Prochaine migration libre = V16, mais cette
  issue n'en a pas besoin.

## Honnetete du rapport
Si tu n'as pas execute les tests, dis-le. Si une partie du scope n'est pas livree,
dis-le en clair plutot que de la resumer comme faite. Un « STATUS: PARTIAL » exact
vaut mieux qu'un « COMPLETED » approximatif.

## Livrable attendu (format strict, MAX 500 tokens caveman)
RETOUR :
- commits: [SHA1, ...]
- resume: objectif + fichiers cles + pitfalls rencontres + resultats de tests chiffres
- [MEMORY:*] signaux: (pitfall / bug / pattern / decision) si applicables
- recommandations suite: RECOMMAND_* ou RECOMMAND_FOLLOWUP: <desc> [triage | domaine]
- STATUS: COMPLETED en derniere ligne (ou STATUS: PARTIAL + BLOQUE_SUR)
