# ADR-004 — Garde serveur (middleware Next) sur présence du cookie `jwt`

- Statut : Accepté
- Date : 2026-07-27
- Contexte : Sprint 45, issue #302 (garde serveur pour les routes connectées `(app)`)
- Follow-up de : review PR #297 (Sprint 40 — shell applicatif #210), réf. mémoire PIT-S40-002
- Portée : `frontend/middleware.ts`, `frontend/src/lib/auth-guard-paths.ts`
- Ne supersede pas : `useAuthGuard` (#210) reste en place, cf. §Décision point 4

## Contexte

Jusqu'à #302, la protection des routes connectées (`/dashboard`, `/timeline`,
`/products`, `/settings`) reposait **uniquement côté client** : le hook
`useAuthGuard` (`frontend/src/hooks/useAuthGuard.ts`, #210) attend la fin du
re-fetch `GET /api/auth/me` d'`AuthContext` (`loading` retombé) puis
`router.push(`/${locale}/login`)` s'il n'y a pas de `user`.

`frontend/middleware.ts` ne faisait que du routage de langue (next-intl,
`localePrefix: 'always'`) — **zéro vérification d'authentification**.

Conséquence : un visiteur anonyme qui ouvre directement `/fr/dashboard` reçoit
d'abord le **HTML complet de la page protégée** (shell applicatif, sidebar,
squelettes de données) avant que le JavaScript n'ait détecté l'absence de
session et ne le redirige. Ce n'est pas une fuite de données authentifiées (les
données métier transitent par des appels API que le backend refuse en 401), mais
c'est un round-trip inutile et une exposition de la structure d'écran à
quelqu'un qui ne devrait pas la voir.

## Options envisagées

### Option A — Vérifier la signature du JWT dans le middleware (Edge) — **REJETÉE**

`backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java`
signe en **HMAC symétrique** (`io.jsonwebtoken.security.Keys`, `javax.crypto.SecretKey`,
propriété `jwt.secret`). Le secret qui **vérifie** est **le même** que celui qui
**émet** les tokens.

Vérifier la signature dans le runtime Edge de Next exigerait de publier ce secret
dans l'environnement du frontend. Un secret de **frappe de jetons** se retrouverait
alors dans un second processus, une seconde image Docker et un second jeu de
variables d'environnement — la surface de compromission d'un attaquant capable de
lire l'env du front passerait de « lire des sessions » à « forger n'importe quelle
identité ». Le gain (détecter un token expiré ~1 rendu plus tôt) est sans commune
mesure avec ce coût.

> Une migration vers un algorithme **asymétrique** (RS256/ES256) rendrait cette
> option acceptable : seule la clé **publique** partirait côté Edge. Hors scope
> #302 — noté en follow-up.

### Option B — Appeler `GET /api/auth/me` depuis le middleware — **REJETÉE**

Fonctionnellement exact (le backend est seul juge de la validité), mais ajoute un
**aller-retour réseau bloquant à CHAQUE navigation** vers une route protégée,
sur le chemin critique du rendu. Coût latence permanent pour un bénéfice qui ne
se matérialise que dans le cas marginal du cookie présent-mais-expiré.

### Option C — Vérifier la **présence** du cookie `jwt` — **RETENUE**

## Décision

1. **Le middleware vérifie la seule présence du cookie `jwt`.** Nom du cookie
   vérifié sur le code émetteur/consommateur : `JwtFilter.java:48`
   (`"jwt".equals(cookie.getName())`) et `AuthController` (BR-AUT-007 : HttpOnly,
   `Path=/`, `SameSite=Lax`, MaxAge 2 jours). Cookie absent → `NextResponse.redirect`
   vers `/${locale}/login`. Cookie présent → la requête est passée au middleware
   next-intl inchangé.

