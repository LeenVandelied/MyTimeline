# Annexe : user (partie 1/2)

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 52 | convention 18, business_rule 10, endpoint 7 |
| `frontend:lib/auth-guard-paths.test.ts` | 37 | test_case 26, business_rule 6, config 3 |
| `frontend:lib/auth-token-verify.test.ts` | 35 | test_case 27, convention 6, other 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 33 | test_case 25, business_rule 4, suspicious 2 |
| `frontend:lib/auth-jwks.ts` | 31 | business_rule 11, convention 10, config 5 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java` | 30 | endpoint 9, other 6, business_rule 5 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java` | 29 | test_case 16, validation 12, role_check 1 |
| `frontend:contexts/AuthContext.tsx` | 29 | business_rule 9, convention 8, other 7 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 24 | convention 8, suspicious 4, business_rule 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java` | 24 | test_case 13, business_rule 4, convention 4 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java` | 21 | business_rule 4, other 4, test_case 4 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java` | 21 | test_case 6, endpoint 4, other 3 |
| `frontend:lib/auth-token-verify.ts` | 21 | business_rule 10, other 6, config 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java` | 20 | business_rule 5, service_method 4, convention 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 20 | config 7, convention 6, role_check 4 |
| `frontend:components/settings/ExportDataFlow.tsx` | 19 | ui_screen 7, other 6, business_rule 3 |
| `frontend:lib/schemas/auth.ts` | 19 | validation 9, business_rule 4, convention 3 |
| `frontend:components/settings/AvatarUpload.tsx` | 18 | other 5, business_rule 4, service_method 3 |
| `frontend:components/ui/theme-toggle.tsx` | 18 | convention 10, other 4, business_rule 3 |
| `frontend:contexts/AuthContext.theme.test.tsx` | 18 | test_case 8, business_rule 6, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java` | 17 | service_method 6, business_rule 3, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java` | 17 | other 6, service_method 4, persistence_query 3 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java` | 17 | test_case 5, validation 5, business_rule 4 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java` | 17 | test_case 9, convention 4, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java` | 16 | business_rule 5, other 4, config 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 16 | business_rule 7, config 3, other 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java` | 16 | test_case 10, config 2, business_rule 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java` | 16 | test_case 7, other 3, config 2 |
| `frontend:components/settings/PasswordStrength.test.tsx` | 16 | test_case 13, other 2, config 1 |
| `frontend:contexts/AuthContext.themeSaveToast.test.tsx` | 15 | test_case 11, other 2, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java` | 14 | service_method 5, validation 4, other 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java` | 14 | other 5, test_case 5, business_rule 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java` | 14 | test_case 12, business_rule 2 |
| `frontend:lib/auth-jwks.test.ts` | 14 | test_case 14 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java` | 13 | business_rule 4, convention 4, batch_job 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RegisterLoginIntegrationTest.java` | 13 | other 4, endpoint 3, test_case 3 |
| `frontend:components/settings/mobile/BottomSheet.tsx` | 13 | business_rule 4, convention 2, suspicious 2 |
| `frontend:hooks/useThemeChoice.test.tsx` | 13 | test_case 11, other 1, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/AvatarServiceImplTest.java` | 12 | test_case 6, validation 3, business_rule 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/PasswordResetEndpointsIntegrationTest.java` | 12 | test_case 5, endpoint 2, validation 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/UserRoleConstraintIntegrationTest.java` | 12 | test_case 7, convention 3, persistence_query 1 |
| `frontend:components/settings/ProfileSection.tsx` | 12 | other 4, external_call 3, suspicious 2 |
| `frontend:components/ui/theme-toggle.test.tsx` | 12 | test_case 10, other 2 |
| `frontend:hooks/useThemeChoice.ts` | 12 | convention 4, business_rule 2, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/PasswordResetTokenEntity.java` | 11 | entity 7, convention 3, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java` | 11 | entity 8, other 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java` | 11 | convention 8, business_rule 1, role_check 1 |
| `frontend:components/settings/DeleteAccountSteps.tsx` | 11 | other 4, state_transition 2, ui_screen 2 |
| `frontend:components/settings/SecuritySection.tsx` | 11 | other 5, external_call 3, business_rule 1 |
| `frontend:components/settings/SettingsShell.test.tsx` | 11 | test_case 10, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java` | 10 | endpoint 5, other 4, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java` | 10 | other 5, business_rule 4, service_method 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java` | 10 | other 4, business_rule 2, endpoint 2 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/UserServiceImplTest.java` | 10 | test_case 6, business_rule 3, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/application/validation/PasswordPolicyTest.java` | 10 | test_case 9, business_rule 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportProfileTest.java` | 10 | other 5, test_case 4, business_rule 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/CallerResolverTest.java` | 10 | test_case 7, other 3 |
| `frontend:components/ui/theme-toggle.i18n.test.ts` | 10 | test_case 8, other 1, suspicious 1 |
| `frontend:lib/auth-guard-paths.ts` | 10 | config 3, business_rule 2, suspicious 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java` | 9 | other 5, service_method 2, persistence_query 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java` | 9 | other 4, convention 2, test_case 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenConcurrencyIntegrationTest.java` | 9 | test_case 6, other 2, convention 1 |
| `frontend:components/pages/HomePage.accent-roles.test.tsx` | 9 | business_rule 4, test_case 3, other 1 |
| `frontend:components/pages/HomePage.test.tsx` | 9 | test_case 8, convention 1 |
| `frontend:components/settings/PasswordStrength.tsx` | 9 | business_rule 4, other 2, convention 1 |
| `frontend:components/settings/PreferencesSection.tsx` | 9 | other 4, i18n_key 2, store_action 2 |
| `frontend:components/settings/useDeleteAccountFlow.ts` | 9 | state_transition 3, service_method 2, business_rule 1 |
| `frontend:contexts/AuthContext.test.tsx` | 9 | test_case 8, entity 1 |
| `frontend:services/userService.ts` | 9 | service_method 6, convention 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java` | 8 | business_rule 2, convention 2, batch_job 1 |
| `backend:src/main/resources/db/migration/V16__user_theme_preference.sql` | 8 | convention 3, db_change 2, business_rule 1 |
| `backend:src/test/java/com/matimeline/eventmanager/domain/models/export/UserDataExportTest.java` | 8 | test_case 6, business_rule 1, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerErrorContractTest.java` | 8 | test_case 5, business_rule 1, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java` | 8 | test_case 4, convention 2, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenCreateStatisticsIntegrationTest.java` | 8 | test_case 4, convention 2, other 2 |
| `frontend:components/pages/HomePage.tsx` | 8 | other 4, business_rule 1, convention 1 |
| `frontend:components/settings/AccountSection.test.tsx` | 8 | test_case 5, business_rule 1, convention 1 |
| `frontend:components/settings/AccountSection.tsx` | 8 | config 2, state_transition 2, convention 1 |
| `frontend:components/settings/ProfileSection.test.tsx` | 8 | test_case 7, other 1 |
| `frontend:components/settings/mobile/BottomSheet.test.tsx` | 8 | test_case 8 |
| `frontend:lib/schemas/settings.ts` | 8 | validation 5, convention 2, business_rule 1 |
| `frontend:services/authService.ts` | 8 | convention 4, service_method 2, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/UserResponse.java` | 7 | other 3, business_rule 2, convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/UserDataExport.java` | 7 | other 4, business_rule 2, entity 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java` | 7 | convention 3, other 2, persistence_query 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/converters/ThemePreferenceConverter.java` | 7 | other 4, business_rule 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java` | 7 | business_rule 4, other 2, service_method 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplateTest.java` | 7 | business_rule 3, test_case 3, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/AuthErrorContractIntegrationTest.java` | 7 | test_case 3, other 2, convention 1 |
| `frontend:components/settings/ExportDataFlow.test.tsx` | 7 | test_case 7 |
| `frontend:components/settings/SettingsShell.tsx` | 7 | ui_screen 5, convention 1, other 1 |
| `frontend:lib/schemas/password-policy.test.ts` | 7 | test_case 6, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/UserDataExportAssembler.java` | 6 | business_rule 2, other 1, persistence_query 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/validation/StrongPasswordValidator.java` | 6 | business_rule 2, config 2, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/User.java` | 6 | convention 3, entity 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/UserService.java` | 6 | service_method 5, convention 1 |
| `frontend:components/settings/mobile/MobileSettings.tsx` | 6 | state_transition 2, ui_screen 2, i18n_key 1 |
| `frontend:hooks/useSettings.ts` | 6 | service_method 3, suspicious 2, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ForgotPasswordRequest.java` | 5 | business_rule 2, endpoint 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ResetPasswordRequest.java` | 5 | business_rule 1, convention 1, endpoint 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/validation/StrongPassword.java` | 5 | convention 3, entity 1, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/UserRepository.java` | 5 | persistence_query 4, convention 1 |
| `backend:src/main/resources/db/migration/V6__create_password_reset_tokens.sql` | 5 | db_change 4, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/domain/models/ThemePreferenceTest.java` | 5 | test_case 3, business_rule 1, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerDevProfileCookieTest.java` | 5 | config 2, test_case 2, convention 1 |
| `frontend:components/settings/ExportDataFlow.intl.test.tsx` | 5 | test_case 4, config 1 |
| `frontend:components/settings/SecuritySection.test.tsx` | 5 | test_case 4, other 1 |
| `frontend:components/theme-provider.tsx` | 5 | config 2, convention 2, other 1 |
| `frontend:services/authService.test.ts` | 5 | test_case 4, convention 1 |
| `frontend:types/auth.ts` | 5 | convention 2, suspicious 2, entity 1 |
| `frontend:types/settings.ts` | 5 | convention 3, entity 1, other 1 |
| `frontend:types/user.test.ts` | 5 | test_case 5 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/DeleteAccountRequest.java` | 4 | business_rule 1, convention 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/RegisterRequest.java` | 4 | validation 4 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/UserUpdateRequest.java` | 4 | convention 1, endpoint 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/PasswordResetTokenMapper.java` | 4 | convention 2, service_method 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java` | 4 | business_rule 2, entity 1, state_transition 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java` | 4 | convention 2, other 1, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/PasswordResetTokenRepository.java` | 4 | persistence_query 4 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/AvatarService.java` | 4 | service_method 3, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/PasswordResetService.java` | 4 | service_method 2, business_rule 1, suspicious 1 |
| `backend:src/main/resources/db/migration/V12__users_role_not_null_check.sql` | 4 | db_change 2, convention 1, other 1 |
| `backend:src/main/resources/db/migration/V15__password_reset_tokens_version.sql` | 4 | convention 2, business_rule 1, db_change 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerValidationTest.java` | 4 | validation 3, test_case 1 |
| `frontend:components/settings/mobile/MobileSettings.test.tsx` | 4 | test_case 3, ui_screen 1 |
| `frontend:components/settings/mobile/SettingsIndex.test.tsx` | 4 | test_case 2, convention 1, suspicious 1 |
| `frontend:components/settings/mobile/SettingsIndex.tsx` | 4 | ui_screen 2, convention 1, i18n_key 1 |
| `frontend:services/userService.test.ts` | 4 | test_case 4 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/AuthRequest.java` | 3 | validation 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ChangePasswordRequest.java` | 3 | business_rule 1, other 1, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/UserMapper.java` | 3 | convention 2, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/EmailService.java` | 3 | business_rule 1, external_call 1, service_method 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetails.java` | 3 | convention 2, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java` | 3 | convention 2, validation 1 |
| `frontend:hooks/useCurrentUser.test.tsx` | 3 | test_case 2, other 1 |
| `frontend:hooks/useCurrentUser.ts` | 3 | convention 2, other 1 |
| `frontend:types/user.ts` | 3 | convention 1, entity 1, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/AuthResponse.java` | 2 | convention 1, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/JwkResponse.java` | 2 | other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/JwksResponse.java` | 2 | convention 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/UpdatePreferencesRequest.java` | 2 | endpoint 1, validation 1 |
| `frontend:components/settings/mobile/chapters.ts` | 2 | config 2 |
| `frontend:hooks/useAuthGuard.ts` | 2 | business_rule 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/AccountDeletionMismatchException.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/AvatarNotFoundException.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/InvalidAvatarException.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/InvalidCredentialsException.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/InvalidPasswordResetTokenException.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/SamePasswordException.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/UserNotFoundException.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/AvatarContent.java` | 1 | entity 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Role.java` | 1 | entity 1 |
| `frontend:components/settings/touchTarget.ts` | 1 | convention 1 |
| `frontend:hooks/useAuth.ts` | 1 | convention 1 |

## Structure (suite) {#t-structure_overflow}

| Pointeur | Symbole | Énoncé | Fait |
|---|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:71-72` | E2eResetTokenController.latestUsableResetToken | Expose GET /api/test-support/password-reset-token avec le paramètre email, et renvoie un E2eResetTokenResponse. | [#8fb84ca2abcae011-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:87` | E2eResetTokenController.E2eResetTokenResponse | Le DTO de réponse ne contient que le champ token de type String. | [#e88fbcf7464a8f03-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RegisterLoginIntegrationTest.java:87-91` | RegisterLoginIntegrationTest.register_thenLogin_persistsUser_andIssuesJwtCookie | Le test appelle POST /api/auth/register et attend un statut 201 Created. | [#8b2c81c4b1747373-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RegisterLoginIntegrationTest.java:98-103` | RegisterLoginIntegrationTest.register_thenLogin_persistsUser_andIssuesJwtCookie | Le test appelle POST /api/auth/login et attend un statut 200 avec un cookie nommé jwt dans la réponse. | [#8b2c81c4b1747373-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RegisterLoginIntegrationTest.java:139-143` | RegisterLoginIntegrationTest.changePassword_updatesPersistedHash_soReloginUsesNewPassword | Le test appelle POST /api/me/change-password avec le cookie jwt et un corps oldPassword et newPassword, et attend un statut 204 No Content. | [#0ea7f9c25b3e9a7e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:37` | JwksController | JwksController est un contrôleur REST public, sans état ni accès base, dont la réponse dépend uniquement du matériel de clé chargé au boot. | [#485037e720a48a44-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:40` | JwksController.JWKS_PATH | Le chemin JWKS est une constante publique /.well-known/jwks.json, hors du préfixe /api. | [#integrations/60ed473e168edd05-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:61-66` | JwksController.jwks | jwks renvoie le JWK Set de jwtService.getPublicJwks avec Cache-Control public et max-age de 300 secondes. | [#integrations/321539050fd09532-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:61-66` | JwksController.jwks | GET /.well-known/jwks.json renvoie en JSON le JwksResponse fourni par jwtService.getPublicJwks. | [#2a7035d417ef3594-1] |
| `frontend:components/settings/mobile/BottomSheet.tsx:187` | BottomSheet.closeButton | Le bouton fermer mesure 44 px sur ses deux côtés (h-11 et w-11). | [#66a292d45393c203-1] |
| `frontend:components/settings/mobile/BottomSheet.tsx:201-209` | BottomSheet.footer | Le pied est rendu seulement si la prop footer est fournie, en frère du corps défilant et non à l'intérieur. | [#4ef0aa5e06900d1e-1] |
| `frontend:components/settings/ExportDataFlow.tsx:96-135` | ExportDataFlow.confirm | L'étape confirm affiche le sélecteur de format, l'aide du format et un bouton de démarrage désactivé pendant isBusy. | [#47ac49fc7897b501-1] |
| `frontend:components/settings/ExportDataFlow.tsx:138-154` | ExportDataFlow.preparing | L'étape preparing affiche le statut du job dans un élément role=status et aria-live polite. | [#d1d7e757508cdb94-1] |
| `frontend:components/settings/ExportDataFlow.tsx:157-232` | ExportDataFlow.ready | L'étape ready affiche un lien de téléchargement async, un message expiré avec relance, ou un message de succès pour les formats sync. | [#dcb398eb9ddc22b4-1] |
| `frontend:components/settings/ExportDataFlow.tsx:162` | ExportDataFlow.expired | Lorsque le lien async est expiré, l'écran affiche export-expired sans bouton de téléchargement et propose un bouton de relance qui appelle flow.reset. | [#b964b1edbababf16-1] |
| `frontend:components/settings/ExportDataFlow.tsx:176` | ExportDataFlow.asyncReady | Lorsque le lien async n'est pas expiré, l'écran affiche le bouton export-download qui appelle flow.downloadCompleted et la date d'expiration. | [#e5f5454ceb3746a2-1] |
| `frontend:components/settings/ExportDataFlow.tsx:217-218` | ExportDataFlow.syncDone | Sans completedJob, l'étape ready affiche le message de fichier déjà téléchargé pour les formats sync. | [#920a552c04333fdc-1] |
| `frontend:components/settings/ExportDataFlow.tsx:235-251` | ExportDataFlow.error | L'étape error affiche un message role=alert et un bouton export-retry qui appelle flow.reset. | [#b84241b1745f841e-1] |
| `frontend:components/settings/ProfileSection.tsx:31-183` | ProfileSection.ProfileSection | Le chapitre Profil affiche la section avatar puis un formulaire avec les champs name, username et email. | [#ca5a70cd49f47863-1] |
| `frontend:components/settings/DeleteAccountSteps.tsx:44-76` | DeleteAccountSteps | L'étape warn affiche le titre et le texte d'avertissement, avec un bouton Annuler et un bouton Continuer qui passe à l'étape de confirmation. | [#8e6102a21eff0382-1] |
| `frontend:components/settings/DeleteAccountSteps.tsx:78-138` | DeleteAccountSteps | L'étape de confirmation est un formulaire qui demande le nom d'utilisateur, soumis via flow.form.handleSubmit(flow.submit). | [#8e6102a21eff0382-2] |
| `frontend:components/settings/PasswordStrength.tsx:103-132` | PasswordStrength.PasswordStrength | Le composant affiche quatre barres colorées et un libellé de niveau, et ne rend rien si le mot de passe est vide. | [#b2256621048f44bf-1] |
| `frontend:components/settings/AccountSection.tsx:49-76` | AccountSection | La section compte affiche un titre, le flux d'export RGPD, puis une zone de suppression avec un bouton destructif qui ouvre le flux. | [#dc65944fca978ea0-1] |
| `frontend:components/settings/SecuritySection.tsx:32-201` | SecuritySection.SecuritySection | Le chapitre Sécurité affiche le formulaire de changement de mot de passe (ancien, nouveau, confirmation) puis la liste des sessions actives. | [#5d66ff990f6c5af0-1] |
| `frontend:components/settings/mobile/MobileSettings.tsx:25-30` | MobileSettings.SECTIONS | Le registre SECTIONS associe chaque chapitre à sa section, et le chapitre Compte reçoit deleteContainer sheet pour afficher la suppression en BottomSheet. | [#b7cb8655e1dde07c-1] |
| `frontend:components/settings/mobile/MobileSettings.tsx:59` | MobileSettings.back | Le bouton retour mesure 44 px sur ses deux côtés (h-11 et w-11) et porte une marge négative à gauche. | [#940c7a47c5a39c5f-1] |
| `frontend:components/settings/SettingsShell.tsx:49-56` | SettingsShell.CHAPTERS | La coquille desktop définit quatre chapitres dans l'ordre Profil, Sécurité, Préférences, Compte. | [#4ffc169780e92af6-1] |
| `frontend:components/settings/SettingsShell.tsx:60` | SettingsShell.active | Le chapitre actif est un état local initialisé à 'profile'. | [#0cd99804439b7a2c-1] |
| `frontend:components/settings/SettingsShell.tsx:108-110` | SettingsShell.tab | L'onglet sélectionné reçoit le fond primaire et la couleur d'encre primaire, les autres onglets restent en couleur muted avec survol. | [#9143930d6763d9fc-1] |
| `frontend:components/settings/SettingsShell.tsx:132-139` | SettingsShell.panels | Seule la section du chapitre actif est montée, chaque panneau restant présent dans le DOM avec l'attribut hidden. | [#0eadb6f6204628c6-1] |
| `frontend:components/settings/SettingsShell.tsx:134-137` | SettingsShell.panels | Le chapitre Compte affiche AccountSection sans prop, contrairement à la variante mobile qui passe deleteContainer sheet. | [#0eadb6f6204628c6-2] |
| `frontend:components/pages/HomePage.tsx:45-60` | HomePage | La page d'accueil assemble dans l'ordre le header, le hero, la section comment ça marche, le CTA et le footer, dans un conteneur racine. | [#d66a910bc46ac460-1] |
| `frontend:components/settings/PreferencesSection.tsx:33-114` | PreferencesSection.PreferencesSection | Le chapitre Préférences affiche trois sélecteurs : langue, thème et densité. | [#e565229e6022b900-1] |
| `frontend:components/settings/mobile/SettingsIndex.tsx:34` | SettingsIndex.list | L'index mobile est une liste ul à séparateurs, bordée et arrondie. | [#626014291eec7726-1] |
| `frontend:components/settings/mobile/SettingsIndex.tsx:35-51` | SettingsIndex.items | L'index génère une ligne bouton par chapitre de MOBILE_CHAPTERS, avec une icône, un libellé et un chevron décoratif. | [#67ce101c134c8d02-1] |
| `frontend:components/settings/mobile/MobileSettings.test.tsx:28-33` | MobileSettings.test | Le test affirme qu'au premier rendu l'index mobile est affiché et qu'aucune section détail n'est montée. | [#2476693c6501c802-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/PasswordResetTokenEntity.java:24-25` | PasswordResetTokenEntity | L'entité mappe la table password_reset_tokens. | [#3d8dced783bb55e1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/PasswordResetTokenEntity.java:33-34` | PasswordResetTokenEntity.userId | La colonne user_id est non nulle. | [#c59dfa5fab6823ce-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/PasswordResetTokenEntity.java:36-37` | PasswordResetTokenEntity.token | La colonne token est non nulle et unique. | [#ca1bdcf91a964b81-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/PasswordResetTokenEntity.java:39-40` | PasswordResetTokenEntity.expiresAt | La colonne expires_at est non nulle. | [#511d166a4eb60eb3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/PasswordResetTokenEntity.java:42-43` | PasswordResetTokenEntity.usedAt | La colonne used_at est nullable et porte la date de consommation du token. | [#0f07b0160a8df5ed-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java:21` | UserEntity.id | L'id est généré par GenerationType.AUTO. | [#ecd448b56d33f40a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java:31-32` | UserEntity.role | La colonne role est non nulle. | [#fbf2c3cfa03fb3ab-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java:34-35` | UserEntity.email | Le champ email est unique, sans contrainte de nullité. | [#e7cae16410a32be4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java:42-43` | UserEntity.themePreference | Le champ themePreference est converti par ThemePreferenceConverter et stocké dans la colonne theme_preference de longueur 16. | [#a7e439b586fee252-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java:46-47` | UserEntity.createdAt | La colonne created_at est non nulle et non modifiable, alimentée par @CreatedDate. | [#66bda78aee592300-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java:50-51` | UserEntity.updatedAt | La colonne updated_at est non nulle et alimentée par @LastModifiedDate. | [#5ab8584ece537f94-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java:54-56` | UserEntity.version | Le champ version est annoté @Version et non nul, sans setter public. | [#b4bfb3a0e8cb6c7f-1] |
| `frontend:types/auth.ts:10-23` | User | Le type User porte id, name, username, email, role, avatarUrl nullable et themePreference nullable. | [#ac3f779bf2baa91a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/validation/StrongPassword.java:32-36` | StrongPassword | L'annotation StrongPassword est liée au validateur StrongPasswordValidator et s'applique aux champs et aux paramètres. | [#ddedbcd7e1084aca-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java:17-23` | PasswordResetToken | PasswordResetToken est un modèle immuable portant id, userId, token, expiresAt et usedAt. | [#2ed092cfa6c08b1d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/User.java:6-18` | User | User est un modèle de domaine avec id, username, name, password, role, email, avatar et themePreference, la préférence étant null tant que le compte n'a rien choisi. | [#b70d850cad866490-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/UserDataExport.java:31-35` | UserDataExport | UserDataExport est un record immuable regroupant profile, categories, products et generatedAt, sans champ de mot de passe. | [#e8be31c1360b78e8-1] |
| `frontend:types/settings.ts:21-30` | SessionSchema | Le schéma SessionSchema décrit une session active avec id GUID, deviceInfo et ipAddress nullables, lastActivity, createdAt et un booléen current. | [#3ba91248c372bcee-1] |
| `frontend:types/user.ts:4-20` | UserSchema | Le schéma UserSchema valide id GUID, name, username, email, role, avatarUrl nullable et themePreference enum nullable. | [#b9868e85254df656-1] |
| `frontend:contexts/AuthContext.test.tsx:32-40` | FAKE_USER | Le fixture FAKE_USER de type User porte id, name, username, email, role, avatarUrl et themePreference. | [#44457e75e284d4c3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/AvatarContent.java:8-9` | AvatarContent | AvatarContent est un record immuable portant les octets de l'avatar et son type MIME. | [#51683061c927814f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Role.java:5-12` | Role | L'enum Role porte les valeurs USER et ADMIN et implémente GrantedAuthority, son authority étant le nom de la constante. | [#37f7f6970ad6f804-1] |
| `frontend:components/settings/PreferencesSection.tsx:80-82` | useThemeChoice.setThemeChoice | Le changement de thème appelle setThemeChoice uniquement si la valeur choisie est un ThemeChoice valide. | [#4c5b8e8431bed1ad-1] |
| `frontend:components/settings/PreferencesSection.tsx:100` | useDensity.setDensity | Le sélecteur de densité appelle setDensity avec la valeur choisie. | [#2adf85ef139c6cdb-1] |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Le login répond 401 avec un code neutre sur BadCredentialsException, sans distinguer identifiant inconnu et mot de passe faux. [#75b1482fae455a05-1] | deducible |
| rules | - Le refresh répond 401 si le token est invalide, expiré, ou si son jti est révoqué ou inconnu. Il révoque le jti de l'ancien token puis enregistre celui du nouveau, et toute JwtException donne un 401 générique. [#502d18fb990a7103-1] [#502d18fb990a7103-2] [#authorization/1b96ea31a014d92e-1] [#889aeaf59cfbce87-1] | deducible |
| rules | - registerSession ne crée rien et ne lève rien si l'utilisateur est introuvable ou si le jti est null, sinon la session porte une IP anonymisée et expire après COOKIE_MAX_AGE secondes. [#72fdae6a021c1eda-1] [#72fdae6a021c1eda-2] | deducible |
| rules | - Un jeton null ou blanc lève MalformedJwtException avant la vérification de signature, et un algorithme autre que RS256 lève UnsupportedJwtException après elle. [#9e1fb7d7f49720f6-1] [#9e1fb7d7f49720f6-2] | deducible |
| rules | - L'IPv4 stockée perd son dernier octet, l'IPv6 compressée avec :: n'est pas stockée, l'IPv6 complète garde ses trois premiers hextets. [#fc4555a5d04c22c4-2] [#fc4555a5d04c22c4-3] [#fc4555a5d04c22c4-4] | deducible |
| rules | - Un mot de passe fort fait de 8 à 100 caractères avec une majuscule et un chiffre, et chaque critère lève sa propre clé (min, max, uppercase, number). [#e2385a30ad2b3acd-1] [#bd040f4c8fa54886-2] [#9520a36a3ed805ca-1] [#bc61a196ad51a62e-1] [#bc61a196ad51a62e-2] [#bc61a196ad51a62e-3] [#bc61a196ad51a62e-4] | deducible |
| rules | - Le mot de passe du login n'est pas soumis à cette politique, il exige seulement 6 caractères (validation.password.loginMin) et le username 3. [#8ecc3e2ddf7a6e0e-1] [#f6b8e76a851d7108-1] [#f6b8e76a851d7108-2] | deducible |
| rules | - name et username font de 3 à 20 caractères à l'inscription. [#c09fb9c62caf219a-1] [#0db2b01f96f26446-1] [#402a162ed6c8ea48-1] | deducible |
| rules | - deleteAccount exige un username de confirmation identique au compte, sinon AccountDeletionMismatchException avant toute écriture, et le formulaire lève settings.account.delete.mismatch. [#0ec9a144d275a5ac-1] [#4a914af96983eb97-1] | deducible |
| rules | - Un token est expiré dès l'instant exact d'expiration, et utilisable s'il n'est ni consommé ni expiré. [#674ca13e46a183ed-1] [#c030f2a7fb2f14fb-1] | deducible |
| rules | - La purge tourne toutes les 24 h (premier passage après 5 min). Selon les tests, elle supprime les tokens consommés et ceux expirés depuis 48 h, et garde ceux expirés depuis 30 minutes. [#batch/99a2df300c170ed7-1] [#0d3083819cc75058-1] [#0d3083819cc75058-2] [#0d3083819cc75058-3] | deducible |
| rules | - Lire un avatar absent lève AvatarNotFoundException, et deleteAvatar sans avatar ne fait rien. [#63faff959b829c33-1] [#bcb966a3ca75907a-1] | deducible |
| surface | - Après suppression, le front appelle logout puis redirige vers /{locale}/login. [#fbd04f8f9a8db877-1] | deducible |
| tests | - Les tests fixent que le cookie jwt a Secure à false en dev et à true en prod, avec des attributs identiques entre login, refresh et logout. [#e4ee9cf3e7270f58-1] [#9aa07d5841f78773-2] [#002a09e025d8271d-1] | deducible |
| tests | - Les tests fixent que le garde de routes ignore la casse, exige un segment exact, décode un seul niveau et traite un percent-encoding malformé comme protégé. [#bfe5d923361c997a-5] [#bfe5d923361c997a-6] [#bfe5d923361c997a-8] [#bfe5d923361c997a-9] | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ChangePasswordRequest.java:9-13` | Javadoc : Selon la javadoc, oldPassword est vérifié contre le hash BCrypt courant et n'est pas soumis à la politique StrongPassword. | [#7ab4a75c001b5f4a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/DeleteAccountRequest.java:8-11` | Javadoc : Selon la javadoc, le service compare username au nom de l'appelant et un écart produit une erreur 400. | [#8bbd885b492444d0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ForgotPasswordRequest.java:9-11` | Javadoc : Selon la javadoc, la réponse est toujours 200 pour un email inconnu, et seul un corps malformé produit un 400. | [#a3916c9e33461011-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ForgotPasswordRequest.java:16-18` | Javadoc : Selon la javadoc, le repli sur fr se fait à la sélection du template et non par la validation. | [#71f8558a1038e524-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ResetPasswordRequest.java:13` | Javadoc : Selon la javadoc, un token invalide, expiré ou consommé donne un 400 traité par le service. | [#5d511fbfad14dd08-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/UserResponse.java:42-44` | avatarUrl vaut /api/me/avatar si l'avatar de l'utilisateur est non nul et non vide, sinon null. | [#57d18c2092798c1c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/UserResponse.java:52` | themePreference reprend la valeur value() de la préférence si elle existe, sinon null. | [#57d18c2092798c1c-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:104-106` | L'ancien fichier d'avatar est supprimé après la sauvegarde, seulement si la référence change. | [#fdee0c60a7c5fa46-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:112-117` | Sans référence d'avatar, ou si le stockage ne renvoie rien, getAvatar lève AvatarNotFoundException. | [#63faff959b829c33-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:125-127` | Si aucune référence d'avatar n'existe, deleteAvatar ne fait rien et revient sans erreur. | [#bcb966a3ca75907a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:103-108` | Si l'email ne correspond à aucun utilisateur, requestReset ne fait aucune action et ne renvoie aucun signal. | [#8d2a9c9d767afb41-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:118` | La date d'expiration du token vaut la date courante plus tokenValidity. | [#8d2a9c9d767afb41-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:143-145` | Un token non utilisable, c'est-à-dire expiré ou déjà consommé, lève InvalidPasswordResetTokenException. | [#889d2f96ff3498a0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:147-150` | Si le compte du token n'existe plus, resetPassword lève InvalidPasswordResetTokenException sans en révéler la cause. | [#889d2f96ff3498a0-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:189-199` | Un token nul ou non-UUID lève InvalidPasswordResetTokenException sans lookup en base. | [#f161b00db820f46b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:29-30` | Javadoc : Selon la javadoc, un token valide, c'est-à-dire non consommé et non expiré, n'entre dans aucune condition de suppression et n'est jamais purgé. | [#batch/8cb3eecf98829cbc-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:29-30` | Javadoc : Selon la javadoc, un token valide n'est jamais supprimé par la purge, quelle que soit la fenêtre. | [#a2feb23931e84982-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/UserDataExportAssembler.java:53-54` | Si aucun utilisateur ne correspond à ownerId, assemble lève UserNotFoundException. | [#d7aa5eb9502d15f1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/UserDataExportAssembler.java:59-61` | Les catégories exportées sont celles de findByOwnerIdOrSystem dont ownerId correspond à l'utilisateur, ce qui exclut les catégories système. | [#d7aa5eb9502d15f1-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:137-142` | updateThemePreference refuse une préférence nulle via requireNonNull. | [#77ade5cf6f6a7e97-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/validation/StrongPasswordValidator.java:23` | Commentaire : Selon le commentaire, une valeur null est déléguée à @NotBlank, et le code retourne true pour null. | [#bd040f4c8fa54886-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/validation/StrongPasswordValidator.java:31-44` | isValid exige au moins une majuscule et au moins un chiffre, et retourne true dès que les deux sont trouvés dans un balayage unique. | [#bd040f4c8fa54886-2] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java:59-61` | Un token est expiré lorsque expiresAt n'est pas postérieur à l'instant now, donc à l'instant exact d'expiration il est déjà expiré. | [#674ca13e46a183ed-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java:64-66` | Un token est utilisable s'il n'est ni consommé ni expiré à l'instant now. | [#c030f2a7fb2f14fb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/UserDataExport.java:101` | avatarPresent vaut true si l'avatar de l'utilisateur est non null et non vide, sans exporter les octets de l'avatar. | [#39dc412702d5d599-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/UserDataExport.java:117-119` | Un produit dont la liste d'événements est null est exporté avec une liste d'événements vide. | [#543e0ffea1375051-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/EmailService.java:19-21` | Javadoc : Selon la javadoc, une locale null, vide ou non supportée retombe sur le template français sans lever d'exception liée à la locale. | [#24eb6a68dd2d4191-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/PasswordResetService.java:16-18` | Javadoc : Selon la javadoc, requestReset ne lève jamais d'exception révélant l'existence du compte, et le contrôleur répond toujours 200. | [#189250c3c25840d0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:156-166` | Si le username du token signé n'existe pas, /me renvoie le même 401 générique qu'un token invalide. | [#ab8e31d3e5b08ee4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:212-217` | Si le username demandé existe déjà, register renvoie un 409 avec le code conflict, sans pré-check bloquant sur l'email. | [#6f3d723273af408f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:219-228` | Le mot de passe est haché avec passwordEncoder.encode et le rôle est fixé à ROLE_USER lors de la création. | [#6f3d723273af408f-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:300-303` | Le refresh refuse le renouvellement si validateToken échoue pour expiration ou signature invalide, et renvoie 401. | [#502d18fb990a7103-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:311-314` | Le refresh refuse un token dont le jti est révoqué ou inconnu, même s'il est encore valide, avec un 401. | [#502d18fb990a7103-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:356` | forgotPassword délègue à PasswordResetService.requestReset avec l'email et la locale, sans exposer le résultat du lookup. | [#fc21364fe89b1478-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:382-389` | registerSession ne crée aucune session si le user est introuvable ou si le jti extrait est null, sans lever d'erreur. | [#72fdae6a021c1eda-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:390-395` | La session enregistrée porte une IP anonymisée via ClientIpAnonymizer.anonymize et une expiration fixée à maintenant plus COOKIE_MAX_AGE secondes. | [#72fdae6a021c1eda-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:402-411` | revokeSessionSilently ne fait rien si le token est null ou vide, et ignore une JwtException en silence. | [#ad961b363692f995-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:414-420` | Le User-Agent est tronqué à 255 caractères avant d'être stocké comme deviceInfo, et renvoie null si l'en-tête est absent. | [#ffbb44fdcc63f923-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:121-129` | Un username différent de celui du compte est refusé si un autre compte le porte déjà, et le même username reste autorisé. | [#f1e8c7982ae29cba-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:131-141` | La mise à jour reconstruit le User en conservant id, password haché, role et avatar, et ne modifie que name, username et email. | [#f1e8c7982ae29cba-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:166-168` | La valeur de thème validée est convertie via ThemePreference.fromValue puis persistée par userService.updateThemePreference. | [#27f0b20b5e41b4ae-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:214` | La suppression appelle userService.deleteAccount avec le caller et le username saisi, la vérification de concordance étant déléguée au service. | [#d99d5d2fe5d1895d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:245` | Un part de fichier vide est transmis au service sous forme de tableau d'octets vide, et non traité comme une erreur technique. | [#0fbddee3986f39b8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:79-84` | Si la clé API est nulle ou vide, la méthode journalise un warning et n'appelle pas Brevo. | [#4db21754de87e441-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:88` | La langue du mail est résolue par PasswordResetEmailTemplate.resolve, avec repli sur le français. | [#c51aeccb38c3365c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:99-105` | Une RestClientException levée par l'appel Brevo est journalisée avec le seul nom de sa classe, sans être propagée au contrôleur. | [#4db21754de87e441-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:120` | Le nom du destinataire est échappé HTML avant insertion dans htmlContent. | [#c5a43fb712d276a3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:124` | Le lien de réinitialisation est échappé HTML avant insertion dans htmlContent. | [#c5a43fb712d276a3-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:66` | Le template DEFAULT est FR, utilisé comme repli. | [#ee2ae82b1c2b03d8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:86-88` | Une locale nulle ou vide renvoie DEFAULT sans examiner la valeur. | [#2fa0df4d522f640f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:89` | La locale est coupée, mise en minuscules, puis réduite à sa sous-étiquette de langue. | [#2fa0df4d522f640f-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:90-95` | Le template dont le languageTag égale la sous-étiquette est retourné, sinon DEFAULT est renvoyé. | [#2fa0df4d522f640f-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java:50` | Commentaire : Selon le commentaire, l'email est unique en base via uq_users_email (V2), donc la requête renvoie au plus un résultat. | [#516dc9a1654365d4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java:140` | Commentaire : Selon le commentaire, la suppression du compte est physique pour le RGPD (#78). | [#37a31f624fa5c1d4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:73-75` | Recherche l'utilisateur par email, puis le token exploitable le plus récent à l'instant courant du Clock. | [#06af8fd109ded19a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:79` | Renvoie 404 sans corps si aucun token exploitable n'est trouvé. | [#06af8fd109ded19a-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/converters/ThemePreferenceConverter.java:21-23` | Écrit la valeur externe de ThemePreference, ou null si l'attribut est nul. | [#66ed51333216cb59-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/converters/ThemePreferenceConverter.java:26-30` | Relit la colonne via ThemePreference.fromValue, ou renvoie null si la colonne est nulle. | [#2bdd6c92e4cfcd26-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:14-16` | Javadoc : Selon la javadoc, l'identité est résolue depuis le SecurityContextHolder, peuplé par JwtFilter à partir du cookie jwt ou du header Authorization Bearer. | [#423154dcb2328040-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:19-21` | Renvoie null pour une IP nulle ou composée uniquement d'espaces. | [#fc4555a5d04c22c4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:26-27` | Pour une IPv4 à quatre octets décimaux valides, le dernier octet est remplacé par zéro. | [#fc4555a5d04c22c4-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:35-37` | Une adresse IPv6 contenant une compression :: renvoie null et n'est pas stockée. | [#fc4555a5d04c22c4-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:39-41` | Pour une IPv6 non compressée d'au moins trois hextets non vides, seuls les trois premiers sont conservés suivis de deux-points doubles. | [#fc4555a5d04c22c4-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:58-62` | Au démarrage, une paire RSA éphémère est générée si la clé configurée est absente ou blanche, sinon la clé configurée est chargée. | [#eaeb1fec0ed5c825-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:164-174` | La surcharge generateToken(Authentication) ajoute un claim jti UUID aléatoire et un claim role issu des autorités de l'utilisateur. | [#authorization/6e5f12c53197589c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:238-245` | Un jeton est valide si son subject égale le username du UserDetails et s'il n'est pas expiré, et toute exception de parsing renvoie false. | [#0cdf93cef93289d0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:53-65` | Javadoc : Selon la javadoc, un principal authentifié sans identifiant de compte est refusé en 401 plutôt que laissé sans limite. | [#86f671fa615aa995-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:67-68` | Javadoc : Selon la javadoc, le plafond est de 30 par minute et par utilisateur sur PUT /api/me/preferences. | [#86f671fa615aa995-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:94-95` | Seule la clé PUT /api/me/preferences est limitée, avec une limite de 30 requêtes par minute et par utilisateur. | [#876d03702960b795-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:98-106` | Les buckets (utilisateur, route) sont tenus dans une LRU synchronisée limitée à 100 000 entrées, la plus ancienne étant évincée au-delà. | [#1310596ba9fef422-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:146-149` | Un bucket est créé à la première requête pour chaque couple identifiant de compte et méthode avec chemin, avec la limite de la route. | [#1310596ba9fef422-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:150-155` | Quand le bucket est vide, la requête reçoit le 429 du limiteur par IP, Retry-After inclus. | [#2c92a4e81594cd94-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:170-179` | La clé de comptage est la chaîne id suivie de l'UUID du compte, lu depuis CustomUserDetails, ou null si le principal ne porte pas d'identifiant. | [#799e83a67cc4d50d-1] |
| `backend:src/main/resources/db/migration/V15__password_reset_tokens_version.sql:9` | Commentaire : Selon le commentaire, la colonne version porte un verrou optimiste JPA pour éviter qu'un token de reset soit consommé deux fois en concurrence. | [#9fac7ad0a456c62f-1] |
| `backend:src/main/resources/db/migration/V16__user_theme_preference.sql:9-14` | Commentaire : Selon le commentaire, une valeur NULL signifie qu'aucun choix n'a été exprimé, et 'system' un choix explicite, distinction impossible avec un défaut. | [#7892ecdae0859bbe-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/AvatarServiceImplTest.java:31-34` | Javadoc : Selon la javadoc, le type d'avatar est détecté par magic bytes JPEG, PNG ou WebP, et non par le Content-Type client. | [#dd2ee84cd3b80695-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/AvatarServiceImplTest.java:47` | La fixture fixe la taille maximale d'un avatar à 5 Mio, soit 5 * 1024 * 1024 octets. | [#77e3815cb83d949a-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java:78` | Commentaire : Selon le commentaire, BR-AUT-012 interdit toute persistance de token, tout envoi d'email et toute exception pour un email inconnu. | [#29fa8005284bc597-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java:98-99` | L'expiration d'un token de reset est fixée à maintenant plus 15 minutes. | [#f7cc1db7ea1eb15f-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java:181` | Commentaire : Selon le commentaire, BR-AUT-002 impose le ré-encodage BCrypt du nouveau mot de passe. | [#ef16c560e9b3dd98-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java:213-222` | Commentaire : Selon le commentaire, un token dont expiresAt est égal à maintenant est considéré expiré. | [#9d473c35f25d3e61-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:27` | Javadoc : Selon la javadoc, la fenêtre de rétention par défaut de la purge des tokens est de 24 heures. | [#6024f10758fbe8af-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:92` | Un token dont used_at est renseigné est supprimé par la purge, même si expires_at est dans le futur. | [#0d3083819cc75058-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:93` | Un token expiré depuis 48 heures, donc au-delà de la fenêtre de rétention, est supprimé par la purge. | [#0d3083819cc75058-2] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:94-95` | Un token valide, ou expiré depuis 30 minutes donc dans la fenêtre de rétention, n'est pas supprimé par la purge. | [#0d3083819cc75058-3] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/UserServiceImplTest.java:60` | Un ancien mot de passe qui ne correspond pas au hash courant provoque une InvalidCredentialsException. | [#c61943c20f0053d8-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/UserServiceImplTest.java:72` | Un nouveau mot de passe identique à l'ancien provoque une SamePasswordException. | [#c61943c20f0053d8-2] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/UserServiceImplTest.java:112` | Si le compte a disparu, updateThemePreference lève UserNotFoundException. | [#e2bba859ce8d52f2-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/validation/PasswordPolicyTest.java:30` | Javadoc : Selon la javadoc, la politique de création impose au moins 8 caractères, une majuscule et un chiffre. | [#1e9f1263aebc18b3-1] |
| `backend:src/test/java/com/matimeline/eventmanager/domain/models/ThemePreferenceTest.java:17-23` | ThemePreference.fromValue accepte exactement les valeurs minuscules light, dark et system, et chaque constante renvoie sa valeur textuelle. | [#f90a37a11fb905f6-1] |
| `backend:src/test/java/com/matimeline/eventmanager/domain/models/export/UserDataExportTest.java:51` | Lorsqu'aucune préférence de thème n'est choisie, le profil exporté porte null et non une valeur par défaut. | [#dc2f9c2fe080d74d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerErrorContractTest.java:86-87` | Commentaire : Selon le commentaire, un username inexistant dans un token signé renvoie le même 401 générique que /refresh, pour éviter l'énumération. | [#91f9966572502e29-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:34-36` | Javadoc : Selon la javadoc, la politique de mot de passe exige au moins 8 caractères, une majuscule et un chiffre, et le durcissement ne doit pas bloquer les comptes antérieurs. | [#08e6e9c1b43e6aad-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:181-182` | Les en-têtes set-cookie, authorization, proxy-authorization et cookie sont masqués dans le diagnostic, les autres en-têtes étant affichés en clair. | [#ef31017611de21c5-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:258-259` | Un login est considéré réussi si le statut HTTP vaut 200 et si le cookie jwt existe avec une valeur non vide. | [#1712c12083cb2cca-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:310-311` | Commentaire : Selon le commentaire, POST /api/me/change-password est un slot rate-limité à 5 appels par minute et par IP. | [#4593fbd83579369a-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:45` | Javadoc : Selon la javadoc de la classe, /me ne sérialise jamais le hash du mot de passe (BR-AUT-008). | [#cddc594c75beffe3-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:46` | Javadoc : Selon la javadoc de la classe, un doublon username ou email à l'inscription doit renvoyer un 409 propre (BR-AUT-001). | [#cddc594c75beffe3-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:292-293` | Le refresh n'est autorisé que si le jti courant est actif dans sessionService. | [#af00aa0731bfbbd4-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:381-385` | Javadoc : Selon la javadoc de la méthode, les attributs Secure et Domain du cookie jwt sont externalisés en app.cookie et doivent être identiques entre pose et suppression (BR-AUT-010). | [#a748b283acdaa6d8-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java:88-94` | Le test impose que chaque clé JWKS publiée ne contienne que les champs kty, use, alg, kid, n et e, sans paramètres privés. | [#0c0895f95f72dae8-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/PasswordResetEndpointsIntegrationTest.java:24` | Javadoc : Selon la javadoc, forgot-password répond 200 même pour un email inconnu (BR-AUT-012, anti-énumération), et le test vérifie ce comportement avec un email absent de la base. | [#e0241e3251fd94c8-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java:162` | La valeur de thème est stockée en minuscules en base, et le test le vérifie par une lecture SQL brute de la colonne theme_preference. | [#eb2e0da8475bf4af-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplateTest.java:24-27` | Les locales fr, en, es et de sont résolues vers le template correspondant (FR, EN, ES, DE). | [#a614e06d99e19f8b-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplateTest.java:29-34` | Une locale absente, vide, blanche ou non supportée (zz, xx-YY, fr;DROP, 42, french) est résolue vers le template FR. | [#a614e06d99e19f8b-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplateTest.java:36-40` | La résolution de locale ignore la casse, les espaces autour et le sous-tag de région (en-GB vers EN, de_AT vers DE, es-419 vers ES). | [#a614e06d99e19f8b-3] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java:97-102` | Javadoc : Selon la javadoc, les champs commençant par = + - ou @ doivent recevoir une apostrophe pour neutraliser l'injection de formule, sans casser l'échappement RFC 4180. | [#6af2ab49b58ca3e1-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java:138-143` | Javadoc : Selon la javadoc, un champ commençant par un saut de ligne \n doit être préfixé d'une apostrophe puis entouré de guillemets RFC 4180. | [#6af2ab49b58ca3e1-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportProfileTest.java:21` | Javadoc : Selon la javadoc, un endpoint qui rend un token de réinitialisation ne doit jamais répondre hors profil e2e, ni en dev, ni en test. | [#e05503e549f14764-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java:36-37` | Javadoc : Selon la javadoc, un plafond de débit par utilisateur authentifié s'applique à PUT /api/me/preferences, via UserRateLimitingFilter. | [#fbb16695be5ce843-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java:89-94` | Javadoc : Selon la javadoc, au-delà de 5 tentatives sur un même token la suivante reçoit 429 même si l'IP varie, les 5 premières renvoyant 400 pour un token inexistant. | [#60be4a57c47f954f-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:37-38` | Javadoc : Selon la javadoc, tout principal authentifié autre que CustomUserDetails est refusé en 401 (fail-closed), et seul JwtFilter authentifie dans cette chaîne. | [#2405f214e5d95c60-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:139-140` | Javadoc : Selon la javadoc, le 429 par utilisateur porte le même Retry-After que le limiteur par IP, sous forme d'entier arrondi au supérieur, d'au moins 1, et sans en-tête X-RateLimit. | [#c6f23c1591fac2c8-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:154` | Le test attend un Retry-After de 15 pour 14,8 secondes restantes, ce qui montre un arrondi au supérieur. | [#c6f23c1591fac2c8-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:157` | Le test attend un Retry-After de 1 pour 0,1 seconde restante, la valeur minimale annoncée étant 1 et jamais 0. | [#c6f23c1591fac2c8-3] |
| `frontend:components/pages/HomePage.accent-roles.test.tsx:36` | Une classe est comptée comme accent si elle porte un préfixe de variante éventuel puis text, bg, border, ring, outline, fill, stroke, decoration, shadow, from, via ou to, suivi de -accent. | [#505e86f59eb95ac6-1] |
| `frontend:components/pages/HomePage.accent-roles.test.tsx:44` | Le wordmark Ma Timeline porté en text-accent est toléré par la liste nommée PENDING, en attente d'arbitrage. | [#183ae16adcfe44eb-1] |
| `frontend:components/pages/HomePage.accent-roles.test.tsx:63` | Un élément portant une classe d'accent est exempté s'il se trouve dans un lien ou un bouton. | [#4ab8ad36931ea981-1] |
| `frontend:components/pages/HomePage.accent-roles.test.tsx:65` | Un élément portant une classe d'accent est exempté s'il se trouve dans une section contenant le CTA landing-final-cta-register. | [#4ab8ad36931ea981-2] |
| `frontend:components/pages/HomePage.tsx:47` | La locale utilisée est params.locale si renseignée, sinon la locale de useLocale, sinon fr. | [#a20abea4d48e9e9b-1] |
| `frontend:components/settings/AccountSection.test.tsx:9` | Javadoc : Selon la javadoc, la validation du mismatch du username à la suppression est couverte par BR-AUT-001. | [#cf0a3c4db3f1eec8-1] |
| `frontend:components/settings/AvatarUpload.tsx:23` | La taille maximale d'un fichier image accepté est fixée à 5 Mo (5 × 1024 × 1024 octets). | [#33e4724fb213ff29-1] |
| `frontend:components/settings/AvatarUpload.tsx:118` | Un dépôt de fichier est ignoré lorsque le composant est désactivé. | [#5036ca27c747e5cb-1] |
| `frontend:components/settings/AvatarUpload.tsx:229` | Commentaire : Le canvas de recadrage est affiché en classes h-40 w-40, soit 160 px, pour une surface interne de 256 px. | [#89fca4aa25eef723-1] |
| `frontend:components/settings/AvatarUpload.tsx:238-242` | Commentaire : Le curseur de zoom est un range de 1 à 3 avec un pas de 0,05, qui appelle setZoom avec la valeur saisie. | [#0e86ce7257bc2493-1] |
| `frontend:components/settings/DeleteAccountSteps.tsx:126` | Le bouton de confirmation de suppression est désactivé pendant que flow.isPending est vrai, et affiche un Spinner. | [#7601caf57fdf7286-1] |
| `frontend:components/settings/ExportDataFlow.tsx:40-44` | Un lien est expiré lorsque la date parsée est valide et inférieure ou égale à l'instant courant. | [#2b6f08368d07315d-1] |
| `frontend:components/settings/ExportDataFlow.tsx:41` | Sans date d'expiration, isExpired renvoie faux. | [#2b6f08368d07315d-2] |
| `frontend:components/settings/ExportDataFlow.tsx:63-68` | Un intervalle de 60 secondes force un nouveau rendu tant que la phase est ready avec une date d'expiration, pour recalculer l'expiration. | [#8b1d2b8ea3c17acb-1] |
| `frontend:components/settings/PasswordStrength.tsx:29-36` | La fonction meetsPolicy renvoie vrai si le mot de passe a une longueur comprise entre PASSWORD_POLICY.minLength et PASSWORD_POLICY.maxLength et si les tests PASSWORD_POLICY.uppercase et PASSWORD_POLICY.digit réussissent. | [#b508e7b4ebe428ed-1] |
| `frontend:components/settings/PasswordStrength.tsx:64-73` | Le score de force additionne des points pour la longueur minimale, une longueur d'au moins 10, la présence d'une majuscule et d'une minuscule, un chiffre et un symbole, puis le plafonne à 4. | [#7fe222d50721dc60-1] |
| `frontend:components/settings/PasswordStrength.tsx:75-79` | Le score est converti en niveau weak si il vaut 0 ou 1, medium s'il vaut 2 ou 3, strong sinon. | [#7ef714e6d7247461-1] |
| `frontend:components/settings/PasswordStrength.tsx:88-91` | Le niveau affiché vaut weak dès que le mot de passe ne respecte pas la politique, quel que soit son score, sinon le niveau dérivé du score. | [#742a228a482a39d0-1] |
| `frontend:components/settings/ProfileSection.tsx:62-63` | Une erreur Axios de statut 409 pose une erreur de formulaire sur le champ username avec le message profile.errors.usernameTaken. | [#b52908b447c37521-1] |
| `frontend:components/settings/SecuritySection.tsx:55-61` | Une erreur Axios de statut 400 pose une erreur de formulaire sur le champ oldPassword avec le message security.password.wrongOld. | [#aeeb3b2dae881ecc-1] |
| `frontend:components/settings/mobile/BottomSheet.tsx:44` | Le seuil de fermeture par swipe vers le bas est fixé à 80 px. | [#5148d8aeca0e247e-1] |
| `frontend:components/settings/mobile/BottomSheet.tsx:50-52` | La fonction shouldDismissOnSwipe renvoie vrai si dragY est strictement supérieur au seuil. | [#8046b0b7e38ab748-1] |
| `frontend:components/settings/mobile/BottomSheet.tsx:99-102` | Pendant le glissement, le décalage vertical est la différence entre la position Y courante et la position initiale, bornée à zéro vers le bas. | [#5266bc37aba015ea-1] |
| `frontend:components/settings/mobile/BottomSheet.tsx:155-160` | Le panneau applique un padding bas égal à la zone safe-area iOS, et une hauteur maximale égale à la hauteur disponible uniquement quand le clavier est ouvert. | [#58657becfe0b3c3a-1] |
| `frontend:components/settings/useDeleteAccountFlow.ts:27-30` | Javadoc : Selon le commentaire, la logique du flux de suppression de compte appuie la règle BR-AUT-001 et est partagée entre le Dialog desktop et le BottomSheet mobile. | [#ee809178d3b61909-1] |
| `frontend:components/ui/theme-toggle.tsx:147` | aria-pressed vaut isDark après montage et reste indéfini avant montage. | [#a5cd5190cef41b31-1] |
| `frontend:components/ui/theme-toggle.tsx:150` | Pour le gabarit labeled, le libellé visible vaut theme.light si le thème est sombre et theme.dark sinon, et theme.toggle avant montage. | [#a5cd5190cef41b31-2] |
| `frontend:components/ui/theme-toggle.tsx:171` | Pour les gabarits icon et square, le libellé vaut theme.toLight si le thème est sombre et theme.toDark sinon, et theme.toggle avant montage. | [#a5cd5190cef41b31-3] |
| `frontend:contexts/AuthContext.theme.test.tsx:131-146` | Le test affirme qu'à la connexion, un compte avec préférence reçoit setTheme avec sa valeur, sans PUT, même si un choix local différent existe. | [#b70ada54bac98094-1] |
| `frontend:contexts/AuthContext.theme.test.tsx:148-163` | Le test affirme qu'à la connexion, un compte sans préférence adopte le choix local explicite par un PUT de updatePreferences. | [#b70ada54bac98094-2] |
| `frontend:contexts/AuthContext.theme.test.tsx:165-175` | Le test affirme que la valeur locale system est considérée comme un choix explicite et envoyée au compte. | [#b70ada54bac98094-3] |
| `frontend:contexts/AuthContext.theme.test.tsx:177-183` | Le test affirme qu'à la connexion, sans préférence de compte ni choix local, rien n'est écrit et la préférence reste null. | [#b70ada54bac98094-4] |
| `frontend:contexts/AuthContext.theme.test.tsx:185-191` | Le test affirme qu'une valeur locale hors domaine est traitée comme l'absence de choix, sans PUT. | [#b70ada54bac98094-5] |
| `frontend:contexts/AuthContext.theme.test.tsx:193-204` | Le test affirme qu'un échec du PUT à la connexion n'empêche pas la connexion et journalise 'Theme preference save failed' avec le seul message d'erreur. | [#b70ada54bac98094-6] |
| `frontend:contexts/AuthContext.tsx:37` | Le helper safeErrorMessage renvoie error.message pour une instance d'Error, et la chaîne 'unknown error' sinon. | [#b25729ae7d05f386-1] |
| `frontend:contexts/AuthContext.tsx:112-116` | Si getUserProfile échoue, loadUser journalise 'User fetch failed' avec le message assaini puis publie un user null, soit un visiteur anonyme. | [#74520951c6ffbf01-1] |
| `frontend:contexts/AuthContext.tsx:154` | persistThemeChoice n'envoie aucun PUT si aucun utilisateur n'est authentifié ou si le compte porte déjà le choix demandé. | [#1d342e9d1d1d858c-1] |
| `frontend:contexts/AuthContext.tsx:164` | La réponse du PUT n'est recopiée dans le user que si elle est la plus récente et si l'identifiant du user courant correspond à celui de la réponse. | [#1d342e9d1d1d858c-2] |
| `frontend:contexts/AuthContext.tsx:168-172` | En cas d'échec, persistThemeChoice journalise 'Theme preference save failed' sans relancer l'erreur, et remet la valeur attendue à la préférence confirmée du compte. | [#1d342e9d1d1d858c-3] |
| `frontend:contexts/AuthContext.tsx:197` | À la connexion, si le compte porte une préférence de thème, elle est appliquée localement sans réécriture sur le compte. | [#7778743e7e4fb5f0-1] |
| `frontend:contexts/AuthContext.tsx:204-207` | Si le compte n'a pas de préférence, adoptLocalThemeAtLogin ne fait rien en l'absence de choix local, sinon il persiste le choix local sur le compte. | [#746fbc524426587b-1] |
| `frontend:contexts/AuthContext.tsx:206` | Sans choix local explicite (readStoredThemeChoice renvoie null), le compte reste sans préférence et aucune écriture n'a lieu. | [#746fbc524426587b-2] |
| `frontend:contexts/AuthContext.tsx:259` | Commentaire : Le logout ne modifie pas le thème local stocké sur le poste. | [#4e8a92bd048e3496-1] |
| `frontend:hooks/useAuthGuard.ts:30-31` | Une fois loading retombé à false sans user, la garde redirige vers /{locale}/login. | [#444f9d665751e3ef-1] |
| `frontend:hooks/useThemeChoice.ts:129-132` | theme, resolvedTheme et isDark valent undefined ou false tant que mounted est faux, et ne prennent une valeur réelle qu'après montage. | [#72b09596b9e2d85e-1] |
| `frontend:hooks/useThemeChoice.ts:146-149` | toggle bascule vers dark si le thème résolu brut vaut dark, sinon vers light, et passe par setThemeChoice. | [#a20b5a2f651595f0-1] |
| `frontend:lib/auth-guard-paths.test.ts:103-128` | scanRouteDirectories ignore les dossiers préfixés par _ ou @, délègue les groupes listés dans knownGroups et classe les dossiers préfixés par ( ou [ comme non interprétables. | [#896e57db62267907-1] |
| `frontend:lib/auth-guard-paths.test.ts:145-147` | normalizeSegment met le segment en minuscules, base de comparaison commune entre disque et constante, à l'image de isProtectedPathname. | [#e19102f7a70bae12-1] |
| `frontend:lib/auth-guard-paths.test.ts:150-163` | diffProtectedSegments compare les segments disque et déclarés après normalisation en minuscules, et restitue les noms bruts dans undeclared et orphan. | [#649368063bca9dab-1] |
| `frontend:lib/auth-guard-paths.test.ts:174-176` | findMiscasedDeclarations renvoie les segments déclarés qui ne sont pas en minuscules, car la normalisation ne voit pas leur casse. | [#629254a976cf6e5c-1] |
| `frontend:lib/auth-guard-paths.test.ts:195-227` | formatGuardReport renvoie GUARD_IN_SYNC si aucun écart n'est détecté, sinon un rapport listant les segments non déclarés, les segments orphelins, les casses mixtes et les dossiers non interprétables. | [#f32bbc25e8115946-1] |
| `frontend:lib/auth-guard-paths.test.ts:295-348` | formatLocaleGuardReport exige que chaque dossier routé de [locale]/ soit classé, public dans PUBLIC_LOCALE_SEGMENTS ou protégé dans PROTECTED_EXTRA_SEGMENTS, et signale les dossiers non classés. | [#8b929bd058c71ddd-1] |
| `frontend:lib/auth-guard-paths.ts:113` | Le pathname est rejeté (retour null) si la locale est absente ou non supportée. | [#d444aafb92b4cea4-1] |
| `frontend:lib/auth-guard-paths.ts:155` | Un segment au percent-encoding malformé est considéré comme protégé. | [#c6008275f32dc980-2] |
| `frontend:lib/auth-jwks.ts:107-109` | L'avertissement d'URL non configurée n'est émis qu'une seule fois, grâce au drapeau notConfiguredWarned. | [#317b32dc4437d756-1] |
| `frontend:lib/auth-jwks.ts:108` | L'avertissement d'URL non configurée n'est émis qu'en production. | [#317b32dc4437d756-2] |
| `frontend:lib/auth-jwks.ts:135-137` | L'avertissement de JWKS injoignable n'est émis qu'en production et une seule fois, grâce au drapeau unreachableWarned. | [#0d6391a4f181efed-1] |
| `frontend:lib/auth-jwks.ts:159-171` | Une URL n'est acceptée que si son protocole est https: ou http:, sinon la fonction renvoie null. | [#dee5ce18d0fe892e-1] |
| `frontend:lib/auth-jwks.ts:181` | Une entrée JWK est ignorée si son kty n'est pas 'RSA'. | [#91910d642ac8fa3d-1] |
| `frontend:lib/auth-jwks.ts:182-184` | Une entrée JWK dont alg ou use est présent mais différent de RS256 ou sig est ignorée, et une entrée sans ces champs est acceptée. | [#91910d642ac8fa3d-2] |
| `frontend:lib/auth-jwks.ts:212` | Un JWKS dont aucune entrée n'est importable est traité comme un échec (null), et non comme un succès sans clé. | [#a2ed9d503f75ac8e-1] |
| `frontend:lib/auth-jwks.ts:225-231` | Un timer abandonne la requête JWKS après JWKS_FETCH_TIMEOUT_MS. | [#f2220d0632b42410-1] |
| `frontend:lib/auth-jwks.ts:251-253` | Une découverte en cours pour la même URL est rejointe au lieu d'en lancer une nouvelle. | [#2da6534161a7b1f7-1] |
| `frontend:lib/auth-jwks.ts:260` | L'entrée de cache reçoit une expiration de 30 secondes si la découverte a échoué, et de 10 minutes si elle a réussi. | [#2da6534161a7b1f7-2] |
| `frontend:lib/auth-jwks.ts:302-309` | Un rafraîchissement forcé est refusé (null) si le dernier rafraîchissement forcé date de moins de JWKS_REFRESH_COOLDOWN_MS, sinon il lance une découverte qui ignore le cache. | [#4c085da69e8a3ae5-1] |
| `frontend:lib/auth-token-verify.ts:119` | Le jeton est refusé si le claim exp est absent, n'est pas un nombre ou est NaN. | [#0ce549b16c384755-1] |
| `frontend:lib/auth-token-verify.ts:121` | Le jeton est refusé si nbf est un nombre postérieur à l'instant courant, et nbf n'est contrôlé que s'il est présent. | [#0ce549b16c384755-2] |
| `frontend:lib/auth-token-verify.ts:139` | Le jeton est refusé si son en-tête alg n'est pas exactement RS256, avant toute vérification de signature. | [#fef4f558bcb33253-1] |
| `frontend:lib/auth-token-verify.ts:145` | Le jeton est refusé si le claim sub est absent, n'est pas une chaîne ou est vide. | [#fef4f558bcb33253-2] |
| `frontend:lib/auth-token-verify.ts:189` | Un cookie absent ou vide donne le verdict rejected. | [#510afab3cb27e0b6-1] |
| `frontend:lib/auth-token-verify.ts:196-202` | Si l'URL JWKS n'est pas configurée ou n'est pas valide, la fonction signale l'absence de configuration et renvoie accepted sans analyser le jeton. | [#510afab3cb27e0b6-2] |
| `frontend:lib/auth-token-verify.ts:204-210` | Si les clés de vérification ne peuvent pas être obtenues, la fonction signale l'injoignabilité et renvoie accepted. | [#510afab3cb27e0b6-3] |
| `frontend:lib/auth-token-verify.ts:212-215` | Après découpage, le jeton est refusé si la forme ou la structure est invalide, puis accepté si une clé connue valide la signature. | [#510afab3cb27e0b6-4] |
| `frontend:lib/auth-token-verify.ts:223-226` | Si aucune clé connue ne valide la signature, la fonction redécouvre les clés, et renvoie rejected si le garde-fou anti-tempête renvoie null. | [#510afab3cb27e0b6-5] |
| `frontend:lib/auth-token-verify.ts:227-229` | Commentaire : Selon le commentaire, toute exception non rattrapée est remplacée par le verdict accepted, pour éviter une erreur 500 sur les routes protégées. | [#510afab3cb27e0b6-6] |
| `frontend:lib/schemas/auth.ts:50-55` | La politique de mot de passe fixe une longueur minimale de 8 et une maximale de 100, avec une majuscule et un chiffre requis. | [#9520a36a3ed805ca-1] |
| `frontend:lib/schemas/auth.ts:88-91` | Le schéma de login exige un username d'au moins 3 caractères et un mot de passe d'au moins 6 caractères, hors de la politique de mot de passe. | [#8ecc3e2ddf7a6e0e-1] |
| `frontend:lib/schemas/auth.ts:110-113` | Le schéma d'inscription exige un name et un username de 3 à 20 caractères, un email valide et un mot de passe soumis à la politique. | [#402a162ed6c8ea48-1] |
| `frontend:lib/schemas/auth.ts:166-167` | Le schéma de réinitialisation exige un token non vide et un newPassword soumis à la politique de mot de passe. | [#5342a5172b0df310-1] |
| `frontend:lib/schemas/settings.ts:80-83` | Le schéma refuse un nouveau mot de passe identique à l'ancien, avec la clé validation.password.same posée sur newPassword. | [#a0a38563f06fc85d-1] |
| `frontend:services/authService.ts:49-53` | La méthode forgotPassword n'envoie la locale que si elle est supportée, sinon le payload ne contient que l'email. | [#fc7aea8875be8be1-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/AuthRequest.java:7-8` | Le champ username est obligatoire et limité à 100 caractères. | [#f172a051fac01b62-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/AuthRequest.java:11-12` | Le champ password est obligatoire et limité à 100 caractères. | [#aebf5f8226e56be2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ChangePasswordRequest.java:20-22` | Le champ newPassword est annoté @NotBlank et @StrongPassword. | [#3f255ce5de6bd69b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/DeleteAccountRequest.java:19-20` | Le champ username est annoté @NotBlank, donc un username vide est refusé avant tout accès à la base. | [#89c547e8244fcf35-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ForgotPasswordRequest.java:24-26` | Le champ email est annoté @NotBlank et @Email. | [#2dc48d2ff642144c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/RegisterRequest.java:11-13` | Le champ name est obligatoire et doit faire entre 3 et 20 caractères. | [#c09fb9c62caf219a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/RegisterRequest.java:15-17` | Le champ username est obligatoire et doit faire entre 3 et 20 caractères. | [#0db2b01f96f26446-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/RegisterRequest.java:19-21` | Le champ email est obligatoire et doit être au format email. | [#c3b0d1f3636a7cb0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/RegisterRequest.java:23-25` | Le champ password est obligatoire et soumis à la contrainte StrongPassword. | [#b73146529462ac20-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ResetPasswordRequest.java:17-22` | Les champs token et newPassword sont obligatoires, et newPassword est soumis à StrongPassword. | [#8fc6b2aa851360e4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/UpdatePreferencesRequest.java:19-21` | themePreference doit être non nul et valoir exactement light, dark ou system. | [#bf3a08573de2927d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/UserUpdateRequest.java:15-25` | name et username sont obligatoires entre 3 et 20 caractères, et email est obligatoire au format email. | [#5d6d1af1e1d3e44c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:68-70` | Un contenu nul ou vide lève InvalidAvatarException avec le message fichier vide. | [#03ded0c6fbc9b97d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:77-79` | Un contenu dont les magic bytes ne correspondent ni à JPEG, ni à PNG, ni à WebP lève InvalidAvatarException. | [#03ded0c6fbc9b97d-3] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:184-186` | Un conflit de verrou optimiste lors de la consommation du token lève InvalidPasswordResetTokenException. | [#ff14c981b945f4fa-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:71-73` | changePassword vérifie l'ancien mot de passe contre le hash courant avec passwordEncoder.matches et lève InvalidCredentialsException en cas d'échec. | [#6d9644d06bc8f672-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:76-78` | changePassword lève SamePasswordException si le nouveau mot de passe correspond au hash courant, contrôle effectué après la vérification de l'ancien. | [#6d9644d06bc8f672-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:98-100` | deleteAccount lève AccountDeletionMismatchException avant toute écriture si le username de confirmation est null ou différent du username du caller. | [#0ec9a144d275a5ac-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:143-144` | updateThemePreference lève UserNotFoundException si le compte du caller n'existe plus lors de l'écriture. | [#cc1c3c175c1acfe8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/validation/StrongPasswordValidator.java:28-30` | isValid retourne false si la longueur est hors des bornes MIN_LENGTH et MAX_LENGTH. | [#e2385a30ad2b3acd-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java:40-48` | fromValue accepte uniquement une correspondance exacte en minuscules et lève IllegalArgumentException si la valeur est null ou inconnue. | [#2a37cc6ebfaaa747-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:132-137` | Une BadCredentialsException pendant le login renvoie 401 avec le code unauthorized, sans distinguer un username inconnu d'un mot de passe faux. | [#authorization/d721b13c15555833-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:132-137` | Une BadCredentialsException levée par AuthenticationManager produit un 401 avec un code neutre, sans distinguer identifiant inconnu et mot de passe faux. | [#75b1482fae455a05-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:168-171` | Si jwtService.validateToken renvoie false pour le token et le CustomUserDetails construit, /me renvoie 401 unauthorized. | [#authorization/bcafc46980fb2c8b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:234-242` | Une DataIntegrityViolationException, par exemple une violation d'unicité sur username ou email, renvoie un 409 avec le code conflict. | [#85963bd8c274bb03-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:328-333` | Toute JwtException levée pendant le refresh renvoie un 401 générique, sans ré-émission de token. | [#889aeaf59cfbce87-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:126-127` | Un username déjà pris par un autre compte renvoie un 409 avec le code conflict, corps identique à celui de register. | [#f5db57cd5ddb27bd-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:151-152` | Javadoc : Selon la javadoc, une valeur de thème autre que light, dark ou system, ou une valeur null ou absente, donne un 400 via UpdatePreferencesRequest. | [#96c7209287045714-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:175-177` | Javadoc : Selon la javadoc, un ancien mot de passe faux donne un 400 via InvalidCredentialsException, et le nouveau mot de passe est validé à au moins 6 caractères par @Valid. | [#6cafba87a980c0d0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:246-249` | Une IOException à la lecture du fichier lève InvalidAvatarException avec le message générique fichier illisible. | [#fea8062a81c7fd19-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java:58-60` | Si le token n'est pas trouvé par findById, la méthode lève une IllegalStateException. | [#086e1fb17288e404-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:70-72` | Un username nul ou vide renvoie Optional.empty() sans interroger UserService. | [#authorization/01b8035a5555822a-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:24-25` | Lève UsernameNotFoundException lorsqu'aucun utilisateur ne correspond au username demandé. | [#6ecee61610ed0536-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:81-83` | Une clé privée mal formée fait échouer le démarrage avec une IllegalStateException qui ne journalise ni la valeur ni le message de la cause. | [#8d5689df1cb8a729-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:221-223` | Un jeton null ou blanc lève MalformedJwtException avant toute vérification de signature. | [#9e1fb7d7f49720f6-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:229-234` | Un jeton dont l'en-tête n'est pas RS256 lève UnsupportedJwtException après la vérification de signature. | [#9e1fb7d7f49720f6-2] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/AvatarServiceImplTest.java:120-128` | Un fichier dont les octets ne sont ni JPEG, ni PNG, ni WebP est rejeté par InvalidAvatarException sans appel à store ni à save. | [#cc70441643b581a7-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/AvatarServiceImplTest.java:130-134` | Un fichier vide est rejeté par InvalidAvatarException sans appel à store. | [#951cc992c3c79d05-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/AvatarServiceImplTest.java:136-143` | Un fichier plus grand que la taille maximale est rejeté par InvalidAvatarException avant le contrôle des magic bytes. | [#eabeb42ae4e10cd0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java:121-129` | Un token introuvable en base lève InvalidPasswordResetTokenException et n'enregistre aucun utilisateur. | [#539a07080842f312-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java:132-138` | Un token qui n'est pas un UUID lève InvalidPasswordResetTokenException sans aucune recherche en base. | [#69d90637268b646a-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java:141-152` | Un token dont la date d'expiration est passée lève InvalidPasswordResetTokenException et ne modifie pas l'utilisateur. | [#2494870e3d79be57-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java:155-167` | Un token déjà consommé, même non expiré, lève InvalidPasswordResetTokenException. | [#3e85638835f33440-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java:198-210` | Un token valide dont l'utilisateur n'existe plus lève InvalidPasswordResetTokenException sans sauvegarde. | [#e9107cb54ed4d836-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerValidationTest.java:55-63` | Le test attend un 400 pour un inscription dont l'email est not-an-email. | [#7e0cc2282941f3f6-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerValidationTest.java:66-74` | Le test attend un 400 pour une inscription dont le mot de passe est vide. | [#b5a6382bb0d702fa-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerValidationTest.java:77-84` | Le test attend un 400 pour un login dont le username et le mot de passe sont vides. | [#367f2acb7a4b4b54-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/PasswordResetEndpointsIntegrationTest.java:50-51` | Javadoc : Selon la javadoc, un corps sans email est rejeté en 400 par la validation @Valid du DTO forgot-password. | [#50d952b04aa84a0d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/PasswordResetEndpointsIntegrationTest.java:93` | Javadoc : Selon la javadoc, un newPassword de moins de 8 caractères est rejeté en 400 par @Valid (BR-AUT-003). | [#c9ac9920eadf46a4-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java:209-211` | Une valeur LIGHT en majuscules envoyée à PUT /api/me/preferences est rejetée en 400 avec le corps error validation_failed. | [#305052602b3573de-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java:213-217` | Une préférence null envoyée à PUT /api/me/preferences est rejetée en 400. | [#305052602b3573de-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:141-156` | Lorsque findDomainUserByUsername renvoie un autre compte, PATCH /api/me répond 409 avec error égal à ErrorCode.CONFLICT et n'appelle jamais updateUser. | [#080a98154a6900c0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:207-224` | Lorsque l'ancien mot de passe est faux, changePassword lève InvalidCredentialsException et POST /api/me/change-password répond 400 avec error bad_request et message invalid current password. | [#327e307fb334f34d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:226-240` | Lorsque le changement de mot de passe réussit, POST /api/me/change-password répond 204 et délègue à userService.changePassword avec le caller résolu. | [#734d91e8e34a9072-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:242-259` | Lorsque le nouveau mot de passe est identique à l'ancien, changePassword lève SamePasswordException et la réponse est 400 avec message new password must differ. | [#eddbc155f81a85dd-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:261-271` | Commentaire : Un newPassword hors politique (abc) déclenche la validation @Valid et une réponse 400. | [#abb74f4fb17d0207-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:288-298` | Commentaire : DELETE /api/me sans corps répond 400 avant l'exécution du corps de méthode, donc sans appel au port deleteAccount. | [#4113343a93481532-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:301-313` | Commentaire : DELETE /api/me avec un username vide répond 400 par la contrainte @NotBlank, avant tout appel à deleteAccount. | [#525f1e6ad20748d9-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:315-332` | Commentaire : Lorsque la confirmation du username ne correspond pas, deleteAccount lève AccountDeletionMismatchException et la réponse est 400 avec le message username confirmation does not match. | [#08fe4b6e0d0af3e1-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:392-408` | Lorsque avatarService.uploadAvatar lève InvalidAvatarException, POST avatar répond 400 avec error bad_request et le message du service. | [#7e324bcd5fbc30ef-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:484-504` | PUT /api/me/preferences avec themePreference dark répond 200 sans hash, et délègue à updateThemePreference avec le caller résolu depuis le JWT. | [#498ba4c67330e52b-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:506-526` | Les valeurs LIGHT, Dark, ' system', auto, vide, null, un objet vide ou une clé theme sont rejetées en 400 avec error validation_failed, sans écriture. | [#723a0620e947d336-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:528-537` | PUT /api/me/preferences sans corps répond 400 et n'appelle pas updateThemePreference. | [#6287f487c2154a7e-1] |
| `frontend:components/settings/AvatarUpload.tsx:64-67` | Un fichier dont le type MIME ne commence pas par image/ est refusé et affiche l'erreur profile.avatar.errorType. | [#95f84e8bd8d45cb9-1] |
| `frontend:components/settings/AvatarUpload.tsx:68-71` | Un fichier dont la taille dépasse MAX_BYTES est refusé et affiche l'erreur profile.avatar.errorSize. | [#95f84e8bd8d45cb9-2] |
| `frontend:components/settings/ProfileSection.tsx:38` | Le formulaire valide ses valeurs avec le schéma createProfileSchema via zodResolver. | [#602983088fbfa257-1] |
| `frontend:components/settings/SecuritySection.tsx:38-41` | Le formulaire de changement de mot de passe est validé par le schéma createChangePasswordSchema via zodResolver. | [#abbe6794391b3d0d-1] |
| `frontend:components/settings/useDeleteAccountFlow.ts:48-51` | Le formulaire react-hook-form valide ses valeurs avec un schéma Zod créé par createDeleteAccountSchema à partir du username de l'utilisateur connecté. | [#fbfb6edeb0e19131-1] |
| `frontend:contexts/AuthContext.tsx:284-289` | useAuth lève une erreur si le contexte est null, c'est-à-dire hors d'un AuthProvider. | [#25e2c4636268e07b-1] |
| `frontend:hooks/useThemeChoice.ts:67-69` | isThemeChoice accepte une valeur seulement si c'est une chaîne présente dans THEME_OPTIONS. | [#a6588dcae7a56eba-1] |
| `frontend:lib/schemas/auth.ts:65` | Un mot de passe de moins de 8 caractères lève la clé validation.password.min. | [#bc61a196ad51a62e-1] |
| `frontend:lib/schemas/auth.ts:66` | Un mot de passe de plus de 100 caractères lève la clé validation.password.max. | [#bc61a196ad51a62e-2] |
| `frontend:lib/schemas/auth.ts:67` | Un mot de passe sans majuscule lève la clé validation.password.uppercase. | [#bc61a196ad51a62e-3] |
| `frontend:lib/schemas/auth.ts:68` | Un mot de passe sans chiffre lève la clé validation.password.number. | [#bc61a196ad51a62e-4] |
| `frontend:lib/schemas/auth.ts:97` | Un username de moins de 3 caractères lève la clé validation.username.min dans le formulaire de login. | [#f6b8e76a851d7108-1] |
| `frontend:lib/schemas/auth.ts:98` | Un mot de passe de moins de 6 caractères lève la clé validation.password.loginMin dans le formulaire de login. | [#f6b8e76a851d7108-2] |
| `frontend:lib/schemas/auth.ts:138` | Si password et confirmPassword diffèrent, l'erreur validation.password.match est levée sur le champ confirmPassword. | [#64a91db71f56df5a-1] |
| `frontend:lib/schemas/auth.ts:157` | Un email invalide lève la clé validation.email.invalid dans le formulaire de mot de passe oublié. | [#a7180068771f5bca-1] |
| `frontend:lib/schemas/auth.ts:187-188` | Si newPassword et confirmPassword diffèrent, l'erreur validation.password.match est levée sur le champ confirmPassword. | [#54b11dd25fc13a86-1] |
| `frontend:lib/schemas/settings.ts:37-48` | Le schéma profil exige un name de 3 à 20 caractères et un username de 3 à 20 caractères, avec les messages validation.name.min et validation.name.max pour le nom. | [#acc006fd63ea269b-1] |
| `frontend:lib/schemas/settings.ts:67` | Le schéma de changement de mot de passe exige un oldPassword non vide, avec la clé validation.password.required. | [#4db1c494b3a92d56-1] |
| `frontend:lib/schemas/settings.ts:72-73` | Le newPassword doit contenir une majuscule et un chiffre, sinon les clés validation.password.uppercase et validation.password.number sont levées. | [#4db1c494b3a92d56-2] |
| `frontend:lib/schemas/settings.ts:76-79` | Le schéma refuse un confirmPassword différent de newPassword, avec la clé validation.password.match posée sur confirmPassword. | [#4db1c494b3a92d56-3] |
| `frontend:lib/schemas/settings.ts:96-98` | Le schéma de suppression de compte exige que confirmUsername soit égal au username attendu, sinon la clé settings.account.delete.mismatch est levée. | [#4a914af96983eb97-1] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:178-182` | /me renvoie 401 lorsque le jti du token est révoqué ou inconnu, selon sessionService.isSessionActive, et accepte les tokens sans jti. | [#badc1ab0e710d816-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:64-68` | Court-circuite vers Optional vide si l'authentification est absente, non authentifiée ou de type AnonymousAuthenticationToken. | [#4e9ab852d428a2b2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:161` | Le endpoint /actuator/health est accessible sans authentification. | [#35b62e81861ea474-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:173` | Toutes les routes /api/auth/** sont accessibles sans authentification. | [#authorization/98b2cdbd7d200daa-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:174-182` | Commentaire : Les routes /api/users, /api/products, /api/events, /api/sessions, /api/me et /api/export exigent l'autorité ROLE_USER, avec la même convention de matcher pour chaque préfixe. | [#authorization/98b2cdbd7d200daa-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:183` | Commentaire : Toute requête non couverte par un matcher précédent exige un principal authentifié, sans contrôle de rôle supplémentaire. | [#authorization/98b2cdbd7d200daa-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:134-139` | Une requête anonyme ou non authentifiée n'est pas comptée et passe au filtre suivant, l'AuthorizationFilter répondant alors 401. | [#authorization/7ec7fee86ff9e720-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:140-145` | Un principal authentifié sans identifiant de compte reçoit une réponse 401 JSON unauthorized, sans comptage. | [#e5aa1bfc7a6eeec1-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java:224-227` | Un appel anonyme à PUT /api/me/preferences est refusé en 401 par la chaîne Spring Security. | [#dd96a418dbc435ce-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:539-548` | Commentaire : Sans utilisateur authentifié, PUT /api/me/preferences répond 401 et n'écrit rien. | [#080263c7947fe9c4-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/AuthErrorContractIntegrationTest.java:52-59` | Vérifie qu'un utilisateur authentifié sans ROLE_USER reçoit 403 en JSON avec error égal à forbidden. | [#de8e77b72bb1da53-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:86-94` | Un principal authentifié qui n'est pas CustomUserDetails reçoit un 401 sur la route PUT /api/me/preferences et n'atteint pas la chaîne. | [#71318043ab9cb750-1] |

## Traitements batch {#t-batch_job}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:70-71` | La purge des tokens est planifiée en fixedDelay avec un intervalle par défaut de 86 400 000 ms (24 h) et un premier passage différé par défaut de 300 000 ms (5 min). | [#batch/99a2df300c170ed7-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:37-38` | Javadoc : Selon le commentaire, le tick @Scheduled automatique a un initial-delay de 5 min par défaut. | [#58e7ef1057f49abf-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:104` | Le test appelle directement purgeConsumedAndExpired, qui supprime les tokens consommés ou expirés hors fenêtre de rétention. | [#381f74b3f75824aa-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/AuthResponse.java:3-4` | Écart à la convention observée dans le lot : AuthResponse utilise Lombok, alors que CategoryRequest, ResetPasswordRequest et UserUpdateRequest écrivent getters et setters à la main. | [#backend-core/880b8a8343456225-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/UserMapper.java:22-32` | Dans ce fichier, ni toDomain ni toEntity ne transmettent de préférence de thème, alors que UserResponse.fromDomain lit getThemePreference(). | [#b27fcba9392a89a4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:72` | Le message d'erreur annonce 5 Mo en dur, alors que la limite réelle vient de app.storage.avatar-max-bytes. | [#8d758cbb64816069-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:172-180` | Selon le commentaire, remplacer saveAndFlush par un persist ou merge sans flush ferait sortir la détection du conflit optimiste du try. | [#4605b058155a4625-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:75` | Le filtre réel de suppression (consommé ou expiré avant la fenêtre) est délégué au port et n'est pas lu dans ce lot, seule la javadoc le décrit ici. | [#batch/9f17520211d2f332-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/UserDataExportAssembler.java:25` | La javadoc annonce des produits actifs, mais le code appelle findByUserId sans filtre sur l'état actif dans ce fichier. | [#227cb5cc59f7b0f7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/validation/StrongPassword.java:38-39` | Le message par défaut de la contrainte StrongPassword est écrit en français, alors que les autres messages de validation du lot sont en anglais, et que d'autres DTOs n'en déclarent pas. | [#backend-core/5a9de540919d7828-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/validation/StrongPasswordValidator.java:35-37` | Le contrôle utilise Character.isUpperCase et Character.isDigit, qui acceptent aussi des caractères non ASCII, ce que la javadoc de l'annotation ne précise pas. | [#f18e76954e811b5e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/User.java:10` | Le champ role de User est typé String, alors que l'enum Role existe dans le même package. | [#61c574942f6d4fe2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/PasswordResetService.java:33` | La javadoc indique un mot de passe d'au moins 6 caractères, alors que StrongPasswordValidator.MIN_LENGTH impose 8 caractères. | [#95c9f387250b23ad-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:66` | Le constructeur reçoit le paramètre userDetailsService sans le stocker ni l'utiliser dans le corps du constructeur. | [#5db7c71329ea02ad-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:111-113` | Aucune limitation de tentatives de connexion n'apparaît dans ce fichier pour le endpoint /login. | [#authorization/26ad297918aedaff-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:145-146` | Le endpoint /me lit le JWT depuis le cookie brut via @CookieValue et ne passe pas par CallerResolver, alors que la javadoc de CallerResolver décrit cette extraction comme remplacée par la lecture du contexte de sécurité. | [#authorization/36aa78900fe7b738-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:212-217` | Le code répond 409 si le username existe et 201 sinon, ce qui permet de tester l'existence d'un compte par le statut HTTP. Le commentaire de UserController indique que ce choix est assumé. | [#2c384990004f6953-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:363` | La javadoc écrit « non expiré >15 min », formulation ambiguë dont le sens exact (délai de 15 minutes) dépend du service non lu ici. | [#fb837e23ba845f87-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:117-120` | Selon le commentaire, la contrainte DB unique n'était pas encore posée à la rédaction, et la vérification d'unicité reste uniquement applicative avec une race possible. | [#97b09f09b018a856-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java:83-89` | Le fichier contient un chemin de repli où un id absent en base conduit à une création, sans erreur signalée au appelant. | [#0747b8c3ebe8fd23-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:23` | La javadoc de la classe cite BR-AUT-005/BR-AUT-012 pour le flux forgot-password, alors que la javadoc de BrevoEmailService indique que BR-AUT-005 est une mauvaise étiquette pour ce flux. | [#e064fae9d9722ffb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetails.java:40-59` | Le commentaire indique que la logique reste à implémenter, et les méthodes isAccountNonExpired, isAccountNonLocked, isCredentialsNonExpired et isEnabled renvoient toutes true en dur. | [#b13f9b62a1d0f815-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:97-99` | En mode éphémère, la paire RS256 est régénérée à chaque démarrage et journalise un avertissement indiquant que les jetons émis sont invalidés au redémarrage. | [#authorization/6d1d59909a7eca5b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:145-174` | generateToken(String) n'ajoute ni claim jti ni claim role, alors que generateToken(Authentication) ajoute les deux, ce qui constitue un écart entre les deux surcharges. | [#backend-core/46b3392f051dc8d7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:145-156` | Le fichier contient deux surcharges de generateToken, et la surcharge à username ne pose pas de jti alors que la surcharge Authentication en pose un, ce qui rend ce jeton non révocable par session selon le commentaire de la classe. | [#0a8688057919d2b4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:241-244` | validateToken avale toute exception via catch (Exception) et renvoie false, sans journalisation. | [#authorization/dfeb9a6862fd5358-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:128-133` | La table LIMITS ne contient qu'une seule clé exacte, si bien que toute autre requête authentifiée n'est pas plafonnée par ce filtre. | [#authorization/3d2d7f98e0c7f971-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:25` | Le commentaire de classe indique les migrations V1 à V15, alors que le dossier de migrations contient aussi V16 (user_theme_preference), lue dans ce lot. | [#c5476bafb350226d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:187-192` | Selon le commentaire, le dépôt est public et le diagnostic part dans les logs CI, ce qui justifie le masquage des valeurs de cookie et d'en-têtes d'authentification. | [#82e77664203cfdc1-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:319-321` | Selon le commentaire, le flakiness signalé par l'audit n'a pas été reproduit, et le changement de sous-réseau supprime un couplage sans cause établie. | [#41e62bfd5f350f20-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:166-176` | Le nom de la méthode contient notFound alors que le test attend un 401 générique. Le fichier contient un nom de test qui ne correspond pas à son assertion. | [#fa60a46d6dd6e480-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:348-359` | Le nom de la méthode contient NotFound alors que le test attend un 401 générique. Le fichier contient un nom de test qui ne correspond pas à son assertion. | [#b5b6fed9ee4b11a1-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:120-132` | Le nom de la méthode annonce qu'aucun email n'est envoyé, mais la méthode ne contient aucune vérification sur emailService. Le test ne vérifie donc pas l'absence d'envoi. | [#881306212b0fb628-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RegisterLoginIntegrationTest.java:29` | Le commentaire de classe indique des migrations V1 à V10, alors que le fichier CLAUDE.md du projet mentionne des migrations jusqu'à V16, donc ce commentaire paraît daté. | [#19ef43469ffe9303-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java:235` | L'assertion accepte n'importe quelle Exception, donc le test ne prouve pas à lui seul que l'exception vient de la contrainte CHECK ck_users_theme_preference. | [#b6bffa88605b5bf0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/UserRoleConstraintIntegrationTest.java:68-73` | Les tests de rejet vérifient seulement la classe générique Exception, sans contrôler la contrainte précise qui a été violée. | [#integrations/ea446db909e94ef5-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java:48-50` | Selon la javadoc, un défaut a été découvert où une variante répondait 2xx sur seau vide sans que l'écriture soit comptée. | [#authorization/8b5e22a9c0f7fd0b-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java:158-159` | Le test écrit un diagnostic sur la sortie standard via System.out.printf, trace de débogage laissée dans un test d'intégration. | [#312abe7563005bbf-1] |
| `frontend:components/pages/HomePage.accent-roles.test.tsx:44` | La dérogation du wordmark est signalée comme en attente d'arbitrage dans le code, et un test vérifie qu'elle existe encore. | [#f83e71dbbd7b8c0c-1] |
| `frontend:components/pages/HomePage.tsx:26-27` | Le commentaire dit que le contenu de FeaturesSection est désormais dans HowItWorksSection avec l'ancre #features, alors que HomePage.test.tsx asserte que #features n'existe pas dans le rendu. | [#1ea3b1d1d9854c83-1] |
| `frontend:components/settings/AvatarUpload.tsx:107-109` | Le décalage est calculé avec clientX et clientY en pixels écran puis appliqué aux coordonnées du canvas de 256 px, lui-même affiché en 160 px sans facteur d'échelle, ce qui peut rendre le déplacement plus rapide que le pointeur. | [#08c97065fafc9820-1] |
| `frontend:components/settings/DeleteAccountSteps.tsx:29-34` | L'interface expose les props flow et onCancel obligatoires, avec titleId et descriptionId optionnels. | [#3c8c7cc5b8f5bf95-1] |
| `frontend:components/settings/ExportDataFlow.tsx:196-202` | Selon le commentaire, si une traduction perd la balise, next-intl rend le texte nu sans lever d'exception, ce qui fait perdre la balise time dans cette langue. | [#4f5666c71bb7e101-1] |
| `frontend:components/settings/ProfileSection.tsx:46` | Le commentaire dit que le reset suit le user d'AuthContext, alors que le user est lu depuis le hook useSettings (ligne 34). | [#7d07d9a7be75be30-1] |
| `frontend:components/settings/ProfileSection.tsx:51-52` | La règle react-hooks/exhaustive-deps est désactivée sur la ligne, et le tableau de dépendances ne contient que user?.id, donc un changement de name, username ou email du user ne relance pas le reset. | [#7d07d9a7be75be30-2] |
| `frontend:components/settings/mobile/BottomSheet.tsx:104-113` | Le callback onClose est appelé à l'intérieur de la fonction de mise à jour passée à setDragY, donc un effet de bord s'exécute dans un updater d'état. | [#30b4b49a847b61e7-1] |
| `frontend:components/settings/mobile/BottomSheet.tsx:143-152` | Selon le commentaire, la classe motion-safe:duration-200 armait une transition sur toutes les propriétés, ce qui animait max-height, et la restriction à transform corrige ce piège mesuré. | [#babd01b282687281-1] |
| `frontend:components/settings/mobile/MobileSettings.tsx:47-53` | Le commentaire renvoie au bouton fermer du BottomSheet à la ligne 181, alors que le bouton fermer commence à la ligne 182 du fichier BottomSheet.tsx lu dans ce lot. | [#0785078b66cb01e5-1] |
| `frontend:components/settings/mobile/SettingsIndex.test.tsx:9-12` | Le mock next-intl de ce fichier renvoie namespace.clé, alors que CtaSection.test et FooterSection.test renvoient la clé seule. Les tests du lot ne suivent pas un mock commun. | [#frontend-core/31e4140d2a82fdf7-1] |
| `frontend:components/settings/useDeleteAccountFlow.ts:59-61` | Le bloc catch ne distingue aucune erreur : toute exception de la mutation est remplacée par le message générique common.genericError sur le champ confirmUsername. | [#dbba6c53a789bf38-1] |
| `frontend:components/ui/theme-toggle.i18n.test.ts:52-60` | Le nom du test annonce l'absence de chaîne française en dur, alors que les assertions ne vérifient que la présence de appels de traduction attendus. | [#3ff85f94e4c199d8-1] |
| `frontend:components/ui/theme-toggle.tsx:90-91` | Selon le commentaire, un ancêtre en overflow:hidden clipperait en silence le pseudo-élément de 44 par 44 px qui déborde de 4 px sur chaque bord. | [#eaa2b09ce2823046-1] |
| `frontend:hooks/useSettings.ts:15` | useSettings type les mutations avec User importé depuis '@/types/user', alors qu'AuthContext et useCurrentUser utilisent User depuis '@/types/auth'. | [#fe5c7b81b7dd9db2-1] |
| `frontend:hooks/useSettings.ts:30-40` | Après un updateProfile réussi, seule la clé auth.me est invalidée, alors que le commentaire indique qu'AuthContext ne relit pas cette clé et que le user d'AuthContext n'est donc pas resynchronisé. | [#db5fd41bdd7f705f-1] |
| `frontend:hooks/useThemeChoice.test.tsx:31-35` | Selon le commentaire de l'en-tête, le garde-fou du seul écrivain est un balayage textuel qui ne voit pas un appel indirect de setTheme. | [#78328b6bcc0de1a2-1] |
| `frontend:hooks/useThemeChoice.ts:134-135` | Le commentaire indique un écran qui ne dépend pas du réseau et un PUT en échec sans retour arrière, mais le code appelle persist sans attendre ni gérer d'erreur, ce que le persisteur doit assumer. | [#c4d59b1aa2bcb242-1] |
| `frontend:lib/auth-guard-paths.test.ts:402` | Le test de settings asserte aussi que PROTECTED_EXTRA_SEGMENTS est vide, ce qui couple ce test à l'état d'une autre constante sans rapport direct avec settings. | [#48223180448666e0-1] |
| `frontend:lib/auth-guard-paths.ts:28-29` | Selon le commentaire, une route ajoutée sous (app) sans être déclarée dans cette liste resterait sans garde serveur, la liste étant maintenue à la main. | [#9bfc07bd4f5c3cc8-1] |
| `frontend:lib/auth-guard-paths.ts:157` | La comparaison met en minuscules le segment reçu mais pas les entrées de PROTECTED_SEGMENTS, si bien qu'une entrée en casse mixte ne correspondrait jamais. Le commentaire indique que la règle repose sur la convention de minuscules. | [#210745f7842cf48e-1] |
| `frontend:lib/auth-token-verify.ts:120` | Le contrôle d'expiration compare exp à nowMs : si nowMs vaut NaN, la comparaison est toujours fausse et un jeton expiré passe ce contrôle. | [#c329f8b8c8690d06-1] |
| `frontend:lib/schemas/auth.ts:175-180` | Le commentaire affirme que le backend tranche à l'identique avec @StrongPassword sur ChangePasswordRequest, ce qui n'est pas vérifiable depuis ce fichier car le backend n'est pas lu. | [#4f47e94c92bf075e-1] |
| `frontend:services/authService.ts:26-37` | Le code retourne apiClient.post sans await dans le bloc try, si bien que le catch ne capte pas une erreur de la requête d'inscription. | [#775e9e7033a036d2-1] |
| `frontend:services/userService.ts:23-24` | L'en-tête indique GET /api/me/export comme stub non livré, alors que le bloc final dit que ce stub a été retiré. | [#1f17439d94ef0a01-1] |
| `frontend:types/auth.ts:10-23` | Le fichier auth.ts déclare une interface User écrite à la main, en parallèle du type User dérivé de UserSchema dans user.ts, ce qui crée deux définitions du même type. | [#frontend-core/fcb2319587514c3b-1] |
| `frontend:types/auth.ts:31-32` | Le commentaire indique une resynchro depuis /api/auth/me, alors que authService.getUserProfile appelle /auth/me. | [#1ff1d69ff01b1a10-1] |
| `frontend:types/user.ts:8` | Le message d'erreur de l'email est codé en dur en anglais, alors que les autres schémas utilisent des clés i18n. | [#b50d229b45004121-1] |

## Endpoints {#t-endpoint}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ForgotPasswordRequest.java:7` | Javadoc : Selon la javadoc, la requête correspond à POST /api/auth/forgot-password. | [#b8bf54899a80088d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ResetPasswordRequest.java:8` | Javadoc : Selon la javadoc, la requête correspond à POST /api/auth/reset-password. | [#6cc21e6ffdff6623-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/UpdatePreferencesRequest.java:7` | Javadoc : Selon la javadoc, la requête correspond à PUT /api/me/preferences. | [#f63af7b08becdf1d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/UserUpdateRequest.java:8` | Javadoc : Selon la javadoc, la requête correspond à PATCH /api/me. | [#7219634e3958f741-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:25-28` | Javadoc : Selon la javadoc, SecurityConfig whiteliste ce chemin en permitAll, car le consommateur n'a pas encore de quoi s'authentifier. | [#integrations/c219dcc0ad52c39c-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java:32` | Javadoc : Selon la javadoc de la classe, l'endpoint testé est GET /.well-known/jwks.json. | [#ebad1f627488c187-1] |
| `frontend:components/settings/AccountSection.tsx:19-21` | Javadoc : Selon la javadoc, la suppression du compte passe par DELETE /api/me via useDeleteAccountFlow, et l'export par ExportDataFlow. | [#8c46720ba0c5cfc4-1] |

## Entités {#t-entity}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/PasswordResetTokenEntity.java:27-31` | Commentaire : Le champ id est annoté @Id sans @GeneratedValue, l'UUID étant assigné par l'application avant persist. | [#3d2f7790b251956b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/PasswordResetTokenEntity.java:45-48` | Commentaire : Le champ version est annoté @Version et mappé sur une colonne non nulle, selon le commentaire pour le verrou optimiste. | [#ae4a627b02fcf505-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java:41` | Commentaire : Selon le commentaire, le nom et le type de la colonne theme_preference doivent correspondre à V16. | [#a7e439b586fee252-1] |
