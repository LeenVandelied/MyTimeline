# Annexe : integrations

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java` | 12 | external_call 5, convention 4, config 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 9 | convention 4, validation 3, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java` | 9 | test_case 5, other 2, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java` | 8 | convention 8 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java` | 8 | convention 4, test_case 4 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplateTest.java` | 7 | test_case 5, config 1, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java` | 6 | convention 4, config 1, persistence_query 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java` | 6 | convention 3, config 2, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java` | 5 | convention 2, external_call 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java` | 5 | convention 4, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java` | 5 | convention 4, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapterTest.java` | 5 | test_case 4, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoHealthIndicator.java` | 4 | other 3, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java` | 4 | convention 4 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoHealthIndicatorTest.java` | 4 | test_case 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java` | 3 | convention 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java` | 2 | convention 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java` | 2 | convention 1, suspicious 1 |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.forbidden.test.tsx` | 2 | external_call 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerErrorContractTest.java` | 1 | convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewControllerTest.java` | 1 | convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java` | 1 | convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventOptimisticLockConflictIntegrationTest.java` | 1 | convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenConcurrencyIntegrationTest.java` | 1 | other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java` | 1 | external_call 1 |
| `mytimeline:frontend/src/contexts/AuthContext.themeSaveToast.test.tsx` | 1 | external_call 1 |
| `mytimeline:frontend/src/services/apiClient.multipart.test.ts` | 1 | external_call 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Le chemin du stockage des exports vient de app.storage.export-path, sans valeur par défaut dans le @Value, et la javadoc annonce une convention fail-fast en prod. [#3a8615964c21dcf2-1] [#0041f21f67193426-2] | deducible |
| rules | - L'extension doit valoir 1 à 5 caractères [a-z0-9], sinon IllegalArgumentException. [#6f4983af9414aa47-1] | deducible |
| rules | - Une RestClientException est journalisée avec le seul nom de classe, sans token ni clé, et n'est pas propagée au contrôleur. [#60b20fc9921c8347-3] [#b9b9446d1558c287-1] | deducible |
| rules | - Le registre prend le premier renderer dont supports est vrai, sinon il lève ExportFormatNotSupportedException. [#9864d2d7bcca1ab3-1] [#24e00cc82b89be48-1] | deducible |
| tests | - Les tests fixent que le JSON exporté contient l'email, le produit et l'événement, mais jamais le hash du mot de passe ni une clé password [#2ee6e70558a01924-1]. | deducible |
| tests | - Les tests fixent qu'un champ CSV commençant par un saut de ligne reçoit une apostrophe en tête puis des guillemets [#271360493da3f939-1]. | deducible |
| tests | - Les tests fixent que le profil CSV a la colonne themePreference avec la valeur light [#271360493da3f939-2], et que le profil Markdown affiche le thème ou la mention aucune [#4b329fceed9b26ff-1]. | deducible |
| tests | - Les tests fixent que sendPasswordResetEmail ne lève jamais d'exception quelle que soit la locale (contrainte BR-AUT-012) [#fd66bd245160df70-1]. | deducible |
| tests | - Les tests fixent que les locales nulle, vide, blanche ou inconnue donnent le français [#3de9961cfcdacd70-1] [#d97eba2cdca557f1-2]. | deducible |
| tests | - Les tests fixent que resolve ignore la casse, les espaces et le sous-tag régional [#d97eba2cdca557f1-3], et que sujet et bouton du payload suivent la locale (fr, en, es, de) [#68e95b1b4c6a82ea-1]. | deducible |
| tests | - Les tests fixent que le nom du destinataire est échappé dans le HTML pour les quatre locales [#72cded3f8ca31e3c-1]. | deducible |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:36` | Si aucun renderer ne gère le format, la méthode lève ExportFormatNotSupportedException avec le nom du format. | [#24e00cc82b89be48-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:86-91` | La méthode resolveWithinBase rejette toute référence nulle, vide, contenant un séparateur de chemin ou deux points, avec IllegalArgumentException. | [#381d4591926b8291-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:92-95` | Après normalisation, le chemin résolu doit commencer par baseDir, sinon la méthode lève IllegalArgumentException (défense en profondeur). | [#381d4591926b8291-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:100-104` | L'extension doit correspondre à [a-z0-9] sur 1 à 5 caractères, sinon la méthode lève IllegalArgumentException. | [#6f4983af9414aa47-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapterTest.java:61-63` | Commentaire : Le test fixe que store lève IllegalArgumentException pour une extension invalide, en défense en profondeur après le filtrage du service. | [#b70a83de6ecc20ab-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:82` | Le no-op sur clé absente ne produit qu'un log WARN, sans signal externe, le contrôle de disponibilité étant porté par BrevoHealthIndicator en profil prod. | [#1e979c5fd365d269-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java:235` | L'assertion accepte n'importe quelle Exception (assertThrows(Exception.class)), sans vérifier qu'il s'agit d'une violation de contrainte. | [#24915c20890dd350-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:32-37` | La méthode render prend le premier renderer dont supports(format) renvoie vrai et délègue le rendu à ce renderer. | [#9864d2d7bcca1ab3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:51-55` | Une IOException d'écriture est enveloppée dans UncheckedIOException avec un message générique, pour ne pas exposer le chemin ou la stack au client. | [#54e96a576c000c98-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:55` | L'adaptateur d'envoi d'email appelle l'API Brevo en HTTP à l'adresse fixe https://api.brevo.com/v3/smtp/email. | [#6bf7717834e2a9ca-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:57-69` | Le client HTTP RestClient est construit à partir du RestClient.Builder injecté, avec le baseUrl Brevo fixé au constructeur. | [#7ccd1bdaa8b5dd43-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:79-84` | Si la clé API est absente ou vide, aucun appel HTTP n'est tenté : un warning est journalisé et l'envoi devient un no-op. | [#60b20fc9921c8347-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:92-98` | L'envoi POST transmet la clé API dans l'en-tête api-key, accepte du JSON et ne lit que le statut de la réponse via toBodilessEntity. | [#60b20fc9921c8347-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:99-105` | Une RestClientException lors de l'appel Brevo est interceptée et journalisée avec le seul nom de classe de l'exception, sans propagation vers le contrôleur. | [#60b20fc9921c8347-3] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java:47-51` | Le test branche un MockRestServiceServer sur le RestClient.Builder et attend un POST vers l'endpoint Brevo smtp/email, ce qui fixe le protocole et l'URL d'appel sortant de BrevoEmailService. | [#9b2c1209795d3f06-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java:97-104` | Le helper login envoie un POST JSON réel via java.net.http.HttpClient vers /api/auth/login et attend un statut 200. | [#191b0912d3bdee58-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.forbidden.test.tsx:47-64` | L'adaptateur forbiddenAdapter rejette toute requête avec un AxiosError de statut 403 et le code ERR_BAD_REQUEST. | [#816c1cb363af8aec-1] |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.forbidden.test.tsx:91` | Le beforeEach remplace l'adaptateur axios de apiClient par forbiddenAdapter, et afterEach le restaure. | [#786bfd2eb21fae71-1] |
| `mytimeline:frontend/src/contexts/AuthContext.themeSaveToast.test.tsx:64-84` | L'adaptateur failingAdapter enregistre la méthode et l'url de chaque requête, puis rejette avec un AxiosError de statut 409 ou 500. | [#e7a92c366da1b75b-1] |
| `mytimeline:frontend/src/services/apiClient.multipart.test.ts:27-52` | Le helper captureRequest remplace l'adaptateur de apiClient par un espion qui capture la config, puis restaure l'adaptateur précédent dans un finally. | [#8461816073da88a8-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:54` | La requête JPQL est construite à partir du nom simple de l'entité PasswordResetTokenEntity. | [#0c3b8b5d276d059a-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:15-17` | Javadoc : Selon la javadoc, chaque usage de stockage (avatars, exports RGPD) a son propre répertoire et sa clé de configuration, et les beans sont déclarés par StorageConfig. | [#4ffef3d0d373604f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:65` | La clé API Brevo est lue depuis la propriété brevo.api.key, avec une valeur vide par défaut. | [#6860fb2193bb56f4-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:66-68` | L'expéditeur, le nom d'expéditeur et l'URL de réinitialisation sont lus depuis des propriétés avec des valeurs par défaut. | [#6860fb2193bb56f4-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:18-28` | Javadoc : Selon la javadoc, le bean est actif uniquement dans le profil e2e, et la classe est annotée Profile e2e. | [#e1b80cdd29ea604b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:34-35` | Le bean avatarStorage construit un LocalStorageAdapter sur le chemin lu dans la propriété app.storage.avatar-path. | [#2e4be0a23920005b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:44-45` | Le bean exportStorage construit un LocalStorageAdapter sur le chemin lu dans la propriété app.storage.export-path, sans valeur par défaut dans l'annotation @Value. | [#3a8615964c21dcf2-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java:52` | Le constructeur de BrevoEmailService reçoit en paramètres le RestClient.Builder, la clé API, l'expéditeur no-reply@mytimeline.app, le nom MyTimeline et l'URL de base de réinitialisation. | [#4bc4e453a2d3e3ef-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplateTest.java:83-87` | Le test affirme que le template par défaut DEFAULT est le template français FR, de languageTag fr. | [#1097c842af502025-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:13-18` | Javadoc : Selon la javadoc, le registre choisit le ExportRenderer par ExportFormat via supports(), Spring injectant toutes les implémentations, et ajouter un format revient à ajouter un renderer sans modifier le use case. | [#2a0f7885822aa7fd-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:24-26` | Le registre reçoit en constructeur la liste de tous les beans ExportRenderer, injectée par Spring. | [#0f95d74bdc01daf9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java:7-13` | Javadoc : Selon la javadoc, il existe une implémentation de ExportRenderer par format (JSON, Markdown, CSV, ZIP), toutes côté infrastructure car elles dépendent de bibliothèques techniques. | [#5a6eff9a9f7b280a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java:14-21` | Le port ExportRenderer, défini dans le domaine, expose supports(ExportFormat) et render(UserDataExport) et ne contient aucune dépendance technique. | [#5a6eff9a9f7b280a-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:13-14` | Javadoc : Selon la javadoc, LocalStorageAdapter écrit les blobs dans un répertoire local hors webroot, et un swap vers S3 ou MinIO se ferait par une nouvelle implémentation de StoragePort. | [#b3128142a2cf02b7-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:38-40` | Le constructeur reçoit le basePath, le convertit en chemin absolu normalisé et le fixe comme répertoire de base de l'instance. | [#ce5f0740bbba8c0f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:43-57` | La méthode store génère le nom de fichier avec un UUID et l'extension validée, sans jamais utiliser le nom fourni par le client, puis renvoie cette référence. | [#1a1fec74340ec77e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:74-78` | La méthode delete est idempotente, car elle utilise Files.deleteIfExists sur le chemin résolu. | [#2657ab0430e16622-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:50-51` | La classe est un adaptateur Spring qui implémente le port domaine EmailService. | [#5476099830e8d246-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:104` | Le journal d'erreur d'envoi ne contient ni le token ni la clé API, seulement le nom simple de la classe d'exception. | [#b9b9446d1558c287-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:120-124` | Le nom du destinataire et le lien de réinitialisation sont échappés en HTML avec HtmlUtils.htmlEscape avant insertion dans le contenu de l'email. | [#1c9019c73cd45014-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:129-133` | Le corps JSON envoyé à Brevo est une Map avec sender, to, subject et htmlContent, le destinataire ayant son nom brut et non échappé. | [#1c9019c73cd45014-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoHealthIndicator.java:25-27` | Le health indicator Brevo est un composant Spring restreint au profil prod. | [#0f6cc63a210dd110-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:66` | Le template de repli DEFAULT est le template français FR. | [#2a75f7941ba689a8-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:85-96` | La résolution de la langue est totale : une locale nulle, vide ou non supportée retombe sur le template FR sans exception. | [#424bd631166a816d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:99-105` | Une locale régionale comme fr-FR ou de_AT est réduite à sa sous-étiquette de langue avant comparaison. | [#7b3034446febe012-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:123-125` | Le rendu HTML attend des valeurs déjà échappées par l'appelant et les insère via String.format. | [#4629fb93ffcd3c8e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:21-22` | Le renderer CSV est un composant Spring qui implémente le port ExportRenderer. | [#4f234ecd904073db-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:25-27` | Le renderer déclare ne supporter que le format ExportFormat.CSV. | [#fa6fafef55f2cd1c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:30-40` | Le rendu assemble les sections PROFILE, CATEGORIES, PRODUCTS et EVENTS dans un seul fichier CSV, dans cet ordre. | [#7c87246f87425fe4-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:37-39` | Le contenu CSV est encodé en UTF-8 et le nom de fichier est produit par ExportFilenames.forFormat. | [#7c87246f87425fe4-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:88` | Chaque champ d'une ligne CSV passe par escape avant d'être concaténé, sans bibliothèque externe. | [#503ba90e3c0e3121-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:97-108` | L'échappement suit la RFC 4180 : neutralisation de la formule, entourage de guillemets si virgule, guillemet ou saut de ligne, et doublement des guillemets. | [#8b52ae90d30c1625-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:98-100` | Une valeur null est rendue comme chaîne vide dans le CSV. | [#8b52ae90d30c1625-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:118-126` | Les valeurs commençant par =, +, -, @, tabulation, retour chariot ou saut de ligne sont préfixées par une apostrophe pour neutraliser l'injection de formule CSV. | [#64f39489a8c24fb5-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:20-21` | Le renderer JSON est un composant Spring qui implémente le port ExportRenderer, avec un support par format. | [#9466b656b0555d3c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:23-26` | Le renderer JSON crée son propre ObjectMapper en champ privé, avec le module JavaTime, les dates en ISO-8601 et une sortie indentée. | [#fc2be60cf9bf7155-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:30` | Le renderer JSON déclare son support uniquement pour le format JSON. | [#1114fc5bba66c80e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:39-42` | En cas d'erreur de sérialisation, le renderer JSON lève une IllegalStateException avec un message générique, sans détail technique. | [#7d8d741b47214f47-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:17-18` | Javadoc : Selon la javadoc, le rendu Markdown est une construction de chaîne pure, sans bibliothèque externe. | [#1d96fec676022681-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:20-21` | Le renderer Markdown est un composant Spring qui implémente le port ExportRenderer. | [#1d96fec676022681-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:40-42` | Le rendu Markdown encode le contenu en UTF-8 et renvoie le type de contenu et le nom de fichier du format Markdown. | [#0658ceb4cf11f4e3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:16-19` | Javadoc : Selon la javadoc, le renderer ZIP compose les renderers JSON, Markdown et CSV sans dupliquer leur logique de rendu. | [#9cb35dfd95c0c498-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:29-31` | Le renderer ZIP reçoit les trois renderers de format par injection de constructeur. | [#9fbc5effa456f1e5-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:45-48` | Le renderer ZIP écrit trois entrées fixes dans l'archive, data.json, data.md et data.csv, chacune produite par le renderer de son format. | [#35a51e5f0043333c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:49-50` | Une IOException pendant l'écriture de l'archive ZIP est encapsulée dans une UncheckedIOException. | [#35a51e5f0043333c-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:21` | Javadoc : Selon la javadoc, la requête est une JPQL liée au mapping JPA et non au SQL brut de la table. | [#1d2cefdb40c7b688-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:28` | La classe implémente l'interface E2eResetTokenFinder, selon le motif adaptateur port et implémentation. | [#1d2cefdb40c7b688-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:37` | La méthode est annotée Transactional en lecture seule. | [#65c39a1eccedc90c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:63-64` | Commentaire : Selon le commentaire, la méthode utilise setMaxResults plutôt qu'un get(0) sur la liste complète, par convention du projet. | [#65c39a1eccedc90c-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:11` | Javadoc : Selon la javadoc, les beans de stockage local sont câblés à raison d'un bean par usage, chacun sur un répertoire distinct. | [#0041f21f67193426-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:21` | Javadoc : Selon la javadoc, chaque clé de configuration de stockage suit la convention fail-fast sans valeur par défaut en prod. | [#0041f21f67193426-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:26-27` | Javadoc : Selon la javadoc, deux beans de type StoragePort coexistent et chaque injection doit être désambiguïsée par un qualifier. | [#0041f21f67193426-3] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerErrorContractTest.java:1` | Le test est rangé dans le package infrastructure.adapters.controllers, en miroir du contrôleur AuthController qu'il teste. | [#3bd6b64f8b255498-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewControllerTest.java:1` | Le test est rangé dans le package infrastructure.adapters.controllers, couche adaptateur de l'architecture hexagonale. | [#c109b934f1e36d8a-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:113-127` | seedUser persiste un UserEntity dans une TransactionTemplate committée, sans passer par POST /api/auth/register. | [#e88067e212995dee-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java:91-104` | seedUser persiste un UserEntity, appelle em.flush() dans une TransactionTemplate et renvoie le userId et le username. | [#03426d01e7a6b66f-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplateTest.java:69-81` | Commentaire : Selon le commentaire, le nom arrive déjà échappé depuis BrevoEmailService via HtmlUtils.htmlEscape, et le template ne le réinterprète pas. | [#c98d746fbad5bc42-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java:103-136` | Le test affirme que CsvExportRenderer préfixe d'une apostrophe les champs user-controlled commençant par @, = ou -, et que ce préfixe est combiné avec l'échappement RFC 4180. | [#f31607d729555ad2-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java:165-182` | Le test affirme que ZipExportRenderer regroupe les trois représentations dans les entrées data.json, data.md et data.csv. | [#dfb8aa6061657764-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java:184-191` | Le test affirme que le nom de fichier d'export commence par mytimeline-export- et se termine par l'extension du format, sans identifiant utilisateur. | [#4ee17d496acc51ca-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java:193-200` | Le test affirme que chaque renderer ne supporte que son propre format, ZipExportRenderer supportant le format ZIP. | [#153b31b2dc43fcf8-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventOptimisticLockConflictIntegrationTest.java:327-332` | La méthode cleanup supprime la ligne events par une requête native DELETE exécutée dans un TransactionTemplate. | [#4eafc196ccd1804e-1] |
