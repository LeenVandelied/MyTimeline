# Groupes candidats (passe déterministe)

Projet mytimeline. 700 fichiers (4513 ko), 14 seeds ({'entity': 7, 'extra': 7}), 6 groupes, 37 techniques, 0 dans un foyer transversal, 290 non rattachés dont 0 à égalité de votes. Arêtes : regex.

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

## Event  (131 fichiers, 1181 ko)
- seeds : CategoryEntity, Event, EventEntity, ProductEntity
- entités : CategoryEntity, EventEntity, ProductEntity
- couches : {'mytimeline/resources': 82, 'mytimeline/infrastructure': 18, 'mytimeline/domain': 15, 'mytimeline/application': 11, 'mytimeline/db': 3, 'mytimeline/utils': 2}
- controllers : EventController, RecurrencePreviewController
- préfixes de routes serveur : /api/events
- services : EventService, RecurrenceExpansionService, eventService
- motifs : {'state-machine': 3, 'authorization': 2, 'integrations': 75}
- rattachement : {'name': 123, 'fanin': 2, 'imports': 6}

## User  (94 fichiers, 451 ko)
- seeds : PasswordReset, PasswordResetTokenEntity, User, UserEntity
- entités : PasswordResetTokenEntity, UserEntity
- couches : {'mytimeline/infrastructure': 36, 'mytimeline/application': 23, 'mytimeline/domain': 19, 'mytimeline/resources': 12, 'mytimeline/db': 4}
- controllers : AuthController, E2eResetTokenController, UserController
- préfixes de routes serveur : /api/auth, /api/me, /api/test-support
- services : AvatarService, BrevoEmailService, CustomUserDetailsService, EmailService, PasswordResetService, UserService, userService
- motifs : {'integrations': 127, 'authorization': 114, 'batch': 13, 'state-machine': 1}
- rattachement : {'name': 73, 'fanin': 9, 'imports': 12}

## Product  (45 fichiers, 376 ko)
- seeds : Product
- couches : {'mytimeline/resources': 29, 'mytimeline/application': 7, 'mytimeline/infrastructure': 5, 'mytimeline/domain': 4}
- controllers : ProductController
- préfixes de routes serveur : /api
- services : ProductService, productService
- motifs : {'integrations': 25, 'authorization': 2}
- rattachement : {'name': 45}

## ExportJob  (42 fichiers, 170 ko)
- seeds : ExportJob, ExportJobEntity
- entités : ExportJobEntity
- couches : {'mytimeline/infrastructure': 16, 'mytimeline/domain': 10, 'mytimeline/resources': 8, 'mytimeline/application': 6, 'mytimeline/db': 2}
- controllers : ExportController
- préfixes de routes serveur : /api/export
- services : ExportService, ExportTokenService, exportService
- motifs : {'integrations': 153, 'batch': 7, 'state-machine': 21, 'authorization': 22}
- rattachement : {'name': 38, 'fanin': 1, 'imports': 3}

## Category  (31 fichiers, 184 ko)
- seeds : Category
- couches : {'mytimeline/resources': 12, 'mytimeline/domain': 8, 'mytimeline/application': 6, 'mytimeline/infrastructure': 4, 'mytimeline/db': 1}
- controllers : CategoryController
- préfixes de routes serveur : /api/categories
- services : CategoryService, categoryService
- motifs : {'integrations': 20}
- rattachement : {'name': 31}

## Session  (30 fichiers, 145 ko)
- seeds : Session, SessionEntity
- entités : SessionEntity
- couches : {'mytimeline/infrastructure': 12, 'mytimeline/resources': 7, 'mytimeline/application': 6, 'mytimeline/domain': 4, 'mytimeline/db': 1}
- controllers : JwksController, SessionController
- préfixes de routes serveur : /api/sessions
- services : JwtService, SessionService, sessionService
- motifs : {'integrations': 30, 'authorization': 52}
- rattachement : {'name': 30}

## Liens entre groupes (arêtes, top 40)
- Event -> User : 21
- Product -> Event : 20
- Event -> Product : 18
- ExportJob -> User : 15
- Product -> User : 13
- Product -> Category : 11
- User -> Session : 9
- Category -> User : 6
- User -> Category : 5
- User -> Product : 5
- Session -> User : 5
- ExportJob -> Event : 5
- Category -> Event : 4
- User -> Event : 4
- Event -> Category : 4
- Category -> Product : 3
- User -> ExportJob : 2
- Event -> ExportJob : 2
- Event -> Session : 2
- ExportJob -> Category : 1
- ExportJob -> Product : 1

