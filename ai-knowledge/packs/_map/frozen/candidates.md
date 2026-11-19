# Groupes candidats (passe déterministe)

Projet mytimeline. 700 fichiers (4513 ko), 14 seeds ({'entity': 7, 'extra': 7}), 5 groupes, 172 techniques, 0 dans un foyer transversal, 40 non rattachés dont 0 à égalité de votes. Arêtes : regex.

Seuils : pack_min_kb=15, min_seed_files=6, merge_ratio=0.9, max_merge_target=40.

Règles par défaut :
- R1 : Un satellite suit le pivot dont il porte le nom (`LoanItem` → Loan) ; un seed de dossier front dont les radicaux sont un préfixe strict de ceux d'une entité suit cette entité (`card` → MemberCard ; pas `admin` → DemandAdmin), avant toute règle d'imports (high)
- R2 : Sauf si ses imports vers un autre pivot sont au moins le double de ceux vers le pivot du nom : il suit les imports (medium)
- R3 : Un controller, un service, un DTO ou un dossier d'écran sans entité suit le pack de l'entité ou du service qu'il importe le plus ; sur moins de 5 imports ou un écart de 1, la confiance tombe à `low` (medium ou low)
- R4 : À égalité de votes, le pack le plus gros en octets, et l'hypothèse est marquée `low` (low)
- R5 : Un transversal proposé par l'agent sans motif mesuré n'est pas créé : hypothèse `deferred`, réexaminée quand l'extraction aura compté ses fichiers (—)
- R6 : Un groupe de référentiel (pas de motif état, controller en lecture publique, moins de `pack_min_kb`) rejoint le pack `referentiels` ; s'il n'y en a pas, il en crée un (medium)
- R7 : Un pack `domain` sous `pack_min_kb` est fondu dans le pack avec lequel il a le plus de liens ; la décision est une hypothèse (medium)
- R8 : Un pack `domain` au-dessus de 5 × la médiane des packs est découpé par `split-r8.py` si une partition de ses seeds satisfait pureté (60 %) et cohésion (80 %), sinon il reste entier et l'hypothèse est `undecidable` (medium ou —)
- R9 : Un test sans seed suit la classe de production qu'il importe le plus ; sinon R4 (medium)
- R10 : Un fichier technique est possédé par le pack `technical` de sa couche ; un transversal peut le revendiquer par `path_rules`, ce qui donne un recouvrement, pas un transfert (high)

