# Annexe : integrations

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `frontend:services/apiClient.ts` | 14 | convention 12, config 1, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 10 | convention 6, validation 2, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java` | 9 | convention 3, external_call 3, config 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java` | 9 | convention 3, test_case 3, endpoint 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java` | 8 | test_case 5, external_call 2, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapterTest.java` | 7 | test_case 3, validation 3, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java` | 7 | test_case 3, business_rule 1, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventDeleteStatisticsIntegrationTest.java` | 7 | test_case 3, convention 2, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java` | 5 | convention 5 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java` | 5 | convention 4, external_call 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductRestoreIntegrationTest.java` | 5 | test_case 4, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/UserRoleConstraintIntegrationTest.java` | 5 | convention 2, test_case 2, suspicious 1 |
| `frontend:services/productService.ts` | 5 | convention 5 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoHealthIndicator.java` | 4 | other 3, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java` | 4 | other 2, config 1, convention 1 |
| `frontend:services/apiClient.multipart.test.ts` | 3 | test_case 3 |
| `frontend:services/categoryService.ts` | 3 | convention 3 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java` | 2 | convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java` | 2 | convention 1, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/PasswordResetEndpointsIntegrationTest.java` | 2 | external_call 1, test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/ProductArchivedFilterIntegrationTest.java` | 2 | config 1, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenCreateStatisticsIntegrationTest.java` | 2 | convention 1, test_case 1 |
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx` | 2 | convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java` | 1 | convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/ProductEventCreationIntegrationTest.java` | 1 | test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportProfileTest.java` | 1 | other 1 |
| `frontend-app:[locale]/login/page.tsx` | 1 | suspicious 1 |
| `frontend-app:[locale]/register/page.tsx` | 1 | convention 1 |
| `frontend-app:[locale]/reset-password/page.tsx` | 1 | convention 1 |
| `frontend:services/inlineErrorHandling.test.ts` | 1 | test_case 1 |
| `frontend:services/inlineErrorHandling.ts` | 1 | convention 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Les routes d'authentification listées court-circuitent l'intercepteur pour tous les statuts, par pathname strict ou suffixe [#17e17e177c3c1115-1] [#371afdf6b26a2509-1]. | deducible |
| rules | - Un 400 donne un toast global, sauf pour /me/change-password [#ebe8f14e30148918-2] [#0ef3c42e524af8fe-1]. | deducible |
| rules | - Le nom et le lien sont échappés en HTML dans htmlContent, tandis que to.name reçoit la valeur brute [#d01536aff913607e-1] [#d01536aff913607e-2]. | deducible |
| rules | - Le nom stocké est un UUID plus une extension de 1 à 5 caractères [a-z0-9], sinon IllegalArgumentException [#a3b8181473ac234b-1] [#eb4a963db93f2f39-1]. | deducible |
| tests | - Les tests fixent que le stockage local garde l'extension dans la référence sans séparateur de chemin, que load d'une référence inconnue renvoie un Optional vide et que delete est idempotent [#ec871153fc886e17-1] [#eee520fee957f2b3-1] [#b194bc3ae8e99e9d-1]. | deducible |
| tests | - Les tests fixent qu'un token au jti révoqué reçoit 401 sur GET /api/auth/me et sur POST /api/auth/refresh, avec le code unauthorized pour le refresh [#0a2bcd07e504b7e3-1] [#5a8c5980899c0905-1]. | deducible |
| tests | - Les tests de suppression d'événement fixent une seule instruction JDBC, EventNotFoundException pour un id inconnu et strictement moins d'instructions que l'ancienne séquence [#4078bc2b0bfc6735-1] [#896e9e32d1bc49a2-1] [#e4e100bbcecb3a95-1]. | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:79-84` | Si la clé Brevo est absente ou vide, l'envoi est ignoré sans appel HTTP et un warning est journalisé. | [#25504d1bcaa2eac3-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java:113-119` | Commentaire : Selon le commentaire, l'envoi de l'email de réinitialisation ne doit lever aucune exception quelle que soit la locale, pour que forgot-password réponde 200. | [#d1ec0fa0c1cb7fa1-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:86-97` | resolveWithinBase rejette les références vides, contenant un séparateur ou '..', puis vérifie que le chemin résolu reste sous le répertoire de base. | [#68cad5d7a30c3ac4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:99-104` | sanitizeExtension rejette avec IllegalArgumentException toute extension nulle ou ne correspondant pas à l'expression [a-z0-9]{1,5}. | [#eb4a963db93f2f39-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapterTest.java:60-64` | Le test fixe que store lève IllegalArgumentException lorsque l'extension fournie contient des caractères de chemin (../etc), et le commentaire indique que le service ne transmet que jpg, png et webp. | [#6088a4bc8a147988-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapterTest.java:67-70` | Le test fixe que load lève IllegalArgumentException pour une référence contenant une remontée de répertoire (../../etc/passwd). | [#43b2edbc9209445c-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapterTest.java:73-76` | Le test fixe que delete lève IllegalArgumentException pour une référence contenant une remontée de répertoire (../secret). | [#c2eb98df8ec4bd71-1] |
| `frontend:services/apiClient.ts:170` | La seule route dont les 400 sont rendus inline est /me/change-password, les autres 400 gardent le toast global. | [#0ef3c42e524af8fe-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:58-66` | Le rendu Markdown insère les noms et descriptions utilisateur tels quels, sans échappement des caractères Markdown, contrairement au rendu CSV qui neutralise les formules. | [#75dbb39e88e401fb-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/UserRoleConstraintIntegrationTest.java:68-73` | Les tests de rejet vérifient seulement la classe générique Exception, sans contrôler la contrainte précise qui a été violée. | [#ea446db909e94ef5-1] |
| `frontend-app:[locale]/login/page.tsx:53-59` | La page traite le 401 inline alors que la javadoc de inlineErrorHandling.ts affirme que le 401 doit toujours rediriger vers la connexion. Le lot ne contient pas l'intercepteur apiClient, donc la cohérence entre les deux n'est pas vérifiable ici. | [#40bab75854fd0729-1] |

## Endpoints {#t-endpoint}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java:33-36` | Javadoc : Selon la javadoc, l'appel passe par la vraie chaîne Spring Security, et un 200 ou 404 sans cookie JWT prouve que la chaîne dédiée E2eTestSupportSecurityConfig traite la requête avant la chaîne principale. | [#544f7c4603c7da6f-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:47-55` | En cas d'IOException lors de la création du répertoire ou de l'écriture, store relève une UncheckedIOException avec le message générique stockage indisponible. | [#b7c7165d3a6fcdda-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:55-69` | L'adapter envoie les e-mails par POST à l'URL fixe https://api.brevo.com/v3/smtp/email, via un RestClient construit à partir du builder Spring. | [#6e099f05854af74d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:91-98` | La requête HTTP vers Brevo transmet la clé dans l'en-tête api-key et envoie le corps en JSON, sans attendre de contenu de réponse. | [#825c5740d504fe2d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:99-105` | Toute RestClientException levée par l'appel Brevo est journalisée par le nom de sa classe, puis n'est pas propagée au contrôleur. | [#825c5740d504fe2d-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:49-51` | Une IOException levée pendant l'écriture du ZIP est encapsulée dans une UncheckedIOException avec le message zip export rendering failed. | [#956bcf8c3be783c0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/PasswordResetEndpointsIntegrationTest.java:24-26` | Javadoc : Selon la javadoc de la classe, les tests de mot de passe oublié n'utilisent pas Brevo réel : sans BREVO_API_KEY, BrevoEmailService est un no-op qui journalise un warning et le flux ne échoue pas. | [#f61f6c016e2d6728-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:77-80` | Commentaire : Selon le commentaire, le RateLimitingFilter limite le login par IP, et le test donne une remoteAddr unique à chaque POST /login. | [#8c4feacc4e67ccaa-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:132-134` | La méthode login appelle le vrai endpoint POST /api/auth/login avec une remoteAddr générée par nextIp et attend un 200. | [#490dc234907bf9ef-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java:44-53` | Le test intercepte l'appel HTTP POST vers https://api.brevo.com/v3/smtp/email avec MockRestServiceServer branché sur le RestClient.Builder. | [#f579b806f254c425-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:17` | Javadoc : Selon la javadoc, le répertoire des exports RGPD est piloté par la clé app.storage.export-path. | [#74e2f13b9e1f877d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:63-68` | L'URL de base du lien de réinitialisation est lue depuis app.frontend.reset-url-base, avec http://localhost:3000/reset-password par défaut. | [#34158f5b5cd49dab-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:63-65` | La clé Brevo est lue depuis la propriété brevo.api.key, avec une valeur vide par défaut. | [#34158f5b5cd49dab-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoHealthIndicator.java:25-27` | Le HealthIndicator Brevo n'est enregistré que pour le profil prod, par l'annotation Profile. | [#178a2c7117dea14c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:28-31` | Un ObjectMapper Jackson 3 dédié est construit avec l'écriture des dates en timestamps désactivée et l'indentation activée. | [#73bcf4b0dbb4cd09-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java:123-124` | Avec une clé API vide, le test attend qu'aucun appel HTTP ne soit émis vers Brevo, quelle que soit la langue. | [#09a37a45eae01aae-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventDeleteStatisticsIntegrationTest.java:169` | Javadoc : Selon la javadoc, spring.jpa.open-in-view est actif, et le contrôleur et le service partagent alors le même contexte de persistance sur une requête HTTP. | [#3decbad8f1653486-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/ProductArchivedFilterIntegrationTest.java:35` | Javadoc : Selon la javadoc, les tests s'exécutent sur un Postgres jetable Testcontainers avec les migrations Flyway V1 à V7. | [#17ce43a8f74ebddd-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java:43` | La classe active le profil e2e, qui s'ajoute au profil test hérité de AbstractPostgresIntegrationTest. | [#44932808c858ddf9-1] |
| `frontend:services/apiClient.ts:15` | Le timeout par défaut de l'instance axios est fixé à 15 000 ms. | [#99da2bca3c86383d-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:32-37` | Le registre choisit le renderer en filtrant la liste injectée par Spring avec ExportRenderer.supports, puis délègue le rendu au premier renderer retenu. | [#93753e4c74dda84a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java:8-12` | Javadoc : Selon la javadoc, chaque format a son implémentation de rendu côté infrastructure, car elle dépend de bibliothèques techniques. | [#918b649e6b91fa71-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java:17` | Le port déclare la méthode supports(ExportFormat) qui indique si un renderer gère un format donné. | [#39d194a0d0d72617-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:17` | Javadoc : Selon la javadoc, l'exportStorage et l'avatarStorage utilisent des répertoires distincts, sans hypothèse partagée. | [#4f47db1f17f1bf57-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:18-19` | Javadoc : Selon la javadoc, les beans sont déclarés par StorageConfig et chaque clé suit la convention #34, sans valeur par défaut en prod. | [#2b6d73515c064a0a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:38-40` | Le constructeur normalise le chemin de base en chemin absolu normalisé à partir de basePath. | [#1029068ca3950c15-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:46` | La méthode store génère le nom de fichier avec un UUID suivi de l'extension validée, sans reprendre le nom fourni par le client. | [#a3b8181473ac234b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:60-66` | load renvoie un Optional vide si le fichier n'existe pas, sinon lit tous les octets, et enveloppe une IOException dans UncheckedIOException. | [#2dff3849dfa0b56d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:73-79` | delete supprime le fichier de façon idempotente avec Files.deleteIfExists et enveloppe une IOException dans UncheckedIOException. | [#7e28ee75a601515f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:86-88` | Commentaire : Selon le commentaire, la locale nulle, vide ou inconnue retombe sur le français via PasswordResetEmailTemplate.resolve. | [#5051ad54cf7f58e0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:115-120` | Le nom du destinataire est échappé en HTML par HtmlUtils.htmlEscape avant insertion dans htmlContent, tandis que le champ JSON to.name reçoit la valeur brute. | [#d01536aff913607e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:121-124` | Le lien de réinitialisation est échappé en HTML par HtmlUtils.htmlEscape avant insertion dans htmlContent. | [#d01536aff913607e-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:25-27` | Le renderer CSV déclare un seul format via supports(ExportFormat), en comparant à ExportFormat.CSV. | [#56c3efc7de673567-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:37-39` | Le contenu CSV est encodé en UTF-8, et le nom de fichier est produit par ExportFilenames.forFormat. | [#93efbe870a5e7725-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:101` | Le rendu CSV passe chaque valeur par neutralizeFormula avant l'échappement RFC 4180. | [#1323a64f4a7c32e4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:102-107` | Un champ contenant une virgule, un guillemet, un saut de ligne ou un retour chariot est entouré de guillemets, et les guillemets internes sont doublés. | [#1323a64f4a7c32e4-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:118-126` | Une valeur commençant par = + - @, une tabulation, un retour chariot ou un saut de ligne reçoit une apostrophe en préfixe. | [#0bcf5a6ce1ee7408-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:34-36` | Le renderer JSON déclare un seul format via supports(ExportFormat), en comparant à ExportFormat.JSON. | [#0e52202a33fe7ef5-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:41-42` | Le rendu Markdown produit son nom de fichier via ExportFilenames.forFormat, comme les autres renderers. | [#9957b692e263dfee-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:20` | Javadoc : Selon la javadoc, l'archive ZIP est produite avec java.util.zip.ZipOutputStream du JDK, sans dépendance externe. | [#1fa3a7d69ef2dbc2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:38-40` | supports n'accepte que le format ExportFormat.ZIP, ce qui fait de ce renderer le choix pour le format ZIP. | [#2d889486849da46c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:46-48` | render délègue à trois renderers existants (JSON, Markdown, CSV) et écrit chaque rendu comme une entrée data.json, data.md et data.csv de la même archive. | [#19b3fc4ec346a739-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:52-53` | Le résultat est un RenderedExport portant le contenu binaire, le type MIME de ExportFormat.ZIP et un nom de fichier produit par ExportFilenames.forFormat. | [#19b3fc4ec346a739-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductRestoreIntegrationTest.java:33-36` | Javadoc : Selon la javadoc, le test parcourt la chaîne Spring Security réelle avec un CallerResolver réel et du SQL natif sur Postgres, sans service mocké. | [#e5717bf26868c222-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:245-246` | Commentaire : Selon le commentaire, JwtFilter ignore /api/auth/**, donc GET /me doit vérifier lui-même la révocation du jti. | [#c7f72c46ae6db822-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventDeleteStatisticsIntegrationTest.java:49-51` | Les tests de ce fichier étendent AbstractPostgresIntegrationTest et sont annotés @SpringBootTest et @Transactional. | [#1bdc8dc5c45d822e-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventDeleteStatisticsIntegrationTest.java:70-71` | Une implémentation concrète EventRepositoryJpaImpl est injectée uniquement pour le contrôle négatif, afin d'accéder aux méthodes héritées de SimpleJpaRepository. | [#c32c8b7a4fe1d4b5-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/UserRoleConstraintIntegrationTest.java:38-41` | Javadoc : Selon la javadoc, l'insertion en SQL natif contourne les validations JPA pour frapper directement les contraintes de la base. | [#f2815b194b4973c2-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/UserRoleConstraintIntegrationTest.java:42-55` | La méthode insertUser insère un utilisateur par EntityManager.createNativeQuery, puis appelle flush. | [#f2815b194b4973c2-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenCreateStatisticsIntegrationTest.java:68-73` | L'appel tokenRepository.create est exécuté dans un TransactionTemplate distinct de celui qui committe le seed utilisateur. | [#a3b6870a1696bb9b-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java:63-64` | Les dates de référence des tokens sont calculées à partir du bean Clock injecté, et non via LocalDateTime.now() sans argument. | [#9fab6efb3012109b-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java:115` | Commentaire : Selon le commentaire, l'id d'un User créé reste null, car @GeneratedValue refuse un id pré-assigné au persist. | [#9f4165a4a9055c11-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java:126-129` | Commentaire : Selon le commentaire, seedToken reproduit la construction de PasswordResetServiceImpl, avec un id UUID assigné applicativement. | [#1fc3552c7ac7fc5a-1] |
| `frontend-app:[locale]/register/page.tsx:48-62` | La page d'inscription distingue le 409 par axios.isAxiosError et error.response?.status, puis le rattache au champ username via form.setError, sans passer d'option d'opt-out. | [#64e89ce12c6df323-1] |
| `frontend-app:[locale]/reset-password/page.tsx:47-62` | La page de réinitialisation distingue le 400 par axios.isAxiosError et error.response?.status, puis affiche un message inline, et appelle resetPassword sans option d'opt-out. | [#c0c5452783be8e61-1] |
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx:46-64` | Le test définit un adaptateur axios qui rejette toute requête avec une AxiosError portant une réponse de statut 403. | [#4a673f4c70063ebf-1] |
| `frontend:components/categories/CategoryDrawer.forbidden.test.tsx:91` | Le test remplace l'adaptateur de transport de apiClient par forbiddenAdapter, et afterEach restaure l'adaptateur d'origine. | [#778f32aa13a579b0-1] |
| `frontend:services/apiClient.ts:17-24` | Le client axios unique est créé avec baseURL issue de NEXT_PUBLIC_API_URL, withCredentials activé, le timeout par défaut et un en-tête Content-Type application/json au niveau de l'instance. | [#4406c434ee5030c8-1] |
| `frontend:services/apiClient.ts:54-61` | Un intercepteur de requête détecte un corps FormData, passe son timeout à 0 et retire l'en-tête Content-Type de l'instance pour les envois multipart. | [#708cf9ff39788961-1] |
| `frontend:services/apiClient.ts:77-88` | Un rafraîchissement périodique du token est lancé par setInterval toutes les 6 heures, uniquement côté navigateur, et ses erreurs sont journalisées en debug sans toast. | [#9bce6d27ef674db6-1] |
| `frontend:services/apiClient.ts:114-120` | Une liste de routes d'authentification (login, register, mot de passe oublié ou réinitialisé, me) court-circuite le traitement global de l'intercepteur de réponse pour tous les statuts. | [#17e17e177c3c1115-1] |
| `frontend:services/apiClient.ts:143` | La correspondance des routes d'authentification se fait sur le pathname, par égalité stricte ou par suffixe ancré, et non par sous-chaîne. | [#371afdf6b26a2509-1] |
| `frontend:services/apiClient.ts:202-212` | Un timeout (code ECONNABORTED) appelle networkStatusStore.reportTimeout, et un statut 5xx appelle networkStatusStore.reportServerError, sauf un 500 que la requête déclare traiter inline. | [#ebe8f14e30148918-1] |
| `frontend:services/apiClient.ts:217-222` | Un 400 déclenche un toast global de validation, sauf si l'URL figure dans la liste des routes à validation inline. | [#ebe8f14e30148918-2] |
| `frontend:services/apiClient.ts:223-232` | Un 401 affiche un toast de session expirée puis redirige vers la page de login de la locale courante après 1 500 ms, avec un verrou isRedirecting qui évite les redirections multiples. | [#ebe8f14e30148918-3] |
| `frontend:services/apiClient.ts:233-248` | Commentaire : Un 403 ne déclenche ni déconnexion ni redirection vers /login et ne prend pas le verrou isRedirecting, selon le commentaire de la branche. | [#ebe8f14e30148918-4] |
| `frontend:services/apiClient.ts:262-269` | Le 403 est journalisé avec console.error uniquement avec url, method et data, sans les en-têtes de la requête, selon le commentaire qui interdit de logger les en-têtes. | [#ebe8f14e30148918-5] |
| `frontend:services/apiClient.ts:270-272` | Le toast d'accès refusé d'un 403 n'est pas affiché lorsque la configuration de la requête déclare traiter le 403 inline. | [#ebe8f14e30148918-6] |
| `frontend:services/apiClient.ts:273-281` | Le toast de erreur serveur d'un 500 n'est pas affiché lorsque la configuration de la requête déclare traiter le 500 inline. | [#ebe8f14e30148918-7] |
| `frontend:services/categoryService.ts:27-31` | Les erreurs inattendues sont journalisées via safeErrorMessage et jamais avec l'objet axios brut. | [#0d952a09524edf62-1] |
| `frontend:services/categoryService.ts:59-66` | createCategory transmet un paramètre options optionnel à apiClient.post, puis valide la réponse avec categorySchema.parse. | [#cd5e05d5c5026de5-1] |
| `frontend:services/categoryService.ts:104-113` | deleteCategory étale les options dans la configuration axios de apiClient.delete et ajoute le paramètre reassignToCategoryId seulement s'il est fourni. | [#af898f016c5f4e41-1] |
| `frontend:services/inlineErrorHandling.ts:35-43` | Le fichier étend l'interface AxiosRequestConfig d'axios par augmentation de module pour ajouter le champ optionnel inlineHandledStatuses. | [#327d68bab6520eaf-1] |
| `frontend:services/productService.ts:11-14` | Commentaire : Selon le commentaire, l'objet axios brut ne doit jamais être journalisé, et la fonction ne journalise qu'un message assaini via safeErrorMessage avant de relancer l'erreur. | [#bdb861ee54c6c577-2] |
| `frontend:services/productService.ts:18-39` | createProduct transmet le paramètre options comme troisième argument de apiClient.post, ce qui porte l'opt-out inline vers la configuration axios. | [#bb0850e84ca1be19-1] |
| `frontend:services/productService.ts:55-66` | updateProduct transmet le paramètre options comme troisième argument de apiClient.patch. | [#0f7befc796712e2e-1] |
| `frontend:services/productService.ts:91-97` | deleteProduct transmet le paramètre options comme second argument de apiClient.delete. | [#38fe9f77232a7cff-1] |
| `frontend:services/productService.ts:124-131` | restoreProduct n'accepte aucun paramètre options et appelle apiClient.post sans configuration, donc aucun statut n'y est déclaré inline. | [#145742ba350d6f89-1] |
