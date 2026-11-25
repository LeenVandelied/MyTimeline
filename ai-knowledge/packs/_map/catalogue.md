# Catalogue des packs (carte du système)

Mode rejeu. 727 fichiers, 727 rattachés (100.0 %), 0 restants. Porte mécanique : 0 erreurs, 0 avertissements.


## domain

### event : Événement  (53 fichiers, 274 ko)
- Le groupe Event compte 135 fichiers et 590 ko, avec EventController et RecurrencePreviewController sur /api/events. La taille du groupe entier est portée par ce pack pivot, les packs session et export (fondus dans ce groupe) sont à 0.
- seeds : Event
- entité pivot : EventEntity
- controllers : EventController, RecurrencePreviewController
- services : EventService, RecurrenceExpansionService
- déclencheurs keywords : event, événement, evenement, recurrence, récurrence, timeline, passwordresettoken
- déclencheurs routes : /api/events
- déclencheurs entities : EventEntity, PasswordResetTokenEntity
- motifs de noms : **/Event*, **/*event*
- alias : timeline, recurrence
- hypothèse A4 [confirmed, low, R3 dossier d'écran sans entité, alias timeline rattaché au p] : Pages timeline : event ou autre pack ?

### user : Utilisateur et authentification  (84 fichiers, 409 ko)
- Le groupe User compte 80 fichiers et 480 ko, avec 3 controllers (/api/auth, /api/me, /api/test-support) et 41 liens entrants depuis Event.
- seeds : User, PasswordResetToken
- entité pivot : UserEntity
- controllers : AuthController, E2eResetTokenController, UserController
- services : AvatarService, BrevoEmailService, CustomUserDetailsService, EmailService, PasswordResetService, UserService
- déclencheurs keywords : user, utilisateur, auth, login, register, password, mot de passe, avatar, email, theme, preference
- déclencheurs routes : /api/auth, /api/me, /api/test-support, api/me, api/me/avatar, api/me/export, me, me/avatar, me/export
- déclencheurs entities : UserEntity
- motifs de noms : **/User*, **/*user*, **/PasswordResetToken*, **/*auth*
- alias : login, register, password, forgot-password, reset-password, auth, role, theme, preference
- hypothèse A3 [refuted, low, R11 User est un hub, aucun groupe n'y est fondu ; la fusion ] : PasswordResetToken (14 fichiers) : fondu dans Event par le script, dans user ou pack propre ?
- hypothèse A5 [confirmed, medium, R3 écrans d'authentification sans entité, suivent le pack qu] : Pages login, register, forgot-password, reset-password : user ou session ?
- hypothèse A8 [confirmed, medium, R9 test sans seed suivant la classe de production la plus pr] : ThemePreference et rôle utilisateur : user ou socle ?
- hypothèse A12 [open, high, R11 User est importée par 3 seeds sur 6 (Category, Product, ] : User, entité hub : son seed garde-t-il son propre pack, et AvatarService lui revient-il ?
- hypothèse A13 [open, high, R11 entité hub : importée par 3/6 seeds d'entité, ses arêtes] : L'entité hub User (importée par 3 seeds d'entité) reste-t-elle dans son pack ?

### product : Produit  (28 fichiers, 170 ko)
- Le groupe Product compte 18 fichiers et 129 ko (au-dessus de pack_min_kb=15) avec un ProductController et un ProductService propres.
- seeds : Product
- entité pivot : ProductEntity
- controllers : ProductController
- services : ProductService
- déclencheurs keywords : product, produit, products
- déclencheurs entities : ProductEntity
- motifs de noms : **/Product*, **/*product*
- alias : products, productId

### session : Session et jetons  (25 fichiers, 143 ko)
- Le seed Session pèse 24 fichiers (fondus par le script dans Event à 4 liens sur 4) avec SessionController, JwksController et JwtService sur /api/sessions. Sa taille est comptée dans le pack event, d'où 0 ici.
- seeds : Session
- entité pivot : SessionEntity
- controllers : JwksController, SessionController
- services : JwtService, SessionService
- déclencheurs keywords : session, jwt, jwks, token, jeton
- déclencheurs routes : /api/sessions
- déclencheurs entities : SessionEntity
- motifs de noms : **/Session*, **/*session*
- hypothèse A10 [confirmed, medium, R7 le script fond Session dans Event (4 liens sur 4), mais S] : Session (24 fichiers) : fondu dans Event comme le fait le script, ou pack propre ?

### category : Catégorie  (20 fichiers, 93 ko)
- Le groupe Category compte 21 fichiers et 97 ko (au-dessus de pack_min_kb=15) avec un CategoryController sur /api/categories.
- seeds : Category
- entité pivot : CategoryEntity
- controllers : CategoryController
- services : CategoryService
- déclencheurs keywords : category, catégorie, categorie, categories
- déclencheurs routes : /api/categories
- déclencheurs entities : CategoryEntity
- motifs de noms : **/Category*, **/*category*

### export : Export de données  (35 fichiers, 107 ko)
- Le seed ExportJob pèse 37 fichiers (fondus par le script dans Event à 5 liens sur 5) avec ExportController sur /api/export et une machine d'états propre (ExportJob.java, 8 occurrences). Sa taille est comptée dans le pack event, d'où 0 ici.
- seeds : ExportJob
- entité pivot : ExportJobEntity
- controllers : ExportController
- services : ExportService, ExportTokenService
- déclencheurs keywords : export, exportjob, zip, csv, markdown, téléchargement
- déclencheurs routes : /api/export
- déclencheurs entities : ExportJobEntity
- dossiers purs (>= 80 %, >= 5 fichiers) : backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/
- motifs de noms : **/ExportJob*
- hypothèse A11 [confirmed, medium, R7 le script fond ExportJob dans Event (5 liens sur 5), mais] : ExportJob (37 fichiers) : fondu dans Event comme le fait le script, ou pack propre ?