## Event  (182 fichiers, 1509 ko)
- seeds : CategoryEntity, Event, EventEntity, ProductEntity
- entités : CategoryEntity, EventEntity, ProductEntity
- couches : {'frontend/components': 118, 'backend/infrastructure': 18, 'backend/domain': 15, 'backend/application': 11, 'frontend/hooks': 8, 'frontend/lib': 4, 'backend/db': 3, 'frontend/types': 2, 'backend/utils': 2, 'frontend/services': 1}
- controllers : EventController, RecurrencePreviewController
- préfixes de routes serveur : /api/events
- URL front : api/products/with-events, events/evt-desktop, events/evt-mobile, products/with-events
- dossiers front : components, hooks, lib, services, types
- services : EventService, RecurrenceExpansionService
- sélecteurs : [data-testid=
- motifs : {'state-machine': 3, 'authorization': 2, 'integrations': 95}
- rattachement : {'name': 115, 'fanin': 31, 'imports': 36}

## User  (176 fichiers, 911 ko)
- seeds : PasswordReset, PasswordResetTokenEntity, Session, SessionEntity, User, UserEntity
- entités : PasswordResetTokenEntity, SessionEntity, UserEntity
- couches : {'backend/infrastructure': 51, 'frontend/components': 34, 'backend/application': 30, 'backend/domain': 25, 'frontend/hooks': 9, 'frontend/lib': 9, 'backend/db': 5, 'frontend/services': 5, 'frontend/contexts': 4, 'frontend/types': 4}
- controllers : AuthController, E2eResetTokenController, JwksController, SessionController, UserController
- préfixes de routes serveur : /api/auth, /api/me, /api/sessions, /api/test-support
- URL front : api/auth/me, api/export, api/export/download/abc, api/export/job-1, api/me, api/me/avatar, api/me/export, auth/me, export, export/download/abc, export/job-1, http, me, me/avatar, me/export
- dossiers front : components, contexts, hooks, lib, services, types
- services : AvatarService, BrevoEmailService, CustomUserDetailsService, EmailService, JwtService, PasswordResetService, SessionService, UserService
- motifs : {'authorization': 176, 'state-machine': 2, 'integrations': 214, 'batch': 20}
- rattachement : {'name': 132, 'fanin': 20, 'imports': 24}

## Product  (68 fichiers, 531 ko)
- seeds : Product
- couches : {'frontend/components': 40, 'frontend/hooks': 9, 'backend/application': 7, 'backend/infrastructure': 5, 'backend/domain': 4, 'frontend/types': 2, 'frontend/services': 1}
- controllers : ProductController
- préfixes de routes serveur : /api
- URL front : users/user-1/products, users/user-1/products/p2
- dossiers front : components, hooks, services, types
- services : ProductService
- motifs : {'integrations': 44, 'authorization': 2}
- rattachement : {'name': 45, 'imports': 13, 'fanin': 10}

## Category  (31 fichiers, 184 ko)
- seeds : Category
- couches : {'backend/domain': 8, 'backend/application': 6, 'frontend/components': 5, 'frontend/hooks': 5, 'backend/infrastructure': 4, 'backend/db': 1, 'frontend/services': 1, 'frontend/types': 1}
- controllers : CategoryController
- préfixes de routes serveur : /api/categories
- URL front : api/categories, categories
- dossiers front : components, hooks, services, types
- services : CategoryService
- motifs : {'integrations': 35}
- rattachement : {'name': 31}

## ExportJob  (31 fichiers, 92 ko)
- seeds : ExportJob, ExportJobEntity
- entités : ExportJobEntity
- couches : {'backend/infrastructure': 13, 'backend/domain': 10, 'backend/application': 6, 'backend/db': 2}
- controllers : ExportController
- préfixes de routes serveur : /api/export
- services : ExportService, ExportTokenService
- motifs : {'state-machine': 17, 'integrations': 111, 'batch': 13, 'authorization': 10}
- rattachement : {'name': 10, 'imports': 15, 'fanin': 6}

## Liens entre groupes (arêtes, top 40)
- Product -> Event : 23
- Event -> User : 23
- Event -> Product : 18
- Product -> User : 13
- Product -> Category : 11
- ExportJob -> User : 11
- User -> Event : 7
- User -> Category : 6
- User -> Product : 6
- Category -> User : 6
- Category -> Event : 4
- User -> ExportJob : 4
- Event -> Category : 4
- Category -> Product : 3
- Event -> ExportJob : 2

## Fusions faites par le script
- CategoryEntity (1 fichiers) fondu dans Event : 5/11 liens
- EventEntity (1 fichiers) fondu dans Event : 7/10 liens
- ExportJobEntity (1 fichiers) fondu dans ExportJob : 2/2 liens
- ProductEntity (1 fichiers) fondu dans Event : 6/11 liens
- SessionEntity (1 fichiers) fondu dans Session : 2/2 liens
- UserEntity (1 fichiers) fondu dans User : 8/21 liens
- PasswordResetTokenEntity (2 fichiers) fondu dans PasswordReset : 2/2 liens
- PasswordReset (21 fichiers) fondu dans User : 14/15 liens
- Session (22 fichiers) fondu dans User : 13/14 liens

## Motifs transversaux (fichiers avec >= 3 occurrences)
- authorization : 35 fichiers (6 à 10+), par groupe {'User': 20, '(tech/non rattaché)': 14, 'ExportJob': 1}
  top : SecurityConfig.java(19), JwtServiceRs256Test.java(16), UserRateLimitingFilterTest.java(12), JwtFilter.java(11), ExportTokenServiceTest.java(10), AuthController.java(10), CallerResolverTest.java(9), ExportTokenService.java(9), CustomUserDetailsService.java(9), JwtFilterTest.java(8), UserRateLimitingFilter.java(8), JwtService.java(8)
- state-machine : 2 fichiers (0 à 10+), par groupe {'ExportJob': 1, '(tech/non rattaché)': 1}
  top : ExportJob.java(8), export.ts(4)
- integrations : 97 fichiers (4 à 10+), par groupe {'User': 35, '(tech/non rattaché)': 20, 'Event': 17, 'ExportJob': 12, 'Product': 7, 'Category': 6}
  top : ExportRenderersTest.java(34), ZipExportRenderer.java(33), TimelineEditHost.forbidden.test.tsx(10), LocalStorageAdapter.java(10), apiClient.ts(9), apiClient.multipart.test.ts(9), LocalStorageAdapterTest.java(9), AuthContext.themeSaveToast.test.tsx(8), E2eTestSupportProfileTest.java(8), MarkdownExportRenderer.java(8), JsonExportRenderer.java(8), CsvExportRenderer.java(8)
- batch : 9 fichiers (0 à 10+), par groupe {'User': 4, 'ExportJob': 3, '(tech/non rattaché)': 2}
  top : PasswordResetTokenPurgeScheduler.java(6), ExportPurgeScheduler.java(5), ForgotPasswordAsyncTest.java(4), PasswordResetTokenPurgeSchedulerIntegrationTest.java(4), ExportPurgeSchedulerIntegrationTest.java(4), SchedulingConfig.java(4), PasswordResetServiceImpl.java(4), AsyncConfig.java(3), AsyncExportRunner.java(3)

## Fichiers techniques sans seed (172)
- par couche : {'frontend/components': 56, 'backend/infrastructure': 34, 'frontend/lib': 22, 'frontend/hooks': 13, 'frontend/services': 12, 'frontend/__tests__': 9, 'frontend/styles': 9, 'frontend-app/(root)': 8, 'frontend/contexts': 3, 'backend/': 2, 'frontend/i18n': 2, 'backend/support': 1, 'frontend/utils': 1}
- les plus importés : inlineErrorHandling.ts[4 groupes], apiClient.ts[3 groupes], EventmanagerApplication.java[0 groupes], ErrorCode.java[0 groupes], BrevoHealthIndicator.java[0 groupes], E2eResetTokenFinder.java[0 groupes], E2eTestSupportSecurityConfig.java[0 groupes], AsyncConfig.java[0 groupes], ClockConfig.java[0 groupes], JpaSharedEntityManagerConfig.java[0 groupes], ProdConfigStartupLogger.java[0 groupes], ProfileSafetyGuard.java[0 groupes], SchedulingConfig.java[0 groupes], RateLimitConfig.java[0 groupes], RateLimitingFilter.java[0 groupes], RsaKeyMaterial.java[0 groupes], EventmanagerApplicationTests.java[0 groupes], LocalStorageAdapterTest.java[0 groupes], AccountDeletionIntegrationTest.java[0 groupes], ExportEndpointsIntegrationTest.java[0 groupes], GlobalExceptionHandlerValidationTest.java[0 groupes], BrevoEmailServiceLocaleTest.java[0 groupes], BrevoHealthIndicatorTest.java[0 groupes], E2eResetTokenEndpointIntegrationTest.java[0 groupes], E2eTestSupportPackageGuardTest.java[0 groupes]

## Fichiers non rattachés (40)
- par couche : {'frontend-app/[locale]': 33, 'backend/db': 5, 'backend/architecture': 1, 'backend/build': 1}
- frontend-app:[locale]/(app)/dashboard/page.tsx (12 ko) tokens=['page'] égalité=None motifs={}
- frontend-app:[locale]/privacy/page.tsx (10 ko) tokens=['page'] égalité=None motifs={}
- frontend-app:[locale]/register/page.tsx (9 ko) tokens=['page'] égalité=None motifs={'integrations': 3}
- backend:src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java (8 ko) tokens=['architecture', 'test'] égalité=None motifs={'integrations': 2}
- frontend-app:[locale]/terms/page.tsx (8 ko) tokens=['page'] égalité=None motifs={}
- backend:src/test/java/com/matimeline/eventmanager/build/BomDriftTest.java (8 ko) tokens=['bom', 'drift', 'test'] égalité=None motifs={'authorization': 1}
- frontend-app:[locale]/reset-password/page.tsx (8 ko) tokens=['page'] égalité=None motifs={'integrations': 3}
- frontend-app:[locale]/login/page.tsx (7 ko) tokens=['page'] égalité=None motifs={'integrations': 3}
- frontend-app:[locale]/forgot-password/page.tsx (6 ko) tokens=['page'] égalité=None motifs={}
- frontend-app:[locale]/(app)/timeline/page.test.tsx (6 ko) tokens=['page'] égalité=None motifs={}
- frontend-app:[locale]/(app)/dashboard/page.test.tsx (5 ko) tokens=['page'] égalité=None motifs={}
- frontend-app:[locale]/layout.tsx (5 ko) tokens=['layout'] égalité=None motifs={'integrations': 1}
- backend:src/main/resources/db/migration/V7__design_v3_schema.sql (5 ko) tokens=['design', 'schema'] égalité=None motifs={'state-machine': 2}
- frontend-app:[locale]/(app)/timeline/page.tsx (5 ko) tokens=['page'] égalité=None motifs={}
- frontend-app:[locale]/register/page.test.tsx (4 ko) tokens=['page'] égalité=None motifs={'integrations': 1}
- frontend-app:[locale]/login/page.test.tsx (4 ko) tokens=['page'] égalité=None motifs={'integrations': 1}
- frontend-app:[locale]/error.test.tsx (4 ko) tokens=['error'] égalité=None motifs={}
- frontend-app:[locale]/reset-password/page.test.tsx (4 ko) tokens=['page'] égalité=None motifs={'integrations': 1}
- frontend-app:[locale]/(app)/dashboard/loading.tsx (4 ko) tokens=['loading'] égalité=None motifs={}
- frontend-app:[locale]/(app)/settings/page.tsx (3 ko) tokens=['page'] égalité=None motifs={}
- frontend-app:[locale]/forgot-password/page.test.tsx (3 ko) tokens=['page'] égalité=None motifs={}
- frontend-app:[locale]/(app)/products/page.tsx (3 ko) tokens=['page'] égalité=None motifs={}
- frontend-app:[locale]/error.tsx (3 ko) tokens=['error'] égalité=None motifs={'integrations': 1}
- frontend-app:[locale]/(app)/settings/loading.tsx (2 ko) tokens=['loading'] égalité=None motifs={}
- frontend-app:[locale]/(app)/products/loading.tsx (2 ko) tokens=['loading'] égalité=None motifs={}
- backend:src/main/resources/db/migration/V1__baseline.sql (2 ko) tokens=['baseline'] égalité=None motifs={}
- frontend-app:[locale]/(app)/dashboard/loading.test.tsx (2 ko) tokens=['loading'] égalité=None motifs={}
- frontend-app:[locale]/(app)/products/[productId]/page.tsx (2 ko) tokens=['page'] égalité=None motifs={}
- frontend-app:[locale]/(app)/timeline/loading.tsx (2 ko) tokens=['loading'] égalité=None motifs={}
- frontend-app:[locale]/(app)/settings/loading.test.tsx (1 ko) tokens=['loading'] égalité=None motifs={}
- backend:src/main/resources/db/migration/V5__fk_indexes.sql (1 ko) tokens=['fk', 'index'] égalité=None motifs={}
- frontend-app:[locale]/(app)/timeline/loading.test.tsx (1 ko) tokens=['loading'] égalité=None motifs={}
- backend:src/main/resources/db/migration/V3__add_audit_columns.sql (1 ko) tokens=['add', 'audit', 'column'] égalité=None motifs={}
- frontend-app:[locale]/(app)/products/[productId]/loading.tsx (1 ko) tokens=['loading'] égalité=None motifs={}
- frontend-app:[locale]/(app)/products/loading.test.tsx (1 ko) tokens=['loading'] égalité=None motifs={}
- frontend-app:[locale]/(app)/layout.tsx (1 ko) tokens=['layout'] égalité=None motifs={}
- frontend-app:[locale]/(app)/products/[productId]/loading.test.tsx (1 ko) tokens=['loading'] égalité=None motifs={}
- frontend-app:[locale]/page.tsx (0 ko) tokens=['page'] égalité=None motifs={}
- backend:src/main/resources/db/migration/V2__unique_constraints.sql (0 ko) tokens=['unique', 'constraint'] égalité=None motifs={}
- frontend-app:[locale]/home/page.tsx (0 ko) tokens=['page'] égalité=None motifs={}

## Foyers transversaux sans seed (0)
- {}
- 
