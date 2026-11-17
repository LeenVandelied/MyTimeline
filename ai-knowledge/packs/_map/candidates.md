# Groupes candidats (passe déterministe)

Projet mytimeline. 688 fichiers (4368 ko), 7 seeds ({'entity': 7}), 1 groupes, 33 techniques, 1 dans un foyer transversal, 266 non rattachés dont 0 à égalité de votes. Arêtes : regex.

Seuils : pack_min_kb=60, min_seed_files=6, merge_ratio=0.6, max_merge_target=40.

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

## UserEntity  (388 fichiers, 2584 ko)
- seeds : CategoryEntity, EventEntity, ExportJobEntity, PasswordResetTokenEntity, ProductEntity, SessionEntity, UserEntity
- entités : CategoryEntity, EventEntity, ExportJobEntity, PasswordResetTokenEntity, ProductEntity, SessionEntity, UserEntity
- couches : {'mytimeline/resources': 160, 'mytimeline/infrastructure': 94, 'mytimeline/domain': 61, 'mytimeline/application': 60, 'mytimeline/db': 11, 'mytimeline/utils': 2}
- controllers : AuthController, CategoryController, E2eResetTokenController, EventController, ExportController, JwksController, ProductController, RecurrencePreviewController, SessionController, UserController
- préfixes de routes serveur : /api, /api/auth, /api/categories, /api/events, /api/export, /api/me, /api/sessions, /api/test-support
- services : AvatarService, BrevoEmailService, CategoryService, CustomUserDetailsService, EmailService, EventService, ExportService, ExportTokenService, JwtService, PasswordResetService, ProductService, RecurrenceExpansionService, SessionService, UserService, authService, categoryService, eventService, exportService, productService, sessionService (+1)
- motifs : {'integrations': 531, 'batch': 55, 'authorization': 204, 'state-machine': 131}
- rattachement : {'name': 347, 'fanin': 18, 'imports': 23}

## Liens entre groupes (arêtes, top 40)

## Fusions faites par le script
- CategoryEntity (1 fichiers) fondu dans UserEntity : 12/12 liens
- EventEntity (1 fichiers) fondu dans UserEntity : 11/11 liens
- ExportJobEntity (1 fichiers) fondu dans UserEntity : 2/2 liens
- ProductEntity (1 fichiers) fondu dans UserEntity : 12/12 liens
- SessionEntity (1 fichiers) fondu dans UserEntity : 2/2 liens
- PasswordResetTokenEntity (2 fichiers) fondu dans UserEntity : 2/2 liens

## Motifs transversaux (fichiers avec >= 3 occurrences)
- authorization : 35 fichiers (7 à 10+), par groupe {'UserEntity': 22, '(tech/non rattaché)': 13}
  top : SecurityConfig.java(19), JwtServiceRs256Test.java(16), UserRateLimitingFilterTest.java(13), JwtFilter.java(11), ExportTokenServiceTest.java(10), UserRateLimitingFilter.java(10), AuthController.java(10), CallerResolverTest.java(9), RateLimitingFilter.java(9), ExportTokenService.java(9), CustomUserDetailsService.java(9), JwtFilterTest.java(8)
- state-machine : 23 fichiers (1 à 10+), par groupe {'UserEntity': 22, '(tech/non rattaché)': 1}
  top : ExportJob.java(13), ExportJobTest.java(6), ExportJobStatus.java(6), ThemePreference.java(6), RecurrenceUnit.java(6), UserDataExportTest.java(5), ThemePreferenceTest.java(5), UserDataExport.java(5), RenderedExport.java(5), ExportFormat.java(5), User.java(5), Session.java(5)
- integrations : 85 fichiers (8 à 10+), par groupe {'UserEntity': 74, '(tech/non rattaché)': 11}
  top : ExportRenderersTest.java(34), ZipExportRenderer.java(33), EventOptimisticLockConflictIntegrationTest.java(24), PasswordResetEmailTemplateTest.java(24), PasswordResetEmailTemplate.java(16), PasswordResetTokenConcurrencyIntegrationTest.java(11), PasswordResetTokenCreateStatisticsIntegrationTest.java(10), BrevoEmailService.java(10), ThemePreferenceIntegrationTest.java(9), AuthControllerLegacyPasswordLoginTest.java(9), E2eTestSupportProfileTest.java(8), SessionRevocationIntegrationTest.java(8)
