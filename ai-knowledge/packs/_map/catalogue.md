# Catalogue des packs (carte du système)

Mode rejeu. 688 fichiers, 688 rattachés (100.0 %), 0 restants. Porte mécanique : 0 erreurs, 8 avertissements.


## domain

### timeline : Chronologie, comptes et exports  (388 fichiers, 2584 ko)
- Un seul groupe candidat de 199 fichiers (997 ko) dont le script a fondu six seeds sur sept dans UserEntity (liens 37/37, 16/16, 9/10, 8/8, 4/4, 2/2), au-dessus de pack_min_kb=60.
- seeds : UserEntity, CategoryEntity, EventEntity, ExportJobEntity, PasswordResetTokenEntity, ProductEntity, SessionEntity
- entité pivot : UserEntity
- controllers : AuthController, CategoryController, E2eResetTokenController, EventController, ExportController, JwksController, ProductController, RecurrencePreviewController, SessionController, UserController
- services : AvatarService, BrevoEmailService, CategoryService, CustomUserDetailsService, EmailService, EventService, ExportService, ExportTokenService, JwtService, PasswordResetService, ProductService, RecurrenceExpansionService, SessionService, UserService
- déclencheurs keywords : user, utilisateur, event, événement, evenement, category, catégorie, categorie, product, produit, session, export, password reset, mot de passe, timeline, chronologie, recurrence, récurrence, avatar
- déclencheurs routes : /api/auth, /api/categories, /api/events, /api/export, /api/me, /api/sessions, /api/test-support
- déclencheurs entities : UserEntity, CategoryEntity, EventEntity, ExportJobEntity, PasswordResetTokenEntity, ProductEntity, SessionEntity
- dossiers purs (>= 80 %, >= 5 fichiers) : mytimeline:backend/, mytimeline:frontend/src/hooks/, mytimeline:frontend/src/types/, mytimeline:frontend/src/components/events/, mytimeline:frontend/src/components/products/
- motifs de noms : **/UserEntity*, **/CategoryEntity*, **/EventEntity*, **/ExportJobEntity*, **/PasswordResetTokenEntity*, **/ProductEntity*, **/SessionEntity*, **/*user*, **/*event*, **/*category*, **/*product*, **/*session*, **/*export*, **/*password*, **/*recurrence*, **/*auth*, **/*theme*
- alias : user, utilisateur, event, événement, evenement, category, catégorie, categorie, product, produit, session, export, password, mot de passe, timeline, chronologie, recurrence, récurrence, auth, theme, thème, conflict, conflit


## transversal

### authorization : Autorisation et limitation de débit  (15 fichiers, 141 ko)
- Le motif authorization compte 35 fichiers à 3 occurrences ou plus, répartis en 17 dans le domaine et 18 hors groupe (SecurityConfig 19, JwtServiceRs256Test 16).
- motif : authorization
- règles de chemin : (Security|Jwt|RateLimit|RateLimiting|CustomUserDetails|ExportToken|CallerResolver|AuthController)
- traverse : timeline
- fichiers revendiqués en recouvrement : 25

### state-machine : États et machines à états  (1 fichiers, 0 ko)
- Le motif state-machine compte 23 fichiers à 3 occurrences ou plus (19 dans le domaine, 4 hors groupe), avec ExportJob 13 et trois foyers sans seed (Role, ThemePreferenceTest, ExportJobTest).
- motif : state-machine
- règles de chemin : /(Role|ThemePreference|ExportJob|ExportJobStatus|ExportFormat|RecurrenceUnit)(Test)?\.java$
- traverse : timeline
- fichiers revendiqués en recouvrement : 7

### integrations : Intégrations externes et export  (4 fichiers, 12 ko)
- Le motif integrations compte 85 fichiers à 3 occurrences ou plus (63 dans le domaine, 22 hors groupe), dont ExportRenderersTest 34 et ZipExportRenderer 33.
- motif : integrations
- règles de chemin : (Brevo|ExportRenderer|ZipExport|PasswordResetEmailTemplate|EmailService|StorageConfig|LocalStorage)
- traverse : timeline
- fichiers revendiqués en recouvrement : 14

