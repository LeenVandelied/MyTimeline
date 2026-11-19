# Annexe : export

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java` | 21 | other 7, convention 5, validation 4 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java` | 18 | endpoint 8, role_check 5, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java` | 14 | other 6, business_rule 5, suspicious 2 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java` | 14 | test_case 5, other 4, config 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 13 | validation 4, business_rule 3, convention 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java` | 12 | convention 5, other 4, business_rule 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/config/StorageConfigTest.java` | 11 | other 4, config 2, convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 10 | business_rule 3, state_transition 3, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java` | 10 | service_method 3, other 2, validation 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java` | 10 | other 4, convention 2, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ExportJobEntity.java` | 9 | entity 6, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java` | 8 | business_rule 3, convention 2, batch_job 1 |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql` | 8 | db_change 5, convention 2, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java` | 7 | state_transition 3, business_rule 1, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java` | 7 | other 3, convention 2, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/domain/models/export/ExportJobTest.java` | 7 | other 3, test_case 2, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java` | 6 | convention 4, external_call 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ExportJobRepository.java` | 5 | persistence_query 2, other 1, role_check 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java` | 4 | other 2, convention 1, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java` | 4 | config 2, other 2 |
| `backend:src/main/resources/db/migration/V14__idx_export_jobs_expires_at.sql` | 4 | batch_job 2, db_change 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ExportJobResponse.java` | 3 | entity 1, other 1, service_method 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportFilenames.java` | 3 | convention 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobMapper.java` | 3 | other 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportFormat.java` | 2 | entity 1, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java` | 2 | convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportService.java` | 2 | convention 1, service_method 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/StoragePort.java` | 2 | convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/ExportFormatNotSupportedException.java` | 1 | validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJobStatus.java` | 1 | entity 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/RenderedExport.java` | 1 | entity 1 |

## Structure (suite) {#t-structure_overflow}

