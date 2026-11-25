# Groupes candidats (passe déterministe)

Projet mytimeline. 700 fichiers (4513 ko), 7 seeds ({'entity': 7}), 4 groupes, 423 techniques, 0 dans un foyer transversal, 40 non rattachés dont 0 à égalité de votes. Arêtes : regex.

Seuils : pack_min_kb=15, min_seed_files=6, merge_ratio=0.9, max_merge_target=40, hub_share=0.5.

Règles par défaut :
- R1 : Un satellite suit le pivot dont il porte le nom (`LoanItem` → Loan) ; un seed de dossier front dont les radicaux sont un préfixe strict de ceux d'une entité suit cette entité (`card` → MemberCard ; pas `admin` → DemandAdmin), avant toute règle d'imports (high)
- R2 : Sauf si ses imports vers un autre pivot sont au moins le double de ceux vers le pivot du nom : il suit les imports (medium)
- R3 : Un controller, un service, un DTO ou un dossier d'écran sans entité suit le pack de l'entité ou du service qu'il importe le plus ; sur moins de 5 imports ou un écart de 1, la confiance tombe à `low` (medium ou low)
- R4 : À égalité de votes, le pack le plus gros en octets, et l'hypothèse est marquée `low` (low)
- R5 : Un transversal proposé par l'agent sans motif mesuré n'est pas créé : hypothèse `deferred`, réexaminée quand l'extraction aura compté ses fichiers (—)
- R6 : Un groupe de référentiel (pas de motif état, controller en lecture publique, moins de `pack_min_kb`) rejoint le pack `referentiels` ; s'il n'y en a pas, il en crée un (medium)
- R7 : Un pack `domain` sous `pack_min_kb` est fondu dans le pack avec lequel il a le plus de liens ; la décision est une hypothèse (medium)
- R8 : Un pack `domain` géant est découpé par `split-r8.py` si une partition de ses seeds satisfait pureté (60 %) et cohésion (80 %), sinon il reste entier et l'hypothèse est `undecidable`. Géant : au-dessus de 5 × la médiane des packs `domain`, ou au moins `giant_share` (40 %) des octets de l'inventaire avec au moins `giant_min_seeds` (4) seeds. Le second critère vaut aussi quand il n'y a qu'un pack `domain`, où la médiane est le pack lui-même (medium ou —)
- R9 : Un test sans seed suit la classe de production qu'il importe le plus ; sinon R4 (medium)
- R10 : Un fichier technique est possédé par le pack `technical` de sa couche ; un transversal peut le revendiquer par `path_rules`, ce qui donne un recouvrement, pas un transfert. Quand plusieurs `path_rules` de packs techniques le matchent, la plus longue l'emporte. Un pack déclaré par `map.tech_packs` (`origin: "map.tech_packs"`) ne possède que ce que ses `path_rules` matchent : il n'est jamais le repli de R10 pour un fichier technique qu'aucune règle ne matche (high)
- R11 : Une entité hub (importée par au moins `hub_share`, 50 %, des autres seeds d'entité, sur au moins 3 autres) est une préoccupation de propriété ou de multi-tenant, pas un pivot : ses arêtes ne votent pas la fusion, aucun groupe n'y est fondu et elle n'est fondue dans aucun groupe. Au vote d'étiquetage, un vote pour elle ne compte que si aucun autre seed n'a de vote. Le graphe compte les imports entre entités et, dans un même paquet (sans `import`), le nom d'une entité cité dans le code d'une autre. Une hypothèse par hub, décidée sur le pack qui porte son seed (high)
- R12 : Un fichier de couche `db` (migration, changelog) que matche une `path_rule` d'un pack `technical` est possédé par ce pack (la plus longue règle l'emporte), même quand son nom le rattache à un seed (`V16__user_theme_preference.sql` reste dans `migrations`, pas dans `user`). Le lien au domaine reste lisible par le nom, et le chargeur charge les deux (§5) (high)
- R13 : Un fichier d'un dossier de `tech_folders` n'est rattaché à aucun seed, ni par son nom ni par le vote de ses imports : il est technique, puis R10 (high)

## Event  (127 fichiers, 540 ko)
- seeds : Event, ExportJob, PasswordResetToken, Session
- entités : EventEntity, ExportJobEntity, PasswordResetTokenEntity, SessionEntity
- couches : {'backend/infrastructure': 49, 'backend/domain': 38, 'backend/application': 28, 'backend/db': 8, 'frontend/services/services': 2, 'backend/utils': 2}
- controllers : EventController, ExportController, JwksController, RecurrencePreviewController, SessionController
- préfixes de routes serveur : /api/events, /api/export, /api/sessions
- dossiers front : services
- services : AvatarService, EventService, ExportService, ExportTokenService, JwtService, RecurrenceExpansionService, SessionService
- motifs : {'state-machine': 20, 'authorization': 76, 'integrations': 249, 'batch': 23}
- rattachement : {'name': 78, 'fanin': 17, 'imports': 32}

## User  (71 fichiers, 360 ko)
- seeds : User
- entités : UserEntity
- couches : {'backend/infrastructure': 32, 'backend/application': 19, 'backend/domain': 12, 'frontend/services/services': 4, 'backend/db': 2, 'frontend/i18n/i18n': 2}
- controllers : AuthController, E2eResetTokenController, UserController
- préfixes de routes serveur : /api/auth, /api/me, /api/test-support
- URL front : api/export, api/me, api/me/avatar, api/me/export, export, me, me/avatar, me/export
- dossiers front : i18n, services
- services : BrevoEmailService, CustomUserDetailsService, EmailService, PasswordResetService, UserService
- motifs : {'authorization': 112, 'batch': 10, 'state-machine': 2, 'integrations': 109}
- rattachement : {'name': 62, 'fanin': 4, 'imports': 5}

