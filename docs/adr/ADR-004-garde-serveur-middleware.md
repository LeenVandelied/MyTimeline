# ADR-004 — Garde serveur (middleware Next) sur le cookie `jwt`

> Titre amendé au sprint 50 : la garde ne portait que sur la **présence** du cookie
> jusqu'à #323, qui y ajoute la **vérification de signature** (cf. §Limites).

- Statut : Accepté
- Date : 2026-07-27
- Contexte : Sprint 45, issue #302 (garde serveur pour les routes connectées `(app)`)
- Follow-up de : review PR #297 (Sprint 40 — shell applicatif #210), réf. mémoire PIT-S40-002
- Portée : `frontend/middleware.ts`, `frontend/src/lib/auth-guard-paths.ts`,
  `frontend/src/lib/canonical-host.ts` (#322), `frontend/src/lib/auth-token-verify.ts` (#323),
  `backend/.../infrastructure/security/{JwtService,RsaKeyMaterial}.java` (#323)
- Complété par : issue #322 (sprint 50 — origine canonique du `Location`),
  issue #323 (sprint 50 — signature RS256 vérifiée en Edge)
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
>
> ✅ **FAIT au sprint 50 (#323).** `JwtService` signe en RS256 ; le middleware
> vérifie la signature avec la seule clé publique. L'option A est donc RETENUE
> **en complément** de l'option C (la présence du cookie reste le premier test,
> et le seul en mode dégradé). Détail : §Limites → « Vérification de signature
> RS256 (#323) ».

### Option B — Appeler `GET /api/auth/me` depuis le middleware — **REJETÉE**

Fonctionnellement exact (le backend est seul juge de la validité), mais ajoute un
**aller-retour réseau bloquant à CHAQUE navigation** vers une route protégée,
sur le chemin critique du rendu. Coût latence permanent pour un bénéfice qui ne
se matérialise que dans le cas marginal du cookie présent-mais-expiré.

### Option C — Vérifier la **présence** du cookie `jwt` — **RETENUE**

## Décision

> ⚠ **Amendement #323 (sprint 50)** — le point 1 ci-dessous décrit l'état livré par
> #302 et reste exact **en mode dégradé** (clé publique non configurée). Avec
> `AUTH_JWT_PUBLIC_KEY` renseignée, la garde vérifie EN PLUS la signature et
> l'expiration. Le point 5 (« la validation RÉELLE reste backend ») demeure vrai :
> la révocation de session n'est vérifiable qu'en base.

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
  **Limite résiduelle** : l'origine du `Location` suivait celle de la requête —
  **traitée au sprint 50, cf. §Origine canonique du `Location` (#322)** ci-dessous.
  **Angle mort corrigé au passage** : les tests unitaires assertaient l'égalité de
  chaîne avec `/fr/login` et résolvaient tout via `new URL(location, ORIGIN)` — avec
  une base. Ils restaient verts alors que la garde était totalement cassée. Ils
  vérifient désormais que le `Location` est **exploitable par Next** : parsable par
  `new URL(location)` sans base, et accepté par le `NextURL` réel de l'adaptateur.
- **Aucune mémorisation de la destination** (pas de `?redirect=`) : l'anonyme
  redirigé vers `/login` atterrit ensuite sur le dashboard, pas sur l'URL demandée.
  Choix délibéré — un paramètre de redirection est une surface d'open-redirect qui
  demande sa propre validation, hors scope #302.

### Origine canonique du `Location` (#322, sprint 50)

> Section ajoutée par #322. Les sections de §Limites sont indépendantes : une
> évolution ultérieure de la garde ajoute la sienne plutôt que de réécrire celle-ci.

**Ce qui a été MESURÉ avant de décider** (`next build` + `next start`, requêtes
curl avec `Host: evil.example` puis `X-Forwarded-Host: evil.example`) :

- Next construit l'URL vue par le middleware depuis `initURL` =
  `${proto}://${fetchHostname}:${port}${req.url}` (`attachRequestMeta`,
  `next/dist/server/next-server.js`) — soit l'**hôte de bind du serveur**, PAS
  l'en-tête `Host`. `experimental.trustHostHeader` n'est pas activé ici.
- En sortie, `resolve-routes.js` applique `getRelativeURL(location, initUrl)` : si
  l'origine du `Location` égale celle d'`initURL`, l'en-tête part **relatif**.
- Conséquence : **sur ce runtime self-hosté, un `Host` falsifié ne déplaçait déjà
  pas la redirection** (`location: /fr/login` dans les trois cas). Le risque décrit
  par #322 n'était donc pas reproductible tel quel. Il le redevient dès que
  `request.nextUrl` dérive des en-têtes : `trustHostHeader`, ou une plateforme edge
  (Vercel & co.) qui construit l'URL depuis le `Host` reçu.

**Décision — option (c), hôte canonique par variable d'environnement.**
Les options écartées : (a) « imposer un `Host` canonique au reverse proxy » — il
n'existe **aucun** reverse proxy dans ce dépôt (`docker-compose.yml` = postgres +
backend + frontend, aucun workflow de déploiement), l'exigence serait purement
documentaire ; (b) allow-list applicative en dur — non synchronisable avec les
domaines de preview/staging, risque signalé par l'issue elle-même.

- Variable : **`APP_CANONICAL_HOST`**, liste d'origines séparées par des virgules,
  **la première étant le canonique**. Formes acceptées : `app.example.com`,
  `app.example.com:8443`, `https://app.example.com` (la forme avec schéma impose
  aussi le protocole, ce qui neutralise un `x-forwarded-proto` menteur).
- **Non `NEXT_PUBLIC_*`** : lue au RUNTIME serveur (`process.env` du sandbox Edge
  est alimenté depuis l'environnement du process Node, cf.
  `buildEnvironmentVariablesFrom`), donc modifiable **sans reconstruire l'image** et
  jamais exposée au navigateur. Un `NEXT_PUBLIC_*` aurait été figé au build.
- **Non `CORS_ALLOWED_ORIGINS`** : cette variable est lue par **Spring** et n'est
  aujourd'hui **pas transmise au conteneur frontend** (vérifié dans
  `docker-compose.yml`). S'appuyer dessus aurait donné une garde silencieusement
  inactive côté Next tout en laissant croire que le `ProfileSafetyGuard` backend la
  couvrait.
- **Portée** : le durcissement s'applique à **toutes** les redirections émises par
  `middleware.ts`, garde #302 **et** next-intl (`/` → `/fr`, `/dashboard` →
  `/fr/dashboard`). Ces dernières dérivent de la même `request.nextUrl` : n'en
  durcir qu'une laisserait le vecteur ouvert sur des chemins plus atteignables.
- **Fail-closed** : hôte entrant non déclaré → l'origine est réécrite vers la
  première entrée. Hôte déclaré → conservé tel quel (preview/staging non cassés).
- **Piège WHATWG rencontré** : écrire `url.host = 'app.example.com'` ne supprime
  **pas** le port déjà présent — la 307 sortait en
  `http://app.example.com:3133/fr/login`, soit le port interne du conteneur. La
  réécriture porte donc sur `hostname` **puis** `port`, jamais sur `host`. Défaut
  invisible en test unitaire tant qu'aucune URL de départ ne portait de port : il a
  été trouvé en interrogeant un serveur réel, pas la suite Vitest.

**Dégradé assumé — variable absente, vide ou invalide → AUCUNE réécriture**, le
comportement d'avant #322 est conservé à l'identique. Délibéré : une garde qui 500
ou boucle sur tous les environnements non configurés serait strictement pire que le
risque qu'elle corrige (BUG-S45-001, cf. ci-dessus). Ancré par des tests
(`APP_CANONICAL_HOST` valant `''`, `'   '`, `'pas valide'`, `',,,'` → 307 nominale).

**Risques résiduels, non couverts par #322 :**

- **Rien n'impose la variable en production.** Il n'existe pas d'équivalent frontend
  au `ProfileSafetyGuard` backend : une prod qui oublie `APP_CANONICAL_HOST` ne
  bénéficie de rien, **silencieusement**. Sur le runtime self-hosté actuel c'est sans
  conséquence (mesure ci-dessus) ; sur une plateforme edge, ce serait l'open-redirect
  d'origine.
- **Une valeur syntaxiquement invalide désactive le durcissement** au lieu de le
  signaler (même raison : interdiction de casser le boot / le rendu).
- **Une liste mal synchronisée** avec les domaines réellement servis renvoie les
  environnements non listés vers le canonique — comportement voulu (fail-closed),
  mais qui se manifeste comme une redirection inattendue si un domaine légitime est
  oublié.
- Les littéraux **IPv6** ne sont acceptés que sous forme d'origine complète
  (`http://[::1]:3000`), pas en hôte nu.

### Vérification de signature RS256 (#323, sprint 50)

> Section ajoutée par #323, à côté de celle de #322. Les sections de §Limites sont
> indépendantes : une évolution ultérieure ajoute la sienne plutôt que de réécrire.

**Ce que #323 ferme.** Les deux premières limites de cette section — « un cookie
présent mais expiré/forgé laisse passer le rendu » et « n'importe qui peut poser un
cookie nommé `jwt` » — étaient la conséquence directe du **HMAC symétrique** de
`JwtService` : le secret qui vérifie était celui qui émet, donc impubliable côté Edge
(§Option A). `JwtService` signe désormais en **RS256** ; `frontend/middleware.ts`
vérifie signature + `exp` avec la seule clé **publique** (`AUTH_JWT_PUBLIC_KEY`).
Un cookie forgé ou périmé produit maintenant un **307 vers `/login`**.

**Vérification par WebCrypto natif, AUCUNE dépendance ajoutée.**
`crypto.subtle.importKey('spki', …)` + `crypto.subtle.verify('RSASSA-PKCS1-v1_5', …)`
est exactement l'algorithme de `RS256` (RFC 7518 §3.3) et est disponible dans le
runtime Edge. `jose` aurait été plus court à écrire, mais c'est une dépendance de
**production** dans un runtime frontend partagé — un ajout qui se séquence, pas qui
s'improvise. Le module de vérification (`src/lib/auth-token-verify.ts`) est **pur**,
comme `auth-guard-paths.ts` et `canonical-host.ts`.

**Confusion d'algorithme — la barrière qui compte.** `alg` est un champ choisi par le
**porteur** du token. La clé publique étant publique par construction, accepter
`alg: HS256` reviendrait à laisser quiconque la connaît signer une identité
arbitraire ; accepter `alg: none` reviendrait à ne rien vérifier. Le module **exige
`alg === "RS256"`** avant de toucher à la signature, et le backend fige `Jwts.SIG.RS256`
aux deux points d'émission. Ancré par test des deux côtés.

**Limites qui SUBSISTENT — ce n'est toujours pas une frontière d'autorisation :**

- **La révocation de session n'est pas vérifiable en Edge.** Un token dont le `jti` a
  été révoqué (`POST /logout`, suppression de compte, #73) reste cryptographiquement
  valide jusqu'à son `exp`. Seul `JwtFilter` consulte la table des sessions. Un
  utilisateur déconnecté ailleurs franchit donc encore la garde — et reçoit 401 sur
  chaque appel API.
- **Dégradé assumé sur clé absente ou illisible.** `AUTH_JWT_PUBLIC_KEY` non
  configurée, vide, ou non décodable ⇒ la garde retombe sur la **présence seule** du
  cookie, c'est-à-dire le contrat de #302. Fail-**open**, délibérément : une garde
  fail-closed sur une clé mal saisie déconnecterait 100 % des utilisateurs sans
  qu'aucun signal ne l'explique, alors que le backend continue, lui, de refuser les
  jetons invalides. Même arbitrage que `APP_CANONICAL_HOST` (#322) et que le
  `Location` absolu ci-dessus : **la garde doit d'abord FONCTIONNER**.
- **Aucun garde-fou frontend n'impose la variable en production.** Comme pour
  `APP_CANONICAL_HOST`, il n'existe pas d'équivalent frontend au `ProfileSafetyGuard`
  backend : rien ne fait échouer le démarrage. Depuis la revue S50 (2e cycle), l'absence
  n'est plus **muette** pour autant : `verifyAuthCookie` (et `parseCanonicalOrigins` pour
  #322) émettent un `console.warn` **one-shot** quand la variable est absente **et**
  `NODE_ENV === 'production'`. Ce n'est PAS un fail-closed — aucune exception n'est levée
  (BUG-S45-001) — juste le signal qui manquait : sans lui, le seul symptôme d'un #322/#323
  intégralement inerte était l'*absence* d'un avertissement. Un vrai garde-fou (refus de
  démarrage) reste un follow-up commun aux deux variables.
- **Une clé publique DÉPAREILLÉE renvoie tout le monde vers `/login`.** C'est le mode
  de panne propre à cette évolution : la clé frontend et la clé privée backend sont
  deux variables distinctes, sans mécanisme de découverte (pas de JWKS). Le symptôme
  est une boucle « je me connecte, je suis redirigé » — non bloquante (l'API répond
  normalement) mais très déroutante. Mitigations retenues : (a) le backend n'expose
  qu'**une** variable, la clé publique étant DÉRIVÉE de la privée (`RsaKeyMaterial`),
  ce qui supprime la moitié du risque ; (b) le backend **journalise au boot** la valeur
  exacte à coller (dans les DEUX modes, configuré comme éphémère). Un endpoint JWKS
  supprimerait le reste — hors scope, noté en follow-up.
  **⚠ AUCUN signal ne couvre ce cas** (revue S50, 2e cycle) : une clé BIEN FORMÉE mais
  dépareillée s'importe sans erreur, donc ni `warnUnreadableKeyOnce` (clé illisible) ni
  l'avertissement d'absence ne se déclenchent — seules les signatures échouent, une par une.
  C'est la panne la plus visible pour l'utilisateur (100 % des sessions renvoyées vers
  `/login`) et la moins diagnosticable. **Remède immédiat : VIDER `AUTH_JWT_PUBLIC_KEY`**
  (retour au dégradé de #302, tout le monde repasse), puis recoller la valeur journalisée
  au boot du backend actuellement en service — et non une valeur re-dérivée à la main en
  `openssl`, manipulation qui produit précisément une paire dépareillée au moindre écart.
- **CI e2e en mode dégradé.** Le job e2e démarre le backend sans clé (paire éphémère,
  car aucune clé privée ne peut être committée dans un dépôt **public**) et ne publie
  donc pas de `AUTH_JWT_PUBLIC_KEY`. La vérification de signature est couverte en
  **unitaire** (`middleware.test.ts`, `auth-token-verify.test.ts`), **pas en E2E** :
  `e2e/auth-guard.spec.ts` exerce le chemin dégradé, inchangé.

**Rotation et distribution des clés.** Procédure opérationnelle complète :
`docs/memory/devops/secret-rotation-runbook.md §2`. En résumé : la clé privée
(`JWT_PRIVATE_KEY`) est un secret de plateforme au même titre que `DB_PASSWORD` ; la
clé publique (`AUTH_JWT_PUBLIC_KEY`) n'en est pas un et se déploie comme une variable
de configuration ordinaire. Les deux se posent **dans le même déploiement** (publique
d'abord, en tolérance dégradée, puis privée) — jamais l'une sans l'autre.

**Stratégie de transition — bascule SÈCHE, assumée.** Le changement de matériel de
signature invalide **100 %** des jetons en circulation : tout utilisateur connecté est
déconnecté. Aucune double émission HS256/RS256 transitoire n'a été implémentée, pour
deux raisons : (a) **le projet n'est déployé nulle part** au 2026-07-28 (`gh secret
list` vide, aucun environnement GitHub, aucun workflow de déploiement — cf. runbook
§Statut) : le parc d'utilisateurs à ménager n'existe pas ; (b) un double chemin de
signature est une **surface d'attaque** (le vérificateur doit alors accepter HS256,
ce qui rouvre exactement la confusion d'algorithme fermée ci-dessus). Au premier
déploiement réel, la bascule se planifie en fenêtre de faible usage avec préavis —
checklist dans le runbook.

## Conséquences

- Un anonyme sur `/fr/dashboard` reçoit un **307 vers `/fr/login`** — aucun octet
  du shell applicatif n'est rendu.
- Coût runtime : lecture d'un cookie + un `split('/')` par requête matchée. Aucun
  I/O, aucune dépendance Node-only → compatible Edge Runtime.
- `frontend/src/lib/auth-guard-paths.ts` est **pur** (aucun import `next/server`,
  `fs`, `path`) pour rester importable depuis l'Edge et testable sans mock —
  même contrainte que `src/i18n/locales.ts` (#235).

## Follow-ups identifiés

- ~~Migrer la signature JWT en asymétrique (RS256)~~ → **traité #323 (sprint 50)**,
  cf. §Limites « Vérification de signature RS256 ». Restent ouverts :
  - exposer un **endpoint JWKS** côté backend pour que le middleware découvre la clé
    publique au lieu de la recevoir en variable — supprimerait le mode de panne
    « clé dépareillée » et rendrait la rotation atomique ;
  - **révocation vérifiable en Edge** (le `jti` révoqué passe encore la garde) ;
  - couvrir la vérification de signature en **E2E** (exige de provisionner une paire
    à la volée dans le job CI, aucune clé ne pouvant être committée).
- Rendre `AUTH_JWT_PUBLIC_KEY` **obligatoire en production**, comme
  `APP_CANONICAL_HOST` : même absence de garde-fou frontend, même dégradé silencieux.
- Synchroniser automatiquement `PROTECTED_APP_SEGMENTS` avec le contenu de
  `frontend/app/[locale]/(app)/` (script de lint, ou test qui lit le FS côté
  Node uniquement).
- Paramètre `?redirect=` avec allow-list de chemins internes.
- ~~**Neutraliser la limite `Host`**~~ → **traité #322 (sprint 50)**, cf. §Limites
  « Origine canonique du `Location` ». Reste ouvert : rendre `APP_CANONICAL_HOST`
  **obligatoire en production** (équivalent frontend du `ProfileSafetyGuard`
  backend), aujourd'hui son absence dégrade en silence.

## Références

- Issue #302 ; review PR #297 ; PIT-S40-002
- BR-AUT-007 (cookie HttpOnly), BR-AUT-011 (JwtFilter cookie OU Bearer)
- `frontend/src/hooks/useAuthGuard.ts` (#210), `frontend/src/i18n/locales.ts` (#235)
