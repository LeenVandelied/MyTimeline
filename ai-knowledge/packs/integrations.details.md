# Annexe : integrations

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java` | 12 | external_call 7, convention 4, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java` | 11 | test_case 8, convention 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java` | 9 | test_case 5, convention 2, external_call 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 8 | validation 3, convention 2, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java` | 6 | convention 3, config 2, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplateTest.java` | 6 | test_case 5, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java` | 5 | convention 4, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java` | 5 | convention 4, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java` | 5 | convention 3, persistence_query 1, suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapterTest.java` | 5 | test_case 5 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoHealthIndicatorTest.java` | 5 | test_case 4, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java` | 4 | convention 2, suspicious 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java` | 4 | convention 2, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java` | 4 | convention 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java` | 3 | convention 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoHealthIndicator.java` | 2 | config 1, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java` | 2 | convention 2 |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.forbidden.test.tsx` | 2 | external_call 2 |
| `mytimeline:frontend/src/components/shared/DeleteConfirmDialog.forbidden.test.tsx` | 2 | convention 1, external_call 1 |
| `mytimeline:frontend/src/components/timeline/TimelineEditHost.forbidden.test.tsx` | 2 | convention 1, external_call 1 |
| `mytimeline:frontend/src/contexts/AuthContext.themeSaveToast.test.tsx` | 2 | convention 1, external_call 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java` | 1 | convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java` | 1 | suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java` | 1 | test_case 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenConcurrencyIntegrationTest.java` | 1 | convention 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Selon la javadoc, les clés de stockage sont fail-fast sans défaut en prod, et exportStorage n'a pas de défaut dans @Value. [#0041f21f67193426-2] [#3a8615964c21dcf2-1] | deducible |
| rules | - Le registre choisit à chaque appel le premier renderer dont supports(format) est vrai, sinon il lève ExportFormatNotSupportedException. [#9864d2d7bcca1ab3-1] [#24e00cc82b89be48-1] | deducible |
| rules | - Nom et lien sont échappés HTML dans le payload, et le template ne les échappe pas une seconde fois. [#1c9019c73cd45014-1] [#1c9019c73cd45014-3] [#4629fb93ffcd3c8e-1] | deducible |
| rules | - L'indicateur de santé Brevo n'est actif qu'en profil prod. [#0f6cc63a210dd110-1] | deducible |
| tests | - Les tests fixent que le CSV contient les sections PROFILE, CATEGORIES, PRODUCTS et EVENTS, avec la colonne themePreference au profil [#e208db06d82742f5-1] [#271360493da3f939-2]. | deducible |
| tests | - Pour prouver une contrainte CHECK, un test passe par un UPDATE natif dans une transaction et attend une exception de la base [#787bb1a4209c63cf-1]. | deducible |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:36` | Si aucun renderer ne supporte le format, le code lève ExportFormatNotSupportedException avec le nom du format. | [#24e00cc82b89be48-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:87-91` | Toute référence nulle, vide, contenant un séparateur de chemin ou la séquence '..' est rejetée avec IllegalArgumentException. | [#381d4591926b8291-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:92-95` | Le chemin résolu est normalisé puis vérifié comme commençant par le répertoire de base, sinon IllegalArgumentException. | [#381d4591926b8291-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:100-104` | L'extension doit correspondre à [a-z0-9]{1,5}, sinon IllegalArgumentException est levée. | [#6f4983af9414aa47-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:118-128` | Un champ dont le premier caractère est un signe de formule ou un saut de ligne est préfixé d'une apostrophe avant l'échappement CSV. | [#64f39489a8c24fb5-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:28-31` | La javadoc indique que l'exception est un garde-fou qui ne devrait pas survenir, les quatre formats ayant un renderer ; cette affirmation n'est pas vérifiable dans ce lot. | [#9554238efa1f9591-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:51-53` | Selon le commentaire, le tri secondaire sur t.id rend le résultat déterministe sans ordonner par récence, et le code signale que ce critère devra changer si la TTL devient variable. | [#bbb3d5883ae25232-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java:64-66` | Un commentaire indique que si ce test renvoie 401, la whitelist de SecurityConfig a sauté et la découverte de clé du middleware boucle, et il interdit d'adapter l'assertion. | [#4c7add49c7251530-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:49-55` | Les erreurs IOException à l'écriture sont enveloppées dans UncheckedIOException avec le message générique 'stockage indisponible'. | [#54e96a576c000c98-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:55` | L'adaptateur appelle l'API Brevo en HTTPS sur l'URL fixe de l'envoi SMTP transactionnel. | [#6bf7717834e2a9ca-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:69` | Le client HTTP RestClient est construit à partir du Builder Spring avec l'URL de base Brevo fixée. | [#7ccd1bdaa8b5dd43-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:79-84` | Si la clé API est vide ou absente, l'envoi est ignoré sans appel HTTP et un warning est journalisé. | [#60b20fc9921c8347-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:82` | En l'absence de clé, le warning journalisé indique que l'envoi de réinitialisation est ignoré en no-op. | [#1e979c5fd365d269-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:92-98` | L'appel HTTP POST transmet la clé dans l'en-tête api-key et attend une réponse sans corps. | [#60b20fc9921c8347-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:99-105` | Une RestClientException lors de l'envoi est journalisée par le nom de classe de l'exception et n'est pas propagée à l'appelant. | [#60b20fc9921c8347-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:129-133` | Le corps JSON envoyé à Brevo contient l'expéditeur, le destinataire, le sujet et le contenu HTML construit à partir du template. | [#1c9019c73cd45014-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java:47` | Le test attend une requête POST vers https://api.brevo.com/v3/smtp/email pour l'envoi des emails de réinitialisation. | [#9b2c1209795d3f06-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java:52` | BrevoEmailService est construit avec la clé d'API, l'adresse d'expéditeur, le nom d'expéditeur et l'URL de base de réinitialisation. | [#4bc4e453a2d3e3ef-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.forbidden.test.tsx:47-64` | L'adaptateur forbiddenAdapter rejette toute requête avec un AxiosError de statut 403 et le code ERR_BAD_REQUEST. | [#816c1cb363af8aec-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.forbidden.test.tsx:91` | Le beforeEach remplace l'adaptateur axios de apiClient par forbiddenAdapter, et afterEach le restaure. | [#786bfd2eb21fae71-1] |
| `mytimeline:frontend/src/components/shared/DeleteConfirmDialog.forbidden.test.tsx:87-104` | L'adaptateur forbiddenAdapter rejette chaque requête par un AxiosError portant une réponse de statut 403. | [#88e3df5307a8bf3c-1] |
| `mytimeline:frontend/src/components/timeline/TimelineEditHost.forbidden.test.tsx:94-114` | L'adaptateur failingAdapter rejette une requête par un AxiosError dont le code vaut ERR_BAD_RESPONSE pour un statut 500 et ERR_BAD_REQUEST sinon. | [#3dfad69d1ba98704-1] |
| `mytimeline:frontend/src/contexts/AuthContext.themeSaveToast.test.tsx:74-95` | L'adaptateur failingAdapter rejette chaque requête par un AxiosError dont le statut et le texte viennent de STATUS_TEXT, et enregistre la requête dans seenRequests. | [#e7a92c366da1b75b-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:54-58` | La requête JPQL est construite à partir du nom simple de l'entité PasswordResetTokenEntity et ne projette que la colonne token. | [#0c3b8b5d276d059a-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:65-68` | La clé Brevo, l'expéditeur et l'URL de base de réinitialisation sont injectés par @Value avec des valeurs par défaut. | [#6860fb2193bb56f4-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoHealthIndicator.java:25-27` | L'indicateur de santé Brevo est un composant actif uniquement en profil prod. | [#0f6cc63a210dd110-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:34-35` | Le bean avatarStorage construit un LocalStorageAdapter sur le chemin lu dans la propriété app.storage.avatar-path. | [#2e4be0a23920005b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:44-45` | Le bean exportStorage construit un LocalStorageAdapter sur le chemin lu dans la propriété app.storage.export-path, sans valeur par défaut dans l'annotation @Value. | [#3a8615964c21dcf2-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:19-26` | Le registre est un @Component qui reçoit par injection une List<ExportRenderer> et la conserve telle quelle, sans résolution à la construction. | [#0f95d74bdc01daf9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:32-38` | La résolution du renderer se fait à chaque appel par filtrage du flux sur renderer.supports(format), premier élément retenu, puis délégation à render(data). | [#9864d2d7bcca1ab3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java:14-20` | Le port est une interface à deux méthodes, supports(ExportFormat) et render(UserDataExport), sans dépendance technique dans sa signature. | [#5a6eff9a9f7b280a-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:29-40` | L'adapter de stockage local reçoit son répertoire de base en constructeur, le normalise en chemin absolu, et n'est pas annoté @Component (déclaration par StorageConfig selon la javadoc). | [#ce5f0740bbba8c0f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:44-46` | Le nom de fichier stocké est généré par UUID suivi d'une extension, et jamais dérivé du nom client. | [#1a1fec74340ec77e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:23-24` | Javadoc : Selon la javadoc, la clé API provient uniquement de la variable d'environnement BREVO_API_KEY et n'est jamais loggée. | [#5476099830e8d246-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:51` | L'adaptateur d'envoi d'email implémente le port domaine EmailService, placé dans le package infrastructure/adapters. | [#5476099830e8d246-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:120` | Le nom du destinataire est échappé HTML avant insertion dans le contenu HTML de l'email. | [#1c9019c73cd45014-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:124` | Le lien de réinitialisation est lui aussi échappé HTML avant insertion dans l'attribut href. | [#1c9019c73cd45014-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:66` | Le template de repli pour les locales absentes ou non supportées est le français. | [#2a75f7941ba689a8-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:85-96` | La résolution de locale ignore la casse et la sous-étiquette régionale, et retombe sur DEFAULT si aucune langue ne correspond. | [#424bd631166a816d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:123-125` | Le rendu HTML insère le nom et le lien tels que fournis par l'appelant, sans les échapper à nouveau. | [#4629fb93ffcd3c8e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:22` | Le renderer CSV implémente le port ExportRenderer et s'exécute comme composant Spring. | [#4f234ecd904073db-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:25-27` | Le renderer déclare ne supporter que le format CSV. | [#fa6fafef55f2cd1c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:37-39` | Le contenu est encodé en UTF-8, puis le résultat porte le content type CSV et un nom de fichier produit par ExportFilenames. | [#7c87246f87425fe4-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:81-108` | L'échappement suit la convention RFC 4180, avec guillemets autour des champs contenant virgule, guillemet ou saut de ligne, et doublement des guillemets. | [#8b52ae90d30c1625-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:28-31` | Le renderer JSON construit un ObjectMapper dédié qui désactive l'écriture des dates en timestamps et active l'indentation. | [#fc2be60cf9bf7155-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:34-35` | Le renderer JSON déclare supporter uniquement le format ExportFormat.JSON. | [#1114fc5bba66c80e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:17-18` | Javadoc : Selon la javadoc, le rendu Markdown est une construction de chaîne pure, sans bibliothèque externe. | [#1d96fec676022681-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:27` | Le renderer Markdown déclare supporter uniquement le format ExportFormat.MARKDOWN. | [#c4c80ba2f8748bd7-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:40` | Le rendu Markdown encode le document assemblé avec un StringBuilder en UTF-8 avant de produire le contenu. | [#0658ceb4cf11f4e3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:112-115` | Le helper nz convertit une valeur null en chaîne vide pour l'affichage Markdown. | [#b8abbd0945ce595b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:17-20` | Javadoc : Selon la javadoc, l'archive utilise java.util.zip.ZipOutputStream du JDK, sans dépendance externe. | [#9cb35dfd95c0c498-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:39` | Le renderer ZIP déclare supporter uniquement le format ExportFormat.ZIP. | [#f2cde3f78a600e26-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:44-54` | Le renderer ZIP construit l'archive entièrement en mémoire avec un ZipOutputStream sur un ByteArrayOutputStream. | [#35a51e5f0043333c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:46-48` | Le renderer ZIP compose les rendus JSON, Markdown et CSV produits par les renderers dédiés, sous les noms data.json, data.md et data.csv, sans logique de rendu propre. | [#35a51e5f0043333c-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:26-28` | L'adaptateur est annoté @Repository et @Profile("e2e") et implémente l'interface E2eResetTokenFinder. | [#1d2cefdb40c7b688-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:37` | La lecture du token est encapsulée dans une transaction en lecture seule. | [#65c39a1eccedc90c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:63-64` | Commentaire : Selon le commentaire, setMaxResults est préféré à un get(0) sur la liste complète, et le code applique setMaxResults(1). | [#65c39a1eccedc90c-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:11` | Javadoc : Selon la javadoc, les beans de stockage local sont câblés à raison d'un bean par usage, chacun sur un répertoire distinct. | [#0041f21f67193426-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:21` | Javadoc : Selon la javadoc, chaque clé de configuration de stockage suit la convention fail-fast sans valeur par défaut en prod. | [#0041f21f67193426-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:26-27` | Javadoc : Selon la javadoc, deux beans de type StoragePort coexistent et chaque injection doit être désambiguïsée par un qualifier. | [#0041f21f67193426-3] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:100-114` | Le compte de test est persisté dans une transaction committée via TransactionTemplate avant la requête de login. | [#ff6366e3eec33e46-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java:237-249` | La sonde de lignes committées s'exécute dans une TransactionTemplate distincte, configurée en lecture seule. | [#a308d2b3168c037c-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java:44-53` | Le test construit BrevoEmailService sur un RestClient.Builder lié à un MockRestServiceServer, qui intercepte le corps de la requête sans appel réseau. | [#9b2c1209795d3f06-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java:103-104` | Commentaire : Selon le commentaire, le champ to.name du payload Brevo reste brut et seul le corps HTML est échappé. | [#4559bbd1bd2631a7-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoHealthIndicatorTest.java:1` | La classe de test est déclarée dans le package infrastructure.adapters.email, comme le code testé. | [#563b745f049158f8-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplateTest.java:71-81` | Commentaire : Selon le commentaire, le nom est échappé en amont par BrevoEmailService, et le template ne le désèchappe ni ne le réinterprète. | [#c98d746fbad5bc42-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java:58` | Convention : chaque renderer d'export expose render(UserDataExport) et renvoie un RenderedExport portant le contenu, le contentType et le filename. | [#4ee17d496acc51ca-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java:167-168` | Le renderer ZIP est construit par injection par constructeur des trois renderers JSON, Markdown et CSV. | [#6d2409d878898434-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java:195-199` | Convention : chaque renderer déclare supports(ExportFormat) et ne répond que pour son propre format, le renderer ZIP étant construit avec les trois autres renderers. | [#153b31b2dc43fcf8-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenConcurrencyIntegrationTest.java:69-76` | Le seed du user est committé via TransactionTemplate.execute, car un appel direct au repository hors transaction ne persisterait pas. | [#02eb3824da89c300-1] |
| `mytimeline:frontend/src/components/shared/DeleteConfirmDialog.forbidden.test.tsx:135` | Le beforeEach remplace seulement l'adaptateur HTTP d'apiClient, si bien que l'intercepteur et les services réels sont exécutés. | [#e65dbfcdd2a02b5d-1] |
| `mytimeline:frontend/src/components/timeline/TimelineEditHost.forbidden.test.tsx:136` | Le beforeEach remplace seulement l'adaptateur HTTP d'apiClient par forbiddenAdapter, avec l'intercepteur réel en place. | [#309404f585113b26-1] |
| `mytimeline:frontend/src/contexts/AuthContext.themeSaveToast.test.tsx:146` | Chaque cas installe failingAdapter avec le statut testé sur apiClient, sans mocker le service de préférences. | [#e99e519a0b0bae53-3] |