## Category  (21 fichiers, 97 ko)
- seeds : Category
- entités : CategoryEntity
- couches : {'backend/domain': 8, 'backend/application': 6, 'backend/infrastructure': 5, 'backend/db': 1, 'frontend/services/services': 1}
- controllers : CategoryController
- préfixes de routes serveur : /api/categories
- dossiers front : services
- services : CategoryService
- motifs : {'integrations': 24}
- rattachement : {'name': 21}

## Product  (18 fichiers, 129 ko)
- seeds : Product
- entités : ProductEntity
- couches : {'backend/application': 7, 'backend/infrastructure': 6, 'backend/domain': 4, 'frontend/services/services': 1}
- controllers : ProductController
- préfixes de routes serveur : /api
- dossiers front : services
- services : ProductService
- motifs : {'integrations': 29, 'authorization': 2}
- rattachement : {'name': 18}

## Liens entre groupes (arêtes, top 40)
- Event -> User : 41
- User -> Event : 34
- Event -> Product : 25
- Product -> Event : 15
- Product -> Category : 14
- Product -> User : 11
- Event -> Category : 9
- User -> Category : 5
- User -> Product : 5
- Category -> Product : 4
- Category -> User : 4
- Category -> Event : 2

## Fusions faites par le script
- PasswordResetToken (14 fichiers) fondu dans Event : 1/1 liens
- Session (24 fichiers) fondu dans Event : 4/4 liens
- ExportJob (37 fichiers) fondu dans Event : 5/5 liens

## Entités hub
- User (UserEntity) : importée par 3/6 seeds d'entité (Category, Product, Session), traitée comme propriété / multi-tenant : ses arêtes ne votent pas la fusion

## Alias refusés
- aucun

## Motifs transversaux (fichiers avec >= 3 occurrences)
- authorization : 35 fichiers (6 à 10+), par groupe {'(tech/non rattaché)': 14, 'User': 14, 'Event': 7}
  top : SecurityConfig.java(19), JwtServiceRs256Test.java(16), UserRateLimitingFilterTest.java(12), JwtFilter.java(11), ExportTokenServiceTest.java(10), AuthController.java(10), CallerResolverTest.java(9), ExportTokenService.java(9), CustomUserDetailsService.java(9), JwtFilterTest.java(8), UserRateLimitingFilter.java(8), JwtService.java(8)
- state-machine : 2 fichiers (0 à 10+), par groupe {'Event': 1, '(tech/non rattaché)': 1}
  top : ExportJob.java(8), export.ts(4)
- integrations : 97 fichiers (4 à 10+), par groupe {'Event': 39, '(tech/non rattaché)': 26, 'User': 21, 'Product': 6, 'Category': 5}
  top : ExportRenderersTest.java(34), ZipExportRenderer.java(33), TimelineEditHost.forbidden.test.tsx(10), LocalStorageAdapter.java(10), apiClient.ts(9), apiClient.multipart.test.ts(9), LocalStorageAdapterTest.java(9), AuthContext.themeSaveToast.test.tsx(8), E2eTestSupportProfileTest.java(8), MarkdownExportRenderer.java(8), JsonExportRenderer.java(8), CsvExportRenderer.java(8)
- batch : 9 fichiers (0 à 10+), par groupe {'Event': 5, 'User': 2, '(tech/non rattaché)': 2}
  top : PasswordResetTokenPurgeScheduler.java(6), ExportPurgeScheduler.java(5), ForgotPasswordAsyncTest.java(4), PasswordResetTokenPurgeSchedulerIntegrationTest.java(4), ExportPurgeSchedulerIntegrationTest.java(4), SchedulingConfig.java(4), PasswordResetServiceImpl.java(4), AsyncConfig.java(3), AsyncExportRunner.java(3)

## Fichiers techniques sans seed (423)
- par couche : {'frontend/components/components': 253, 'frontend/hooks/hooks': 44, 'frontend/lib/lib': 35, 'backend/infrastructure': 33, 'frontend/services/services': 12, 'frontend/__tests__/__tests__': 9, 'frontend/styles/styles': 9, 'frontend/types/types': 9, 'frontend-app/(root)': 8, 'frontend/contexts/contexts': 7, 'backend/(root)': 2, 'backend/support': 1, 'frontend/utils/utils': 1}
- les plus importés : safe-error.ts[4 groupes], apiClient.ts[4 groupes], inlineErrorHandling.ts[4 groupes], settings.ts[2 groupes], auth.ts[1 groupes], category.ts[1 groupes], event.ts[1 groupes], product.ts[1 groupes], user.ts[1 groupes], EventmanagerApplication.java[0 groupes], ErrorCode.java[0 groupes], BrevoHealthIndicator.java[0 groupes], E2eResetTokenFinder.java[0 groupes], E2eTestSupportSecurityConfig.java[0 groupes], AsyncConfig.java[0 groupes], ClockConfig.java[0 groupes], JpaSharedEntityManagerConfig.java[0 groupes], ProdConfigStartupLogger.java[0 groupes], ProfileSafetyGuard.java[0 groupes], SchedulingConfig.java[0 groupes], RateLimitConfig.java[0 groupes], RateLimitingFilter.java[0 groupes], RsaKeyMaterial.java[0 groupes], EventmanagerApplicationTests.java[0 groupes], LocalStorageAdapterTest.java[0 groupes]

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