## transversal

### authorization : Autorisation et sécurité  (37 fichiers, 351 ko)
- Le motif authorization touche 35 fichiers (SecurityConfig 19 occurrences, JwtFilter 11), répartis entre User (14), Event (7) et le socle (14). Taille en ko inconnue, mise à 0.
- motif : authorization
- déclencheurs keywords : authorization, autorisation, security, sécurité, rate limit, role, jwt
- règles de chemin : ^backend:src/.*/(SecurityConfig|JwtFilter|JwtService|UserRateLimitingFilter|CustomUserDetailsService|ExportTokenService)[^/]*\.java$
- traverse : user, session, export
- fichiers revendiqués en recouvrement : 37

### integrations : Intégrations et services externes  (110 fichiers, 830 ko)
- Le motif integrations touche 97 fichiers (ZipExportRenderer 33 occurrences, apiClient 9), répartis sur Event (39), le socle (26), User (21), Product (6) et Category (5). Taille en ko inconnue, mise à 0.
- motif : integrations
- déclencheurs keywords : integration, intégration, storage, stockage, brevo, renderer, apiclient
- règles de chemin : ^backend:src/.*/(ZipExportRenderer|MarkdownExportRenderer|JsonExportRenderer|CsvExportRenderer|LocalStorageAdapter|BrevoEmailService|BrevoHealthIndicator)[^/]*\.java$ ; ^frontend:.*/apiClient[^/]*$
- traverse : user, event, export, session, product, category
- fichiers revendiqués en recouvrement : 110

### batch : Tâches planifiées et asynchrones  (9 fichiers, 42 ko)
- Le motif batch touche 9 fichiers (PasswordResetTokenPurgeScheduler 6 occurrences, ExportPurgeScheduler 5) répartis entre Event (5), User (2) et le socle (2). Taille en ko inconnue, mise à 0.
- motif : batch
- déclencheurs keywords : batch, scheduler, scheduled, cron, purge, async
- règles de chemin : ^backend:src/.*/(PasswordResetTokenPurgeScheduler|ExportPurgeScheduler|SchedulingConfig|AsyncConfig|AsyncExportRunner)[^/]*\.java$
- traverse : user, export
- fichiers revendiqués en recouvrement : 9


## technical

### backend-core : Socle backend  (45 fichiers, 340 ko)
- 36 fichiers techniques backend sans seed (33 en infrastructure, 2 à la racine, 1 de support), plus 2 tests non rattachés (ArchitectureTest, BomDriftTest), migrations exclues. Taille en ko inconnue, mise à 0.
- dossiers purs (>= 80 %, >= 5 fichiers) : backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/
- règles de chemin : ^backend:(?!src/main/resources/db/migration/)src/(main|test)/(java|resources)/

### frontend-core : Socle frontend  (344 fichiers, 2598 ko)
- 344 fichiers techniques frontend sans seed hors lib (253 composants, 44 hooks, 12 services, 9 styles), components/ui restant à retirer par configuration. Taille en ko inconnue, mise à 0.
- dossiers purs (>= 80 %, >= 5 fichiers) : frontend:components/dashboard/, frontend:components/events/, frontend:components/landing/, frontend:components/products/, frontend:components/settings/, frontend:components/shared/, frontend:components/timeline/, frontend:components/ui/, frontend:styles/__tests__/
- règles de chemin : ^frontend:(?!(src/)?(components/ui|lib)/)

### frontend-app : Routes et pages Next.js  (41 fichiers, 179 ko)
- 8 fichiers techniques à la racine de l'app router plus 33 fichiers de pages et layouts non rattachés sous [locale], soit 41 fichiers. Taille en ko inconnue, mise à 0.
- dossiers purs (>= 80 %, >= 5 fichiers) : frontend-app:[locale]/(app)/
- règles de chemin : ^frontend-app:

### lib-socle : Socle d'interface (frontend)  (35 fichiers, 277 ko)
- pack technique déclaré par map.tech_packs
- déclencheurs keywords : lib, socle
- règles de chemin : ^frontend:lib/

### migrations : Migrations de base  (17 fichiers, 49 ko)
- pack technique déclaré par map.tech_packs
- déclencheurs keywords : migrations
- dossiers purs (>= 80 %, >= 5 fichiers) : backend:src/main/resources/db/
- règles de chemin : ^backend:src/main/resources/db/migration/


## Hypothèses hors pack (différées, indécidables)

- A6 [confirmed] état courant : Radicaux dashboard et settings, pages correspondantes : quel pack ?
- A7 [confirmed] non créé : state-machine : state-machine : créer un pack transversal ?
- A9 [undecidable] état courant : Migrations non rattachées (V1, V2, V3, V5, V7) : quel propriétaire ?

## Porte mécanique


## Fichiers restants (0)

