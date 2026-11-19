# Catalogue des packs (carte du système)

Mode rejeu. 700 fichiers, 700 rattachés (100.0 %), 0 restants. Porte mécanique : 0 erreurs, 0 avertissements.


## domain

### event : Événement  (180 fichiers, 1502 ko)
- Le groupe Event pèse 178 fichiers et 1498 ko (118 composants front) avec son controller /api/events et un service de récurrence propres.
- seeds : Event, EventEntity
- entité pivot : EventEntity
- controllers : EventController, RecurrencePreviewController
- services : EventService, RecurrenceExpansionService
- déclencheurs keywords : event, événement, evenement, recurrence, récurrence, timeline
- déclencheurs routes : /api/events, events/evt-desktop, events/evt-mobile
- déclencheurs entities : EventEntity
- dossiers purs (>= 80 %, >= 5 fichiers) : frontend:components/events/, frontend:components/timeline/
- motifs de noms : **/Event*, **/*event*, **/EventEntity*, **/*recurrence*
- alias : timeline, recurrence
- hypothèse A4 [open, low, R3 dossier d'écran sans entité, alias timeline rattaché au p] : Pages timeline : event ou autre pack ?

### user : Utilisateur et authentification  (154 fichiers, 826 ko)
- Le groupe User compte 87 fichiers et 430 ko, avec 3 controllers (/api/auth, /api/me, /api/test-support) et PasswordReset fondu à 13 liens sur 14.
- seeds : User, UserEntity, PasswordReset, PasswordResetTokenEntity
- entité pivot : UserEntity
- controllers : AuthController, E2eResetTokenController, UserController
- services : AvatarService, BrevoEmailService, CustomUserDetailsService, EmailService, PasswordResetService, UserService
- déclencheurs keywords : user, utilisateur, auth, login, register, password, mot de passe, avatar, email, theme, preference
- déclencheurs routes : /api/auth, /api/me, /api/test-support, me/avatar, me/export
- déclencheurs entities : UserEntity, PasswordResetTokenEntity
- dossiers purs (>= 80 %, >= 5 fichiers) : frontend:components/settings/
- motifs de noms : **/User*, **/*user*, **/UserEntity*, **/PasswordReset*, **/PasswordResetTokenEntity*, **/*password*, **/*auth*, **/*role*, **/*theme*, **/*preference*, **/*settings*
- alias : login, register, password, forgot-password, reset-password, auth, role, theme, preference, settings
- hypothèse A3 [open, medium, R3 fusion par le script à 13 liens sur 14 vers User, Passwor] : PasswordReset (22 fichiers) : pack propre ou dans user ?
- hypothèse A5 [open, medium, R3 écrans d'authentification sans entité, suivent le pack qu] : Pages login, register, forgot-password, reset-password : user ou session ?
- hypothèse A8 [open, medium, R9 test sans seed suivant la classe de production la plus pr] : ThemePreference et rôle utilisateur : user ou socle ?

### product : Produit  (69 fichiers, 535 ko)
- Le groupe Product pèse 68 fichiers et 531 ko, dont 40 composants front, avec un ProductController et un ProductService propres.
- seeds : Product, ProductEntity
- entité pivot : ProductEntity
- controllers : ProductController
- services : ProductService
- déclencheurs keywords : product, produit, products
- déclencheurs routes : users/user-1/products, users/user-1/products/p2
- déclencheurs entities : ProductEntity
- dossiers purs (>= 80 %, >= 5 fichiers) : frontend:components/dashboard/
- motifs de noms : **/Product*, **/*product*, **/ProductEntity*
- alias : products, productId
- hypothèse A1 [open, high, R1 satellite suivant le pivot dont il porte le nom (liens 6/] : ProductEntity : fondu dans Event par le script ou dans product ?

### session : Session et jetons  (22 fichiers, 84 ko)
- Le groupe Session compte 52 fichiers et 232 ko, avec le controller /api/sessions, JwksController et JwtService, et 36 occurrences du motif authorization.
- seeds : Session, SessionEntity
- entité pivot : SessionEntity
- controllers : JwksController, SessionController
- services : JwtService, SessionService
- déclencheurs keywords : session, jwt, jwks, token, jeton
- déclencheurs routes : /api/sessions
- déclencheurs entities : SessionEntity
- motifs de noms : **/Session*, **/*session*, **/SessionEntity*

### category : Catégorie  (32 fichiers, 187 ko)
- Le groupe Category compte 31 fichiers et 184 ko (au-dessus de pack_min_kb=15) avec un CategoryController sur /api/categories et un front propre de 5 composants.
- seeds : Category, CategoryEntity
- entité pivot : CategoryEntity
- controllers : CategoryController
- services : CategoryService
- déclencheurs keywords : category, catégorie, categorie, categories
- déclencheurs routes : /api/categories, api/categories
- déclencheurs entities : CategoryEntity
- motifs de noms : **/Category*, **/*category*, **/CategoryEntity*
- hypothèse A2 [open, high, R1 satellite suivant le pivot dont il porte le nom (liens 5/] : CategoryEntity : fondu dans Event par le script ou dans category ?

### export : Export de données  (31 fichiers, 92 ko)
- Le groupe ExportJob compte 31 fichiers et 92 ko avec 17 occurrences du motif state-machine et 111 du motif integrations (renderers).
- seeds : ExportJob, ExportJobEntity
- entité pivot : ExportJobEntity
- controllers : ExportController
- services : ExportService, ExportTokenService
- déclencheurs keywords : export, exportjob, zip, csv, markdown, téléchargement
- déclencheurs routes : /api/export
- déclencheurs entities : ExportJobEntity
- dossiers purs (>= 80 %, >= 5 fichiers) : backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/
- motifs de noms : **/ExportJob*, **/ExportJobEntity*


## transversal

### authorization : Autorisation et sécurité  (0 fichiers, 0 ko)
- Le motif authorization touche 35 fichiers (SecurityConfig 19 occurrences, JwtFilter 11), répartis entre User (14), Session (4) et le socle (16).
- motif : authorization
- déclencheurs keywords : authorization, autorisation, security, sécurité, rate limit, role, jwt
- règles de chemin : ^backend:src/.*/(SecurityConfig|JwtFilter|JwtService|RateLimitingFilter|UserRateLimitingFilter|CustomUserDetailsService)[^/]*\.java$
- traverse : user, session, export
- fichiers revendiqués en recouvrement : 10

### integrations : Intégrations et services externes  (0 fichiers, 0 ko)
- Le motif integrations touche 97 fichiers (ZipExportRenderer 33 occurrences, apiClient 9), répartis sur les 6 domaines (User 25, Event 17, ExportJob 12).
- motif : integrations
- déclencheurs keywords : integration, intégration, storage, stockage, brevo, renderer, apiclient
- règles de chemin : ^backend:src/.*/(ZipExportRenderer|MarkdownExportRenderer|JsonExportRenderer|CsvExportRenderer|LocalStorageAdapter|BrevoEmailService|BrevoHealthIndicator)[^/]*\.java$ ; ^frontend:.*/apiClient[^/]*$
- traverse : user, event, export, session, product, category
- fichiers revendiqués en recouvrement : 13

### batch : Tâches planifiées et asynchrones  (0 fichiers, 0 ko)
- Le motif batch touche 9 fichiers (PasswordResetTokenPurgeScheduler 6 occurrences, ExportPurgeScheduler 5) répartis entre User (4), ExportJob (3) et le socle (2).
- motif : batch
- déclencheurs keywords : batch, scheduler, scheduled, cron, purge, async
- règles de chemin : ^backend:src/.*/(PasswordResetTokenPurgeScheduler|ExportPurgeScheduler|SchedulingConfig|AsyncConfig|AsyncExportRunner)[^/]*\.java$
- traverse : user, export
- fichiers revendiqués en recouvrement : 7


## technical

### backend-core : Socle backend  (44 fichiers, 326 ko)
- 41 fichiers techniques backend sans seed (38 en infrastructure : configuration, sécurité, filtres, tests d'intégration), plus les migrations non rattachées.
- dossiers purs (>= 80 %, >= 5 fichiers) : backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/
- règles de chemin : ^backend:src/(main|test)/(java|resources)/

### frontend-core : Socle frontend  (127 fichiers, 778 ko)
- 159 fichiers techniques frontend sans seed (63 composants, 33 lib, 19 hooks, 14 services, 9 styles).
- dossiers purs (>= 80 %, >= 5 fichiers) : frontend:__tests__/, frontend:styles/, frontend:components/landing/
- règles de chemin : ^frontend:

### frontend-app : Routes et pages Next.js  (41 fichiers, 179 ko)
- 8 fichiers techniques à la racine de l'app router plus 33 fichiers de pages et layouts non rattachés sous [locale].
- dossiers purs (>= 80 %, >= 5 fichiers) : frontend-app:[locale]/
- règles de chemin : ^frontend-app:


## Hypothèses hors pack (différées, indécidables)

- A6 [open] état courant : Radical dashboard et pages settings : quel pack ?
- A7 [open] non créé : state-machine : state-machine : créer un pack transversal ?
- A9 [open] état courant : Migrations non rattachées (V1 à V9) : quel propriétaire ?

## Porte mécanique


## Fichiers restants (0)

