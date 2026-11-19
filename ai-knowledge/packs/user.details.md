# Annexe : user (partie 1/2)

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 41 | convention 13, business_rule 10, endpoint 5 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java` | 29 | test_case 24, business_rule 2, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 28 | test_case 20, business_rule 5, convention 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java` | 26 | endpoint 8, business_rule 5, convention 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java` | 20 | other 5, test_case 4, suspicious 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 19 | business_rule 5, convention 5, config 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java` | 17 | business_rule 5, service_method 3, validation 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java` | 16 | other 5, service_method 5, validation 4 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java` | 16 | test_case 12, other 2, business_rule 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java` | 15 | validation 5, business_rule 2, service_method 2 |
| `mytimeline:frontend/src/components/ui/dialog.tsx` | 15 | other 8, convention 4, business_rule 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java` | 14 | test_case 7, convention 4, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java` | 14 | test_case 7, convention 3, suspicious 2 |
| `mytimeline:frontend/src/components/ui/theme-toggle.tsx` | 14 | business_rule 6, other 5, convention 2 |
| `mytimeline:frontend/src/components/ui/toaster.tsx` | 14 | business_rule 6, config 5, other 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java` | 13 | test_case 5, business_rule 3, convention 2 |
| `mytimeline:frontend/src/components/ui/palette-color-picker.tsx` | 13 | business_rule 7, config 2, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java` | 12 | endpoint 3, config 2, other 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/AvatarServiceImplTest.java` | 12 | test_case 10, config 1, other 1 |
| `mytimeline:frontend/src/components/settings/PasswordStrength.test.tsx` | 12 | test_case 11, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java` | 11 | test_case 8, business_rule 1, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java` | 11 | other 3, test_case 3, suspicious 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RegisterLoginIntegrationTest.java` | 11 | convention 4, test_case 3, other 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportProfileTest.java` | 11 | test_case 6, config 2, business_rule 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java` | 11 | test_case 4, convention 3, business_rule 2 |
| `mytimeline:frontend/src/components/settings/AvatarUpload.tsx` | 11 | other 3, business_rule 2, state_transition 2 |
| `mytimeline:frontend/src/components/ui/button.tsx` | 11 | convention 6, other 5 |
| `mytimeline:frontend/src/services/userService.ts` | 11 | service_method 6, other 3, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java` | 10 | business_rule 3, convention 2, i18n_key 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java` | 10 | persistence_query 3, business_rule 2, convention 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/PasswordResetEndpointsIntegrationTest.java` | 10 | test_case 6, business_rule 2, endpoint 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplateTest.java` | 10 | test_case 5, convention 3, business_rule 1 |
| `mytimeline:frontend/src/components/settings/PasswordStrength.tsx` | 10 | business_rule 5, other 3, i18n_key 1 |
| `mytimeline:frontend/src/components/ui/palette-color-picker.test.tsx` | 10 | test_case 8, other 2 |
| `mytimeline:frontend/src/components/ui/tabs.tsx` | 10 | business_rule 4, convention 3, other 3 |
| `mytimeline:frontend/src/components/ui/theme-toggle.test.tsx` | 10 | test_case 10 |
| `mytimeline:frontend/src/lib/schemas/password-policy.test.ts` | 10 | test_case 5, business_rule 3, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/UserDataExport.java` | 9 | other 8, business_rule 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java` | 9 | business_rule 3, other 3, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java` | 9 | business_rule 2, convention 2, suspicious 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java` | 9 | convention 6, business_rule 1, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java` | 9 | business_rule 3, other 3, convention 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java` | 9 | test_case 3, config 2, convention 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/UserRoleConstraintIntegrationTest.java` | 9 | test_case 6, convention 1, persistence_query 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CallerResolverTest.java` | 9 | test_case 6, business_rule 1, other 1 |
| `mytimeline:frontend/src/components/ui/tabs.test.tsx` | 9 | test_case 8, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java` | 8 | convention 4, entity 3, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java` | 8 | business_rule 5, other 1, suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/validation/PasswordPolicyTest.java` | 8 | test_case 5, business_rule 2, suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/domain/models/export/UserDataExportTest.java` | 8 | test_case 6, business_rule 2 |
| `mytimeline:frontend/src/components/ui/button.hover-pairing.test.ts` | 8 | test_case 5, other 3 |
| `mytimeline:frontend/src/components/ui/language-selector.tsx` | 8 | other 3, business_rule 1, convention 1 |
| `mytimeline:frontend/src/components/ui/theme-toggle.i18n.test.ts` | 8 | test_case 8 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/validation/StrongPasswordValidator.java` | 7 | business_rule 6, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java` | 7 | convention 3, business_rule 1, entity 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/User.java` | 7 | other 3, convention 2, entity 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/UserServiceImplTest.java` | 7 | business_rule 3, test_case 3, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenConcurrencyIntegrationTest.java` | 7 | test_case 4, convention 2, business_rule 1 |
| `mytimeline:frontend/src/components/ui/avatar.tsx` | 7 | other 4, convention 2, business_rule 1 |
| `mytimeline:frontend/src/components/ui/dialog.test.tsx` | 7 | test_case 7 |
| `mytimeline:frontend/src/components/ui/select.tsx` | 7 | config 3, other 2, business_rule 1 |
| `mytimeline:frontend/src/components/ui/toaster.test.tsx` | 7 | test_case 7 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/UserResponse.java` | 6 | other 3, business_rule 2, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java` | 6 | other 2, batch_job 1, business_rule 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java` | 6 | business_rule 3, entity 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/AvatarService.java` | 6 | other 5, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/PasswordResetService.java` | 6 | other 2, business_rule 1, service_method 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/UserService.java` | 6 | other 3, business_rule 1, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java` | 6 | business_rule 1, entity 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/PasswordResetTokenEntity.java` | 6 | convention 3, entity 2, business_rule 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerDevProfileCookieTest.java` | 6 | test_case 2, config 1, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerErrorContractTest.java` | 6 | test_case 5, other 1 |
| `mytimeline:frontend/src/components/ui/dropdown-menu.tsx` | 6 | convention 3, other 2, config 1 |
| `mytimeline:frontend/src/components/ui/form.tsx` | 6 | other 3, convention 2, suspicious 1 |
| `mytimeline:frontend/src/components/ui/toast.tsx` | 6 | business_rule 2, convention 2, other 2 |
| `mytimeline:frontend/src/components/ui/tooltip.tsx` | 6 | other 4, convention 2 |
| `mytimeline:frontend/src/types/user.ts` | 6 | entity 3, other 2, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/ChangePasswordRequest.java` | 5 | validation 2, business_rule 1, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/RegisterRequest.java` | 5 | validation 4, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserDataExportAssembler.java` | 5 | business_rule 1, persistence_query 1, service_method 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/PasswordResetTokenRepository.java` | 5 | other 4, business_rule 1 |
| `mytimeline:backend/src/main/resources/db/migration/V12__users_role_not_null_check.sql` | 5 | db_change 3, config 1, convention 1 |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql` | 5 | db_change 3, convention 1, other 1 |
| `mytimeline:backend/src/main/resources/db/migration/V6__create_password_reset_tokens.sql` | 5 | db_change 4, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerValidationTest.java` | 5 | test_case 3, convention 1, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenCreateStatisticsIntegrationTest.java` | 5 | test_case 3, convention 1, other 1 |
| `mytimeline:frontend/src/components/ui/badge.tsx` | 5 | other 3, convention 2 |
| `mytimeline:frontend/src/components/ui/button.stories.tsx` | 5 | other 4, convention 1 |
| `mytimeline:frontend/src/components/ui/card.tsx` | 5 | other 4, convention 1 |
| `mytimeline:frontend/src/components/ui/footer-app.tsx` | 5 | i18n_key 2, convention 1, suspicious 1 |
| `mytimeline:frontend/src/components/ui/popoverPicker.tsx` | 5 | other 2, business_rule 1, convention 1 |
| `mytimeline:frontend/src/hooks/useCurrentUser.test.tsx` | 5 | other 3, test_case 2 |
| `mytimeline:frontend/src/hooks/useCurrentUser.ts` | 5 | other 3, store_action 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/DeleteAccountRequest.java` | 4 | business_rule 1, convention 1, endpoint 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/ResetPasswordRequest.java` | 4 | validation 2, business_rule 1, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/UpdatePreferencesRequest.java` | 4 | validation 2, convention 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/UserUpdateRequest.java` | 4 | convention 1, endpoint 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/validation/StrongPassword.java` | 4 | convention 2, other 1, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/UserRepository.java` | 4 | convention 2, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java` | 4 | convention 2, service_method 1, suspicious 1 |
| `mytimeline:frontend/src/components/ui/checkbox.tsx` | 4 | other 3, convention 1 |
| `mytimeline:frontend/src/components/ui/language-selector.a11y.test.tsx` | 4 | test_case 4 |
| `mytimeline:frontend/src/components/ui/popover.tsx` | 4 | other 2, config 1, convention 1 |
| `mytimeline:frontend/src/components/ui/tag.tsx` | 4 | business_rule 2, other 1, suspicious 1 |
| `mytimeline:frontend/src/services/userService.test.ts` | 4 | test_case 3, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/ForgotPasswordRequest.java` | 3 | endpoint 1, other 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/PasswordResetTokenMapper.java` | 3 | service_method 2, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/UserMapper.java` | 3 | convention 1, service_method 1, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/EmailService.java` | 3 | other 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetails.java` | 3 | entity 1, other 1, suspicious 1 |
| `mytimeline:frontend/src/components/ui/badge.stories.tsx` | 3 | other 3 |
| `mytimeline:frontend/src/components/ui/checkbox.stories.tsx` | 3 | other 2, convention 1 |
| `mytimeline:frontend/src/components/ui/icon-button.tsx` | 3 | convention 2, config 1 |
| `mytimeline:frontend/src/components/ui/language-selector.i18n.test.ts` | 3 | test_case 3 |
| `mytimeline:frontend/src/types/user.test.ts` | 3 | test_case 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/AuthRequest.java` | 2 | validation 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/AccountDeletionMismatchException.java` | 2 | other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/AvatarNotFoundException.java` | 2 | other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/InvalidAvatarException.java` | 2 | other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/InvalidCredentialsException.java` | 2 | other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/InvalidPasswordResetTokenException.java` | 2 | other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/SamePasswordException.java` | 2 | other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/UserNotFoundException.java` | 2 | other 2 |
| `mytimeline:backend/src/main/resources/db/migration/V15__password_reset_tokens_version.sql` | 2 | db_change 1, other 1 |
| `mytimeline:frontend/src/components/ui/avatar.stories.tsx` | 2 | other 2 |
| `mytimeline:frontend/src/components/ui/card.stories.tsx` | 2 | convention 1, other 1 |
| `mytimeline:frontend/src/components/ui/dialog.stories.tsx` | 2 | other 2 |
| `mytimeline:frontend/src/components/ui/input.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/ui/radio.tsx` | 2 | other 2 |
| `mytimeline:frontend/src/components/ui/select.stories.tsx` | 2 | other 2 |
| `mytimeline:frontend/src/components/ui/spinner.tsx` | 2 | other 2 |
| `mytimeline:frontend/src/components/ui/switch.tsx` | 2 | other 2 |
| `mytimeline:frontend/src/components/ui/table.tsx` | 2 | convention 2 |
| `mytimeline:frontend/src/components/ui/tabs.stories.tsx` | 2 | other 2 |
| `mytimeline:frontend/src/components/ui/textarea.tsx` | 2 | business_rule 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/AvatarContent.java` | 1 | entity 1 |
| `mytimeline:frontend/src/components/ui/icon-button.stories.tsx` | 1 | other 1 |
| `mytimeline:frontend/src/components/ui/input.stories.tsx` | 1 | other 1 |
| `mytimeline:frontend/src/components/ui/label.tsx` | 1 | convention 1 |
| `mytimeline:frontend/src/components/ui/radio.stories.tsx` | 1 | other 1 |
| `mytimeline:frontend/src/components/ui/switch.stories.tsx` | 1 | other 1 |
| `mytimeline:frontend/src/components/ui/table.stories.tsx` | 1 | other 1 |
| `mytimeline:frontend/src/components/ui/tag.stories.tsx` | 1 | other 1 |
| `mytimeline:frontend/src/components/ui/textarea.stories.tsx` | 1 | other 1 |
| `mytimeline:frontend/src/components/ui/toast.stories.tsx` | 1 | other 1 |
| `mytimeline:frontend/src/components/ui/tooltip.stories.tsx` | 1 | other 1 |