## Fusions faites par le script
- CategoryEntity (1 fichiers) fondu dans Event : 5/12 liens
- EventEntity (1 fichiers) fondu dans Event : 7/11 liens
- ExportJobEntity (1 fichiers) fondu dans ExportJob : 2/2 liens
- ProductEntity (1 fichiers) fondu dans Event : 6/12 liens
- SessionEntity (1 fichiers) fondu dans Session : 2/2 liens
- PasswordResetTokenEntity (2 fichiers) fondu dans PasswordReset : 2/2 liens
- UserEntity (2 fichiers) fondu dans User : 6/20 liens
- PasswordReset (21 fichiers) fondu dans User : 14/15 liens

## Motifs transversaux (fichiers avec >= 3 occurrences)
- authorization : 35 fichiers (6 à 10+), par groupe {'(tech/non rattaché)': 14, 'User': 14, 'Session': 5, 'ExportJob': 2}
  top : SecurityConfig.java(19), JwtServiceRs256Test.java(16), UserRateLimitingFilterTest.java(12), JwtFilter.java(11), ExportTokenServiceTest.java(10), AuthController.java(10), CallerResolverTest.java(9), ExportTokenService.java(9), CustomUserDetailsService.java(9), JwtFilterTest.java(8), UserRateLimitingFilter.java(8), JwtService.java(8)
- state-machine : 2 fichiers (0 à 10+), par groupe {'ExportJob': 2}
  top : ExportJob.java(8), export.ts(4)
- integrations : 84 fichiers (3 à 10+), par groupe {'User': 25, 'ExportJob': 18, 'Event': 15, '(tech/non rattaché)': 11, 'Session': 6, 'Product': 5, 'Category': 4}
  top : ExportRenderersTest.java(34), ZipExportRenderer.java(18), BrevoHealthIndicatorTest.java(11), MarkdownExportRenderer.java(8), JsonExportRenderer.java(8), CsvExportRenderer.java(8), LocalStorageAdapter.java(8), BrevoHealthIndicator.java(7), ExportRendererRegistry.java(7), StorageConfigTest.java(6), UserController.java(6), E2eTestSupportProfileTest.java(5)
- batch : 4 fichiers (0 à 10+), par groupe {'User': 2, '(tech/non rattaché)': 1, 'ExportJob': 1}
  top : ForgotPasswordAsyncTest.java(4), PasswordResetServiceImpl.java(4), AsyncConfig.java(3), AsyncExportRunner.java(3)

## Fichiers techniques sans seed (37)
- par couche : {'mytimeline/infrastructure': 34, 'mytimeline/': 2, 'mytimeline/support': 1}
- les plus importés : ThemePreferenceConverter.java[1 groupes], EventmanagerApplication.java[0 groupes], ErrorCode.java[0 groupes], BrevoHealthIndicator.java[0 groupes], E2eResetTokenFinder.java[0 groupes], E2eTestSupportSecurityConfig.java[0 groupes], AsyncConfig.java[0 groupes], ClockConfig.java[0 groupes], JpaSharedEntityManagerConfig.java[0 groupes], ProdConfigStartupLogger.java[0 groupes], ProfileSafetyGuard.java[0 groupes], SchedulingConfig.java[0 groupes], RateLimitConfig.java[0 groupes], RateLimitingFilter.java[0 groupes], RsaKeyMaterial.java[0 groupes], SecurityConfig.java[0 groupes], EventmanagerApplicationTests.java[0 groupes], LocalStorageAdapterTest.java[0 groupes], AccountDeletionIntegrationTest.java[0 groupes], GlobalExceptionHandlerValidationTest.java[0 groupes], BrevoEmailServiceLocaleTest.java[0 groupes], BrevoHealthIndicatorTest.java[0 groupes], E2eResetTokenEndpointIntegrationTest.java[0 groupes], E2eTestSupportPackageGuardTest.java[0 groupes], ProdConfigStartupLoggerTest.java[0 groupes]

