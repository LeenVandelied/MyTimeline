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

## Références

- Issue #302 ; review PR #297 ; PIT-S40-002
- BR-AUT-007 (cookie HttpOnly), BR-AUT-011 (JwtFilter cookie OU Bearer)
- `frontend/src/hooks/useAuthGuard.ts` (#210), `frontend/src/i18n/locales.ts` (#235)