- batch : 14 fichiers (2 à 10+), par groupe {'UserEntity': 10, '(tech/non rattaché)': 4}
  top : RateLimitTunableCeilingTest.java(10), CorsAllowedOriginsConfigIntegrationTest.java(10), ExportServiceImpl.java(7), E2eTestSupportProfileTest.java(6), PasswordResetTokenPurgeScheduler.java(6), AsyncExportRunner.java(6), ExportPurgeScheduler.java(5), StorageConfigTest.java(4), ForgotPasswordAsyncTest.java(4), PasswordResetTokenPurgeSchedulerIntegrationTest.java(4), ExportPurgeSchedulerIntegrationTest.java(4), SchedulingConfig.java(4)

## Fichiers techniques sans seed (33)
- par couche : {'mytimeline/infrastructure': 30, 'mytimeline/': 2, 'mytimeline/support': 1}
- les plus importés : EventmanagerApplication.java[0 groupes], ErrorCode.java[0 groupes], BrevoHealthIndicator.java[0 groupes], E2eResetTokenFinder.java[0 groupes], E2eTestSupportSecurityConfig.java[0 groupes], AsyncConfig.java[0 groupes], ClockConfig.java[0 groupes], ProdConfigStartupLogger.java[0 groupes], ProfileSafetyGuard.java[0 groupes], SchedulingConfig.java[0 groupes], RateLimitConfig.java[0 groupes], RateLimitingFilter.java[0 groupes], RsaKeyMaterial.java[0 groupes], EventmanagerApplicationTests.java[0 groupes], LocalStorageAdapterTest.java[0 groupes], AccountDeletionIntegrationTest.java[0 groupes], RegisterLoginIntegrationTest.java[0 groupes], BrevoEmailServiceLocaleTest.java[0 groupes], BrevoHealthIndicatorTest.java[0 groupes], E2eTestSupportPackageGuardTest.java[0 groupes], ProdConfigStartupLoggerTest.java[0 groupes], ProfileSafetyGuardTest.java[0 groupes], AuditingAndEqualityTest.java[0 groupes], ClientIpAnonymizerTest.java[0 groupes], CorsAllowedOriginsConfigIntegrationTest.java[0 groupes]