2. **Composition, pas remplacement.** `createMiddleware` (next-intl) reste
   l'unique gestionnaire du routage de langue et demeure le **dernier** maillon :
   le check d'auth s'exécute en amont et, s'il laisse passer, délègue. Écraser le
   middleware next-intl casserait le routage localisé (régression #235).

3. **Seuls les chemins DÉJÀ préfixés par une locale supportée sont évalués.**
   Un `/dashboard` nu n'est pas traité par la garde : next-intl le redirige
   d'abord vers `/fr/dashboard`, requête sur laquelle le middleware re-tourne et
   applique la garde. On évite ainsi de dupliquer la négociation de locale
   (`Accept-Language`, cookie `NEXT_LOCALE`) — une seule implémentation, celle de
   next-intl, décide de la locale.

4. **`useAuthGuard` est conservé, et n'est pas redondant.** Il couvre deux cas que
   le middleware ne voit pas :
   - les **transitions client-side** (`router.push`) qui ne repassent pas
     systématiquement par le middleware ;
   - le cas **cookie présent mais token invalide/expiré** (cf. §Limites).

5. **La validation RÉELLE reste backend.** Signature, expiration et session active
   sont vérifiées par `JwtFilter` (`validateToken` + `isSessionActive`), qui répond
   401 sur token forgé/expiré/révoqué. Le middleware n'est **pas** une frontière
   d'autorisation : c'est une optimisation de rendu.

## Limites assumées (à lire avant de s'appuyer sur cette garde)

- **Un cookie `jwt` présent mais expiré, forgé ou révoqué laisse passer le rendu.**
  La page protégée est servie, ses appels API reçoivent 401, `AuthContext` ne
  restaure aucun `user`, et `useAuthGuard` redirige côté client. C'est exactement
  le comportement d'avant #302 pour ce cas précis — non régressé, non corrigé.
- **N'importe qui peut poser un cookie nommé `jwt` avec une valeur arbitraire** et
  obtenir le HTML du shell. La garde décourage l'accès accidentel, elle
  n'**empêche** pas un accès délibéré. Toute donnée sensible doit continuer de
  transiter par une API que le backend protège — **ne jamais** rendre côté serveur
  une donnée métier en se fiant à ce middleware.
- **La liste des segments protégés est explicite, donc faillible.** Le route group
  `(app)` n'apparaît pas dans l'URL : le middleware ne peut pas la déduire du
  système de fichiers à l'exécution. Ajouter un segment sous
  `frontend/app/[locale]/(app)/` **sans** l'ajouter à `PROTECTED_APP_SEGMENTS`
  laisse la nouvelle route sans garde serveur, silencieusement. Un test unitaire
  ancre la liste, mais aucun mécanisme ne la synchronise automatiquement.
- **Le `matcher` fait partie de la surface de sécurité, pas seulement de la perf.**
  Un chemin exclu par `config.matcher` n'entre jamais dans le middleware : la garde
  y est inactive, silencieusement. La formulation initiale
  `'/((?!api|_next|.*\..*).*)'` excluait **tout chemin contenant un point** — donc
  `/fr/products/foo.bar`, trivialement atteignable puisque le paramètre
  `[productId]` accepte un point (relevé par l'audit sécurité du sprint 45).
  **Résolution retenue** : l'exclusion ne porte plus que sur une extension d'asset
  en **fin** de chemin, et une **seconde entrée** (`/:locale(fr|en|es|de)/:path*`)
  ré-inclut inconditionnellement tout chemin préfixé d'une locale — y compris
  `/fr/products/photo.png`. Les assets réels vivent sous `/public` et sont servis à
  la racine, jamais sous un préfixe de locale : les deux entrées ne se recouvrent pas.
  **Contrainte** : `matcher` doit rester une littérale statique (analyse au build
  par Next), la liste des locales y est donc **dupliquée**. Un test de
  `middleware.test.ts` l'ancre contre `SUPPORTED_LOCALES` (#235) — ajouter une locale
  sans mettre le matcher à jour casse ce test.
- **Le pathname vu par le middleware n'est PAS percent-décodé.** `/fr/%64ashboard`
  arrive littéralement : comparer les segments bruts laissait passer la garde
  (relevé par le même audit). Les segments sont désormais décodés **un par un et
  sur un seul niveau** (ce que fait le routeur Next : `/fr/%2564ashboard` reste
  `%64ashboard`, qui ne résout aucune route). Un segment au percent-encoding
  **malformé** (`%zz`) est traité comme **protégé** (fail-closed).
- **Le `Location` de la redirection est ABSOLU — contrainte de runtime, pas un
  choix de sécurité.** L'audit du sprint 45 avait imposé un `Location` **relatif**
  (`/fr/login`) pour ne pas dériver l'URL de l'en-tête `Host`, contrôlable par
  l'appelant. **Cette mise en œuvre casse Next** : l'adaptateur Edge normalise
  toute redirection émise par un middleware via `new NextURL(location, …)`, soit
  `new URL(location)` **sans base** ; sur un chemin relatif ce parse lève
  `TypeError: Invalid URL` (`ERR_INVALID_URL`, `input: '/fr/login'`) et la requête
  finit en **500**. Reproduit localement (`next build` + `next start` : 500 sur
  `/fr/dashboard`) et en CI (run 30269383403 : les 10 specs `e2e/auth-guard.spec.ts`
  attendaient 307, recevaient 500 — *toutes* les routes protégées étaient en panne).
  Le build ne le détecte pas : il compile le middleware sans jamais exécuter la
  normalisation. **Arbitrage** : une garde qui 500 sur l'intégralité des routes
  connectées est strictement pire qu'un risque d'empoisonnement par `Host` — la
  garde doit d'abord FONCTIONNER. La cible est donc construite par
  `request.nextUrl.clone()` (URL déjà parsée et normalisée par Next, `x-forwarded-*`
  pris en compte) plutôt que par concaténation sur `request.url` brut.
  **Limite résiduelle assumée** : l'origine du `Location` suit celle de la requête,
  donc l'en-tête `Host` / `x-forwarded-host`. Derrière un proxy qui ne normalise
  pas `Host`, un `Host` hostile déplace la cible de la redirection (open-redirect,
  et empoisonnement de cache si un cache mutualisé mémorise la 307). La mitigation
  n'est PAS un retour au relatif (500) : elle est au niveau de l'infra (le reverse
  proxy doit imposer un `Host` canonique) ou, à terme, dans une allow-list d'hôtes
  côté middleware — cf. Follow-ups. Le comportement actuel est **ancré par un test**
  de `middleware.test.ts` (« LIMITE ASSUMÉE : l'origine du Location suit celle de la
  requête »), de sorte qu'un futur durcissement le fasse échouer visiblement.
  **Angle mort corrigé au passage** : les tests unitaires assertaient l'égalité de
  chaîne avec `/fr/login` et résolvaient tout via `new URL(location, ORIGIN)` — avec
  une base. Ils restaient verts alors que la garde était totalement cassée. Ils
  vérifient désormais que le `Location` est **exploitable par Next** : parsable par
  `new URL(location)` sans base, et accepté par le `NextURL` réel de l'adaptateur.
- **Aucune mémorisation de la destination** (pas de `?redirect=`) : l'anonyme
  redirigé vers `/login` atterrit ensuite sur le dashboard, pas sur l'URL demandée.
  Choix délibéré — un paramètre de redirection est une surface d'open-redirect qui
  demande sa propre validation, hors scope #302.

## Conséquences

- Un anonyme sur `/fr/dashboard` reçoit un **307 vers `/fr/login`** — aucun octet
  du shell applicatif n'est rendu.
- Coût runtime : lecture d'un cookie + un `split('/')` par requête matchée. Aucun
  I/O, aucune dépendance Node-only → compatible Edge Runtime.
- `frontend/src/lib/auth-guard-paths.ts` est **pur** (aucun import `next/server`,
  `fs`, `path`) pour rester importable depuis l'Edge et testable sans mock —
  même contrainte que `src/i18n/locales.ts` (#235).

## Follow-ups identifiés

- Migrer la signature JWT en asymétrique (RS256) rendrait l'Option A viable et
  permettrait de rejeter un token expiré **avant** rendu.
- Synchroniser automatiquement `PROTECTED_APP_SEGMENTS` avec le contenu de
  `frontend/app/[locale]/(app)/` (script de lint, ou test qui lit le FS côté
  Node uniquement).
- Paramètre `?redirect=` avec allow-list de chemins internes.
- **Neutraliser la limite `Host`** (cf. §Limites) : imposer un `Host` canonique au
  reverse proxy, ou valider `request.nextUrl.host` contre une allow-list dans le
  middleware avant d'émettre la 307. Un retour au `Location` relatif n'est PAS une
  option — il rend un 500 sur toutes les routes protégées.

## Références

- Issue #302 ; review PR #297 ; PIT-S40-002
- BR-AUT-007 (cookie HttpOnly), BR-AUT-011 (JwtFilter cookie OU Bearer)
- `frontend/src/hooks/useAuthGuard.ts` (#210), `frontend/src/i18n/locales.ts` (#235)
