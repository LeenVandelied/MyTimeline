[BRIEFING ISSUE #329 — Sprint 54, vague 1]

## ⚠ AVANT TOUT — cwd et HEAD (garde-fou worktree, leçon S45+)

Tu tournes dans un **worktree git**, pas dans le dépôt principal. Ta première commande DOIT être :

```
cd /Users/herrh/VSProjects/MyTimeline/.claude/worktrees/sprint-52-start-252990 && git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD
```

Attendu : branche `claude/sprint-54-start-8ee5a7`, HEAD `68a924c` (ou un descendant si la vague a déjà commité).
**Si tu vois autre chose (ex. `main`, `dev`, ou un chemin `/Users/herrh/VSProjects/MyTimeline` sans `.claude/worktrees/`), ARRÊTE et signale-le** — tu es dans le mauvais arbre de travail et tout ce que tu mesureras sera faux.

## Issue

**#329 — [CHORE] auth.setup.ts : ajouter un retry sur l'échec de rendu de /fr/register**
Labels : `enhancement`, `epic:events`, `priority:P2`, `size:S`, `frontend`, `sprint-54`

### Contexte
Avant de lancer la suite complète de tests automatisés (68 tests au total), un script se connecte une seule fois pour créer un compte de test partagé. Si cette étape échoue, aucun des 68 tests ne peut s'exécuter — la moindre instabilité passagère bloque tout le run. Pendant le Sprint 47, cela s'est produit deux fois pour une cause totalement étrangère au code testé (un bug du serveur de développement), et le message d'erreur affiché pointait vers la mauvaise cause, ce qui a fait perdre du temps de diagnostic.

### À faire
`frontend/e2e/auth.setup.ts:47` ne retente actuellement que sur une réponse **429** (rate-limit d'inscription, 5/min/IP). Si `/fr/register` renvoie un **500 transitoire** (par exemple un problème de rendu du serveur de dev), le setup échoue immédiatement et bloque tout le run E2E.

Mesuré pendant le S47 : 2 runs entièrement rouges causés par `InvariantError: Expected clientReferenceManifest to be defined` (bug de manifeste du serveur de dev Next 15.5.22), sans aucun rapport avec le code applicatif testé. Le message d'échec actuel accuse le rate-limit register, ce qui envoie le diagnostic dans la mauvaise direction — un piège de la même famille que le 403 CORS déjà documenté dans le runbook E2E.

Ajouter 2 tentatives avec `page.reload()` avant abandon, et différencier clairement dans le message d'échec « 429 rate-limit » de « échec de rendu (500/autre) ».

### BR impactées
Aucune.

### Critères d'acceptation
- [ ] `auth.setup.ts` retente le rendu de `/fr/register` (via `page.reload()`) jusqu'à 2 fois avant d'abandonner, en plus du cas 429 déjà géré
- [ ] Le message d'échec distingue explicitement « rate-limit (429) » de « échec de rendu (500/autre) »
- [ ] Un run avec un 500 transitoire simulé se rétablit après retry sans faire échouer le setup

### Risques techniques (énoncé de l'issue)
Un retry mal calibré peut masquer un vrai bug de rendu récurrent (pas transitoire) — s'assurer que le message de log final liste bien le nombre de tentatives et la nature de la dernière erreur pour ne pas perdre le signal en cas d'échec persistant.

## Plan d'implémentation (architect, /sprint plan — **emplacements re-vérifiés par le lead au démarrage, aucune dérive de ligne**)

```yaml
issue_0329:
  fichiers_cles:
    - "frontend/e2e/auth.setup.ts"
  couches_touchees: ["frontend"]
  strategie_test: "E2E"
  risque_regression: "Un retry mal calibré masque un vrai bug de rendu récurrent — le message final doit lister le nombre de tentatives et la nature de la dernière erreur."
  ordre_ecriture: "PÉRIMÈTRE PRÉCISÉ : le correctif porte sur les lignes 46-47 (goto + expect register-form, HORS boucle), PAS sur la boucle REGISTER_RETRIES existante (lignes 50-71). Corriger aussi le message d'échec en dur lignes 63-66."
  zod_dto_sync: "NON"
  possibly_done: false
  etat_reel_du_code: |
    Confirmé. Un retry EXISTE (boucle REGISTER_RETRIES lignes 50-71) mais couvre uniquement la
    soumission. Le rendu initial (goto /fr/register ligne 46 + toBeVisible ligne 47) n'est pas
    protégé — un 500 transitoire jette immédiatement, sans page.reload().
```

### Structure actuelle du fichier, mesurée par le lead (102 lignes, HEAD `68a924c`)

| Lignes | Rôle |
|---|---|
| 32-33 | `REGISTER_RETRIES = 3`, `REGISTER_BACKOFF_MS = 20_000` |
| 35-42 | `fillRegister()` — remplit et soumet le formulaire |
| 44-81 | `provision()` |
| **46-47** | **`page.goto('/fr/register')` puis `expect(getByTestId('register-form')).toBeVisible()` — HORS boucle, non protégé. C'est ta cible.** |
| 50-72 | boucle `REGISTER_RETRIES` sur la **soumission** (couvre le 429) |
| **63-66** | **message d'échec en dur : « rate-limit register 5/min/IP probable — bucket non rechargé ». Accuse toujours le 429, même quand la cause est un 500.** |
| 74-80 | connexion + attente `dashboard` |
| 86-101 | déclarations `setup(...)` (persist identities + 1 provision par compte) |

### Deux points à trancher toi-même, en le disant

1. **La ligne 70 est un second `expect(register-form).toBeVisible()`**, dans le `catch` de la boucle, après le backoff. Elle souffre exactement du même défaut que la ligne 47 : un 500 transitoire à ce moment-là jette sans retry. Le mini-plan ne la mentionne pas. Décide si elle entre dans le périmètre — et **dis-le**, dans un sens comme dans l'autre.
2. **Critère 3 : « un run avec un 500 transitoire simulé se rétablit après retry ».** Réfléchis à comment tu le démontres réellement. `page.route()` de Playwright permet d'intercepter et de renvoyer un 500 sur la première navigation puis de laisser passer — mais `auth.setup.ts` est un **projet `setup`**, pas une spec, et l'y instrumenter durablement serait intrusif. Une spec dédiée qui exerce la fonction de retry extraite est une autre voie. **Choisis, justifie, et si tu ne démontres pas le critère 3, écris-le noir sur blanc plutôt que de le cocher.**

## Triage
Taille: S
Modèle: opus
Effort: medium

## Context-pack domaine (lire EN PRIORITE avant tout code)

<!-- ===== cp-frontend.md ===== -->
# Context-pack : Frontend MyTimeline (Next.js 15 App Router / React 18)

> À charger pour TOUTE tâche frontend. Décrit la stack RÉELLE (scan code, sprint 9).
> Versions = source de vérité `frontend/package.json`. Ce pack ne réplique pas les
> valeurs mineures : en cas de doute, relire le `package.json`.

## Stack réelle (versions du package.json)

- **Next.js `^15.2.4`** — App Router, dev `next dev --turbopack`, build `next build`.
- **React `^18.3.1`** + React DOM 18.3.1. ⚠ **PAS React 19** malgré `@types/react@^19`.
- **TypeScript `^5`** strict (`strict: true`, `noEmit`), alias `@/* → src/*`, `@/app/* → app/*`.
- **TanStack Query `^5.101.2`** (+ devtools) — état serveur. API v5 STRICT (forme objet, `gcTime`).
- **Zod `^3.24.2`** — validation + inférence de types.
- **React Hook Form `^7.54.2`** + `@hookform/resolvers@^4` (zodResolver).
- **next-intl `^4.0.2`** — i18n, 4 locales `['fr','en','es','de']`, `localePrefix: 'always'`.
- **Tailwind `^4.0.12`** (`@tailwindcss/postcss`) + `tailwind.config.ts` minimal + `postcss.config.mjs`.
- **shadcn/ui** style `new-york`, `rsc: true`, icônes **lucide-react**, Radix (dialog, select, popover, dropdown, checkbox, label, slot).
- **axios `^1.8.1`** (client HTTP), **react-hot-toast** (toasts globaux), **next-themes** (clair/sombre), **framer-motion**, **dayjs**, **react-colorful**.
- Tests : **Vitest `^2.1.9`** + **RTL `^16`** + jest-dom (jsdom). **Playwright `^1.61`** configuré ET peuplé (`frontend/e2e/` contient ≥9 specs : `golden-path`, `categories`, `products`, `settings-*` — MAJ S33, l'ancienne note « e2e vide » était périmée S9). Storybook 8 présent.

## Structure `frontend/`

- **`app/`** (App Router, PAS `src/app/`) : `layout.tsx` (root, Server Component), `app/[locale]/` avec `dashboard/ login/ register/ forgot-password/ reset-password/ home/ privacy/ terms/`.
- **`i18n.ts`** (racine) : `getRequestConfig`, charge les messages depuis **`public/locales/<locale>/<namespace>.json`** (fichiers par namespace : `auth common dashboard errors legal products register validation`).
- **`middleware.ts`** : `next-intl/middleware`, `localePrefix: 'always'`, matcher exclut `api|_next|*.*`.
- **`src/components/`** : `ui/` (shadcn : button, card, dialog, select, form, input, spinner, dropdown-menu, popover, language-selector…), `calendar/`, `pages/`, `products/`, + composants métier (`EventContent`, `EventEditForm`, `Testimonial*`, `theme-provider`).
- **`src/contexts/`** : `AuthContext.tsx` (source unique du user), `QueryProvider.tsx`.
- **`src/services/`** : `apiClient.ts` (axios + intercepteurs), `authService.ts`, `eventService.ts`, `productService.ts`.
- **`src/hooks/`** : `useAuth.ts`, `useCurrentUser.ts`, `useProductsWithEvents.ts`.
- **`src/lib/`** : `schemas/auth.ts` (Zod), `query-keys.ts`, `utils.ts`.
- **`src/types/`** : `auth.ts` `user.ts` `event.ts` `product.ts` (schémas Zod + types, ré-exports).
- **`src/styles/`** : `globals.css` `landing.css` `animations.css` + **`ds/`** (design tokens Graphite).

## Conventions

- **Server Components par défaut** ; `'use client'` UNIQUEMENT si hooks/état/handlers (ex. `AuthContext`, `QueryProvider`, `useCurrentUser`). Le root `layout.tsx` reste serveur ; `QueryProvider` isole `QueryClientProvider` côté client.
- **TypeScript strict** : zéro `any`, zéro `as` non justifié.
- **État serveur = TanStack Query v5** (forme objet `useQuery({ queryKey, queryFn })`, `gcTime` pas `cacheTime`). Query keys centralisées : `src/lib/query-keys.ts` (factory hiérarchique par domaine, `as const`). NE PAS éparpiller les clés en littéraux → invalidations qui ratent leur cible. `QueryClient` créé via `useState` (une instance/durée de vie, jamais au niveau module en App Router).
- **Auth = `AuthContext` source UNIQUE du user** (`useAuth()`). **#135 / DEC-S9-002** : PII (email, name) N'EST PLUS en `localStorage`. Session = cookie **JWT HttpOnly** (invisible JS). Restauration au montage par **re-fetch `GET /api/auth/me`** (`withCredentials`), `loading:true` le temps du re-fetch (pas de flash anonyme). `logout` ne purge aucun storage. `useCurrentUser` NE refait PAS d'appel `/me` : sa `queryFn` relit le user d'`AuthContext` (anti double-fetch). **Ne jamais réintroduire de PII persistée** → renvoyer vers DEC-S9-002.
- **Sécurité logs** : ne JAMAIS logger l'objet axios brut (`error.config.data` = body → password en clair ; `error.config.headers` = Authorization/cookies). Utiliser un extracteur assaini (`safeErrorMessage`) — cf. `AuthContext`, `apiClient`.
- **Formulaires = RHF + Zod** via `zodResolver`. Deux familles de schémas : « bruts » `*Schema` (service, parse payload, sans message) et factories i18n `create*Schema(t)` (form, messages traduits). Le token/param hors formulaire n'entre pas dans le schéma form (cf. reset-password).
- **Redirections auth localisées** : construire l'URL avec la locale courante (`/${locale}/login`) — `localePrefix: 'always'` casse tout chemin non préfixé.

## Sync Zod ↔ DTO backend (piège récurrent)

Les schémas Zod front doivent rester alignés sur les DTO backend (Spring Boot). Désalignement = strip silencieux ou ZodError runtime.
- `.nullable()` pour un champ nullable backend ; `.optional()` pour un champ absent. JAMAIS `.nullish()` en code manuel.
- Endpoint paginé : `paginatedSchema(itemSchema)`, jamais `schema.array()` (le body est `{items,total,page,size}`).
- Contraintes alignées BR-AUT-003 : username 3..20, email valide, password ≥ 6. Le client ne doit PAS surcontraindre le contrat backend (ex. reset ≠ register).
- DTO connus : login `{username,password}`, register `{name,username,email,password}`, forgot `{email}`, reset `{token,newPassword}`, `/auth/me` → `UserSchema {id(uuid),name,username,email,role}`.
- ⚠ Il n'existe PAS de règle `.claude/rules-jit/zod-dto-sync.md` à ce jour — appliquer cette checklist directement.

## i18n (next-intl 4)

- `useTranslations("namespace")` — JAMAIS de strings FR hardcodées. Pas de `t("key",{ns})` : un `useTranslations` par namespace.
- Messages = `public/locales/<locale>/<namespace>.json` (mock/validation data en JSON, pas de FR inline).
- Zod i18n : factory `create*Schema(t)` (option `useMemo` côté form pour stabilité).

## Design system « Graphite » (`src/styles/ds/`)

- Direction B validée (S6, source projet Claude Design) : quasi-monochrome, accent bleu électrique unique pour *today/active*, type mono (Archivo display/ui + IBM Plex Mono) via `next/font` self-hosté (variables `--font-display/--font-mono`). Clair + sombre complets.
- Tokens : `ds/tokens/` (`colors base spacing typography fonts`) + `ds/components/`, `ds/timeline.css`, `ds/i18n.css`, `ds/a11y-audit.md`, `ds/readme.md`.
- **Theme-aware** : chaque composant doit fonctionner clair ET sombre (`next-themes`). Consulter `ds/readme.md` avant de créer un composant.
- Éviter les hex inline → passer par les tokens CSS du DS.

## Accessibilité

- Spinners : `role="status"` + `aria-label` + `<span class="sr-only">`.
- Tables : `aria-label`, `scope="col"`. Interactifs custom : `role` + `tabIndex` + `onKeyDown` (Enter/Space) + `focus:ring-2`.
- Cf. `src/styles/ds/a11y-audit.md`.

## Tests (Vitest + RTL) — pièges

- **`React.use()` N'EXISTE PAS en React 18.3.1** (PIT-S8-005) — ne pas s'appuyer dessus dans code ou tests.
- **`useSearchParams` exige un `<Suspense>`** englobant (PAT-S8-004).
- **`next build` en CI attrape des erreurs invisibles aux tests RTL** (types/build strict, `ignoreBuildErrors:false`) — un run vitest vert ne garantit pas le build.
- Setup `vitest.setup.ts` : jest-dom, cleanup RTL, mocks `next/font/google`, `next/navigation`, `matchMedia`. `useAuth` hors `<AuthProvider>` lève.
- Objectif : run vitest sans ligne stderr. `act()` warning → test `async` + `await waitFor(...)`. Logs d'erreur intentionnels → `vi.spyOn(console,'error').mockImplementation(()=>{})` + `mockRestore()`.
- ✅ `frontend/e2e/` PEUPLÉ (≥9 specs Playwright : golden-path, categories, products, settings-{account,mobile,navigation,preferences,profile,security}). Vérifier la couverture réelle d'un parcours avant d'ajouter — les nouveaux `data-testid` doivent être référencés dans une spec (sinon coverage-e2e MAJEUR).

## Références

- `docs/memory/decisions.md` (DEC-S9-002 : PII hors localStorage), `docs/memory/patterns.md`, `docs/memory/pitfalls.md` (PIT-S8-005, PAT-S8-004).
- `frontend/src/styles/ds/readme.md` (charte Graphite), `ds/a11y-audit.md`.

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

### BR-AUT-003 — Validation des champs d'inscription
**Règle** : Le `system` MUST rejeter un `register` dont `name`/`username` ne font pas 3..20 caractères, `email` non valide, ou `password` < 6 caractères.
**Pourquoi** : Garantir des credentials exploitables et un email correct.
**Implémentation** : annotations Bean Validation sur `RegisterRequest` (`@NotBlank`, `@Size(min=3,max=20)`, `@Email`, `@Size(min=6)`) + `@Valid` sur `@RequestBody` (`AuthController.java:151`).
**Test attendu** : `AuthControllerTest#register_shouldReturn400_whenPasswordTooShort`.
> ✅ RÉSOLU (Sprint 9) : `@Valid` présent sur `register` (`AuthController.java:151`) → les Bean Validations de `RegisterRequest` sont déclenchées (validation serveur active). Côté frontend, `RegisterSchema` Zod existe (`frontend/src/lib/schemas/auth.ts:47`, cf. A12).

### BR-AUT-004 — Validation des credentials de login
**Règle** : Le `system` MUST rejeter un `login` dont `username` < 3 ou `password` < 6 caractères.
**Pourquoi** : Cohérence avec les contraintes d'inscription, éviter des requêtes d'auth triviales.
**Implémentation** : `AuthRequest` côté backend + `@Valid` sur `login` (`AuthController.java:97`) ; `LoginSchema` Zod côté frontend (`username z.string().min(3)`, `password z.string().min(6)`).
**Test attendu** : `AuthControllerTest#login_shouldReject_whenUsernameTooShort`.
> ✅ RÉSOLU (Sprint 9) : `@Valid` présent sur `login` (`AuthController.java:97`) — également sur forgot/reset password. La validation backend est active (plus uniquement Zod frontend).

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

## Dépendances intra-sprint

- **#331 tourne EN PARALLÈLE de toi**, sur `frontend/src/components/EventEditForm.tsx`, `frontend/src/components/events/NewEventDrawer.tsx` et `frontend/e2e/timeline.spec.ts`. **Ne touche à aucun de ces fichiers.** Ton périmètre est `frontend/e2e/auth.setup.ts` (+ éventuellement un helper voisin sous `frontend/e2e/support/` si tu extrais une fonction, et une spec dédiée si tu en écris une pour le critère 3).
- **#330 démarrera après la vague 1** et écrira ~18 specs E2E. Ton correctif conditionne la fiabilité de tout son run : si le setup casse, ses 18 specs ne s'exécutent pas.
- Vous partagez **un seul working tree**. Conséquence dure : **`git add` ciblé fichier par fichier, JAMAIS `git add -A` / `git add .`** — tu embarquerais le travail en cours de l'autre agent dans ton commit.

## Designer

Non applicable — aucun changement d'interface.

## Contraintes

- **Branche cible** : `claude/sprint-54-start-8ee5a7` (déjà checkout, ne change PAS de branche).
- **Commit** : 1 commit logique, message gitmoji **en français**, référençant `(#329)`.
- **Code en anglais, commentaires/docs/commits en français** (convention projet). Le fichier actuel respecte déjà cette règle — ses commentaires expliquent le *pourquoi*, garde ce niveau.
- **TypeScript strict** — pas de `any`, pas de `@ts-ignore`.
- **Ne dégrade pas le signal.** Le fichier documente aujourd'hui pourquoi le retry 429 existe (rate-limit bucket4j 5/min/IP, run 28752900622). Ton retry de rendu doit être aussi explicite : nombre de tentatives, nature de la dernière erreur, et **distinction claire des deux causes** dans le message final. Un message qui dit « ça a échoué 5 fois » sans dire *de quoi* est une régression du diagnostic, pas un progrès.

### Tests — obligatoire, et le vert doit être MESURÉ

**Lis d'abord `docs/memory/sprints/sprint-47/e2e-local-runbook.md` en entier** — il documente précisément l'incident que ton issue corrige, et 4 pièges qui t'enverront sur une fausse piste :

- `:3000` peut être squatté par le `next-server` d'un **autre projet** → front sur **`:3100`** + `PLAYWRIGHT_BASE_URL`.
- Le profil `dev` fige `app.cors.allowed-origins=http://localhost:3000` → un **403 CORS** sur `POST /api/auth/register` se **déguise en « rate-limit register 5/min/IP »** dans le message actuel de `auth.setup.ts`. **C'est un troisième mode de confusion du même message que tu réécris** — vois s'il vaut la peine d'être couvert aussi, et dis-le.
- Base **`eventmanager_e2e`** (migrée V15), **jamais** `eventmanager`.
- **`--workers=1` impératif** en local.

Commandes (issues du runbook) :
```
cd backend && SKIP_DELEGATION=1 ./mvnw --batch-mode --no-transfer-progress -DskipTests package
```
```
cd backend && SPRING_PROFILES_ACTIVE=dev,e2e DB_URL=jdbc:postgresql://localhost:5432/eventmanager_e2e DB_USERNAME=eventuser DB_PASSWORD=motdepasse_dev_local RATE_LIMIT_ENABLED=false java -jar target/eventmanager-0.0.1-SNAPSHOT.jar --app.cors.allowed-origins=http://localhost:3000,http://localhost:3100
```
```
cd frontend && NEXT_PUBLIC_API_URL=/api E2E_API_PROXY_TARGET=http://localhost:8080 npm run dev -- -p 3100
```
```
cd frontend && SKIP_DELEGATION=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test --workers=1 --reporter=line
```
`SKIP_DELEGATION=1` est requis (le hook `warn-test-delegation.sh` bloque `npx playwright test` sans lui).

Ce qu'il faut démontrer, par ordre d'importance :
1. **Non-régression** : le setup passe toujours sur un chemin nominal (les projets `setup` verts, puis au moins une spec qui en dépend).
2. **Le retry de rendu s'active** sur un 500 — cf. le point 2 de la section « à trancher » en tête de briefing.
3. **Le message d'échec persistant** distingue bien 429 / rendu. Provoque-le si tu peux (ex. `REGISTER_RETRIES` temporairement à 1 dans un run jetable, non commité).

⚠ **Ne lance PAS `npm run build` ni `build-storybook` pendant qu'un `next dev` tourne** : ils réécrivent `.next` sous ses pieds et le tuent (`ENOENT … _buildManifest.js.tmp`). Sur un worktree partagé par deux agents, c'est le mode d'échec le plus vicieux.

**Si tu ne parviens pas à lever la stack** : dis-le explicitement. Rapporte ce que tu as tenté et l'erreur exacte. Un « E2E non exécuté » honnête vaut mieux qu'un vert supposé.

### Pièges de mesure sur ce projet

- **`git diff` renvoie ~vide** sous le hook RTK. Utilise `rtk proxy git diff`, ou redirige vers un fichier et lis-le. Ne conclus pas « aucun changement » sur une sortie vide.
- Le mode d'échec que tu corriges est précisément un cas où **le message accuse la mauvaise cause**. Ne te fie pas au texte d'une erreur Playwright pour établir un diagnostic : va chercher le code HTTP réel (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/fr/register`) et le log du serveur de dev.

## Livrable attendu (format strict, MAX 500 tokens, style caveman — pas de prose)

```
RETOUR #329
commits: [<SHA court>]
fichiers: <liste chemin:lignes>
perimetre_tranche:
  - ligne 70 (2e expect register-form dans le catch): TRAITÉE / HORS PÉRIMÈTRE + raison
  - critere 3 (500 simulé): DÉMONTRÉ par <méthode> / NON DÉMONTRÉ + raison
tests:
  - setup projects: <N passed / M failed> (ou NON EXÉCUTÉ + raison)
  - suite e2e complète: <N passed / M failed / K skipped> (ou NON EXÉCUTÉ + raison)
message_echec_final: <le texte exact produit en cas d'échec persistant, pour que le lead juge la lisibilité>
premisses_infirmees: <toute affirmation du briefing que le code contredit — numéro de ligne, comportement. "aucune" si rien.>
pack_lu: OUI — <nom du pack> §<titre de section RÉELLE que tu as lue>
[MEMORY:pitfall|pattern|decision] <si applicable>
RECOMMAND_FOLLOWUP: <desc> [triage XS|S|M|L] (ou "aucun")
RECOMMAND_TEST_RUNNER / RECOMMAND_SECURITY / RECOMMAND_DB_EXPERT / RECOMMAND_UI_DESIGN : <ou négation explicite>
STATUS: COMPLETED
```

Dernière ligne = `STATUS: COMPLETED` (ou `STATUS: PARTIAL` précédé d'une section `BLOQUE_SUR:` détaillée).
