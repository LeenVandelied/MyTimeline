[BRIEFING ISSUE #302]

## Contexte d'execution (LIRE EN PREMIER)

- **Repertoire de travail OBLIGATOIRE** : `/Users/herrh/VSProjects/MyTimeline/.claude/worktrees/new-feature-2347-14cb9a`
  Tu es dans un WORKTREE, pas dans le repo principal. Avant toute commande, `cd` explicitement dans ce chemin.
  Ne travaille JAMAIS dans `/Users/herrh/VSProjects/MyTimeline` (repo principal, autre branche).
- **Garde-fou** : verifie `git rev-parse --abbrev-ref HEAD` -> doit afficher `sprint/45`. Si ce n'est pas le cas, STOP et remonte l'erreur.
- Une autre issue (#283) tourne EN PARALLELE dans le meme working tree. Consequence :
  **`git add` CIBLE uniquement sur tes fichiers. JAMAIS `git add -A`, JAMAIS `git add .`, JAMAIS `git commit -a`.**
- `git diff` renvoie une sortie vide/tronquee sous le hook RTK de ce poste. Utilise `rtk proxy git diff` si besoin.

## Issue

**[FEATURE] Garde serveur (middleware) pour les routes connectées (app)** — P1 / size:M / epic:auth / fullstack

### Contexte
Follow-up détecté lors de la review de la PR #297 (Sprint 40 — Shell applicatif #210 + invalidation cache catégories #245).
Réf. mémoire interne : PIT-S40-002.

Aujourd'hui, la protection des routes connectées (`/dashboard`, `/timeline`, `/products`, etc., sous le shell applicatif `(app)/`) repose **uniquement côté client** : un hook (`useAuthGuard`) affiche un indicateur de chargement puis redirige via JavaScript si l'utilisateur n'est pas authentifié. Le fichier `middleware.ts` de Next.js, lui, ne s'occupe que du routage des langues (next-intl) — il ne vérifie pas l'authentification.

Concrètement, un utilisateur non connecté qui accède directement à une URL comme `/dashboard` reçoit d'abord la page complète (le shell applicatif, potentiellement des données) **avant** que le JavaScript ne détecte l'absence de session et ne le redirige. Ce n'est pas une fuite de données confirmée, mais c'est un round-trip inutile et une exposition de structure d'écran à quelqu'un qui ne devrait pas la voir.

### À faire
- Ajouter une vérification d'authentification côté serveur dans `frontend/middleware.ts`, en plus du routage i18n déjà en place.
- Vérifier la présence d'un cookie JWT HttpOnly **avant** de laisser le rendu des routes sous `(app)/` se produire ; rediriger immédiatement vers la page de connexion si absent, sans jamais envoyer le HTML des pages protégées.
- Conserver `useAuthGuard` côté client en filet de sécurité (UX pendant les transitions client-side), mais il ne doit plus être la seule ligne de défense.

### Critères d'acceptation
- [ ] Un utilisateur anonyme accédant directement à une URL protégée (`/dashboard`, `/timeline`, `/products`, etc.) ne reçoit plus le HTML/shell de la page protégée : il est redirigé côté serveur avant tout rendu
- [ ] La vérification du cookie JWT HttpOnly se fait dans `middleware.ts`, en amont du rendu des routes du groupe `(app)/`
- [ ] `useAuthGuard` reste fonctionnel pour les transitions purement client-side (navigation interne sans rechargement)
- [ ] Aucune régression sur le routage i18n existant (next-intl) déjà géré par le même middleware
- [ ] Tests (unitaires middleware + E2E golden-path) couvrant : accès anonyme direct → redirection serveur ; accès authentifié → rendu normal

### Risques techniques (issue)
- Le middleware Next.js tourne dans un environnement Edge Runtime restreint : attention aux libs Node-only non supportées en Edge.
- Risque de double redirection ou de flash si la garde serveur et la garde client ne sont pas bien coordonnées.

## DECISION ARCHITECTURE — DEJA TRANCHEE PAR LE LEAD (ne pas re-debattre)

**Strategie retenue : verification de la PRESENCE du cookie `jwt` uniquement, dans le middleware.**

Motif (verifie sur le code, pas une supposition) :
`backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` signe en
**HMAC symetrique** (`io.jsonwebtoken.security.Keys`, `javax.crypto.SecretKey`, propriete `jwt.secret`).
Le secret qui VERIFIE est donc le meme que celui qui EMET les tokens. Le partager avec le runtime Next
(Edge) pour une verification de signature elargirait la surface d'attaque : un secret de frappe de jetons
se retrouverait dans l'environnement frontend. **REJETE.**

L'appel a `/api/auth/me` depuis le middleware est egalement **REJETE** : il ajoute un aller-retour reseau
a CHAQUE navigation vers une route protegee.

Ce qui est attendu :
- Le middleware lit `request.cookies.get('jwt')`. Absent -> `NextResponse.redirect` vers la page de login
  **localisee** (respecter `localePrefix: 'always'`). Present -> laisser passer.
- La validation REELLE (signature, expiration) reste assuree par `JwtFilter` cote backend, qui repond 401
  sur token expire/forge. `useAuthGuard` reste le filet cote client.
- **Documenter ce choix et ses limites** dans un ADR `docs/adr/ADR-XXX-garde-serveur-middleware.md`
  (numero : prendre le suivant libre dans `docs/adr/`). Ecrire noir sur blanc la limite assumee :
  un cookie present mais expire laisse passer le rendu, puis le backend renvoie 401 et la garde client redirige.

## Plan d'implementation (architect, /sprint plan)

```yaml
issue_302:
  fichiers_cles:
    - "frontend/middleware.ts"                                      # ATTENTION : PAS frontend/src/middleware.ts (chemin fantome). Verifie : next-intl SEUL (createMiddleware), matcher '/((?!api|_next|.*\\..*).*)', ZERO auth/jwt/cookie
    - "frontend/src/hooks/useAuthGuard.ts"                          # verifie : garde CLIENT #210, consommee par AppShell + pages (app)
    - "frontend/src/components/layout/AppShell.tsx"                 # consommateur useAuthGuard
    - "frontend/app/[locale]/(app)/timeline/page.tsx"               # verifie L44 useAuthGuard
    - "frontend/app/[locale]/(app)/dashboard/"                      # verifie (repertoire)
    - "frontend/app/[locale]/(app)/products/"                       # verifie (repertoire)
    - "backend/.../infrastructure/security/JwtFilter.java"          # verifie L48 : cookie nomme "jwt"
  couches_touchees: ["frontend"]
  strategie_test: "unit+E2E"
  risque_regression: "Le route group `(app)` n'apparait PAS dans l'URL — le middleware devra hardcoder la liste des segments proteges (/dashboard,/timeline,/products) prefixes par la locale ; oublier un segment = garde silencieusement inactive, en ajouter un de trop = boucle de redirection sur /login. Le middleware existant est next-intl : COMPOSER avec createMiddleware, ne pas l'ecraser (sinon routing localise casse, regression #235)."
  ordre_ecriture: "ADR -> middleware -> tests unitaires -> E2E"
  zod_dto_sync: "NON"
```

**Points de vigilance non negociables :**
1. Le nom exact du cookie est `jwt` — verifie dans `JwtFilter.java` (~L48). Ne pas deviner, relire le fichier.
2. `frontend/middleware.ts` existe et exporte `createMiddleware(...)` de next-intl avec
   `localePrefix: 'always'` et `matcher: ['/((?!api|_next|.*\\..*).*)']`. Tu dois **COMPOSER** :
   envelopper l'appel `createMiddleware` dans une fonction qui fait d'abord le check auth. Ne pas remplacer.
3. Le groupe de routes `(app)` **n'apparait pas dans l'URL**. L'URL reelle est `/<locale>/dashboard`.
   Deduis la liste des segments proteges en listant `frontend/app/[locale]/(app)/` — ne l'invente pas.
4. Si tu redireges vers `/login`, prefixe par la locale courante, sinon next-intl re-redirige (boucle).
   Verifie le chemin reel de la page de login en listant `frontend/app/[locale]/`.

## Triage
Taille: M
Modele: opus
Effort: high