### batch : Tâches planifiées et asynchrones  (2 fichiers, 3 ko)
- Le motif batch compte 14 fichiers à 3 occurrences ou plus (10 dans le domaine, 4 hors groupe), avec PasswordResetTokenPurgeScheduler 6 et ExportPurgeScheduler 5.
- motif : batch
- règles de chemin : (Scheduler|SchedulingConfig|AsyncExportRunner|AsyncConfig)
- traverse : timeline
- fichiers revendiqués en recouvrement : 5


## technical

### backend-socle : Socle backend  (16 fichiers, 132 ko)
- 46 fichiers techniques sans seed (43 en infrastructure, dont les configurations, filtres et tests d'intégration), plus 3 en application, 1 d'architecture et 1 de build parmi les non rattachés.
- règles de chemin : ^mytimeline:backend/(?!src/main/resources/db/)

### frontend-socle : Socle frontend  (257 fichiers, 1480 ko)
- La majorité des 440 fichiers non rattachés (419 en ressources) sont des fichiers frontend sans seed, sans aucun motif transversal sauf 2 occurrences d'integrations (e2e-rate-limit-budget.test.ts).
- dossiers purs (>= 80 %, >= 5 fichiers) : mytimeline:frontend/app/, mytimeline:frontend/src/__tests__/, mytimeline:frontend/src/styles/, mytimeline:frontend/src/components/dashboard/, mytimeline:frontend/src/components/landing/, mytimeline:frontend/src/components/shared/, mytimeline:frontend/src/components/ui/, mytimeline:frontend/src/components/settings/mobile/
- règles de chemin : ^mytimeline:frontend/

### migrations : Migrations de base de données  (5 fichiers, 12 ko)
- 16 fichiers non rattachés de la couche db, sans seed ni motif transversal.
- règles de chemin : ^mytimeline:backend/src/main/resources/db/


## Hypothèses hors pack (différées, indécidables)

- A1 [open] un seul pack domain timeline, pivot UserEntity : Les six seeds fondus par le script dans UserEntity forment-ils un seul pack, ou faut-il séparer événements, catégories et comptes ?
- A2 [open] fondu dans timeline : ProductEntity (1 fichier) reste-t-il dans le pack timeline ou forme-t-il un pack à part ?
- A3 [open] fondu dans timeline : ExportJobEntity (1 fichier) appartient-il au pack timeline ou à un pack d'export séparé ?
- A4 [open] les composants nommés timeline, event, product, category, auth, theme ou conflict vont à timeline par alias, le reste (ui, layout, styles, lib générique) reste au socle frontend : Les fichiers frontend non rattachés vont-ils au pack timeline (par alias) ou au socle frontend ?
- A5 [open] oui, pack transversal batch : Le motif batch (14 fichiers) justifie-t-il un pack transversal ?
- A6 [open] revendiqués par le transversal state-machine via path_rules, sans retirer leur propriétaire : Les foyers state-machine sans seed (Role, ThemePreferenceTest, ExportJobTest) relèvent-ils du transversal ou du domaine ?
- A7 [open] nombre de fichiers du motif ou de la couche tel que donné, 0 ko tant que la taille n'est pas mesurée : Quelles tailles donner aux packs sans groupe (transversaux et techniques) ?
- A8 [open] trois packs techniques par règle de chemin : backend-socle, frontend-socle, migrations : Les fichiers sans seed vont-ils aux packs techniques par chemin (backend, frontend, base) ?

## Porte mécanique

- avert. hypothèse A1 : decision 'un seul pack domain timeline, pivot UserEntity' n'est pas un pack
- avert. hypothèse A2 : decision 'fondu dans timeline' n'est pas un pack
- avert. hypothèse A3 : decision 'fondu dans timeline' n'est pas un pack
- avert. hypothèse A4 : decision 'les composants nommés timeline, event, product, category, auth, theme ou conflict vont à timeline par alias, le reste (ui, layout, styles, lib générique) reste au socle frontend' n'est pas un pack
- avert. hypothèse A5 : decision 'oui, pack transversal batch' n'est pas un pack
- avert. hypothèse A6 : decision 'revendiqués par le transversal state-machine via path_rules, sans retirer leur propriétaire' n'est pas un pack
- avert. hypothèse A7 : decision "nombre de fichiers du motif ou de la couche tel que donné, 0 ko tant que la taille n'est pas mesurée" n'est pas un pack
- avert. hypothèse A8 : decision 'trois packs techniques par règle de chemin : backend-socle, frontend-socle, migrations' n'est pas un pack

## Fichiers restants (0)