| Pointeur | Symbole | Énoncé | Fait |
|---|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:66-73` | ExportController.exportInline | GET /api/export parse le paramètre format et renvoie le fichier rendu inline, avec 401 si aucun caller n'est résolu. | [#integrations/a1af8840ed91bbb5-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:77-88` | ExportController.submitAsync | POST /api/export soumet un job asynchrone et répond 202 avec ExportJobResponse, ou 401 si aucun utilisateur n'est résolu. | [#071643b5944b880b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:86-87` | ExportController.submitAsync | POST /api/export soumet un job asynchrone et renvoie 202 avec la réponse du job, dont l'URL de téléchargement éventuelle. | [#integrations/1df5c599c86dd243-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:91-102` | ExportController.jobStatus | GET /api/export/job/{jobId} renvoie le statut du job du propriétaire, ou 404 si le job est inconnu ou appartient à un autre utilisateur. | [#542c65ac19d97770-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:109-129` | ExportController.download | GET /api/export/download/{jobId} exige un token signé valide, puis renvoie le fichier, sinon 404. | [#b496e1abe39faec9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:38-40` | LocalStorageAdapter | Le constructeur reçoit un chemin de base, normalisé en chemin absolu. | [#753dced5855a7e30-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:16-26` | ExportJob | Le modèle métier ExportJob est un POJO portant id, ownerId, format, status, storageRef, errorCode, createdAt, completedAt et expiresAt. | [#b99866367a7951cd-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ExportJobEntity.java:23-25` | ExportJobEntity | L'entité JPA ExportJobEntity est mappée sur la table export_jobs. | [#fc63aac0048954d1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ExportJobEntity.java:28-29` | ExportJobEntity.id | L'identifiant UUID est généré automatiquement avec GenerationType.AUTO. | [#cb21bdca3437f31e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ExportJobEntity.java:31-32` | ExportJobEntity.userId | La colonne user_id est obligatoire et stocke l'identifiant du propriétaire sans association ManyToOne. | [#997ec849433df630-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ExportJobEntity.java:34-38` | ExportJobEntity.format | Les colonnes format et status sont des chaînes obligatoires de 16 caractères au maximum. | [#87e3a056e37071cf-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ExportJobEntity.java:43-44` | ExportJobEntity.errorCode | La colonne error_code est une chaîne optionnelle de 64 caractères au maximum. | [#e507314132deba19-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ExportJobEntity.java:46-53` | ExportJobEntity.createdAt | Les colonnes createdAt, completedAt et expiresAt sont des LocalDateTime, createdAt étant obligatoire et les deux autres optionnelles. | [#81419955ed1da561-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportFormat.java:19-24` | ExportFormat | L'énumération définit JSON et MARKDOWN comme formats synchrones, et ZIP et CSV comme formats asynchrones, avec leur type MIME et leur extension. | [#4bd95503fc046d97-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ExportJobResponse.java:32-38` | ExportJobResponse | Le DTO HTTP porte jobId, status, format, downloadUrl et expiresAt, les champs storageRef, errorCode et ownerId n'y figurent pas. | [#77cf525b7fee76c0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJobStatus.java:8-13` | ExportJobStatus | L'énumération définit quatre statuts, PENDING, RUNNING, COMPLETED et FAILED. | [#6656955aaab09cd8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/RenderedExport.java:8` | RenderedExport | Le record RenderedExport porte le contenu en octets, le type MIME et le nom de fichier proposé. | [#03baa01101752491-1] |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Les exports s'écrivent sous export-path et jamais dans le répertoire des avatars. [#15ab20197e968f0c-1] | deducible |
| rules | - Les méthodes markRunning et markCompleted ne contrôlent pas l'état courant. [#79d4aa70838aab63-1] [#99122a29b71383fb-1] | deducible |
| rules | - La purge supprime le fichier avant la ligne en base, et l'erreur sur un job n'arrête pas les suivants. [#450d17525574aab3-1] [#450d17525574aab3-3] | deducible |
| rules | - Un champ commençant par =, +, -, @, tabulation ou saut de ligne reçoit une apostrophe en préfixe. [#83fd00ed9710ea05-1] | deducible |
| surface | - Le statut d'un job (GET /api/export/job/{jobId}) répond 404 aussi bien pour un job inconnu que pour un job d'un autre utilisateur, car le filtre par propriétaire est fait en SQL dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:70-81` [#542c65ac19d97770-1] [#76007e81f3da6e2c-1] [#365e67432bb9d9d9-1]. | deducible |
| surface | - Le téléchargement (GET /api/export/download/{jobId}) exige un token signé valide dont le jobId correspond au job et l'ownerId à l'appelant, sinon 404 [#b496e1abe39faec9-1] [#679e3f442b6b9054-1]. | deducible |
| tests | - Selon le commentaire de ExportTokenService, un test nommé verify_missingSubjectOrUidClaim_returnsEmpty ancre le cas d'un token signé sans claim sub ou uid, mais ce test n'a pas été lu [#authorization/be1b54120b1abe50-1]. | deducible |
| rules | - ExportPurgeScheduler.purgeExpired supprime le fichier via exportStorage puis la ligne via exportJobRepository.deleteById [#batch/5715b77c36e0dbb9-2] [#450d17525574aab3-1] [#batch/5715b77c36e0dbb9-3] `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:68-73`. | deducible |
| rules | - UserDataExportAssembler.assemble lève UserNotFoundException : exportInline n'a pas besoin de contrôler l'existence de l'utilisateur lui-même [#user/66b8e2900608834a-1] [#user/d7aa5eb9502d15f1-1] `backend:src/main/java/com/matimeline/eventmanager/application/services/UserDataExportAssembler.java:49-54`. | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:35` | La durée de vie du fichier téléchargeable est fixée à 24 heures par la constante DOWNLOAD_TTL_HOURS, et cette échéance sert de base au purge planifiée. | [#batch/44dd721f941d7c5b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:73` | Le contenu rendu est stocké via le StoragePort avec l'extension du format, et la référence obtenue est conservée. | [#5686ec4dee42298d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:76` | La date d'expiration du fichier est fixée à la date de complétion plus 24 heures (DOWNLOAD_TTL_HOURS). | [#5686ec4dee42298d-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:68-73` | Pour chaque job expiré ayant une référence, le fichier est supprimé du stockage avant la suppression de la ligne en base. | [#450d17525574aab3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:73` | La ligne du job est supprimée après le fichier, et le compteur purged est incrémenté. | [#450d17525574aab3-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:75-79` | Une RuntimeException sur un job est journalisée avec le seul type d'exception, et les autres jobs continuent d'être traités. | [#450d17525574aab3-3] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:102-105` | Le téléchargement renvoie vide si le job n'est pas téléchargeable selon ExportJob.isDownloadable. | [#78b030e5b637f431-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:65-70` | Un job est téléchargeable si son statut est COMPLETED, qu'il a une référence de stockage et une date d'expiration, et que l'instant courant est antérieur à cette expiration. | [#916a992fa5c873bb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:46` | La référence de stockage est générée à partir d'un UUID aléatoire suivi de l'extension assainie. | [#773091294adeea81-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:62-64` | Un fichier absent renvoie un Optional vide au lieu d'une exception. | [#6a72ce1d63fc0e97-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:75` | La suppression utilise deleteIfExists, donc une référence absente est sans effet. | [#12c278c3bd29d6cd-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:144-151` | L'URL de téléchargement n'est construite que si le job est COMPLETED et a une date d'expiration, sinon elle vaut null. | [#a01408ee42f6a4d7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:102-103` | Un champ est entouré de guillemets s'il contient une virgule, un guillemet, un saut de ligne ou un retour chariot, et les guillemets internes sont doublés. | [#be3acd5573f80a77-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:118-128` | Un champ dont le premier caractère est =, +, -, @, tabulation, retour chariot ou saut de ligne reçoit une apostrophe en préfixe. | [#83fd00ed9710ea05-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:53-55` | La préférence de thème affichée vaut aucune lorsque la valeur est null. | [#3f1b1d0facae734d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:60-62` | Lorsqu'il n'y a aucune catégorie, la section affiche le message Aucune catégorie puis s'arrête. | [#0a36f4823b0f4237-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:69-71` | La description d'une catégorie n'est ajoutée que si elle est non nulle et non vide après suppression des espaces. | [#0a36f4823b0f4237-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:102` | La date de fin n'est affichée que lorsque la date de début est présente. | [#bd5f408bcdb70cc9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:106-108` | La mention récurrent n'est ajoutée que si isRecurring vaut TRUE et que recurrenceUnit est non null. | [#bd5f408bcdb70cc9-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:84-85` | Les jobs sans expiresAt, donc en attente ou en cours, ne sont jamais retournés par la purge. | [#0b261b34efdb01b7-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:87` | Le helper seedCompletedJob fixe createdAt à expiresAt moins 24 heures. | [#06d7b608ca632213-1] |
| `backend:src/test/java/com/matimeline/eventmanager/domain/models/export/ExportJobTest.java:29-30` | completedAt enregistré est la valeur passée explicitement à markCompleted, sans dérivation depuis expiresAt moins 24 heures. | [#0766dc0503a2ed54-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/config/StorageConfigTest.java:54-55` | Un fichier d'export est écrit sous export-path et ne doit jamais apparaître dans le répertoire avatar. | [#15ab20197e968f0c-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:36` | Si aucun renderer ne gère le format, une ExportFormatNotSupportedException est levée. | [#d00e645c46e4b1e1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:65-69` | L'export inline refuse un format asynchrone (ZIP ou CSV) avec une ExportFormatNotSupportedException. | [#23f4df0fb15daa38-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:77-80` | La soumission asynchrone refuse un format synchrone (JSON ou MARKDOWN) avec une ExportFormatNotSupportedException. | [#3eab0f691637f6a9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/ExportFormatNotSupportedException.java:9-13` | L'exception porte le message unsupported export format suivi de la valeur demandée, qui est reprise telle quelle. | [#7c50e04a9f36d9f6-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportFormat.java:55-65` | Le paramètre est nettoyé des espaces et converti en majuscules, puis comparé aux noms de formats, et toute valeur nulle ou inconnue lève une exception. | [#294fa6ab1b481935-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:86-97` | resolveWithinBase rejette les références vides, contenant un séparateur ou '..', puis vérifie que le chemin résolu reste sous le répertoire de base. | [#integrations/68cad5d7a30c3ac4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:87-91` | Une référence nulle, vide, contenant un séparateur ou le motif .. est rejetée avec une IllegalArgumentException. | [#790e58e7428b8de3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:93-95` | Un chemin résolu qui sort du répertoire de base est rejeté avec une IllegalArgumentException. | [#790e58e7428b8de3-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:101-103` | Une extension absente ou ne respectant pas le motif a-z0-9 de 1 à 5 caractères est rejetée. | [#1d69cc7d64ef1ede-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:44-47` | En cas d'erreur de sérialisation JacksonException, le rendu lève une IllegalStateException au message fixe, sans détail technique. | [#c781711ef105e102-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:65-83` | validateSecret, exécuté au démarrage, échoue si le secret n'est pas du Base64 standard décodant à au moins 32 octets. | [#authorization/8848356f2c8c0732-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:66-82` | Au démarrage, validateSecret appelle getSigningKey et lève une IllegalStateException si le secret n'est pas du Base64 décodant à au moins 32 octets, sans inclure la valeur. | [#14dc8c12f2d89795-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:110-112` | verify renvoie Optional.empty si le token est null ou blanc, sans tenter de parsing. | [#d7eb038aa775ae0e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:126-134` | Toute RuntimeException levée pendant la vérification (signature, expiration, format ou claims absents) fait renvoyer Optional.empty. | [#d7eb038aa775ae0e-2] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ExportJobRepository.java:25-29` | Javadoc : Selon la javadoc, la recherche scopée au propriétaire ne renvoie le job que si son ownerId égale celui demandé, sinon un Optional vide. | [#c6d5c5929511c555-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:31-32` | Javadoc : Selon la javadoc, les endpoints sont protégés par JwtFilter avec le rôle ROLE_USER et l'identité est dérivée du JWT via CallerResolver. | [#39788215f8db2b88-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:67-70` | Si CallerResolver ne résout aucun utilisateur, la réponse est 401 sans corps. | [#c86feeadc072b9fe-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:98-101` | Le statut d'un job est lu via exportService.getJob scopé au caller, et renvoie 404 si le job est inconnu ou appartient à un autre utilisateur. | [#integrations/477aa0cd75160647-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:118-124` | Le téléchargement exige un token vérifié dont jobId et ownerId correspondent au job et au caller, sinon 404. | [#integrations/1953bae609178bc1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:119-124` | Le téléchargement exige que le jobId du token corresponde au job et que l'ownerId du token corresponde à l'appelant, sinon 404. | [#679e3f442b6b9054-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:70-81` | findByIdAndOwnerId filtre le job sur son propriétaire directement en SQL, donc un job appartenant à un autre utilisateur n'est jamais renvoyé. | [#76007e81f3da6e2c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:120-122` | verify rejette tout token dont le claim typ ne vaut pas export-download, ce qui isole les tokens de download des tokens d'authentification. | [#1a5dc55516cc4fdf-1] |

## Traitements batch {#t-batch_job}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:59-61` | La génération d'un export s'exécute en tâche de fond sur l'executor exportExecutor, dans une transaction. | [#7d2ace43e7022c31-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:59-60` | La purge des exports expirés est planifiée en fixedDelay avec un intervalle par défaut de 3 600 000 ms (1 h) et un premier passage différé par défaut de 300 000 ms (5 min). | [#batch/975432c3f0e38e69-1] |
| `backend:src/main/resources/db/migration/V14__idx_export_jobs_expires_at.sql:5` | Commentaire : Selon le commentaire, un scheduler de purge (#267) balaye export_jobs pour supprimer fichier et ligne après expiration. Le scheduler n'est pas dans le lot. | [#81aadcc48592aa2d-1] |
| `backend:src/main/resources/db/migration/V14__idx_export_jobs_expires_at.sql:9` | Commentaire : Selon le commentaire, le balayage de purge s'exécute à chaque tick horaire. | [#81aadcc48592aa2d-2] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:71` | La méthode n'effectue pas de contrôle d'existence de l'utilisateur et délègue l'assemblage à assembler, alors que le port ExportService annonce une UserNotFoundException. | [#19f35ea6a4b76c0d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ExportJobRepository.java:33-37` | Selon la javadoc, expires_at n'est renseigné qu'à la complétion, or ExportJob.markFailed ne le renseigne jamais, donc les jobs FAILED ne sont pas remontés par la purge. | [#5e02a812ee4153f1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:39-43` | La javadoc de classe annonce une URL signée valable 24h, alors que le code fixe l'expiration du token à job.expiresAt, valeur non définie dans ce fichier. | [#integrations/f4d2f5c000695439-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:74` | Chaque champ, y compris les valeurs numériques converties en texte par str, passe par escape, donc une valeur négative comme durationValue reçoit aussi l'apostrophe en préfixe. | [#8d302dbc450961e7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:58-66` | Le rendu Markdown insère les noms et descriptions utilisateur tels quels, sans échappement des caractères Markdown, contrairement au rendu CSV qui neutralise les formules. | [#integrations/75dbb39e88e401fb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:99` | Le titre d'un événement, texte saisi par l'utilisateur, est inséré dans le Markdown sans échappement des caractères de mise en forme. | [#95a518ab54976556-1] |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql:16` | Le commentaire signale que la purge des fichiers d'export sur disque n'est pas implémentée et constitue une dette, alors que la suppression du compte purge les lignes. | [#430651123fc7cd9c-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:31` | La javadoc mentionne les migrations V1 à V14, alors que le CLAUDE.md du projet indique V16 comme dernière migration. | [#f8a6bef674a5d793-1] |

## Endpoints {#t-endpoint}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:31` | Javadoc : Selon la javadoc, les endpoints d'export sont protégés par JwtFilter et l'identité est toujours dérivée du JWT. | [#integrations/3a45b8a567290bb0-1] |

## Méthodes de service {#t-service_method}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/ExportJobResponse.java:44-51` | Construit la réponse à partir d'un ExportJob en convertissant status et format en leur nom d'énumération et en recevant l'URL de téléchargement du contrôleur. | [#60755901eebfadc2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:84-85` | Un job PENDING est sauvegardé pour le propriétaire, puis le worker asynchrone est déclenché avec son identifiant. | [#f659c11a50bc696a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:90-93` | La lecture du statut d'un job est faite en transaction read-only, scopée au propriétaire via findByIdAndOwnerId. | [#365e67432bb9d9d9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:106-110` | Le fichier est relu depuis le stockage et nommé mytimeline-export suivi de l'extension du format. | [#0560779bcdf672c9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:43-46` | La fabrique crée un job sans id, au statut PENDING, sans référence de stockage ni date de fin. | [#4f9f821f123b0ae9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportService.java:29` | Le port déclare la génération inline d'un export synchrone pour un propriétaire et un format. | [#e11f043a562d7345-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:94-103` | sign produit un JWT HS256 portant sub égal à jobId, uid égal à ownerId, typ égal à export-download, iat égal à l'instant du Clock et exp égal à expiresAt. | [#41542a3ee2b2eb0f-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:47-55` | En cas d'IOException lors de la création du répertoire ou de l'écriture, store relève une UncheckedIOException avec le message générique stockage indisponible. | [#integrations/b7c7165d3a6fcdda-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:49-51` | Une IOException levée pendant l'écriture du ZIP est encapsulée dans une UncheckedIOException avec le message zip export rendering failed. | [#integrations/956bcf8c3be783c0-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:64` | La purge charge la liste des jobs expirés à la date courante via findExpired. | [#bb8b6ba05aa82340-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ExportJobRepository.java:32` | Javadoc : Selon la javadoc, findExpired retourne les jobs dont expires_at est non nul et antérieur à la date donnée. | [#bcfed93cfd6069d7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/ExportJobRepository.java:39-40` | Javadoc : Selon la javadoc, la ligne d'un job est supprimée après la suppression du fichier via StoragePort. | [#13c123b0dd26d250-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:89-92` | findExpired exécute une JPQL qui sélectionne les jobs dont expiresAt est renseigné et antérieur au paramètre now. | [#23f40870088204f8-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:17` | Javadoc : Selon la javadoc, le répertoire des exports RGPD est piloté par la clé app.storage.export-path. | [#integrations/74e2f13b9e1f877d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:28-31` | Le ObjectMapper désactive l'écriture des dates en timestamps et active l'indentation de la sortie. | [#96d1dec0c4a12cab-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:34-35` | Le bean avatarStorage lit la propriété app.storage.avatar-path sans valeur par défaut et crée un LocalStorageAdapter. | [#c340f5acdb15448d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:44-45` | Le bean exportStorage lit la propriété app.storage.export-path sans valeur par défaut et crée un LocalStorageAdapter distinct de celui des avatars. | [#5cd043c52d47ab6a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:26-27` | Javadoc : Selon la javadoc, les tokens de téléchargement d'export sont signés avec un secret dédié app.export.token-secret, séparé de jwt.secret depuis #323. | [#authorization/a6b728e36d491210-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:50-51` | Le secret de signature est lu depuis la propriété app.export.token-secret, sans valeur par défaut. | [#4b922b766b80b7a4-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:45` | Le test fixe app.export.purge.initial-delay-ms à 3600000 ms pour neutraliser le tick automatique. | [#3b2b212fd72c794c-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:46` | Le test fixe app.export.purge.interval-ms à 3600000 ms. | [#6e19aa40e2672403-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/config/StorageConfigTest.java:43` | Le test fixe app.storage.avatar-path sur le répertoire temporaire avatarDir. | [#c4ac87aa334d0660-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/config/StorageConfigTest.java:44` | Le test fixe app.storage.export-path sur le répertoire temporaire exportDir. | [#2a862ed8626ee7db-1] |

## Changements de base {#t-db_change}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/resources/db/migration/V13__export_jobs.sql:27-44` | La migration V13 crée la table export_jobs avec les colonnes id, user_id, format, status, storage_ref, error_code, created_at, completed_at et expires_at, avec id en clé primaire. | [#16630b6ec6a25d8b-1] |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql:38-39` | La clé étrangère user_id référence users(id) avec suppression en cascade. | [#989d30899185cabc-1] |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql:40-41` | La contrainte CHECK limite format aux valeurs ZIP et CSV. | [#c3c58e300d1442e2-1] |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql:42-43` | La contrainte CHECK limite status aux valeurs PENDING, RUNNING, COMPLETED et FAILED. | [#758443619888fced-1] |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql:46` | Un index idx_export_jobs_user est créé sur la colonne user_id. | [#b840cedec8401fce-1] |
| `backend:src/main/resources/db/migration/V14__idx_export_jobs_expires_at.sql:18` | La migration V14 crée l'index idx_export_jobs_expires_at sur la colonne expires_at. | [#80764427763ebcfa-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:81-82` | Commentaire : Le code d'erreur d'échec est une constante bornée, et le message ou la stack de l'exception ne sont pas stockés sur le job. | [#batch/626250add9b61251-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:61-62` | La méthode purgeExpired est annotée @Transactional et s'exécute dans une transaction unique couvrant tout le balayage. | [#batch/5715b77c36e0dbb9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:70` | Commentaire : Selon le commentaire, la suppression du fichier avant la ligne rend l'opération idempotente, une référence absente étant traitée comme un no-op. | [#batch/5715b77c36e0dbb9-3] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportRendererRegistry.java:32-37` | Le registre choisit le renderer en filtrant la liste injectée par Spring avec ExportRenderer.supports, puis délègue le rendu au premier renderer retenu. | [#integrations/93753e4c74dda84a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:54` | Le stockage injecté dans le service est identifié par le qualifier exportStorage. | [#ab04f96a89e72df9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:43-62` | Un agrégat de domaine à cycle de vie est une POJO qui expose une fabrique statique pending(...) pour un état initial, et des méthodes de transition nommées markRunning, markCompleted et markFailed qui modifient le statut. | [#backend-core/10c17a2eae05786b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java:8-12` | Javadoc : Selon la javadoc, chaque format a son implémentation de rendu côté infrastructure, car elle dépend de bibliothèques techniques. | [#integrations/918b649e6b91fa71-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportRenderer.java:14-20` | Chaque format est rendu par une implémentation du port ExportRenderer, qui déclare sa prise en charge via supports. | [#cb354d6b5062bebb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/ExportService.java:15` | Javadoc : Selon la javadoc, toutes les méthodes reçoivent ownerId dérivé du JWT et jamais d'un paramètre client. | [#9e5a6d03a16cf334-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/StoragePort.java:28` | Le port store persiste un contenu et renvoie une référence opaque utilisée ensuite pour relire ou supprimer. | [#c16fc89fe325f17f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/StoragePort.java:37-38` | Javadoc : Selon la javadoc, la suppression est idempotente et une référence inconnue ne lève pas d'exception. | [#28b190196a9b2962-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:17` | Javadoc : Selon la javadoc, l'exportStorage et l'avatarStorage utilisent des répertoires distincts, sans hypothèse partagée. | [#integrations/4f47db1f17f1bf57-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:18-19` | Javadoc : Selon la javadoc, les beans sont déclarés par StorageConfig et chaque clé suit la convention #34, sans valeur par défaut en prod. | [#integrations/2b6d73515c064a0a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:38-40` | Le constructeur normalise le chemin de base en chemin absolu normalisé à partir de basePath. | [#integrations/1029068ca3950c15-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:25-27` | Le renderer CSV déclare un seul format via supports(ExportFormat), en comparant à ExportFormat.CSV. | [#integrations/56c3efc7de673567-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:30-40` | Le rendu produit un unique fichier CSV en UTF-8 découpé en sections PROFILE, CATEGORIES, PRODUCTS et EVENTS, avec un nom généré par ExportFilenames. | [#0500490be5d91143-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:37-39` | Le contenu CSV est encodé en UTF-8, et le nom de fichier est produit par ExportFilenames.forFormat. | [#integrations/93efbe870a5e7725-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:101` | Le rendu CSV passe chaque valeur par neutralizeFormula avant l'échappement RFC 4180. | [#integrations/1323a64f4a7c32e4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:102-107` | Un champ contenant une virgule, un guillemet, un saut de ligne ou un retour chariot est entouré de guillemets, et les guillemets internes sont doublés. | [#integrations/1323a64f4a7c32e4-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportFilenames.java:11` | Javadoc : Selon la javadoc, le nom de fichier ne contient ni identifiant utilisateur ni email. | [#eef86d39e33e8867-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportFilenames.java:13` | La classe utilitaire est final et package-private, avec un constructeur privé. | [#eef86d39e33e8867-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportFilenames.java:21-23` | Le nom de fichier d'export suit le motif mytimeline-export suivi de la date AAAAMMJJ et de l'extension du format. | [#integrations/2832645086b21e2a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:25` | Commentaire : Selon le commentaire, le rendu utilise Jackson 3 dont java.time est pris en charge nativement. | [#754962c89c614e33-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/JsonExportRenderer.java:34-36` | Le renderer JSON déclare un seul format via supports(ExportFormat), en comparant à ExportFormat.JSON. | [#integrations/0e52202a33fe7ef5-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:41-42` | Le rendu Markdown produit son nom de fichier via ExportFilenames.forFormat, comme les autres renderers. | [#integrations/9957b692e263dfee-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:20` | Javadoc : Selon la javadoc, l'archive ZIP est produite avec java.util.zip.ZipOutputStream du JDK, sans dépendance externe. | [#integrations/1fa3a7d69ef2dbc2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:38-40` | supports n'accepte que le format ExportFormat.ZIP, ce qui fait de ce renderer le choix pour le format ZIP. | [#integrations/2d889486849da46c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:46-48` | render délègue à trois renderers existants (JSON, Markdown, CSV) et écrit chaque rendu comme une entrée data.json, data.md et data.csv de la même archive. | [#integrations/19b3fc4ec346a739-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java:52-53` | Le résultat est un RenderedExport portant le contenu binaire, le type MIME de ExportFormat.ZIP et un nom de fichier produit par ExportFilenames.forFormat. | [#integrations/19b3fc4ec346a739-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobMapper.java:15` | Javadoc : Selon la javadoc, les enums du domaine sont persistés par leur nom. | [#f573fad7ad0ef495-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:26-28` | Le repository JPA implémente le port ExportJobRepository en étendant SimpleJpaRepository d'ExportJobEntity. | [#312d7661b42058a0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:59-61` | Lors d'une création (id null), save passe par le mapper puis par SimpleJpaRepository.save. | [#6d4b01157c9150c3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:33-36` | Javadoc : Selon la javadoc, les claims sub, uid et typ isolent les tokens d'export des tokens d'authentification, et depuis #323 les deux familles ne partagent plus de matériel de signature. | [#authorization/4bc36e7512fa7e29-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:70-80` | Le message d'erreur de démarrage ne contient que le nom de la classe de l'exception, sans la valeur du secret ni son détail. | [#authorization/c4dd6589611301e7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:85-88` | La clé HMAC est dérivée en décodant le secret en Base64 puis en appelant Keys.hmacShaKeyFor. | [#authorization/f8ca1ebb38d96f3d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:94-103` | sign émet un token HS256 dont le sub vaut le jobId, le claim uid vaut l'ownerId et le claim typ vaut export-download. | [#authorization/81394489244fcd13-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:114-116` | verify contrôle la signature avec la clé d'export via verifyWith, et l'expiration contre le Clock injecté via clock(). | [#authorization/f3622be2246a7523-1] |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql:24` | Commentaire : Selon le commentaire, les migrations V1 à V12 ne doivent pas être éditées une fois appliquées, à cause du checksum Flyway. | [#a8ba70d4a16b368d-1] |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql:48-52` | Commentaire : Chaque migration se termine par un bloc de commentaires ROLLBACK (manuel) qui liste les instructions inverses, Flyway Community ne rejouant pas les undo. | [#backend-core/6263eaed3b52418b-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:48` | La classe de test étend AbstractPostgresIntegrationTest et utilise @SpringBootTest. | [#6b534bfd754f0b6e-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/config/StorageConfigTest.java:23` | Javadoc : Selon la javadoc, la clé app.storage.export-path suit la convention #34, avec fail-fast et sans valeur par défaut en production. | [#9d590708e8f4b9ee-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/config/StorageConfigTest.java:36-37` | Le ApplicationContextRunner charge PropertyPlaceholderAutoConfiguration et StorageConfig comme seule configuration utilisateur. | [#e9294f948fc7fd2c-1] |
