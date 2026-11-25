# Annexe : export

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java` | 19 | business_rule 5, convention 3, service_method 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java` | 19 | other 5, convention 4, business_rule 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java` | 18 | endpoint 7, role_check 5, other 3 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/AvatarServiceImplTest.java` | 17 | test_case 13, suspicious 2, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java` | 15 | convention 3, business_rule 2, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 13 | convention 7, state_transition 4, business_rule 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java` | 12 | business_rule 5, other 3, suspicious 2 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java` | 12 | test_case 9, config 1, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java` | 10 | convention 4, state_transition 3, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 10 | convention 4, validation 3, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java` | 10 | convention 5, business_rule 2, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java` | 8 | business_rule 2, convention 2, batch_job 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java` | 8 | config 2, convention 2, other 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/config/StorageConfigTest.java` | 8 | other 3, test_case 3, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/AvatarService.java` | 7 | convention 2, service_method 2, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java` | 7 | convention 3, business_rule 1, entity 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java` | 7 | convention 3, batch_job 1, persistence_query 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ExportJobRepository.java` | 6 | persistence_query 3, other 2, role_check 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ExportJobEntity.java` | 6 | entity 4, convention 1, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ExportJobResponse.java` | 5 | other 2, business_rule 1, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java` | 5 | business_rule 1, convention 1, service_method 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportFormat.java` | 4 | convention 2, business_rule 1, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java` | 4 | service_method 2, convention 1, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportService.java` | 4 | service_method 3, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/StoragePort.java` | 4 | service_method 3, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobMapper.java` | 3 | convention 2, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java` | 3 | config 2, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/domain/models/export/ExportJobTest.java` | 3 | other 1, state_transition 1, test_case 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/AvatarNotFoundException.java` | 2 | other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/ExportFormatNotSupportedException.java` | 2 | other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/InvalidAvatarException.java` | 2 | other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/AvatarContent.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJobStatus.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/RenderedExport.java` | 1 | convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportFilenames.java` | 1 | business_rule 1 |

## Structure (suite) {#t-structure_overflow}

| Pointeur | Symbole | Énoncé | Fait |
|---|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:65-74` | ExportController.exportInline | GET /api/export, paramètre format, renvoie inline le fichier d'un format synchrone, avec 200 en succès. | [#319b045aa097c00f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:66-73` | ExportController.exportInline | GET /api/export parse le paramètre format et renvoie le fichier rendu inline, avec 401 si aucun caller n'est résolu. | [#integrations/a1af8840ed91bbb5-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:77-88` | ExportController.submitAsync | POST /api/export, paramètre format, soumet un job asynchrone et renvoie 202 avec un ExportJobResponse. | [#071643b5944b880b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:86-87` | ExportController.submitAsync | POST /api/export soumet un job asynchrone et renvoie 202 avec la réponse du job, dont l'URL de téléchargement éventuelle. | [#integrations/1df5c599c86dd243-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:91-102` | ExportController.jobStatus | GET /api/export/job/{jobId} renvoie le statut du job du caller, et 404 si le job est absent ou appartient à un autre utilisateur. | [#542c65ac19d97770-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:109-129` | ExportController.download | GET /api/export/download/{jobId} avec paramètre token renvoie le fichier si le token et le caller correspondent au job, sinon 404. | [#b496e1abe39faec9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:65-73` | ExportServiceImpl.exportInline | Assemble les données de l'utilisateur puis rend le format demandé en réponse immédiate, pour un format synchrone. | [#23f4df0fb15daa38-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:16-26` | ExportJob | Le modèle ExportJob est un POJO portant id, ownerId, format, status, storageRef, errorCode, createdAt, completedAt et expiresAt. | [#b99866367a7951cd-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ExportJobEntity.java:23-29` | ExportJobEntity | L'entité est mappée sur la table export_jobs, avec un id UUID généré en AUTO et sans @Version. | [#fc63aac0048954d1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ExportJobEntity.java:31-32` | ExportJobEntity.userId | La colonne user_id est non nulle et stockée en UUID simple, sans association ManyToOne. | [#997ec849433df630-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ExportJobEntity.java:37-38` | ExportJobEntity.status | La colonne status est non nulle, de type varchar de longueur 16. | [#87e3a056e37071cf-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ExportJobEntity.java:43-44` | ExportJobEntity.errorCode | La colonne error_code est un varchar de longueur 64, nullable. | [#e507314132deba19-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:22-23` | ZipExportRenderer | La classe ZipExportRenderer est un composant Spring qui implémente le port ExportRenderer. | [#8f5c2cd3f8777d4c-1] |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Toute RuntimeException de génération met le job en FAILED avec le code fixe GENERATION_ERROR, sans message. [#batch/92871d4006ddb92f-3] | deducible |
| rules | - Un format asynchrone en inline ou un format synchrone en async lève ExportFormatNotSupportedException. [#23f4df0fb15daa38-2] [#3eab0f691637f6a9-2] | deducible |
| rules | - Le paramètre de format est normalisé (trim, majuscules), une valeur nulle ou inconnue lève la même exception. [#294fa6ab1b481935-1] | deducible |
| rules | - La purge supprime le fichier seulement s'il a une référence, avant la ligne, qui est supprimée dans tous les cas. [#450d17525574aab3-1] [#450d17525574aab3-2] | deducible |
| rules | - Le secret de signature doit être du Base64 décodant à 32 octets au moins, sinon le démarrage échoue. [#14dc8c12f2d89795-2] | deducible |
| surface | - Le filtre de propriété se fait dans la requête elle-même, sur l'identifiant du job et sur userId, dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:70-81` [#integrations/d0d4c3b6873c2877-1]. | deducible |
| tests | - Les tests fixent que markCompleted garde la valeur completedAt fournie et ne la déduit pas de expiresAt moins 24 heures [#0766dc0503a2ed54-1]. | deducible |
| tests | - Les tests fixent que avatarStorage et exportStorage sont deux beans distincts, qu'un export s'écrit sous export-path sans toucher le répertoire avatar, et que le contexte échoue au démarrage sans app.storage.export-path [#eb9cd80429fb3f30-1] [#15ab20197e968f0c-1] [#9d07ba752a943c26-1]. | deducible |
| rules | - LocalStorageAdapter.delete est idempotent pour une référence bien formée inconnue (Files.deleteIfExists), mais lève IllegalArgumentException si elle est vide ou contient un séparateur ou [#12c278c3bd29d6cd-1] [#integrations/7e28ee75a601515f-1] `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:73-79`. | deducible |
| rules | - Le CSV préfixe d'une apostrophe tout champ commençant par un caractère de formule. [#83fd00ed9710ea05-2] | deducible |
| tests | - Les tests fixent que les avatars JPEG, PNG et WebP sont reconnus par magic bytes et stockés avec l'extension correspondante [#9c04cddd4bfe931b-1] [#737c3305c41c4b4a-1] [#e0264cc270531712-1]. | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ExportJobResponse.java:25-26` | Javadoc : Selon la javadoc, downloadUrl et expiresAt ne sont non null que lorsque le statut est COMPLETED. | [#97abee22274d5286-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:62-64` | Si le job demandé est introuvable, le worker journalise un avertissement et s'arrête sans changer d'état. | [#5686ec4dee42298d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:76` | La date d'expiration du fichier est fixée à la date de génération plus DOWNLOAD_TTL_HOURS heures. | [#5686ec4dee42298d-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:87-88` | L'ancienne référence d'avatar est relue depuis la base, avec repli sur la référence portée par le caller si l'utilisateur est absent. | [#1c4324c9ad92e299-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:104-106` | L'ancien fichier est supprimé après la sauvegarde seulement si une ancienne référence existe et diffère de la nouvelle. | [#1c4324c9ad92e299-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:125-126` | Si le caller n'a pas d'avatar, la suppression ne fait rien et sort immédiatement. | [#b3152e5f4c94517d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:145-164` | Détecte JPEG par les octets FF D8 FF, PNG par la signature de 8 octets et WebP par RIFF en tête et WEBP aux octets 8 à 11, sinon renvoie vide. | [#b93731ef872c106d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:171-179` | Déduit le type MIME de l'extension de la référence stockée, avec repli sur application/octet-stream pour une extension inconnue. | [#b32708b7692c1012-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:68-73` | Le fichier n'est supprimé que si le job porte une référence de stockage, la ligne est supprimée dans tous les cas. | [#450d17525574aab3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:71-73` | Le fichier est supprimé via StoragePort.delete avant la suppression de la ligne par deleteById. | [#450d17525574aab3-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:32-37` | Délègue le rendu au premier renderer dont supports(format) renvoie vrai. | [#2ef7dccab2861c6b-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:96-105` | Renvoie vide si le job n'appartient pas au caller, ou s'il n'est pas téléchargeable à l'instant courant. | [#78b030e5b637f431-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:113-117` | Javadoc : Selon la javadoc, l'UUID est masqué dans les logs et seul un préfixe court est conservé. | [#141e6e74b25a2f17-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportFormat.java:45-47` | isSync renvoie le drapeau sync du format. | [#df7715a58e754f75-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:65-70` | Un job est téléchargeable si son statut est COMPLETED, storageRef et expiresAt sont renseignés, et la date courante est strictement avant expiresAt. | [#916a992fa5c873bb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/AvatarService.java:40-43` | Javadoc : Selon la javadoc, deleteAvatar est idempotent et ne fait rien pour un caller sans avatar. | [#ec482b9e0dfedcea-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:43-57` | La méthode store génère une référence de fichier au format UUID suivi de l'extension validée, sans utiliser le nom fourni par le client. | [#773091294adeea81-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:144-147` | L'URL de téléchargement n'est construite que si le job est COMPLETED et possède une date d'expiration, sinon elle vaut null. | [#a01408ee42f6a4d7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:148` | La date d'expiration du token de téléchargement est la date d'expiration du job, convertie en Date avec la zone de l'horloge. | [#a01408ee42f6a4d7-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:97-108` | Un champ contenant virgule, guillemet, saut de ligne ou retour chariot est entouré de guillemets, les guillemets internes étant doublés, après neutralisation de formule. | [#be3acd5573f80a77-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:123-126` | Une valeur commençant par =, +, -, @, tabulation, retour chariot ou saut de ligne reçoit une apostrophe en préfixe. | [#83fd00ed9710ea05-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportFilenames.java:21-23` | Le nom de fichier d'export est le préfixe mytimeline-export- suivi de la date yyyyMMdd et de l'extension du format, sans identifiant utilisateur. | [#a50a24b21eddaa1a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:53-55` | Commentaire : Une préférence de thème absente s'affiche comme aucune, selon le commentaire qui renvoie au ticket 653. | [#3f1b1d0facae734d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:54-55` | La préférence de thème affiche sa valeur si elle est non null, sinon le libellé aucune. | [#3f1b1d0facae734d-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:61` | Quand la liste des catégories est vide, le document affiche le message Aucune catégorie à la place de la liste. | [#0a36f4823b0f4237-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:100-103` | La plage de dates n'est affichée que si startDate est non null, et endDate n'est ajouté que s'il est lui aussi présent. | [#bd5f408bcdb70cc9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:106-108` | La mention récurrent n'est affichée que si isRecurring vaut TRUE et que recurrenceUnit n'est pas null. | [#bd5f408bcdb70cc9-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:49-50` | Une IOException levée pendant l'écriture de l'archive est relancée en UncheckedIOException avec le message zip export rendering failed. | [#34af047abf37cff1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:110-112` | Un token null ou blanc est refusé et renvoie un Optional vide sans être parsé. | [#d7eb038aa775ae0e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:116` | L'expiration du token est vérifiée contre l'instant fourni par le Clock injecté et non contre l'horloge système. | [#f823965740137381-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:120-122` | Un token dont le claim typ n'est pas export-download est refusé, ce qui isole ces tokens des tokens d'authentification. | [#1a5dc55516cc4fdf-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/AvatarServiceImplTest.java:47` | La taille maximale d'un avatar utilisée par ce test est fixée à 5 Mo (5 x 1024 x 1024 octets). | [#31d3c231098d4fcf-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:68-69` | Rejette un contenu nul ou vide avec InvalidAvatarException. | [#1046ffacd8962da9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:77-79` | Rejette tout contenu qui ne commence pas par une signature JPEG, PNG ou WebP avec InvalidAvatarException. | [#1046ffacd8962da9-3] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:113-115` | Lève AvatarNotFoundException lorsque la référence d'avatar est nulle ou vide. | [#b53297ab9e295a1a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:36` | Lève ExportFormatNotSupportedException si aucun renderer ne supporte le format demandé. | [#d00e645c46e4b1e1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:66-68` | Rejette un format non synchrone demandé en inline avec ExportFormatNotSupportedException. | [#23f4df0fb15daa38-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:77-79` | Rejette un format synchrone soumis en asynchrone avec ExportFormatNotSupportedException. | [#3eab0f691637f6a9-2] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportFormat.java:55-65` | fromParam applique trim et majuscules à la valeur puis la compare aux noms de format, et lève ExportFormatNotSupportedException si la valeur est null ou inconnue. | [#294fa6ab1b481935-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/AvatarService.java:25-27` | Javadoc : Selon la javadoc, uploadAvatar lève InvalidAvatarException si le contenu est vide, trop volumineux ou n'est pas un JPEG, PNG ou WebP. | [#de662ac91427d15f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:86-91` | La méthode resolveWithinBase rejette une référence nulle, vide, ou contenant un slash, un antislash ou deux points. | [#790e58e7428b8de3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:92-95` | Le chemin résolu doit commencer par le répertoire de base, sinon une IllegalArgumentException est levée. | [#790e58e7428b8de3-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:100-104` | L'extension de stockage doit être nulle ou hors du motif a-z0-9 de 1 à 5 caractères, sinon une IllegalArgumentException est levée. | [#1d69cc7d64ef1ede-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:65-83` | Au démarrage, validateSecret appelle getSigningKey et lève une IllegalStateException sans la valeur du secret si la clé est invalide. | [#authorization/8848356f2c8c0732-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:70-72` | Le secret doit être du Base64 standard décodant à au moins 32 octets, sinon le démarrage échoue avec IllegalStateException. | [#14dc8c12f2d89795-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:126-134` | verify intercepte toute RuntimeException et renvoie Optional.empty, sans exposer le détail d'erreur. | [#authorization/ca82dcefc6247794-2] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ExportJobRepository.java:24-29` | Javadoc : Selon la javadoc, findByIdAndOwnerId ne renvoie le job que si son propriétaire correspond, sinon Optional vide. | [#c6d5c5929511c555-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/AvatarService.java:7-10` | Javadoc : Selon la javadoc, toute opération agit uniquement sur le caller dérivé du JWT, jamais sur un identifiant fourni par le client. | [#ed90f2a700352da1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:31-32` | Javadoc : Selon la javadoc, les endpoints /api/export/** sont protégés par JwtFilter et exigent ROLE_USER, l'identité étant dérivée du JWT. | [#39788215f8db2b88-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:67-70` | Renvoie 401 lorsque CallerResolver ne fournit aucun utilisateur courant. | [#c86feeadc072b9fe-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:98-101` | Le statut d'un job est lu via exportService.getJob scopé au caller, et renvoie 404 si le job est inconnu ou appartient à un autre utilisateur. | [#integrations/477aa0cd75160647-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:101` | Un job absent ou appartenant à un autre utilisateur renvoie 404 car la recherche est scopée au propriétaire. | [#d815bdbebdce9373-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:118-124` | Le téléchargement exige un token vérifié dont jobId et ownerId correspondent au job et au caller, sinon 404. | [#integrations/1953bae609178bc1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:70-81` | La requête filtre sur l'identifiant du job et sur userId, si bien qu'un job appartenant à un autre utilisateur n'est jamais renvoyé. | [#integrations/d0d4c3b6873c2877-1] |

## Traitements batch {#t-batch_job}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:53-62` | La purge des exports expirés est déclenchée par @Scheduled avec un délai fixe configurable, 3600000 ms par défaut, et un délai initial de 300000 ms par défaut. | [#batch/975432c3f0e38e69-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:85` | Déclenche AsyncExportRunner.run sur l'identifiant du job PENDING juste après sa persistance. | [#771720b2508a4345-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:83-98` | findExpired, en transaction readOnly, sélectionne les jobs dont expiresAt est renseigné et antérieur à la date donnée, ce qui sert au balayage de purge. | [#integrations/183b61942b485193-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:72` | Le message d'erreur annonce 5 Mo en dur alors que la limite effective vient de app.storage.avatar-max-bytes, configurable. | [#1046ffacd8962da9-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:90-100` | Le nouveau fichier est stocké avant userRepository.save, sans suppression de ce fichier si le save échoue, alors que la javadoc de classe annonce une absence d'orphelin. | [#53c5a2e3b939148a-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:61-75` | La méthode purgeExpired est annotée @Transactional et capture chaque RuntimeException par job dans cette même transaction, sans sous-transaction par job. | [#450d17525574aab3-3] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:30` | La javadoc annonce 4 formats ayant un renderer, alors que les renderers CSV, JSON et Markdown lus dans ce lot couvrent 3 formats. | [#08bf3e5134168e9b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java:10` | La javadoc cite un ZipExportRenderer, or aucun renderer ZIP ne figure dans les fichiers lus pour ce lot. | [#3b073ba23a4b94cc-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:39-43` | La javadoc de classe annonce une URL signée valable 24h, alors que le code fixe l'expiration du token à job.expiresAt, valeur non définie dans ce fichier. | [#integrations/f4d2f5c000695439-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:118-128` | La neutralisation s'applique à toutes les valeurs, y compris les nombres négatifs convertis en texte (par exemple durationValue), qui reçoivent donc une apostrophe en tête. | [#83fd00ed9710ea05-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:64-65` | Le nom de catégorie, saisi par l'utilisateur, est inséré dans le Markdown sans échappement des caractères spéciaux, à la différence de la neutralisation appliquée au CSV. | [#integrations/75dbb39e88e401fb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:70` | La description de catégorie est ajoutée telle quelle au Markdown, sans échappement, alors que ce champ provient de l'utilisateur. | [#6ba3206513155819-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ExportJobEntity.java:127-138` | hashCode renvoie une constante dérivée de la seule classe, alors que equals compare l'id non nul, ce qui rend le hash identique pour toutes les instances. | [#752a3fa184eda39d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/AvatarServiceImplTest.java:115-116` | Selon le commentaire, l'ancien fichier est supprimé après le save, mais le test ne vérifie que l'appel delete sans contrôle de l'ordre par rapport à save. | [#466e0069e2a28f6c-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/AvatarServiceImplTest.java:120` | Le nom du test annonce un statut 400, mais le test n'affirme que le type InvalidAvatarException et aucun code HTTP. | [#b282546a26cdd2d8-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:31` | La javadoc mentionne les migrations V1..V14, numérotation que ce fichier ne permet pas de vérifier et qui peut être obsolète. | [#f8a6bef674a5d793-1] |

## Endpoints {#t-endpoint}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:31` | Javadoc : Selon la javadoc, les endpoints d'export sont protégés par JwtFilter et l'identité est toujours dérivée du JWT. | [#integrations/3a45b8a567290bb0-1] |

## Entités {#t-entity}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:23-25` | Javadoc : Selon la javadoc de classe, le type d'image est détecté par magic bytes, sans consulter le Content-Type ni l'extension fournis par le client. | [#996e12fba256892f-1] |

## Méthodes de service {#t-service_method}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ExportJobResponse.java:44-51` | Construit la projection HTTP à partir d'un ExportJob et de l'URL de téléchargement fournie par l'appelant. | [#60755901eebfadc2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:66-67` | Valide le contenu, stocke le nouvel avatar, enregistre la nouvelle référence sur le caller, puis supprime l'ancien fichier, dans une transaction. | [#a29596f684cad574-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:110-119` | Renvoie les octets de l'avatar du caller avec son type MIME, et lève AvatarNotFoundException si aucune référence n'existe ou si le fichier est introuvable. | [#bd6a75005b957bab-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:122-137` | Remplace la référence de l'avatar du caller par null puis supprime le fichier stocké. | [#60e94109b2c58235-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:61-84` | Recherche les jobs expirés à la date courante, supprime pour chacun le fichier puis la ligne, et journalise le nombre de jobs purgés. | [#bb8b6ba05aa82340-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:24-26` | Reçoit du contexte Spring la liste de toutes les implémentations de ExportRenderer. | [#a8cd254e706a171d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:76` | Crée un job d'export au statut PENDING pour un format asynchrone, puis déclenche le worker AsyncExportRunner.run. | [#3eab0f691637f6a9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:96-111` | Charge le fichier d'un job téléchargeable du propriétaire, sinon renvoie un Optional vide. | [#78b030e5b637f431-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/AvatarService.java:19-29` | Javadoc : Selon la javadoc, uploadAvatar valide puis stocke l'avatar du caller, met à jour sa référence en base et supprime l'ancien fichier. | [#7fd134a9589bef9c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/AvatarService.java:37` | Le port déclare getAvatar(User caller) qui renvoie un AvatarContent. | [#6ab8b7b526efedb9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java:8-10` | Javadoc : Selon la javadoc, il existe une implémentation de rendu par format, toutes côté infrastructure. | [#cb354d6b5062bebb-2] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java:20` | Déclare la méthode qui rend un UserDataExport dans le format supporté. | [#bf566ad86e4de6d9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportService.java:29` | Le port déclare exportInline(UUID, ExportFormat) pour les formats synchrones, qui renvoie un RenderedExport. | [#e11f043a562d7345-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportService.java:38` | Le port déclare submitAsync(UUID, ExportFormat) pour les formats asynchrones, qui renvoie le job créé. | [#1486bfcf62e8b910-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportService.java:47-51` | Javadoc : Selon la javadoc, download charge le fichier d'un job terminé, non expiré et possédé par ownerId, sinon renvoie un Optional vide. | [#11e3ca65abecd7cb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/StoragePort.java:28` | Le port déclare store(byte[], extension) qui renvoie une référence opaque. | [#c16fc89fe325f17f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/StoragePort.java:34` | Le port déclare load(reference) qui renvoie un Optional des octets. | [#ec2571057ca266ac-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/StoragePort.java:36-40` | Javadoc : Selon la javadoc, delete est idempotent : une référence inconnue ou déjà supprimée ne lève pas d'exception. | [#28b190196a9b2962-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:51-55` | En cas d'IOException à l'écriture, la méthode store lève une UncheckedIOException au message générique stockage indisponible. | [#3e9853bbead0161a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:25-27` | Ne gère que le format CSV. | [#4d519c4bcafec9e6-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:35` | Ne gère que le format JSON. | [#493954600aacdf35-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:39-49` | Sérialise le snapshot en JSON indenté et renvoie le contenu avec le type MIME JSON. | [#c781711ef105e102-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:27` | Ne gère que le format Markdown. | [#1fe9d3ac39831b64-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:37-40` | La méthode supports renvoie vrai uniquement pour le format ZIP. | [#b705a9d64652a6bc-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:44-62` | La méthode save met à jour une entité gérée en recopiant status, storageRef, errorCode, completedAt et expiresAt, sinon crée une nouvelle entité. | [#8f109801a30e7c20-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:65-83` | validateSecret, annoté @PostConstruct, appelle getSigningKey et lève IllegalStateException si le secret est invalide, sans inclure la valeur du secret dans le message. | [#14dc8c12f2d89795-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:94-103` | sign construit un JWT HS256 avec pour sujet le jobId, les claims uid et typ export-download, une date d'émission issue du Clock et l'expiration fournie. | [#41542a3ee2b2eb0f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:109-136` | verify renvoie le couple jobId et ownerId si la signature, le type et l'expiration sont valides, sinon un Optional vide sans lever d'exception. | [#ac160ab52e306a11-2] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:63-64` | La purge lit les jobs via ExportJobRepository.findExpired avec la date courante issue de l'horloge injectée. | [#bb8b6ba05aa82340-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:84` | Persiste un job PENDING pour le propriétaire avant le déclenchement du worker. | [#128e0f8003655e77-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:90-92` | Lit un job par son identifiant restreint au propriétaire, dans une transaction en lecture seule. | [#365e67432bb9d9d9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ExportJobRepository.java:31-37` | Javadoc : Selon la javadoc, findExpired remonte les jobs dont expires_at est renseigné et antérieur à la date donnée, et jamais les jobs PENDING ou RUNNING. | [#bcfed93cfd6069d7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ExportJobRepository.java:37` | Le port déclare findExpired(LocalDateTime now) qui renvoie une liste de ExportJob. | [#5e02a812ee4153f1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ExportJobRepository.java:39-40` | Javadoc : Le port déclare deleteById(UUID id) pour supprimer la ligne d'un job. | [#13c123b0dd26d250-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:87` | Commentaire : Selon le commentaire, la condition expires_at non nul exclut les jobs PENDING et RUNNING, et l'index idx_export_jobs_expires_at (V14) sert la requête. | [#23f40870088204f8-2] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:44` | La propriété app.storage.avatar-max-bytes a une valeur par défaut de 5242880 octets (5 Mo). | [#backend-core/2f88ba661d416e11-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:12-19` | Javadoc : Selon la javadoc, deux instances distinctes de l'adapter servent les avatars et les exports RGPD, chacune avec sa clé de configuration app.storage et son répertoire de base. | [#integrations/74e2f13b9e1f877d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:29` | La fonctionnalité WRITE_DATES_AS_TIMESTAMPS est désactivée, les dates sont écrites au format ISO-8601. | [#96d1dec0c4a12cab-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:30` | La fonctionnalité INDENT_OUTPUT est activée, le JSON produit est indenté. | [#96d1dec0c4a12cab-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:33-36` | Le bean avatarStorage reçoit sa base depuis la propriété app.storage.avatar-path, sans valeur par défaut. | [#c340f5acdb15448d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:43-46` | Le bean exportStorage reçoit sa base depuis la propriété app.storage.export-path, sans valeur par défaut, et est distinct du bean avatar. | [#5cd043c52d47ab6a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:50-51` | Le secret HMAC est lu depuis la propriété app.export.token-secret, sans valeur par défaut dans l'annotation @Value. | [#4b922b766b80b7a4-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:43-47` | Le test est lancé en SpringBootTest avec app.export.purge.initial-delay-ms et app.export.purge.interval-ms fixés à 3600000, ce qui neutralise le tick planifié pendant le test. | [#3b2b212fd72c794c-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/config/StorageConfigTest.java:42-44` | Le test fournit app.storage.export-path pointant sur un répertoire temporaire distinct de app.storage.avatar-path. | [#2a862ed8626ee7db-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ExportJobResponse.java:12-13` | Javadoc : Selon la javadoc, la classe est une projection HTTP figée servant de contrat au frontend pour les jobs d'export. | [#75707d9accd15c99-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:26` | Javadoc : Le worker asynchrone est un bean séparé du service appelant, car @Async n'agit que sur un appel passant par le proxy. | [#backend-core/b0e52f743efbfc1d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:26-27` | Javadoc : Selon la javadoc, @Async n'agit que sur un appel inter-bean via proxy, jamais en self-invocation, d'où le worker séparé de ExportServiceImpl. | [#batch/ce8a59037f3a80e1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:35` | La durée de vie du fichier téléchargeable est une constante publique fixée à 24 heures. | [#backend-core/96769bfb2678cd5c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:46` | Le port de stockage d'export est injecté par constructeur avec @Qualifier nommant le bean, au lieu de dépendre d'une implémentation infra. | [#backend-core/7bde5fed83444f14-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:59-61` | Le traitement asynchrone est porté par une méthode annotée @Async avec un nom d'executor, et @Transactional, dans un bean distinct du service appelant. | [#backend-core/5c775b34bd544ed0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:81` | Commentaire : Selon le commentaire, les échecs sont matérialisés par un code d'erreur borné, sans message ni stack trace. | [#30cff03de4f27860-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:84` | Le journal d'erreur ne contient que l'identifiant du job et le nom simple de la classe d'exception. | [#backend-core/5c775b34bd544ed0-3] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:42` | Le service d'avatar reçoit ses ports par constructeur, avec @Qualifier pour le stockage, et une valeur de configuration injectée par @Value. | [#backend-core/66b8acb6643833aa-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:51-63` | Les formats d'image autorisés sont une énumération privée portant une extension et un type MIME. | [#backend-core/6ab2449702f89fac-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java:77-79` | La détection renvoie un Optional qui est converti en InvalidAvatarException par orElseThrow si le type n'est pas JPEG, PNG ou WebP. | [#backend-core/7ad98dadd151539e-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:75-79` | Une RuntimeException sur un job est isolée par un try/catch par job, journalisée avec le type d'exception seulement, et le traitement des jobs suivants continue. | [#batch/d40ee25765e10173-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:81-83` | Le journal de fin de purge ne contient que le nombre de jobs purgés, sans identifiant ni donnée personnelle. | [#batch/5715b77c36e0dbb9-5] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:14-17` | Javadoc : Selon la javadoc, Spring injecte toutes les implémentations du port ExportRenderer et la résolution se fait via supports, ce qui permet d'ajouter un format sans modifier le use case. | [#b7658060f6952471-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:33-34` | Javadoc : La méthode submitAsync n'est pas transactionnelle : la sauvegarde du job en PENDING est validée avant le déclenchement du worker. | [#backend-core/0083fe9a94454321-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:33-34` | Javadoc : Selon la javadoc, submitAsync n'est pas transactionnel, le save PENDING étant committé avant le déclenchement async. | [#e0c962db7fefca77-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:113-117` | Les identifiants utilisateur sont masqués dans les journaux par la méthode statique maskId, qui ne garde que les huit premiers caractères suivis de ***. | [#backend-core/a785ba7f77afbf96-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportFormat.java:21-24` | Un enum de domaine peut porter des métadonnées par constante (type MIME, extension, drapeau), exposées par des accesseurs contentType(), extension() et isSync(). | [#backend-core/8de21d905c6d66d8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportFormat.java:55-65` | Le parsing d'un paramètre de requête passe par fromParam, insensible à la casse, qui lève une exception de domaine ExportFormatNotSupportedException pour null, vide ou valeur inconnue, jamais null en retour. | [#backend-core/2698035b77e78775-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:18-26` | Les champs d'identité et de création d'un agrégat de domaine sont déclarés final, les champs d'état restent mutables et n'exposent que des getters. | [#backend-core/b46a3d24d7d811c1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:43-46` | Un agrégat de domaine est créé par une fabrique statique pending qui fixe le statut initial et laisse id à null, généré ensuite par la couche persistance. | [#backend-core/10c17a2eae05786b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:48-62` | Les transitions d'état d'un agrégat sont des méthodes mark* void qui modifient status et les champs liés, sans garde de transition, la séquence étant pilotée par le use case. | [#backend-core/66742a1c0e93eafc-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:65-70` | Une règle d'état est exprimée par une méthode booléenne du modèle qui combine le statut, la présence de la référence de stockage et la date d'expiration par rapport à un instant passé en paramètre. | [#backend-core/abea0044c630798d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/RenderedExport.java:8` | Une valeur immuable de domaine sans logique est modélisée par un record Java. | [#backend-core/79a44e55ca73f460-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/AvatarService.java:9` | Javadoc : Les opérations d'un service de port agissent sur l'utilisateur appelant transmis en paramètre (User caller) et jamais sur un identifiant fourni par le client, l'appartenance étant structurelle. | [#backend-core/55e7d17002289562-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/AvatarService.java:19-29` | Javadoc : Les erreurs de validation d'un service de port sont déclarées par une balise @throws pointant vers une exception du package domain.exceptions. | [#backend-core/55e7d17002289562-2] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java:7-21` | Javadoc : Un port de rendu suit un patron stratégie : une méthode supports(format) indique si l'implémentation gère le format, et une méthode render porte le rendu, une implémentation par format. | [#backend-core/9b270e8a87cf5652-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportService.java:15` | Javadoc : Selon la javadoc, toutes les méthodes prennent ownerId dérivé du JWT et n'exposent que les données de ce propriétaire. | [#9e5a6d03a16cf334-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/StoragePort.java:8` | Javadoc : Selon la javadoc, le port est défini côté domaine et son adapter concret LocalStorageAdapter vit en infrastructure. | [#de619ef6c4765f43-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:21-27` | Javadoc : Selon la javadoc, l'adapter est une implémentation de StoragePort sans SDK fournisseur, et le nom de fichier n'est jamais tiré de la saisie client. | [#integrations/4f47db1f17f1bf57-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:29-40` | Adaptateur de stockage local qui résout le répertoire de base en chemin absolu normalisé à partir du basePath fourni au constructeur. | [#753dced5855a7e30-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:60-70` | La lecture renvoie Optional.empty si le fichier n'existe pas, et enveloppe une IOException de lecture dans UncheckedIOException. | [#integrations/2dff3849dfa0b56d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:73-79` | La suppression utilise deleteIfExists et se veut idempotente, une IOException étant enveloppée dans UncheckedIOException. | [#integrations/7e28ee75a601515f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:16-19` | Javadoc : Selon la javadoc, l'échappement RFC 4180 est écrit à la main, sans dépendance externe ajoutée. | [#0201fca3212873b6-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:37-40` | Le contenu CSV est encodé en UTF-8, puis retourné dans un RenderedExport avec le type de contenu CSV et le nom produit par ExportFilenames. | [#integrations/93efbe870a5e7725-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:82-91` | Le helper row assemble les champs séparés par des virgules, chacun échappé, et termine la ligne par un saut de ligne LF. | [#6f78b26491ce0b9f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:97-108` | Chaque champ est d'abord neutralisé contre l'injection de formule, puis entouré de guillemets s'il contient virgule, guillemet, saut de ligne ou retour chariot, avec doublement des guillemets. | [#integrations/1323a64f4a7c32e4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:111` | Javadoc : Selon la javadoc, la neutralisation vise l'injection de formule CSV identifiée par OWASP. | [#d3c6856f9014f13b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:17-20` | Javadoc : Selon la javadoc, le snapshot ne contient que des champs de portabilité, sans hash de mot de passe. | [#957ab4de0a3bb6bb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:25` | Commentaire : Selon le commentaire, la mapper est configuré explicitement pour les dates, afin que le format ne dépende pas d'un défaut de la bibliothèque. | [#754962c89c614e33-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:16-19` | Javadoc : Selon la javadoc, le rendu Markdown est une construction de chaîne pure, sans bibliothèque externe. | [#integrations/04172a4c4cc45b47-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:17-20` | Javadoc : Selon la javadoc, l'archive utilise java.util.zip.ZipOutputStream du JDK, sans dépendance externe, ce que confirme le code. | [#0ee5f23138704e56-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:25-35` | Le constructeur reçoit par injection les trois renderers JSON, Markdown et CSV, que la classe compose au lieu de dupliquer leur logique. | [#5b4181c13a150cb9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:43-54` | L'archive ZIP compose les rendus JSON, Markdown et CSV dans les entrées data.json, data.md et data.csv, sans logique de rendu dupliquée. | [#integrations/19b3fc4ec346a739-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobMapper.java:10-16` | Javadoc : Selon la javadoc, les enums du domaine sont persistés par leur nom, avec un varchar borné par les CHECK de V13. | [#f573fad7ad0ef495-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobMapper.java:20-31` | Le mapping vers le domaine relit le format et le statut stockés en chaîne via ExportFormat.valueOf et ExportJobStatus.valueOf. | [#integrations/b5bb759214acbff2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:40-43` | Commentaire : Selon le commentaire, save est appelé par submitAsync qui n'est pas transactionnel, afin que le statut PENDING soit commité dans sa propre transaction avant le worker async. | [#integrations/89cb2baa33276845-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:41` | Commentaire : Selon le commentaire, save est annoté @Transactional REQUIRED pour que le PENDING soit commité dans sa propre transaction avant le worker async. | [#e160c5e8c2089227-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:44-46` | La méthode save est annotée @Transactional sans attribut, et met à jour les seuls champs de statut, stockage, erreur, complétion et expiration si le job existe. | [#integrations/89cb2baa33276845-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:21` | Javadoc : Selon la javadoc, chaque clé de stockage suit la convention fail-fast sans default en prod, de sorte que le boot échoue si la clé est absente. | [#498348c6aac59433-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ExportJobEntity.java:15-22` | Javadoc : Selon la javadoc, l'entité reflète exactement le DDL de la migration V13, et l'absence de @Version est justifiée par un unique writer. | [#0dbe804bfb6e04c5-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:26-27` | Javadoc : Selon la javadoc, les tokens sont signés en HMAC HS256 avec un secret dédié, distinct du secret d'authentification depuis #323. | [#5343dbd95c7c8731-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:55-56` | L'horloge Clock est injectée par le constructeur et sert à l'émission et à la vérification des tokens. | [#3390f194ab14f71a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:59-64` | Javadoc : Selon la javadoc, le garde-fou de démarrage est calqué sur JwtService et vérifie le secret au boot. | [#3f305e712018f1d4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:94-102` | sign produit un token HS256 avec sub égal au jobId, uid égal à l'ownerId, typ égal à export-download et exp égal à expiresAt. | [#authorization/81394489244fcd13-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/AvatarServiceImplTest.java:37-38` | La classe de test utilise MockitoExtension, avec StoragePort et UserRepository mockés et AvatarServiceImpl construit à la main dans setUp. | [#0ce791ba8f6bb255-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:48` | La classe de test étend AbstractPostgresIntegrationTest pour disposer d'une base PostgreSQL Testcontainers. | [#6b534bfd754f0b6e-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/config/StorageConfigTest.java:34-37` | Le runner ajoute PropertyPlaceholderAutoConfiguration et StorageConfig pour reproduire le fail-fast des placeholders non résolus. | [#e9294f948fc7fd2c-1] |