## Fichiers non rattachés (266)
- par couche : {'mytimeline/resources': 259, 'mytimeline/db': 5, 'mytimeline/architecture': 1, 'mytimeline/build': 1}
- mytimeline:frontend/src/__tests__/e2e-rate-limit-budget.test.ts (70 ko) tokens=['e', 'e', 'rate', 'limit', 'budget'] égalité=None motifs={'integrations': 2}
- mytimeline:frontend/src/components/layout/AppShell.test.tsx (35 ko) tokens=['app', 'shell'] égalité=None motifs={}
- mytimeline:frontend/src/styles/__tests__/tsx-focus-utility.test.ts (28 ko) tokens=['tsx', 'focu', 'utility'] égalité=None motifs={}
- mytimeline:frontend/src/styles/__tests__/base-layer.test.ts (26 ko) tokens=['base', 'layer'] égalité=None motifs={}
- mytimeline:frontend/src/components/landing/HeaderSection.tsx (22 ko) tokens=['header', 'section'] égalité=None motifs={}
- mytimeline:frontend/src/components/layout/AppShell.tsx (21 ko) tokens=['app', 'shell'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/zoom.ts (21 ko) tokens=['zoom'] égalité=None motifs={}
- mytimeline:frontend/src/__tests__/e2e-pixel-guards.test.ts (18 ko) tokens=['e', 'e', 'pixel', 'guard'] égalité=None motifs={}
- mytimeline:frontend/src/lib/color.test.ts (18 ko) tokens=['color'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/toaster.tsx (17 ko) tokens=['toaster'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/lib.ts (17 ko) tokens=['lib'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/DensityRibbon.window.test.tsx (17 ko) tokens=['density', 'ribbon', 'window'] égalité=None motifs={}
- mytimeline:frontend/src/styles/__tests__/control-border-tier.test.ts (16 ko) tokens=['control', 'border', 'tier'] égalité=None motifs={}
- mytimeline:frontend/src/services/apiClient.test.ts (16 ko) tokens=['api', 'client'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/DensityRibbon.tsx (16 ko) tokens=['density', 'ribbon'] égalité=None motifs={}
- mytimeline:frontend/src/lib/color.ts (16 ko) tokens=['color'] égalité=None motifs={}
- mytimeline:frontend/src/lib/legal-pages.test.ts (15 ko) tokens=['legal', 'page'] égalité=None motifs={}
- mytimeline:frontend/src/components/shared/DeleteConfirmDialog.test.tsx (15 ko) tokens=['delete', 'confirm', 'dialog'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/zoom.test.ts (15 ko) tokens=['zoom'] égalité=None motifs={}
- mytimeline:frontend/src/components/landing/landing.hover-pairing.test.ts (15 ko) tokens=['landing', 'hover', 'pairing'] égalité=None motifs={}
- mytimeline:frontend/src/lib/canonical-host.ts (14 ko) tokens=['canonical', 'host'] égalité=None motifs={}
- mytimeline:frontend/src/components/__tests__/date-time-semantics.test.tsx (14 ko) tokens=['date', 'time', 'semantic'] égalité=None motifs={}
- mytimeline:frontend/src/lib/canonical-host.test.ts (13 ko) tokens=['canonical', 'host'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/toaster.test.tsx (13 ko) tokens=['toaster'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/palette-color-picker.tsx (13 ko) tokens=['palette', 'color', 'picker'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/dropdown-menu.tsx (13 ko) tokens=['dropdown', 'menu'] égalité=None motifs={}
- mytimeline:frontend/src/components/shared/DeleteConfirmDialog.tsx (13 ko) tokens=['delete', 'confirm', 'dialog'] égalité=None motifs={}
- mytimeline:frontend/app/[locale]/(app)/dashboard/page.tsx (12 ko) tokens=['page'] égalité=None motifs={}
- mytimeline:frontend/src/services/apiClient.ts (12 ko) tokens=['api', 'client'] égalité=None motifs={}
- mytimeline:frontend/src/components/landing/HeaderSection.test.tsx (11 ko) tokens=['header', 'section'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/virtualization.ts (11 ko) tokens=['irtualization'] égalité=None motifs={}
- mytimeline:frontend/src/components/landing/HeroSection.tsx (11 ko) tokens=['hero', 'section'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/dashboard-mobile.test.tsx (10 ko) tokens=['dashboard', 'mobile'] égalité=None motifs={}
- mytimeline:frontend/app/[locale]/privacy/page.tsx (10 ko) tokens=['page'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/section-titles.test.tsx (10 ko) tokens=['section', 'title'] égalité=None motifs={}
- mytimeline:frontend/src/__tests__/i18n-namespaces.test.ts (10 ko) tokens=['i', 'n', 'namespace'] égalité=None motifs={}
- mytimeline:frontend/src/lib/date-iso.local-date.test.tsx (10 ko) tokens=['date', 'iso', 'local', 'date'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/language-selector.tsx (10 ko) tokens=['language', 'selector'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/virtualization.test.ts (10 ko) tokens=['irtualization'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/label-reserve.test.ts (9 ko) tokens=['label', 'reserve'] égalité=None motifs={}
- mytimeline:frontend/app/[locale]/register/page.tsx (9 ko) tokens=['page'] égalité=None motifs={}
- mytimeline:frontend/src/components/settings/AvatarUpload.tsx (9 ko) tokens=['avatar', 'upload'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/section-counts.test.tsx (9 ko) tokens=['section', 'count'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/lane-layout.test.ts (9 ko) tokens=['lane', 'layout'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/lib-a11y.test.ts (9 ko) tokens=['lib', 'a', 'y'] égalité=None motifs={}
- mytimeline:backend/src/test/java/com/matimeline/eventmanager/architecture/ArchitectureTest.java (8 ko) tokens=['architecture', 'test'] égalité=None motifs={'integrations': 2}
- mytimeline:frontend/src/styles/__tests__/i18n-intl-classes.test.ts (8 ko) tokens=['i', 'n', 'intl', 'class'] égalité=None motifs={}
- mytimeline:frontend/src/styles/__tests__/eyebrow-consumers.test.tsx (8 ko) tokens=['eyebrow', 'consumer'] égalité=None motifs={}
- mytimeline:frontend/src/hooks/useMobileKeyboard.test.ts (8 ko) tokens=['use', 'mobile', 'keyboard'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/KpiMarginalia.intl.test.tsx (8 ko) tokens=['kpi', 'marginalia', 'intl'] égalité=None motifs={}
- mytimeline:frontend/src/components/settings/mobile/BottomSheet.tsx (8 ko) tokens=['bottom', 'sheet'] égalité=None motifs={}
- mytimeline:frontend/app/[locale]/terms/page.tsx (8 ko) tokens=['page'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/kpis.test.ts (8 ko) tokens=['kpi'] égalité=None motifs={}
- mytimeline:frontend/src/lib/date-iso.ts (8 ko) tokens=['date', 'iso'] égalité=None motifs={}
- mytimeline:frontend/src/styles/__tests__/storybook-font-shell.test.ts (8 ko) tokens=['storybook', 'font', 'shell'] égalité=None motifs={}
- mytimeline:frontend/app/global-not-found-screen.tsx (8 ko) tokens=['global', 'not', 'found', 'screen'] égalité=None motifs={}
- mytimeline:frontend/app/[locale]/reset-password/page.tsx (8 ko) tokens=['page'] égalité=None motifs={}
- mytimeline:frontend/src/components/landing/LandingMobileMenu.tsx (8 ko) tokens=['landing', 'mobile', 'menu'] égalité=None motifs={}
- mytimeline:frontend/src/components/shared/StateScreen.tsx (7 ko) tokens=['state', 'screen'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/lane-layout.ts (7 ko) tokens=['lane', 'layout'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/select.tsx (7 ko) tokens=['select'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/CompactAgenda.tsx (7 ko) tokens=['compact', 'agenda'] égalité=None motifs={}
- mytimeline:backend/src/test/java/com/matimeline/eventmanager/build/BomDriftTest.java (7 ko) tokens=['bom', 'drift', 'test'] égalité=None motifs={'authorization': 1}
- mytimeline:frontend/src/components/dashboard/WeekAgenda.tsx (7 ko) tokens=['week', 'agenda'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/dashboard-components.test.tsx (7 ko) tokens=['dashboard', 'component'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/palette-color-picker.test.tsx (7 ko) tokens=['palette', 'color', 'picker'] égalité=None motifs={}
- mytimeline:frontend/app/[locale]/login/page.tsx (7 ko) tokens=['page'] égalité=None motifs={}
- mytimeline:frontend/src/components/ui/dialog.tsx (7 ko) tokens=['dialog'] égalité=None motifs={}
- mytimeline:frontend/src/components/dashboard/kpis.ts (7 ko) tokens=['kpi'] égalité=None motifs={}
- mytimeline:frontend/src/components/landing/HeroSection.test.tsx (7 ko) tokens=['hero', 'section'] égalité=None motifs={}
- mytimeline:frontend/src/hooks/useMobileKeyboard.ts (7 ko) tokens=['use', 'mobile', 'keyboard'] égalité=None motifs={}
- mytimeline:frontend/app/global-not-found.test.tsx (7 ko) tokens=['global', 'not', 'found'] égalité=None motifs={}
- mytimeline:frontend/src/services/apiErrorMessages.test.ts (7 ko) tokens=['api', 'error', 'message'] égalité=None motifs={}
- mytimeline:frontend/src/styles/__tests__/landing-palette.test.ts (6 ko) tokens=['landing', 'palette'] égalité=None motifs={}
- mytimeline:frontend/src/components/settings/SecuritySection.tsx (6 ko) tokens=['security', 'section'] égalité=None motifs={}
- mytimeline:frontend/src/components/settings/SettingsShell.tsx (6 ko) tokens=['setting', 'shell'] égalité=None motifs={}
- mytimeline:frontend/app/[locale]/forgot-password/page.tsx (6 ko) tokens=['page'] égalité=None motifs={}
- mytimeline:frontend/src/lib/next-occurrence.test.ts (6 ko) tokens=['next', 'occurrence'] égalité=None motifs={}
- mytimeline:frontend/app/[locale]/(app)/timeline/page.test.tsx (6 ko) tokens=['page'] égalité=None motifs={}
- mytimeline:frontend/src/components/timeline/label-reserve.ts (6 ko) tokens=['label', 'reserve'] égalité=None motifs={}

## Foyers transversaux sans seed (1)
- {'state-machine': 1}
- Role.java