## Structure (suite) {#t-structure_overflow}

| Pointeur | Symbole | Énoncé | Fait |
|---|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:203-219` | UserController.deleteCurrentUser | DELETE /api/me délègue la suppression du compte à UserService.deleteAccount avec le username saisi, puis efface le cookie jwt et répond 204. | [#6dc99624ee4f5fdd-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:233-256` | UserController.uploadAvatar | POST /api/me/avatar accepte un multipart de type multipart/form-data et transmet le contenu de la part file à AvatarService.uploadAvatar. | [#6a491107ed3002b8-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:264-275` | UserController.getAvatar | GET /api/me/avatar renvoie les octets de l'avatar du caller avec le Content-Type du type stocké. | [#f7d9fd0cefe79d35-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:282-290` | UserController.deleteAvatar | DELETE /api/me/avatar délègue à AvatarService.deleteAvatar pour le caller et répond 204. | [#1e1b98d1328d76fa-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:44-45` | E2eResetTokenController | Le contrôleur est annoté @Profile("e2e") et @RequestMapping("/api/test-support") et ne déclare aucune annotation de sécurité dans ce fichier. | [#1ed742974441f8cd-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:71-72` | E2eResetTokenController.latestUsableResetToken | Expose GET /api/test-support/password-reset-token avec le paramètre email, qui renvoie le token exploitable le plus récent. | [#c7abb657718092cb-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:87` | E2eResetTokenController.E2eResetTokenResponse | Le DTO de réponse ne contient que le champ token de type String. | [#833724751ac66738-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java:80-87` | ResetPasswordTokenRateLimitIntegrationTest.reset | Le helper reset envoie POST /api/auth/reset-password avec un corps JSON contenant token et newPassword NewSecret1, depuis une IP socket donnée. | [#d7dc5e33760290c8-1] |
| `mytimeline:frontend/src/components/settings/AvatarUpload.tsx:146-221` | AvatarUpload | Le composant affiche la zone de dépôt avec l'avatar actuel quand sourceUrl est absent, et le recadrage (canvas, zoom, boutons) quand sourceUrl est défini. | [#7b1d4ef2370cf8b0-1] |
| `mytimeline:frontend/src/components/settings/PasswordStrength.tsx:103-132` | PasswordStrength | Le composant ne rend rien si le mot de passe est vide, sinon quatre segments colorés et un libellé de niveau annoncé en aria-live polite. | [#739fab5fbd87bd85-1] |
| `mytimeline:frontend/src/components/ui/language-selector.tsx:168-194` | LanguageSelector | LanguageSelector affiche un bouton globe qui ouvre un menu listant les quatre langues, chaque item étant un lien vers la même route dans la locale choisie. | [#218ee4d7d29309da-1] |
| `mytimeline:frontend/src/components/ui/footer-app.tsx:7-48` | AppFooter | Le composant AppFooter affiche le pied de page avec l'année courante, la mention de droits réservés et deux liens vers les pages terms et privacy de la locale courante. | [#bd33144743840ce1-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java:17-23` | PasswordResetToken | Modèle immuable portant id, userId, token, expiresAt et usedAt, sans dépendance framework. | [#c342fa8964981090-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java:17-20` | ThemePreference | Enum à trois valeurs LIGHT, DARK et SYSTEM, chacune portant une valeur externe en minuscules. | [#91ad61b21554d634-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java:15-32` | UserEntity | L'entité est mappée sur la table users, avec un id UUID généré en AUTO, username et email uniques, et role non nul. | [#031affe1a66a3d3e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java:39-44` | UserEntity.themePreference | themePreference est converti par ThemePreferenceConverter dans la colonne theme_preference de longueur 16, sans contrainte nullable explicite. | [#3f1031a6800df02c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/UserEntity.java:46-52` | UserEntity.createdAt | createdAt est annoté @CreatedDate, non nul et non modifiable, et updatedAt est annoté @LastModifiedDate via AuditingEntityListener. | [#2d40482f1e19ff86-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/PasswordResetTokenEntity.java:24-48` | PasswordResetTokenEntity | L'entité est mappée sur la table password_reset_tokens, avec les colonnes id, user_id, token, expires_at, used_at et version. | [#28a8fc931f196d75-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/PasswordResetTokenEntity.java:36-37` | PasswordResetTokenEntity.token | Le champ token est non nul et unique, de type UUID. | [#ae440359e09d13c4-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java:34-41` | PasswordResetTokenRepositoryJpaImpl.create | create convertit le token du domaine en entité via le mapper puis le persiste avec super.save, sans lecture préalable. | [#4eec7e4da554ddf2-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java:52-54` | AuthControllerProdProfileCookieTest | La classe de test utilise un contexte Spring Web minimal, déclaré par SpringJUnitWebConfig, et charge le fichier application-prod.properties via TestPropertySource. | [#06422aec61cad1f8-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/User.java:6-18` | User | Modèle utilisateur portant id, username, name, password, role, email, avatar et themePreference. | [#5c7c9261a5f279ba-1] |
| `mytimeline:frontend/src/types/user.ts:4-18` | UserSchema | UserSchema est un schéma Zod décrivant UserResponse avec id, name, username, email, role, avatarUrl et themePreference. | [#bc58474de2fc85ce-1] |
| `mytimeline:frontend/src/types/user.ts:13` | UserSchema.avatarUrl | avatarUrl est une chaîne nullable, toujours présente, sans valeur par défaut. | [#faf07dbd8221ea3f-1] |
| `mytimeline:frontend/src/types/user.ts:17` | UserSchema.themePreference | themePreference est une énumération THEME_OPTIONS nullable, toujours présente. | [#722e39414f050e84-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetails.java:11-19` | CustomUserDetails | CustomUserDetails implémente UserDetails et encapsule une entité User avec une liste d'autorités fournie par le constructeur. | [#56bae8d1952df702-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/AvatarContent.java:8` | AvatarContent | Record immuable portant les octets d'un avatar et son type MIME. | [#b4af9c54c76c838a-1] |
| `mytimeline:frontend/src/hooks/useCurrentUser.ts:31` | useCurrentUser | La clé de requête utilisée est queryKeys.auth.me. | [#961a913b384b8222-1] |
| `mytimeline:frontend/src/hooks/useCurrentUser.ts:34` | useCurrentUser | La queryFn renvoie Promise.resolve du user courant d'AuthContext, sans requête HTTP. | [#961a913b384b8222-2] |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - changePassword vérifie d'abord l'ancien mot de passe (InvalidCredentialsException), puis refuse un nouveau identique au hash courant (SamePasswordException). [#9e9be01f5162e06f-1] [#18e50776984ca03a-1] [#18e50776984ca03a-2] | deducible |
| rules | - requestReset ne fait rien et ne signale rien si l'email est inconnu. [#0a6a3a7045f96a93-1] | deducible |
| rules | - La purge s'exécute toutes les 24 h par défaut, avec un premier passage après 5 minutes, et supprime les tokens consommés ou expirés avant maintenant moins la rétention. [#b6c240419a03f7b4-1] [#79756b133713f4b8-1] | deducible |
| rules | - Selon le test d'intégration, un token consommé est purgé même s'il expire dans le futur, un token expiré depuis 48 h est purgé et un token expiré depuis 30 min est conservé. [#6706a6e875fa5909-1] [#6706a6e875fa5909-2] [#6706a6e875fa5909-3] | deducible |
| rules | - L'ancien fichier d'avatar n'est supprimé que si sa référence existe et diffère de la nouvelle. [#5c618e66ccd37104-1] | deducible |
| tests | - Les tests fixent une politique de mot de passe de 8 à 100 caractères, identique pour register, reset et change-password, sans toucher oldPassword ni le login des comptes hérités [#20219d217ea213b4-1] [#c2b1c5fdadc2f38a-1] [#6fdd86b9caf0c313-1] [#5f7a4686a5b00d34-1] [#9eec73ecc1c5fcd5-1] [#9eec73ecc1c5fcd5-2]. | deducible |
| tests | - Un token de reset inconnu, non UUID, expiré, consommé ou sans utilisateur est rejeté, et une consommation concurrente n'aboutit qu'une fois [#fef5f96bdd43111c-1] [#27ee941f6d1b5775-1] [#7a957adaab7fa7b2-1] [#875208d53fa9b8a3-1] [#3ac1b97da7876c87-1]. | deducible |
| tests | - La sixième tentative sur un même token donne 429 avec Retry-After de 30 s [#3a28e9b1b4f8dcab-1] [#6934b62c30cf47c4-1]. | deducible |
| tests | - UserSchema exige avatarUrl (URL relative ou null) et themePreference (light, dark, system ou null) [#f0a7b785c84390b8-1] [#027a7c3331042954-1] [#027a7c3331042954-2]. | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/ChangePasswordRequest.java:9` | Javadoc : Selon la javadoc, oldPassword est vérifié contre le hash BCrypt courant et un échec produit un 400, sans politique de robustesse appliquée. | [#529a3520503c7b33-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/DeleteAccountRequest.java:8` | Javadoc : Selon la javadoc, la suppression de compte exige la re-saisie du username comme confirmation, la source d'identité restant le JWT. | [#9c38bf53dc3e5b9e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/ResetPasswordRequest.java:13` | Javadoc : Selon la javadoc, un token invalide, expiré ou consommé produit un 400 côté service, et newPassword suit la politique StrongPassword. | [#91ad9fd29eb8ce1f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/UserResponse.java:41-53` | avatarUrl vaut /api/me/avatar si l'avatar de l'utilisateur est présent et non blanc, sinon null. | [#2e01cbedfbb7918a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/UserResponse.java:52` | themePreference vaut la valeur de la préférence de l'utilisateur, ou null si aucun choix n'a été fait. | [#2e01cbedfbb7918a-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:104-106` | L'ancien fichier d'avatar est supprimé uniquement si la référence précédente est non nulle et diffère de la nouvelle. | [#5c618e66ccd37104-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:125-127` | Si la référence d'avatar est nulle ou blanche, deleteAvatar retourne sans rien faire. | [#74951afc15ffa86a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:147-150` | Un fichier commençant par FF D8 FF est reconnu comme JPEG. | [#73bf94d305c17064-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:158-161` | Un fichier de plus de 12 octets dont les octets 0 à 3 valent RIFF et les octets 8 à 11 valent WEBP est reconnu comme WebP, sans contrôle de la taille du bloc RIFF. | [#73bf94d305c17064-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:171-180` | Le type MIME servi est déduit de l'extension de la référence stockée, avec repli sur application/octet-stream si l'extension n'est pas reconnue. | [#eb3583ea1abbbdf1-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:104-108` | Si aucun utilisateur ne correspond à l'email, requestReset ne fait aucune action. | [#0a6a3a7045f96a93-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:153` | Le nouveau mot de passe est encodé par le PasswordEncoder avant la sauvegarde de l'utilisateur. | [#3441089babd3c59b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:73-75` | La purge calcule une date de coupure égale à maintenant moins la rétention, puis demande la suppression des tokens consommés ou expirés avant cette date. | [#79756b133713f4b8-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserDataExportAssembler.java:59-61` | Seules les catégories dont le propriétaire correspond à ownerId sont retenues, ce qui exclut les catégories système. | [#f881252ad777c509-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:68-73` | Le changement de mot de passe échoue si l'ancien mot de passe ne correspond pas au hash courant (BCrypt). | [#9e9be01f5162e06f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:110` | Commentaire : Selon le commentaire, les catégories système (owner_id NULL) sont préservées lors de la purge. | [#ef60f98406ef2d65-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/validation/StrongPasswordValidator.java:16` | La longueur minimale du mot de passe est fixée à 8 caractères. | [#58d306d6e0c751fc-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/validation/StrongPasswordValidator.java:19` | La longueur maximale du mot de passe est fixée à 100 caractères. | [#d0faf757771b6309-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/validation/StrongPasswordValidator.java:25-26` | Une valeur nulle est acceptée par le validateur, l'absence de valeur étant laissée à @NotBlank. | [#436c92fe7ec45d1f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/validation/StrongPasswordValidator.java:28-30` | Un mot de passe de longueur hors de l'intervalle 8 à 100 caractères est refusé. | [#436c92fe7ec45d1f-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/validation/StrongPasswordValidator.java:35-37` | Un caractère majuscule au sens Character.isUpperCase est compté comme majuscule, et un caractère Character.isDigit comme chiffre. | [#436c92fe7ec45d1f-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/validation/StrongPasswordValidator.java:40-41` | La validation retourne vrai dès qu'une majuscule et un chiffre ont été trouvés, en un seul balayage. | [#436c92fe7ec45d1f-4] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java:54-56` | Un token est considéré consommé dès que usedAt n'est pas nul. | [#b22d13082ea4efc9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java:59-61` | Un token est expiré lorsque expiresAt n'est pas postérieur à l'instant donné, donc à égalité il est expiré. | [#a849b2b5eaa23ad1-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java:64-66` | Un token est exploitable s'il n'est ni consommé ni expiré à l'instant donné. | [#2ea382d05bae8c72-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java:43` | La comparaison de la valeur externe est sensible à la casse et sans suppression d'espaces. | [#83daae6dcb629794-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/UserDataExport.java:93-113` | Assemble le profil exporté en recopiant seuls id, username, name, email, role, un indicateur de présence d'avatar et la valeur de thème ou null. | [#19f686cd2c7d264e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/PasswordResetTokenRepository.java:32-42` | Javadoc : Selon la javadoc, la purge supprime les tokens consommés ou expirés avant une date et ne cible jamais un token valide en cours d'usage. | [#4725713819c136f7-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/PasswordResetService.java:11-25` | Javadoc : Selon la javadoc, si l'email est inconnu, requestReset ne fait rien et ne lève aucune exception révélant l'existence du compte. | [#30e3ed16d38758f3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/UserService.java:26-29` | Javadoc : Selon la javadoc, deleteAccount exige que confirmUsername soit exactement égal au username du caller, sinon aucune donnée n'est touchée. | [#bcc529f89637fa20-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:132-137` | Une BadCredentialsException renvoie 401 avec le code générique UNAUTHORIZED, sans distinguer un username inconnu d'un mot de passe faux. | [#b2cfb8b742831c99-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:178-182` | GET /api/auth/me refuse avec 401 un token dont le jti n'est plus une session active, ce contrôle étant nécessaire car /api/auth/** est exclu de JwtFilter. | [#575186050ab1cb42-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:214-217` | Lors de l'inscription, un username déjà présent renvoie 409 avec le code CONFLICT avant la création du compte. | [#2a37f60098851612-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:221-230` | L'inscription crée un User avec un identifiant UUID aléatoire, le mot de passe encodé par PasswordEncoder et le rôle codé en dur ROLE_USER. | [#2a37f60098851612-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:234-242` | Une DataIntegrityViolationException à l'inscription, due à une contrainte unique sur username ou email, renvoie 409 CONFLICT. | [#2a37f60098851612-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:357` | Commentaire : Selon le commentaire, la réponse de forgot-password est identique que le compte existe ou non, ce que le code reproduit par un message fixe. | [#74357801763e7ff6-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:374-380` | Javadoc : Selon la javadoc, l'IP complète n'est jamais persistée et le User-Agent est borné à 255 caractères. | [#4be1f8cb5e6cb3ff-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:394` | La session enregistrée stocke l'adresse IP du client anonymisée via ClientIpAnonymizer, jamais l'IP complète. | [#4be1f8cb5e6cb3ff-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:402-411` | revokeSessionSilently ignore un token null ou vide et avale une JwtException, sans lever d'erreur. | [#107fb9034eb9803e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:414-420` | deviceInfo renvoie le User-Agent tronqué à 255 caractères, ou null si l'en-tête est absent. | [#eda736a422a16091-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:121-129` | Un username demandé déjà porté par un autre compte renvoie 409 avec le corps générique conflict, et le changement vers son propre username reste autorisé. | [#c655c234892a675c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:126-127` | Le 409 de PATCH /api/me porte le même corps générique {error: conflict} que l'inscription. | [#c655c234892a675c-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:133-140` | PATCH /api/me reconstruit le User en conservant id, password, role et avatar du caller, seuls name, username et email étant modifiés. | [#c655c234892a675c-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:157` | Javadoc : Selon la javadoc, le plafonnement de PUT /api/me/preferences est appliqué par utilisateur authentifié et non par IP. | [#dbf3f94c5219acc5-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:245` | Un fichier avatar vide est transmis au service sous forme de tableau d'octets vide, le service étant chargé de le rejeter. | [#ba95fb538086d817-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:79-84` | Si la clé API est nulle ou blanche, sendPasswordResetEmail journalise un warning et retourne sans appel HTTP. | [#775621251ad13b2f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:99-105` | Une RestClientException est capturée, journalisée avec le seul nom simple de la classe d'exception, et n'est pas propagée à l'appelant. | [#775621251ad13b2f-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:120-127` | Le nom du destinataire et le lien sont échappés HTML avant insertion dans htmlContent, alors que le champ to.name reçoit le nom brut. | [#5b0443ae67966f97-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:85-96` | resolve renvoie le template dont la sous-étiquette de langue correspond à la locale, et renvoie FR (DEFAULT) pour une locale nulle, vide ou inconnue. | [#91583347a8781dfd-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:99-105` | language coupe l'étiquette au premier tiret, puis au premier underscore si aucun tiret n'existe, et ne garde que la partie langue. | [#181af8382357620c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:123-125` | htmlContent substitue les deux valeurs déjà échappées dans les placeholders %1$s (nom) et %2$s (lien) du gabarit. | [#49bb28fc0c4ae9df-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java:66` | saveAndFlush force le flush immédiat, donc un échec du verrou optimiste remonte dans l'appel et non au commit. | [#38e6158d5b55a273-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java:95-99` | En création, l'id est remis à null pour laisser la génération à JPA, et themePreference est recopié depuis le domaine. | [#52b4c1bf0b12db8f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java:113-116` | Commentaire : Selon le commentaire, themePreference n'est pas recopiée lors d'une mise à jour et seul updateThemePreference l'écrit, ce que confirme copyMutableFields qui ne copie pas ce champ. | [#126abc370019e426-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:77-79` | La réponse est 200 avec le token si un token exploitable existe, et 404 sans corps sinon, qu'il manque le compte ou le token. | [#ecada1ee8b26b809-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:57` | Un token est exploitable seulement si son expiresAt est strictement postérieur à l'heure fournie. | [#f5a0c5651fe2641e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:58-64` | Le résultat est trié par expiresAt décroissant puis id décroissant, et limité à un seul token. | [#f5a0c5651fe2641e-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/PasswordResetTokenEntity.java:45-48` | Commentaire : Le champ version porte @Version et sert de verrou optimiste sur la consommation du token. | [#f45a8afa2738b508-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:70-72` | currentUser renvoie Optional.empty si le nom du principal est nul ou vide. | [#e6f3d6cbf39f8ce9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:26-27` | Une adresse IPv4 à quatre octets décimaux voit son dernier octet remplacé par 0. | [#c8e16bfb4284d0e4-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:34-37` | Une adresse IPv6 contenant le motif de compression deux-points doubles renvoie null et n'est pas stockée. | [#c8e16bfb4284d0e4-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:39-41` | Une adresse IPv6 non compressée conserve ses trois premiers hextets, suivis de deux-points doubles. | [#c8e16bfb4284d0e4-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:46-47` | Commentaire : Selon le commentaire, une valeur au format non reconnu n'est pas stockée, et le code renvoie null dans ce cas. | [#c8e16bfb4284d0e4-4] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:52-61` | Un octet IPv4 est rejeté s'il est vide, dépasse trois caractères, contient un non-chiffre ou dépasse la valeur 255. | [#c7767146784a6a4c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:90-95` | La route PUT /api/me/preferences est limitée à 30 requêtes par minute et par utilisateur authentifié. | [#ce64361fcde0a725-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:124-127` | Lorsque le limiteur est désactivé, la requête passe directement à la chaîne de filtres sans comptage. | [#6ecf7cddb53990f8-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:134-139` | Une requête anonyme, absente ou non authentifiée n'est pas comptée et passe au filtre d'autorisation qui répond 401. | [#6ecf7cddb53990f8-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:148-149` | Le compteur est tenu par clé composée de l'identifiant du compte et du couple méthode et chemin, avec un bucket par minute. | [#6ecf7cddb53990f8-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:150-155` | Un dépassement de quota renvoie la même réponse 429 que le limiteur par IP, avec l'en-tête Retry-After calculé. | [#6ecf7cddb53990f8-4] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java:213-222` | Commentaire : Selon le commentaire du test, un token dont expiresAt égale l'instant courant est considéré expiré, ce que le test vérifie. | [#3d525772929f4f99-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:92` | Un token dont used_at est renseigné est purgé par purgeConsumedAndExpired, même si son expiration est future. | [#6706a6e875fa5909-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:93` | Un token expiré depuis 48 heures, non consommé, est purgé par purgeConsumedAndExpired. | [#6706a6e875fa5909-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:95` | Un token expiré depuis 30 minutes, non consommé, est conservé par la purge selon l'assertion du test. | [#6706a6e875fa5909-3] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/UserServiceImplTest.java:71-72` | changePassword lève SamePasswordException lorsque le nouveau mot de passe est identique à l'ancien. | [#d7a40ba2a101f21a-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/UserServiceImplTest.java:78-87` | En cas de succès, changePassword encode le nouveau mot de passe avec PasswordEncoder puis appelle userRepository.save. | [#d7a40ba2a101f21a-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/UserServiceImplTest.java:116-121` | updateThemePreference lève NullPointerException pour un thème null et n'appelle pas le repository. | [#dc84698e07fea1f0-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/validation/PasswordPolicyTest.java:30` | Javadoc : Selon la javadoc, la politique de mot de passe exige au moins 8 caractères, une majuscule et un chiffre. | [#a388cfd969fc23b2-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/validation/PasswordPolicyTest.java:84` | Le test construit un mot de passe plus long que StrongPasswordValidator.MAX_LENGTH et attend un rejet par le DTO d'inscription. | [#fee0b1a26430bfc8-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/domain/models/export/UserDataExportTest.java:51` | Sans choix de thème explicite, le profil exporté porte themePreference à null et n'invente pas de valeur par défaut. | [#77af98cfd12ac5cf-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/domain/models/export/UserDataExportTest.java:66-69` | Le test impose que le record ExportedProfile ne porte aucun composant dont le nom contient password. | [#fc21f644a3de7d83-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:35-36` | Javadoc : Selon la javadoc, la politique de mot de passe exige au moins 8 caractères, une majuscule et un chiffre (BR-AUT-003), et le durcissement ne doit pas bloquer les comptes créés avant ce durcissement. | [#3d345f90494e59b1-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:207-208` | headersOf remplace la valeur des en-têtes listés dans REDACTED_HEADERS par un résumé, et affiche les autres valeurs telles quelles. | [#aaca74ad535f4261-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:44-45` | Javadoc : Selon la javadoc de la classe, /me ne sérialise jamais le hash du mot de passe. | [#84ac6c1d50b5379d-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:46` | Javadoc : Selon la javadoc de la classe, un doublon username ou email à l'inscription doit donner un 409. | [#84ac6c1d50b5379d-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:144-147` | Commentaire : Selon le commentaire, /me vérifie la révocation du jti, et le test stubbe isSessionActive à true pour le cas nominal. | [#39ca1b1bb0876f33-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:165-176` | Un token à signature valide dont le compte est introuvable reçoit un 401 générique unauthorized, sans le texte User not found. | [#3727bbc8c173f3e1-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:292-293` | Commentaire : Selon le commentaire, le refresh exige un jti courant actif, et le test stubbe isSessionActive à true. | [#e09780521221d80e-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:42` | Javadoc : Selon la javadoc, le correctif rend PasswordResetServiceImpl.requestReset annoté @Async, pour sortir l'envoi du thread de requête. | [#11faa398c3958574-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/PasswordResetEndpointsIntegrationTest.java:35-40` | Javadoc : Selon la javadoc, forgot-password est accessible sans token et répond 200 pour un email inconnu. | [#98a195a59db0c135-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/PasswordResetEndpointsIntegrationTest.java:92-96` | Javadoc : Selon la javadoc, un newPassword de moins de 8 caractères est hors politique et renvoie 400 via @Valid. | [#9c0a916e1d80b9ab-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:47` | Javadoc : Selon la javadoc, GET et PATCH /api/me ne sérialisent jamais le hash du mot de passe (BR-AUT-008). | [#7985539984801c02-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:48` | Javadoc : Selon la javadoc, PATCH /api/me avec un username déjà porté par un autre compte renvoie 409 (BR-AUT-001). | [#e2f8fa8fd9b8ac5e-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplateTest.java:18-19` | Javadoc : Selon la javadoc, aucune locale ne doit faire échouer forgot-password (BR-AUT-012), le repli se faisant sur le français. | [#e0334f0e97f2207d-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenConcurrencyIntegrationTest.java:34-35` | Javadoc : Selon la javadoc, le verrou optimiste @Version (V15) sur PasswordResetTokenEntity garantit qu'un token n'est consommé qu'une fois. | [#fdb0966ea9a680c6-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportProfileTest.java:19-21` | Javadoc : Selon la javadoc, le canal de capture test-only n'existe qu'en profil e2e et ne doit jamais répondre en prod, dev ou test. | [#4b674f300fe7a44f-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CallerResolverTest.java:27-29` | Javadoc : Selon la javadoc, CallerResolver renvoie Optional.empty plutôt qu'une exception en l'absence d'authentification exploitable. | [#66e69a67a61c1686-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java:40` | Javadoc : Selon la javadoc, le plafond de PUT /api/me/preferences est compté par utilisateur et non par IP. | [#1512f9c310f2696b-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java:180` | Un PUT anonyme n'est pas compté par le plafond utilisateur et reçoit 401. | [#85988a7098c41234-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java:60` | Les statuts 400, 404 et 405 désignent une variante qui n'atteint pas le contrôleur. | [#e4743b72c16222fd-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java:137` | Une variante est considérée routée si son statut sur seau plein est compris entre 200 et 299. | [#48f9a74a31788074-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java:151` | Une variante routée consomme un jeton du même seau que le chemin canonique, une variante non routée n'en consomme aucun. | [#48f9a74a31788074-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:143-161` | Le Retry-After d'un 429 par utilisateur est décroissant : 60 sur un seau neuf, 15 après 45,2 s, 1 pour 0,1 s restante, puis le quota revient après 100 ms. | [#cbf3e9f0b2a84f2e-1] |
| `mytimeline:frontend/src/components/settings/AvatarUpload.tsx:23` | La taille maximale d'un fichier avatar est fixée à 5 Mo. | [#5a34f17fcd039d02-1] |
| `mytimeline:frontend/src/components/settings/AvatarUpload.tsx:238-242` | Commentaire : Le curseur de zoom varie de 1 à 3 par pas de 0,05 et met à jour le zoom du recadrage. | [#c18e122d193a5c15-1] |
| `mytimeline:frontend/src/components/settings/PasswordStrength.tsx:29-36` | meetsPolicy vérifie que le mot de passe a une longueur comprise entre PASSWORD_POLICY.minLength et maxLength, une majuscule et un chiffre. | [#757aa48127836db4-1] |
| `mytimeline:frontend/src/components/settings/PasswordStrength.tsx:62` | Un symbole est un point de code qui n'est ni lettre, ni marque, ni nombre. | [#9d231e3411226978-1] |
| `mytimeline:frontend/src/components/settings/PasswordStrength.tsx:64-73` | scorePassword additionne un point pour la longueur minimale, un point pour 10 caractères ou plus, un point pour casse mixte, un point pour chiffre et un point pour symbole, plafonné à 4. | [#6477f02bd88e37d1-1] |
| `mytimeline:frontend/src/components/settings/PasswordStrength.tsx:75-79` | levelFromScore renvoie weak pour un score inférieur ou égal à 1, medium jusqu'à 3, et strong au-delà. | [#62d6837465b48dd9-1] |
| `mytimeline:frontend/src/components/settings/PasswordStrength.tsx:88-91` | levelFromPassword renvoie weak dès que meetsPolicy échoue, sinon le niveau issu du score. | [#cf372615f99d714f-1] |
| `mytimeline:frontend/src/components/ui/avatar.tsx:18` | Les valeurs par défaut d'Avatar sont alt à chaîne vide et size à md. | [#eb2fadaecda5f4a4-1] |
| `mytimeline:frontend/src/components/ui/dialog.tsx:37-40` | DialogContent délègue le retour du focus à useReturnFocus, qui reçoit les callbacks onOpenAutoFocus et onCloseAutoFocus de l'hôte. | [#71dc6f4dc10e609d-1] |
| `mytimeline:frontend/src/components/ui/dialog.tsx:104` | Sous le breakpoint md, la croix passe à 44 px par 44 px via max-md:h-11 et max-md:w-11, et reste de 16 px par 16 px au-dessus. | [#71dc6f4dc10e609d-2] |
| `mytimeline:frontend/src/components/ui/language-selector.tsx:166` | Le chemin courant est débarrassé du préfixe de locale par un replace de la locale courante, puis réutilisé pour chaque lien de langue. | [#afa8cebb355bd3bc-1] |
| `mytimeline:frontend/src/components/ui/palette-color-picker.tsx:21-25` | Javadoc : Selon le commentaire, le composant n'appelle onChange que sur action utilisateur, jamais au montage, et une couleur hors palette s'affiche Personnalisé actif sans pastille cochée. | [#08d0116b906c6db0-1] |
| `mytimeline:frontend/src/components/ui/palette-color-picker.tsx:45` | Javadoc : Selon la javadoc, le composant a une disposition 6 par 2 à toute largeur, et une cible tactile de 44 par 44 en mobile. | [#08d0116b906c6db0-2] |
| `mytimeline:frontend/src/components/ui/palette-color-picker.tsx:121` | Une couleur est dite personnalisée lorsque la valeur est non vide et ne correspond à aucune entrée de la palette. | [#7a4cacfbdf09e1fe-1] |
| `mytimeline:frontend/src/components/ui/palette-color-picker.tsx:123-125` | L'arrêt de tabulation unique du groupe est la pastille cochée, ou la première pastille si aucune n'est cochée. | [#172efb332070f44b-1] |
| `mytimeline:frontend/src/components/ui/palette-color-picker.tsx:127` | La couleur initiale du picker libre est la valeur, sinon customInitialColor, sinon la première couleur de la palette. | [#d2c90f15f12b8257-1] |
| `mytimeline:frontend/src/components/ui/palette-color-picker.tsx:129-152` | Les touches flèches droite et bas avancent d'une pastille avec bouclage, les flèches gauche et haut reculent, Home va à la première et End à la dernière, puis onChange reçoit le hex de la pastille atteinte. | [#45c1c517035379de-1] |
| `mytimeline:frontend/src/components/ui/palette-color-picker.tsx:252-258` | Le bouton Personnalisé reçoit aria-pressed égal à isCustom, une bordure foreground quand il est actif, et une classe d'estompage quand disabled est vrai. | [#08d0116b906c6db0-3] |
| `mytimeline:frontend/src/components/ui/popoverPicker.tsx:47` | Quand disabled est vrai, le Popover est forcé fermé et onOpenChange est neutralisé, donc le picker ne s'ouvre pas. | [#0f9c15d575142bc6-1] |
| `mytimeline:frontend/src/components/ui/select.tsx:151` | Le focus d'un SelectItem change uniquement le fond en focus:bg-accent-soft, l'encre de repos reste en place. | [#dff1d6f17c7ca40a-1] |
| `mytimeline:frontend/src/components/ui/tabs.tsx:37-40` | select met à jour l'état interne seulement si value est indéfini, et appelle onValueChange dans tous les cas. | [#bf9119f1f65dccef-1] |
| `mytimeline:frontend/src/components/ui/tabs.tsx:52-54` | Les touches ArrowRight et ArrowLeft déplacent l'index de un vers l'avant ou l'arrière, avec retour circulaire aux extrémités. | [#37ea7fc2f37ba8e6-1] |
| `mytimeline:frontend/src/components/ui/tabs.tsx:55-58` | La touche Home sélectionne le premier onglet et la touche End sélectionne le dernier. | [#37ea7fc2f37ba8e6-2] |
| `mytimeline:frontend/src/components/ui/tabs.tsx:62-66` | Sur une touche de navigation, l'onglet cible est sélectionné puis reçoit le focus DOM via sa ref, les autres touches étant ignorées. | [#37ea7fc2f37ba8e6-3] |
| `mytimeline:frontend/src/components/ui/tag.tsx:20-22` | La pastille de couleur n'est rendue que si swatch est renseigné, et elle est masquée aux lecteurs d'écran. | [#b39794403f26966a-1] |
| `mytimeline:frontend/src/components/ui/tag.tsx:24-28` | Le bouton de suppression n'est rendu que si onRemove est fourni, et son nom accessible vient de removeLabel. | [#b39794403f26966a-2] |
| `mytimeline:frontend/src/components/ui/textarea.tsx:17-18` | aria-invalid vaut true si invalid est vrai, et la classe mt-textarea--invalid n'est ajoutée que dans ce cas. | [#89e8a12e07efe656-1] |
| `mytimeline:frontend/src/components/ui/theme-toggle.tsx:141` | Le gabarit par défaut est icon, et le composant reçoit testId obligatoire, variant et className. | [#eae2fa86556c708e-1] |
| `mytimeline:frontend/src/components/ui/theme-toggle.tsx:147` | aria-pressed est absent tant que le composant n'est pas monté, et vaut isDark après montage. | [#eae2fa86556c708e-2] |
| `mytimeline:frontend/src/components/ui/theme-toggle.tsx:150` | Le gabarit labeled affiche en texte visible le thème de destination, theme.light en mode sombre et theme.dark en mode clair, avec theme.toggle avant montage. | [#eae2fa86556c708e-3] |
| `mytimeline:frontend/src/components/ui/theme-toggle.tsx:171` | Avant montage, le libellé générique theme.toggle est utilisé, et après montage le libellé nomme la destination, theme.toLight en mode sombre et theme.toDark en mode clair. | [#eae2fa86556c708e-4] |
| `mytimeline:frontend/src/components/ui/theme-toggle.tsx:183` | Le gabarit square est un bouton 44 × 44 px (h-11 w-11) rendu avec les classes Tailwind déclarées. | [#eae2fa86556c708e-5] |
| `mytimeline:frontend/src/components/ui/theme-toggle.tsx:203` | Le gabarit icon est visuellement 36 × 36 px (h-9 w-9), et un pseudo-élément before de 44 × 44 px étend la zone cliquable. | [#eae2fa86556c708e-6] |
| `mytimeline:frontend/src/components/ui/toast.tsx:23-28` | La variante info n'ajoute aucune classe modificatrice, et success, warning et danger ajoutent respectivement mt-toast--success, mt-toast--warning et mt-toast--danger. | [#f0d69f4ca0a438bc-1] |
| `mytimeline:frontend/src/components/ui/toast.tsx:51-52` | Le message n'est rendu que s'il n'est ni null ni undefined. | [#6d9cc202928610e8-1] |
| `mytimeline:frontend/src/components/ui/toaster.tsx:176-185` | Associe le type success à la variante success, error à la variante danger, et tout autre type à la variante info. | [#3df5b9e85502f0b8-1] |
| `mytimeline:frontend/src/components/ui/toaster.tsx:209-211` | Un élément peut recevoir le focus s'il est connecté, non désactivé et hors des ancêtres inert ou hidden. | [#6974763a957a30e2-1] |
| `mytimeline:frontend/src/components/ui/toaster.tsx:217-220` | Le focus est considéré orphelin s'il est nul, sur le body, ou encore sur un toast. | [#c546b4d3ecc650af-1] |
| `mytimeline:frontend/src/components/ui/toaster.tsx:232-234` | Une pause au survol n'est active que si le toast survolé figure parmi les toasts visibles, et de même pour le focus. | [#d1068782c057313b-1] |
| `mytimeline:frontend/src/components/ui/toaster.tsx:240` | Le survol est remis à zéro pendant le rendu dès que le toast survolé n'est plus visible. | [#d1068782c057313b-2] |
| `mytimeline:frontend/src/components/ui/toaster.tsx:291-299` | La carte est focusable et capte le pointeur uniquement lorsque le toast est visible, sinon tabIndex vaut -1 et pointerEvents vaut none. | [#d1068782c057313b-3] |
| `mytimeline:frontend/src/lib/schemas/password-policy.test.ts:80-85` | Un mot de passe plus long que PASSWORD_POLICY.maxLength est refusé par les trois schémas de formulaire. | [#57b2dd54dc55cd55-1] |
| `mytimeline:frontend/src/lib/schemas/password-policy.test.ts:102-110` | Le test fixe que le schéma de login accepte les mots de passe historiques qui ne respectent pas la politique. | [#e27b997b1d5ded2f-1] |
| `mytimeline:frontend/src/lib/schemas/password-policy.test.ts:176-183` | Commentaire : Les caractères Other_Uppercase sont comptés comme majuscules par la politique, sans catégorie Lu. | [#fc6c5ed4dee3b428-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/AuthRequest.java:7` | Le champ username de AuthRequest est obligatoire et refuse une valeur vide ou blanche. | [#92f5c6c3e4948d43-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/AuthRequest.java:12` | Le champ password de AuthRequest est obligatoire et limité à 100 caractères. | [#267443263593ffc9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/ChangePasswordRequest.java:17-18` | Le champ oldPassword est obligatoire, sans annotation de politique de robustesse. | [#d8bffc4b3d59c4e9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/ChangePasswordRequest.java:20-22` | Le champ newPassword est obligatoire et soumis à la contrainte StrongPassword. | [#2ac526e658044675-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/DeleteAccountRequest.java:19-20` | Le champ username est obligatoire et refuse une valeur vide ou blanche. | [#2e19cd7f089e35c1-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/ForgotPasswordRequest.java:24-26` | Le champ email est obligatoire, non blanc et doit respecter le format email. | [#9fb7e0e2ae14077a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/RegisterRequest.java:11-13` | Le champ name est obligatoire et doit contenir entre 3 et 20 caractères. | [#a3564dd4892bd398-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/RegisterRequest.java:15-17` | Le champ username est obligatoire et doit contenir entre 3 et 20 caractères. | [#4fd951ab5717e8e3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/RegisterRequest.java:19-21` | Le champ email est obligatoire et doit respecter le format email. | [#e0ecaa54e3711a7e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/RegisterRequest.java:23-25` | Le champ password est obligatoire et soumis à la contrainte StrongPassword. | [#4fd656ac52faacf2-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/ResetPasswordRequest.java:17-18` | Le champ token est obligatoire et refuse une valeur vide ou blanche. | [#418bb58aa3029876-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/ResetPasswordRequest.java:20-22` | Le champ newPassword est obligatoire et soumis à la contrainte StrongPassword. | [#45f5fded0dd2736f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/UpdatePreferencesRequest.java:9-11` | Javadoc : Selon la javadoc, une valeur invalide de themePreference produit un 400 VALIDATION_FAILED via @Valid et GlobalExceptionHandler. | [#91aff7dce9ed0a4f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/UpdatePreferencesRequest.java:18-21` | Le champ themePreference doit être non nul et correspondre entièrement à light, dark ou system. | [#91aff7dce9ed0a4f-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/UserUpdateRequest.java:15-25` | Les champs name et username sont obligatoires et de longueur entre 3 et 20, et email doit respecter le format email. | [#fcdff8f5395f38a6-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:68-70` | Un contenu nul ou vide lève InvalidAvatarException avec le message fichier vide. | [#609349e75b77f88c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:71-73` | Un contenu dont la taille dépasse maxBytes lève InvalidAvatarException. | [#609349e75b77f88c-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:77-79` | Un contenu dont les magic bytes ne correspondent ni à JPEG, PNG ni WebP lève InvalidAvatarException. | [#609349e75b77f88c-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:139-140` | Un token absent de la base lève InvalidPasswordResetTokenException. | [#73a8b35d1023d45e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:143-145` | Un token non utilisable à l'instant courant, c'est-à-dire expiré ou déjà consommé, lève InvalidPasswordResetTokenException. | [#73a8b35d1023d45e-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:147-150` | Si le compte lié au token n'existe plus, resetPassword lève InvalidPasswordResetTokenException sans en révéler la cause. | [#73a8b35d1023d45e-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:184-185` | Un conflit de verrou optimiste lors de la consommation du token est converti en InvalidPasswordResetTokenException. | [#73a8b35d1023d45e-4] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:190-198` | Un token nul ou qui n'est pas un UUID valide lève InvalidPasswordResetTokenException avant toute recherche en base. | [#8f292fce24271a96-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserDataExportAssembler.java:53-54` | Un ownerId inconnu lève UserNotFoundException. | [#b0458840536ede16-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:71-72` | Lève InvalidCredentialsException si l'ancien mot de passe ne correspond pas. | [#18e50776984ca03a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:76-77` | Lève SamePasswordException si le nouveau mot de passe correspond au hash courant, contrôle effectué après la vérification de l'ancien. | [#18e50776984ca03a-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:98-99` | Lève AccountDeletionMismatchException si la confirmation est nulle ou différente du username du caller, avant toute écriture. | [#943127ba120eccec-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:142` | Refuse une préférence nulle par Objects.requireNonNull. | [#461ff7249363cd0a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/ThemePreference.java:40-48` | Convertit une valeur exacte en minuscules en constante, sinon lève IllegalArgumentException, y compris pour null. | [#69c568fbca4799a7-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/AvatarService.java:26-27` | Javadoc : Selon la javadoc, l'upload lève InvalidAvatarException si le contenu est vide, trop grand ou n'est pas JPEG, PNG ou WebP. | [#fbfc5f8368f87314-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/PasswordResetService.java:35-36` | Javadoc : Selon la javadoc, resetPassword lève InvalidPasswordResetTokenException si le token est inexistant, mal formé, expiré ou déjà consommé. | [#c8d0556a93f93647-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/UserService.java:17-19` | Javadoc : Selon la javadoc, changePassword lève InvalidCredentialsException si l'ancien mot de passe ne correspond pas au hash courant. | [#4354622f2c6955be-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:173-177` | Commentaire : Selon le commentaire, un token sans jti est accepté pour préserver la compatibilité descendante, ce que le contrôle isSessionActive applique en renvoyant true pour un jti absent. | [#a51bf41b2aad99b1-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:151-152` | Javadoc : Selon la javadoc, toute valeur de themePreference autre que light, dark ou system, ainsi que null ou une absence, renvoie 400. | [#ef304834550dc7be-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:246-248` | Une IOException à la lecture du fichier avatar lève InvalidAvatarException avec le message fichier illisible. | [#22011559b0f1d693-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java:58-60` | Si findById ne trouve pas le token dans markConsumed, une IllegalStateException est levée. | [#233895b1ebabc1ef-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:19-21` | Une adresse nulle ou composée uniquement d'espaces renvoie null sans traitement. | [#aa4f2c8de085cbbe-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:140-145` | Un appelant authentifié sans identifiant de compte reçoit un 401 unauthorized, sans être compté. | [#authorization/ef91d216c638ddd0-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:140-145` | Un principal authentifié sans identifiant de compte est refusé avec un 401 unauthorized, sans passer par le limiteur. | [#4689911ac1d8a4a4-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java:506-526` | PUT /api/me/preferences renvoie 400 validation_failed pour LIGHT, Dark, espace, auto, chaîne vide, null, objet vide ou clé theme, sans appeler updateThemePreference. | [#bdaa329c7e4c45e2-1] |
| `mytimeline:frontend/src/components/settings/AvatarUpload.tsx:64-67` | Un fichier dont le type ne commence pas par image/ est refusé et affiche l'erreur de type. | [#1ae9d302848600a8-1] |
| `mytimeline:frontend/src/components/settings/AvatarUpload.tsx:68-71` | Un fichier de plus de MAX_BYTES est refusé et affiche l'erreur de taille. | [#1ae9d302848600a8-2] |
| `mytimeline:frontend/src/lib/schemas/password-policy.test.ts:112-117` | Le schéma de login renvoie la clé validation.password.loginMin au lieu de validation.password.min pour un mot de passe trop court. | [#f7ce5e190236a6b4-1] |
| `mytimeline:frontend/src/types/user.ts:8` | Le champ email doit être une adresse e-mail valide, avec le message d'erreur littéral 'Invalid email'. | [#8d7025f4480ccf84-1] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:206-209` | Les routes de UserController agissent sur l'identité résolue par CallerResolver.currentUser depuis le JWT, et renvoient 401 si elle est absente. | [#b0fec61dc9e1c4a5-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:64-68` | currentUser renvoie Optional.empty si l'authentification est absente, non authentifiée ou anonyme. | [#7694acbf498a358c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:170-179` | La clé de l'utilisateur est construite à partir de l'UUID du compte porté par CustomUserDetails, et vaut null sinon. | [#4817f85f1d59477d-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CallerResolverTest.java:53-61` | CallerResolver.currentUser résout l'utilisateur de domaine à partir du nom du principal authentifié dans le SecurityContext. | [#c11f8b45b03d2290-1] |

## Traitements batch {#t-batch_job}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:70-71` | La purge des tokens est déclenchée avec un délai fixe de 86400000 ms par défaut (24 h) entre deux exécutions et un premier passage après 300000 ms par défaut. | [#b6c240419a03f7b4-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/UserMapper.java:10-19` | UserMapper.toDomain ne transmet pas de préférence de thème, alors que UserResponse.fromDomain lit user.getThemePreference() pour renvoyer themePreference. | [#128e6d740428545a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:72` | Le message d'erreur fixe la limite à 5 Mo alors que maxBytes est configurable, le message peut donc ne plus correspondre à la limite réelle. | [#e7a18c51ee2b051d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:92-100` | Le User sauvegardé est construit avec sept arguments, sans préférence de thème, ce qui peut écraser cette valeur si elle existe en base. | [#e7a18c51ee2b051d-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:142` | Le commentaire fixe la validité à 15 minutes, alors que la durée est configurable via token-validity-minutes et le code ne contient pas cette valeur en dur. | [#ca0b32858809cbcd-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserDataExportAssembler.java:25` | La javadoc annonce des produits actifs, mais l'appel visible productRepository.findByUserId ne filtre pas sur un état actif dans ce fichier. | [#395f7bdcedceca3b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/validation/StrongPassword.java:39` | Le message par défaut de StrongPassword est en français, alors que les autres messages du lot sont en anglais ou absents. | [#backend-socle/a1a112644f96b401-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/User.java:10` | Le champ role de User est une String, alors que l'enum Role existe dans le même package. | [#backend-socle/59cca22916afa937-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/PasswordResetService.java:33` | La javadoc indique un minimum de 6 caractères pour newPassword, alors que StrongPasswordValidator impose 8 caractères minimum, ce qui est une incohérence documentaire. | [#7bb8d33f210692c5-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:66` | Le constructeur reçoit un paramètre CustomUserDetailsService userDetailsService qui n'est jamais affecté à un champ ni utilisé dans le corps. | [#authorization/7ee28be5964c768b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:66` | Le constructeur reçoit un paramètre CustomUserDetailsService userDetailsService qui n'est jamais affecté à un champ ni utilisé dans le corps. | [#ed5117554dbd37ca-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:139` | Le log d'erreur du login inclut le username saisi, ce qui écrit un identifiant utilisateur dans les logs. | [#46538dfcc6254d7f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:173-177` | Selon le commentaire, /api/auth/** est bypassé par JwtFilter, donc la révocation n'est pas vérifiée par la chaîne Security sur cette route et doit être contrôlée à la main. | [#authorization/6fe0d789832e1431-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:119-120` | Selon le commentaire, la vérification d'unicité du username reste applicative et peut subir une course tant que la contrainte DB unique n'est pas posée. | [#6510088e555ab30c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java:105-106` | Selon la javadoc, l'hydratation de themePreference est faite hors de UserMapper pour éviter une dépendance application vers infrastructure, exception gelée à ArchitectureTest. | [#abec88bcbc891cfc-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:23` | Le commentaire attribue l'anti-énumération à BR-AUT-005 et BR-AUT-012, alors que le commentaire de BrevoEmailService indique que BR-AUT-005 n'est pas la bonne règle pour ce flux. | [#0f030d2f4c197339-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:41-45` | Selon le commentaire, expiresAt DESC est un proxy de récence car la table n'a pas de colonne de création, et le tri sur id ne départage que sans ordonner par récence. | [#8236f40ad623b805-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:51-52` | Selon le commentaire, le second critère de tri (id) rend le résultat déterministe mais n'ordonne pas par récence, ce qui est signalé comme un point à reprendre si la TTL devient variable. | [#integrations/bbb3d5883ae25232-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:9` | La javadoc donne l'exemple d'une IPv6 compressée tronquée à trois hextets, alors que le code renvoie null pour toute adresse contenant deux-points doubles (lignes 34 à 37). | [#19fba3efca6aeeca-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetails.java:40-58` | Les méthodes isAccountNonExpired, isAccountNonLocked, isCredentialsNonExpired et isEnabled renvoient toujours true, alors que le commentaire indique qu'une logique reste à implémenter. | [#4afe34aeca29eda0-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:27` | La ligne de retour est indentée à quatre espaces alors que le reste de la méthode l'est à huit, écart mineur de mise en forme. | [#backend-socle/13cd0990d0682f15-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:78-79` | Selon la javadoc, un attaquant peut faire croître le nombre de buckets en créant des comptes, et l'éviction LRU efface l'historique du moins récent. | [#authorization/28035b740c80cb01-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/validation/PasswordPolicyTest.java:146` | Le message d'assertion concatène la constante OUT_OF_POLICY, qui ne contient pas la valeur testée secret, alors que le test échoue sur cette valeur. | [#c03cbf4b045951f9-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerDevProfileCookieTest.java:134` | Le test utilise standaloneSetup, donc la chaîne de filtres de sécurité n'est pas traversée et seul le contenu du cookie est vérifié. | [#authorization/61b557ebf16d9a04-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:247` | En cas d'exception, committedRowCount renvoie une chaîne de diagnostic au lieu de propager l'erreur, ce qui fait apparaître la sonde en échec comme une valeur de comptage. | [#b4d7713e265fd207-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:310` | Selon le commentaire, l'endpoint /api/me/change-password est un slot rate-limité à 5 appels par minute et par IP. | [#3164b3a8a191377d-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:319` | Selon le commentaire, le flaky signalé par l'audit n'a pas été reproduit, et le réglage de l'IP dédiée n'est pas présenté comme une correction prouvée. | [#3164b3a8a191377d-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:235-243` | Le test simule la MalformedJwtException de JwtService.extractUsername au lieu d'appeler le service réel, donc le comportement jjwt sur un jeton vide n'est pas exercé par ce test. | [#d06019dfa6910cc4-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:105` | Le test repose sur une mesure de durée réelle en millisecondes, avec un seuil fixe de 4000 ms. | [#bd643c56b2fbcd5c-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:120-132` | Le nom du test annonce qu'aucun email n'est envoyé, mais le corps du test ne contient aucune vérification sur emailService. | [#a9c23fe46c902026-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RegisterLoginIntegrationTest.java:29` | Le commentaire borne la liste des migrations citées à V1..V10 et ne mentionne pas les versions suivantes. | [#9c994cc59cc96c2a-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java:234-235` | Le test de rejet CHECK accepte toute Exception via assertThrows, sans vérifier la contrainte ck_users_theme_preference précisément. | [#9552c12d646d8a0b-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/UserRoleConstraintIntegrationTest.java:63` | Les tests de rejet acceptent toute Exception via isInstanceOf(Exception.class), sans vérifier la contrainte qui a échoué. | [#3bbd81a9f4e12a54-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java:16` | L'import AutoConfigureMockMvc vient du package org.springframework.boot.webmvc.test.autoconfigure, alors que CLAUDE.md du projet indique Spring Boot 3.4 ; à vérifier. | [#58f65d173ce71b30-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java:92-93` | La javadoc annonce un 400 pour les cinq premières tentatives, or le test vérifie seulement qu'elles ne renvoient pas 429. | [#1ced9020fce38c3b-1] |
| `mytimeline:frontend/src/components/settings/AvatarUpload.tsx:72-80` | Aucun gestionnaire onerror n'est posé sur l'image : en cas d'échec de chargement, aucune erreur n'est affichée et l'URL d'objet créée à la ligne 72 n'est pas révoquée. | [#dae1f8200eb23c07-1] |
| `mytimeline:frontend/src/components/ui/dialog.tsx:106` | Le libellé accessible de la croix est en anglais, Close, en dur, alors que la locale principale du projet est fr. Le test dialog.test.tsx interroge aussi le nom Close. | [#cf1a287f71b6bd52-1] |
| `mytimeline:frontend/src/components/ui/footer-app.tsx:4-5` | Le fichier importe deux fois depuis next-intl, avec un import séparé pour useTranslations et un autre pour useLocale. | [#58bfbb3e8002fb08-1] |
| `mytimeline:frontend/src/components/ui/form.tsx:48-52` | Le garde if (!fieldContext) est placé après l'appel à getFieldState, et le contexte par défaut est un objet vide, donc ce garde ne peut pas être vrai tel que le contexte est déclaré. | [#c35a8fc1ff5891d5-1] |
| `mytimeline:frontend/src/components/ui/language-selector.tsx:154-158` | Selon la javadoc, le rendu après la conversion asChild n'a pas été vérifié au navigateur, et les ratios et la cible tactile ne sont pas re-mesurés. | [#eb26ad497fdcac79-1] |
| `mytimeline:frontend/src/components/ui/popoverPicker.tsx:22-23` | La doc du prop disabled dit utiliser aria-disabled et non disabled, alors que le code passe disabled au PopoverTrigger (voir ligne 48) et ne pose aria-disabled que sur le repli div. | [#d6f93839d244cda7-1] |
| `mytimeline:frontend/src/components/ui/tag.tsx:9-18` | La javadoc dit que removeLabel est requis pour onRemove, mais le code fournit une valeur par défaut 'Retirer' à removeLabel. | [#f3455eec41a228bc-1] |
| `mytimeline:frontend/src/components/ui/theme-toggle.tsx:171-180` | Les gabarits square et icon portent un aria-label qui nomme la destination et un aria-pressed qui expose l'état courant, deux informations de sens inverse pour un même bouton. | [#43994f5f2c5b9cdd-1] |
| `mytimeline:frontend/src/services/userService.ts:22-24` | L'en-tête indique que GET /api/me/export est un endpoint stub non livré, alors que le bas du fichier indique que ce stub a été retiré. | [#423609150e8f07a9-1] |

## Endpoints {#t-endpoint}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/ChangePasswordRequest.java:8` | Javadoc : Selon la javadoc, cette requête correspond à POST /api/me/change-password. | [#7e7132941edf330e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/DeleteAccountRequest.java:6` | Javadoc : Selon la javadoc, cette requête correspond à DELETE /api/me pour la suppression de compte. | [#4cc1cc60b9640091-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/ForgotPasswordRequest.java:9` | Javadoc : Selon la javadoc, POST /api/auth/forgot-password répond toujours 200, sans révéler l'existence du compte. | [#48343472763c902a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/UserUpdateRequest.java:8` | Javadoc : Selon la javadoc, cette requête correspond à PATCH /api/me pour la mise à jour du profil courant. | [#c24047fcdaefd6cd-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/PasswordResetEndpointsIntegrationTest.java:19-22` | Javadoc : Selon la javadoc de la classe, les endpoints mot de passe oublié sous /api/auth/** sont accessibles sans token grâce à permitAll et au contournement du JwtFilter. | [#integrations/b76784470b1996dc-1] |

## Méthodes de service {#t-service_method}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/PasswordResetTokenMapper.java:11-19` | toDomain convertit une PasswordResetTokenEntity en PasswordResetToken en copiant id, userId, token, expiresAt et usedAt. | [#7d85719ee45a4369-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/PasswordResetTokenMapper.java:21-29` | toEntity crée une PasswordResetTokenEntity à partir d'un PasswordResetToken en copiant les cinq champs du token. | [#9891a017c01f179d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/UserMapper.java:10-20` | toDomain construit un User à partir d'une UserEntity en transmettant sept champs, sans préférence de thème. | [#c9ba25c74a9e1b78-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:67-107` | uploadAvatar valide le contenu, stocke le nouveau fichier, sauvegarde le User avec la nouvelle référence, puis supprime l'ancien fichier si la référence change. | [#2b36e62dc08c222c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:109-119` | getAvatar renvoie le contenu de l'avatar et son type MIME, ou lève AvatarNotFoundException si la référence est absente ou introuvable dans le stockage. | [#6ade347418a09a23-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:121-138` | deleteAvatar remet l'avatar à null en base puis supprime le fichier stocké, sans effet si aucune référence n'existe. | [#250c9521a302f641-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:29-45` | Javadoc : Selon la javadoc, requestReset ne révèle jamais l'existence du compte et le contrôleur répond toujours 200. | [#bffeb08fea96319e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:101-132` | requestReset crée un token de reset valable pendant la durée configurée, le persiste puis envoie l'email de réinitialisation, et avale toute RuntimeException en la journalisant sans contenu sensible. | [#c69d437a32e90da2-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserDataExportAssembler.java:52-64` | assemble agrège en lecture seule le profil utilisateur, ses produits et ses catégories possédées dans un UserDataExport daté de maintenant. | [#4c212e842f420ed1-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:53-55` | Persiste l'utilisateur via userRepository.save dans une transaction. | [#ae4cdba0ea9e4db7-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:59-63` | Met à jour l'utilisateur via userRepository.save dans une transaction. | [#43083d456b22c73e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:116-120` | Supprime le compte dans l'ordre : révocation des sessions, events, products, categories possédées, puis user. | [#2c29c1b4eee4abdc-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:137-145` | Pose la préférence de thème via userRepository.updateThemePreference et lève UserNotFoundException si le compte n'existe plus. | [#3b3b4a135d6ff645-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java:147-160` | Les méthodes findDomainUserById, findDomainUserByUsername et findDomainUserByEmail délèguent directement au UserRepository. | [#e4a02f496d240aaa-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/PasswordResetService.java:28-38` | Javadoc : Selon la javadoc, resetPassword vérifie le token, ré-encode le mot de passe en BCrypt, met à jour le compte et marque le token consommé. | [#0eaed09ef98c6369-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java:44-68` | markConsumed charge l'entité gérée par findById, recopie usedAt, puis appelle saveAndFlush et renvoie le domaine. | [#976b7d9f30cddc1e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java:129-138` | updateThemePreference est transactionnelle, charge l'utilisateur par id, pose la préférence, sauvegarde et renvoie le domaine, ou Optional.empty si absent. | [#40a1652a02416e2b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:73-75` | Cherche l'utilisateur par email, puis le token exploitable via resetTokenFinder avec l'heure courante issue de Clock. | [#f12848943d963b26-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:37-38` | findLatestUsableToken est une méthode en lecture seule transactionnelle qui renvoie un Optional d'UUID. | [#920fc8dd3bf9b076-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:23-28` | loadUserByUsername charge l'utilisateur par son nom via le port du dépôt et lève UsernameNotFoundException avec le message User not found si absent. | [#29e77f01a55a68b2-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:85` | nextIp incrémente un compteur atomique partagé et construit une adresse IP 10.83 à partir de ses octets de poids fort et faible. | [#14a65f2d0c176a52-1] |
| `mytimeline:frontend/src/components/ui/palette-color-picker.tsx:107-115` | Le composant reçoit value, onChange, label, testIdPrefix, disabled, customInitialColor et describedBy, puis rend un radiogroup de pastilles et un PopoverPicker pour Personnalisé. | [#a59548c8b13714e7-1] |
| `mytimeline:frontend/src/services/userService.ts:37-41` | updateProfile envoie un PATCH /me avec name, username et email, puis parse la réponse avec UserSchema. | [#f8beb85e9ec6ea27-1] |
| `mytimeline:frontend/src/services/userService.ts:57-63` | updatePreferences envoie un PUT /me/preferences avec le themePreference et les options fournies par l'appelant, puis parse la réponse avec UserSchema. | [#e96d093b89aa3ae7-1] |
| `mytimeline:frontend/src/services/userService.ts:74-76` | changePassword envoie un POST /me/change-password avec oldPassword et newPassword, sans lire la réponse. | [#34b07f4cb29c09ae-1] |
| `mytimeline:frontend/src/services/userService.ts:84-86` | deleteAccount envoie un DELETE /me avec le username dans le corps de la requête, via la clé data de la config axios. | [#0508508038db6745-1] |
| `mytimeline:frontend/src/services/userService.ts:105-110` | uploadAvatar ajoute le fichier sous la part file d'un FormData, envoie un POST /me/avatar et parse la réponse avec UserSchema. | [#d49637c1e01cc514-1] |
| `mytimeline:frontend/src/services/userService.ts:115-117` | deleteAvatar envoie un DELETE /me/avatar sans paramètre. | [#e17ad3706b29511f-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:226` | Javadoc : Selon la javadoc, l'avatar uploadé est stocké via le port StoragePort sous un nom généré, jamais le nom de fichier fourni par le client. | [#integrations/821aa6a831873ea0-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:251` | La méthode uploadAvatar délègue le fichier lu en octets au port AvatarService, avant de relire l'utilisateur pour la réponse. | [#integrations/821aa6a831873ea0-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:92-98` | Envoie un POST à l'endpoint Brevo smtp/email avec l'en-tête api-key, un corps JSON et une réponse récupérée sans corps (toBodilessEntity). | [#ca48d5fcbead056f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:8` | Javadoc : Selon la javadoc, le sujet et le corps HTML de l'email de réinitialisation sont sortis de BrevoEmailService et déclinés dans ce catalogue d'enum. | [#integrations/a21c93a53e80e769-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:70-71` | Le test remplace le port EmailService, qui porte l'envoi Brevo, par un @MockitoBean, sans appel réseau réel. | [#integrations/6e84f2ed7c001309-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/PasswordResetEndpointsIntegrationTest.java:24-25` | Javadoc : Selon la javadoc de la classe, en test sans BREVO_API_KEY, BrevoEmailService agit en no-op avec un avertissement et le flux d'envoi n'échoue pas. | [#integrations/e4e2d28f9a9ae2e2-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:87-88` | uploadAvatar recharge l'utilisateur par son id pour récupérer l'ancienne référence d'avatar, avec repli sur la référence du caller. | [#e4c5e668398854c1-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:118-121` | requestReset insère le nouveau token par tokenRepository.create, sans lecture préalable. | [#dae06dace004e4e2-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:75` | La purge appelle tokenRepository.deleteConsumedOrExpiredBefore avec la date de coupure. | [#7b484975c6071531-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/UserDataExportAssembler.java:56` | assemble charge les produits de l'utilisateur par productRepository.findByUserId. | [#dc8b8aa68368863f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java:93-97` | deleteConsumedOrExpiredBefore supprime en masse les tokens consommés ou expirés avant la date de coupure, et renvoie le nombre de lignes supprimées. | [#55371a1e1f367b51-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java:35-46` | findDomainUserByUsername exécute une JPQL sur username et renvoie le premier utilisateur trouvé, ou Optional.empty. | [#0d979bc9eb412c87-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java:54-63` | findDomainUserByEmail exécute une JPQL sur email, utilise getResultList et prend le premier élément, sans getSingleResult. | [#771c1e9c3e1907b8-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java:146-150` | deleteById exécute un DELETE natif sur la table users par id, sans select préalable. | [#5d0933161319a91f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:54-58` | La requête JPQL projette la seule colonne token de PasswordResetTokenEntity, filtrée sur userId, usedAt nul et expiresAt postérieur à now. | [#91b422e68652f102-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:241-244` | committedRowCount compte les UserEntity portant un username donné par une requête JPQL, exécutée dans une transaction en lecture seule. | [#6c9166fda60e2911-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RegisterLoginIntegrationTest.java:66-72` | countUsers exécute un SELECT count(*) natif sur la table users filtré par username, dans une TransactionTemplate. | [#29f9dece58971932-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java:121-126` | rawThemePreference lit la valeur brute de la colonne theme_preference de la table users par requête SQL native. | [#85818e41b4f3302e-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/UserRoleConstraintIntegrationTest.java:42-53` | insertUser exécute un INSERT SQL natif dans users avec un role bindé pouvant valoir NULL, en contournant les validations JPA. | [#91111db9fc71ba04-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:44` | La taille maximale d'un avatar vaut 5242880 octets (5 Mo) par défaut, configurable via app.storage.avatar-max-bytes. | [#55957da94745e6bc-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:69` | La durée de validité d'un token de reset vaut 15 minutes par défaut, configurable via app.password-reset.token-validity-minutes. | [#f36702af8b213472-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:58` | La fenêtre de rétention des tokens expirés vaut 24 heures par défaut, configurable via app.password-reset.purge.retention-hours. | [#a227f5d67f7b77cd-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:77` | Le cookie jwt est posé avec SameSite Lax. | [#34bf95ecf8e32b31-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:78` | La durée de vie du cookie jwt et de la session est fixée à 2 jours, soit 172800 secondes. | [#e6638f2a16e07b9c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:83-87` | Les attributs Secure et Domain du cookie jwt sont lus depuis les propriétés app.cookie.secure et app.cookie.domain. | [#f3380ad47dce22d3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:72-73` | UserController lit l'attribut Secure du cookie depuis la propriété app.cookie.secure. | [#2f89ef572de08af9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:65-68` | Le constructeur lit brevo.api.key (défaut vide), brevo.sender.email (défaut no-reply@mytimeline.app), brevo.sender.name (défaut MyTimeline) et app.frontend.reset-url-base (défaut http://localhost:3000/reset-password). | [#d49e6680fcdfcaff-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:28` | Javadoc : Selon la javadoc, le bean n'existe que sous le profil e2e, et aucune autre configuration ne l'active. | [#bad68e50289f8c12-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:30` | Javadoc : Selon la javadoc, le job CI e2e pose SPRING_PROFILES_ACTIVE=dev,e2e, le profil e2e s'ajoutant à dev. | [#integrations/4c61ca6e2f106b0b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:18` | Javadoc : Selon la javadoc, le bean n'est actif qu'en profil e2e, et hors de ce profil aucune requête de ce type n'est câblée. | [#65d10589d65d13bb-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:88` | Seule la route PUT /api/me/preferences est plafonnée par la table LIMITS. | [#authorization/589eeb31cac50d43-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:97-104` | Les buckets sont conservés dans une LRU synchronisée bornée à 100 000 entrées, la plus ancienne étant évincée au-delà. | [#330fe3dc7589d49e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:114-119` | Le filtre est activé par défaut via la propriété app.rate-limit.enabled, avec la valeur par défaut true. | [#b115362b3f59b34a-1] |
| `mytimeline:backend/src/main/resources/db/migration/V12__users_role_not_null_check.sql:16` | Commentaire : Le commentaire indique que les migrations s'appliquent aussi à la base dev et à la future prod, car spring.flyway.baseline-on-migrate vaut true. | [#backend-socle/9425a42ca3a25501-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/AvatarServiceImplTest.java:47` | La taille maximale d'avatar utilisée par les tests est fixée à 5 Mo. | [#2bee908f4bad626f-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerDevProfileCookieTest.java:51` | Le test charge le fichier application-dev.properties réel via @TestPropertySource. | [#7b99ba8835a4b67c-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:181-182` | La constante REDACTED_HEADERS liste les en-têtes set-cookie, authorization, proxy-authorization et cookie dont la valeur doit être masquée dans le diagnostic. | [#199cd20c0e935ee5-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java:32-33` | Javadoc : Selon la javadoc, le test vérifie que app.cookie.secure=true est défini dans le fichier application-prod.properties, pour le cookie JWT en production. | [#ad4604569a3f4237-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java:49-50` | Javadoc : Selon la javadoc, seules deux propriétés cookie sont résolues dans ce contexte, app.cookie.secure à true littéral et app.cookie.domain avec un défaut vide. | [#ad4604569a3f4237-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportProfileTest.java:34-38` | Le canal test-only est défini par trois classes conditionnées listées dans TEST_SUPPORT_BEANS : le controller, l'adaptateur JPA et la configuration de sécurité. | [#integrations/71274bf7fecc9cfa-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportProfileTest.java:90` | Le contexte de test positionne spring.profiles.active à e2e. | [#1423377211e3b0a9-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java:57` | Le plafond du test est la constante DEFAULT_PREFERENCES_PER_MINUTE de UserRateLimitingFilter. | [#585a561531b777ae-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java:54` | La classe démarre un vrai serveur sur un port aléatoire, sans MockMvc. | [#e90226962e0bdab6-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java:38-40` | La classe de test démarre le contexte Spring Boot avec spring.main.allow-bean-definition-overriding à true et étend AbstractPostgresIntegrationTest. | [#5f4224d32ed64bcd-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:211-219` | Le constructeur de UserRateLimitingFilter reçoit un booléen d'activation, et avec ce booléen à false le filtre laisse passer les requêtes. | [#authorization/2d7737ca59da087a-1] |
| `mytimeline:frontend/src/components/ui/dropdown-menu.tsx:103-114` | Le contenu du menu est rendu dans un Portal avec un sideOffset par défaut de 4 et le z-index var(--z-popover-over-modal). | [#e00834aeddc55d9f-1] |
| `mytimeline:frontend/src/components/ui/icon-button.tsx:16-17` | Les valeurs par défaut de IconButton sont size md, variant default et type button. | [#49442f9fd04cf0b6-1] |
| `mytimeline:frontend/src/components/ui/palette-color-picker.tsx:202` | Chaque pastille porte tabIndex 0 si elle est l'arrêt de tabulation, sinon -1. | [#8205ab38ecb95c3e-1] |
| `mytimeline:frontend/src/components/ui/palette-color-picker.tsx:215` | Chaque pastille fait 44 px en mobile (size-11) et 28 px à partir du point de rupture sm (sm:size-7). | [#8205ab38ecb95c3e-2] |
| `mytimeline:frontend/src/components/ui/popover.tsx:48` | Le contenu du popover est stylé avec z-[var(--z-popover-over-modal)], une largeur de w-72, un padding p-4 et outline-hidden. | [#d63a9bb2e917a613-1] |
| `mytimeline:frontend/src/components/ui/select.tsx:57` | Le SelectTrigger a une hauteur de h-9 et passe à max-md:h-11 sous 768 px, pour une cible tactile de 44 px. | [#411ec0b2e0547099-1] |
| `mytimeline:frontend/src/components/ui/select.tsx:106` | Le contenu du select utilise le z-index relatif var(--z-popover-over-modal), une hauteur max de 96 et un débordement caché. | [#58ad67fd6487ecb9-1] |
| `mytimeline:frontend/src/components/ui/select.tsx:151` | Chaque SelectItem a une hauteur minimale de 44 px sous 768 px via max-md:min-h-11. | [#5ba8b37bb9f36fec-1] |
| `mytimeline:frontend/src/components/ui/toaster.tsx:191-192` | Le décalage haut des toasts est calculé à partir de jetons DS (space-5, space-11, space-2) et de l'encoche safe-area. | [#6ca94b04d2e1143e-1] |
| `mytimeline:frontend/src/components/ui/toaster.tsx:195-198` | Le conteneur de toasts reçoit un z-index var(--z-toast) et le décalage haut TOASTER_TOP_OFFSET. | [#5ca10b360334c597-1] |
| `mytimeline:frontend/src/components/ui/toaster.tsx:200-201` | La durée d'affichage des toasts de succès est fixée à 4000 ms. | [#253dc2d47b334c01-1] |
| `mytimeline:frontend/src/components/ui/toaster.tsx:204` | TOAST_OPTIONS ne surcharge que la durée du type success, partagée entre le Toaster et useToaster. | [#66b3deeedd7fbf97-1] |
| `mytimeline:frontend/src/components/ui/toaster.tsx:278` | Le Toaster est positionné en haut à droite. | [#65d6da753f2a82a2-1] |

## Changements de base {#t-db_change}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/resources/db/migration/V12__users_role_not_null_check.sql:37-40` | La migration remplace par ROLE_USER toute valeur NULL ou hors des valeurs ROLE_USER et ROLE_ADMIN dans users.role. | [#74d2cfe2af69a907-1] |
| `mytimeline:backend/src/main/resources/db/migration/V12__users_role_not_null_check.sql:42-44` | La migration rend la colonne users.role NOT NULL. | [#74d2cfe2af69a907-2] |
| `mytimeline:backend/src/main/resources/db/migration/V12__users_role_not_null_check.sql:46-52` | La migration ajoute la contrainte ck_users_role limitant users.role aux valeurs ROLE_USER et ROLE_ADMIN. | [#7c4408ec81275c4c-1] |
| `mytimeline:backend/src/main/resources/db/migration/V15__password_reset_tokens_version.sql:28-29` | La migration ajoute la colonne version integer NOT NULL avec la valeur par défaut 0 à password_reset_tokens. | [#b9739366c91bd73b-1] |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql:35` | La migration fixe un lock_timeout local de 5 secondes pour la transaction. | [#db909dfbc7906393-1] |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql:37-38` | La migration ajoute la colonne users.theme_preference varchar(16), nullable et sans valeur par défaut. | [#6d423e3a2b0f5f49-1] |
| `mytimeline:backend/src/main/resources/db/migration/V16__user_theme_preference.sql:39-41` | La migration ajoute la contrainte ck_users_theme_preference limitant theme_preference aux valeurs light, dark et system. | [#c9728c44e5601e19-1] |
| `mytimeline:backend/src/main/resources/db/migration/V6__create_password_reset_tokens.sql:28-35` | La migration crée la table password_reset_tokens avec les colonnes id, user_id, token, expires_at et used_at, la clé primaire portant sur id. | [#6645a8722484174f-1] |
| `mytimeline:backend/src/main/resources/db/migration/V6__create_password_reset_tokens.sql:37-38` | La migration ajoute une contrainte d'unicité sur la colonne token. | [#b28a2b2ccec60771-1] |
| `mytimeline:backend/src/main/resources/db/migration/V6__create_password_reset_tokens.sql:40-42` | La migration crée une clé étrangère user_id vers users(id) avec suppression en cascade. | [#625218b38416e8ec-1] |
| `mytimeline:backend/src/main/resources/db/migration/V6__create_password_reset_tokens.sql:44` | La migration crée l'index idx_password_reset_tokens_user sur la colonne user_id. | [#98d67d4df2fec53e-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:108` | Le compte semé reçoit le rôle ROLE_USER lors de la persistance du UserEntity. | [#16c776502218d6d3-1] |

## Clés de traduction {#t-i18n_key}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:25-33` | Le sujet FR de l'email de réinitialisation est « Réinitialisation de votre mot de passe MyTimeline » et le corps indique une validité de 15 minutes. | [#aab6bd536448849d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:35-43` | Le corps EN de l'email indique que le lien est valide 15 minutes. | [#20b6db88ba7b9b89-1] |
| `mytimeline:frontend/src/components/settings/PasswordStrength.tsx:128` | Le libellé est résolu par la clé settings.security.strength suivie du niveau weak, medium ou strong. | [#5ca9d4e6a77a659d-1] |
| `mytimeline:frontend/src/components/ui/footer-app.tsx:16` | Le texte de droits réservés est lu via la clé common.footer.allRightsReserved. | [#e296a1b69d7ebf89-1] |
| `mytimeline:frontend/src/components/ui/footer-app.tsx:39` | Le libellé du lien vers les conditions est lu via la clé common.footer.termsOfService. | [#e296a1b69d7ebf89-2] |
| `mytimeline:frontend/src/components/ui/language-selector.tsx:177` | Le libellé accessible du déclencheur est lu via la clé navigation.changeLanguage du namespace common. | [#818f32d8d22cb830-1] |
| `mytimeline:frontend/src/components/ui/palette-color-picker.tsx:190` | Le nom accessible de chaque pastille est lu par la clé dynamique roles suivie du rôle de l'entrée de palette. | [#2400c1429e61baf6-1] |