## Fichiers non rattachés (290)
- par couche : {'mytimeline/resources': 280, 'mytimeline/db': 5, 'mytimeline/domain': 2, 'mytimeline/application': 1, 'mytimeline/architecture': 1, 'mytimeline/build': 1}
- mytimeline:frontend/src/__tests__/e2e-rate-limit-budget.test.ts (84 ko) tokens=['e', 'e', 'rate', 'limit', 'budget'] égalité=None motifs={}
- mytimeline:frontend/src/lib/auth-guard-paths.test.ts (39 ko) tokens=['auth', 'guard', 'path'] égalité=None motifs={}
- mytimeline:frontend/src/components/layout/AppShell.test.tsx (35 ko) tokens=['app', 'shell'] égalité=None motifs={}
- mytimeline:frontend/src/styles/__tests__/tsx-focus-utility.test.ts (28 ko) tokens=['tsx', 'focu', 'utility'] égalité=None motifs={}
- mytimeline:frontend/src/styles/__tests__/base-layer.test.ts (26 ko) tokens=['base', 'layer'] égalité=None motifs={}
- mytimeline:frontend/src/components/landing/HeaderSection.tsx (23 ko) tokens=['header', 'section'] égalité=None motifs={}
- mytimeline:frontend/src/components/layout/AppShell.tsx (21 ko) tokens=['app', 'shell'] égalité=None motifs={}
- mytimeline:frontend/src/services/apiClient.test.ts (20 ko) tokens=['api', 'client'] égalité=None motifs={}
- mytimeline:frontend/src/__tests__/e2e-pixel-guards.test.ts (18 ko) tokens=['e', 'e', 'pixel', 'guard'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/toaster.tsx (18 ko) tokens=['toaster'] égalité=None motifs={}
- mytimeline:frontend/src/lib/color.test.ts (18 ko) tokens=['color'] égalité=None motifs={}
- mytimeline:frontend/src/lib/auth-token-verify.test.ts (17 ko) tokens=['auth', 'token', 'verify'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/lib.ts (17 ko) tokens=['lib'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/DensityRibbon.window.test.tsx (17 ko) tokens=['density', 'ribbon', 'window'] égalité=None motifs={}
- mytimeline:frontend/src/styles/__tests__/control-border-tier.test.ts (16 ko) tokens=['control', 'border', 'tier'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/DensityRibbon.tsx (16 ko) tokens=['density', 'ribbon'] égalité=None motifs={}
- mytimeline:frontend/src/lib/color.ts (16 ko) tokens=['color'] égalité=None motifs={}
- mytimeline:frontend/src/lib/legal-pages.test.ts (15 ko) tokens=['legal', 'page'] égalité=None motifs={}
- mytimeline:frontend/src/components/shared/DeleteConfirmDialog.test.tsx (15 ko) tokens=['delete', 'confirm', 'dialog'] égalité=None motifs={}
- mytimeline:frontend/src/components/landing/landing.hover-pairing.test.ts (15 ko) tokens=['landing', 'hover', 'pairing'] égalité=None motifs={}
- mytimeline:frontend/src/lib/canonical-host.ts (14 ko) tokens=['canonical', 'host'] égalité=None motifs={}
- mytimeline:frontend/src/components/__tests__/date-time-semantics.test.tsx (14 ko) tokens=['date', 'time', 'semantic'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/label-reserve.test.ts (14 ko) tokens=['label', 'reserve'] égalité=None motifs={}
- mytimeline:frontend/src/lib/canonical-host.test.ts (13 ko) tokens=['canonical', 'host'] égalité=None motifs={}
- mytimeline:frontend/src/components/shared/DeleteConfirmDialog.tsx (13 ko) tokens=['delete', 'confirm', 'dialog'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/toaster.test.tsx (13 ko) tokens=['toaster'] égalité=None motifs={}
- mytimeline:frontend/src/services/apiClient.ts (13 ko) tokens=['api', 'client'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/palette-color-picker.tsx (13 ko) tokens=['palette', 'color', 'picker'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/dropdown-menu.tsx (13 ko) tokens=['dropdown', 'menu'] égalité=None motifs={}
- mytimeline:frontend/app/[locale]/(app)/dashboard/page.tsx (12 ko) tokens=['page'] égalité=None motifs={}
- mytimeline:frontend/src/contexts/AuthContext.theme.test.tsx (12 ko) tokens=['auth', 'context', 'theme'] égalité=None motifs={}
- mytimeline:frontend/src/contexts/AuthContext.tsx (12 ko) tokens=['auth', 'context'] égalité=None motifs={}
- mytimeline:frontend/src/components/shared/ConflictDialog.tsx (11 ko) tokens=['conflict', 'dialog'] égalité=None motifs={}
- mytimeline:frontend/src/components/landing/HeaderSection.test.tsx (11 ko) tokens=['header', 'section'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/virtualization.ts (11 ko) tokens=['irtualization'] égalité=None motifs={}
- mytimeline:frontend/src/components/landing/HeroSection.tsx (11 ko) tokens=['hero', 'section'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/dashboard-mobile.test.tsx (10 ko) tokens=['dashboard', 'mobile'] égalité=None motifs={}
- mytimeline:frontend/app/[locale]/privacy/page.tsx (10 ko) tokens=['page'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/section-titles.test.tsx (10 ko) tokens=['section', 'title'] égalité=None motifs={}
- mytimeline:frontend/src/__tests__/i18n-namespaces.test.ts (10 ko) tokens=['i', 'n', 'namespace'] égalité=None motifs={}
- mytimeline:frontend/src/lib/date-iso.local-date.test.tsx (10 ko) tokens=['date', 'iso', 'local', 'date'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/language-selector.tsx (10 ko) tokens=['language', 'selector'] égalité=None motifs={}
- mytimeline:frontend/src/lib/auth-token-verify.ts (10 ko) tokens=['auth', 'token', 'verify'] égalité=None motifs={}
- mytimeline:frontend/src/components/shared/DeleteConfirmDialog.forbidden.test.tsx (10 ko) tokens=['delete', 'confirm', 'dialog', 'forbidden'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/theme-toggle.tsx (10 ko) tokens=['theme', 'toggle'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/virtualization.test.ts (10 ko) tokens=['irtualization'] égalité=None motifs={}
- mytimeline:frontend/src/components/shared/ConflictDialog.test.tsx (9 ko) tokens=['conflict', 'dialog'] égalité=None motifs={}
- mytimeline:frontend/app/[locale]/register/page.tsx (9 ko) tokens=['page'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/section-counts.test.tsx (9 ko) tokens=['section', 'count'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/lib-a11y.test.ts (9 ko) tokens=['lib', 'a', 'y'] égalité=None motifs={}
- mytimeline:backend/src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java (8 ko) tokens=['architecture', 'test'] égalité=None motifs={}
- mytimeline:frontend/src/styles/__tests__/i18n-intl-classes.test.ts (8 ko) tokens=['i', 'n', 'intl', 'class'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/label-reserve.ts (8 ko) tokens=['label', 'reserve'] égalité=None motifs={}
- mytimeline:frontend/src/components/settings/mobile/BottomSheet.tsx (8 ko) tokens=['bottom', 'sheet'] égalité=None motifs={}
- mytimeline:frontend/src/styles/__tests__/eyebrow-consumers.test.tsx (8 ko) tokens=['eyebrow', 'consumer'] égalité=None motifs={}
- mytimeline:frontend/src/hooks/useMobileKeyboard.test.ts (8 ko) tokens=['use', 'mobile', 'keyboard'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/KpiMarginalia.intl.test.tsx (8 ko) tokens=['kpi', 'marginalia', 'intl'] égalité=None motifs={}
- mytimeline:frontend/src/lib/schemas/auth.ts (8 ko) tokens=['auth'] égalité=None motifs={}
- mytimeline:frontend/app/[locale]/terms/page.tsx (8 ko) tokens=['page'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/kpis.test.ts (8 ko) tokens=['kpi'] égalité=None motifs={}
- mytimeline:frontend/src/lib/date-iso.ts (8 ko) tokens=['date', 'iso'] égalité=None motifs={}
- mytimeline:backend/src/test/java/com/matimeline/eventmanager/build/BomDriftTest.java (8 ko) tokens=['bom', 'drift', 'test'] égalité=None motifs={'authorization': 1}
- mytimeline:frontend/app/global-not-found-screen.tsx (8 ko) tokens=['global', 'not', 'found', 'screen'] égalité=None motifs={}
- mytimeline:frontend/src/styles/__tests__/storybook-font-shell.test.ts (8 ko) tokens=['storybook', 'font', 'shell'] égalité=None motifs={}
- mytimeline:frontend/src/hooks/useThemeChoice.test.tsx (8 ko) tokens=['use', 'theme', 'choice'] égalité=None motifs={}
- mytimeline:frontend/app/[locale]/reset-password/page.tsx (8 ko) tokens=['page'] égalité=None motifs={}
- mytimeline:frontend/src/components/landing/LandingMobileMenu.tsx (8 ko) tokens=['landing', 'mobile', 'menu'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/dialog.tsx (7 ko) tokens=['dialog'] égalité=None motifs={}
- mytimeline:frontend/src/lib/auth-guard-paths.ts (7 ko) tokens=['auth', 'guard', 'path'] égalité=None motifs={}
- mytimeline:frontend/src/components/shared/StateScreen.tsx (7 ko) tokens=['state', 'screen'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/select.tsx (7 ko) tokens=['select'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/CompactAgenda.tsx (7 ko) tokens=['compact', 'agenda'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/theme-toggle.test.tsx (7 ko) tokens=['theme', 'toggle'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/WeekAgenda.tsx (7 ko) tokens=['week', 'agenda'] égalité=None motifs={}
- mytimeline:frontend/src/hooks/useMobileKeyboard.ts (7 ko) tokens=['use', 'mobile', 'keyboard'] égalité=None motifs={}
- mytimeline:frontend/app/global-not-found.test.tsx (7 ko) tokens=['global', 'not', 'found'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/dashboard-components.test.tsx (7 ko) tokens=['dashboard', 'component'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/palette-color-picker.test.tsx (7 ko) tokens=['palette', 'color', 'picker'] égalité=None motifs={}
- mytimeline:frontend/app/[locale]/login/page.tsx (7 ko) tokens=['page'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/kpis.ts (7 ko) tokens=['kpi'] égalité=None motifs={}

## Foyers transversaux sans seed (0)
- {}
- 
