# Annexe : batch

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 7 | state_transition 3, convention 2, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java` | 7 | convention 4, batch_job 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java` | 5 | batch_job 1, business_rule 1, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java` | 5 | test_case 3, convention 1, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java` | 4 | convention 2, config 1, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java` | 4 | test_case 4 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java` | 3 | other 2, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java` | 3 | test_case 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java` | 2 | config 1, convention 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Le test async libère son latch dans un @AfterEach pour qu'aucun thread ne reste bloqué entre les tests. [#6905db6da4e28531-1] | deducible |
| tests | - Les tests fixent que la purge des tokens de réinitialisation supprime les tokens consommés et les expirés hors rétention, et conserve les valides et les expirés récemment [#1ffca7439a8f14e1-1] [#0ef78d8bbde88b98-2]. | deducible |
| tests | - Selon la javadoc, le test de purge des tokens ne surcharge aucune propriété, pour partager le contexte SpringBootTest commun [#0ef78d8bbde88b98-1]. | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:35` | La durée de vie du fichier téléchargeable est fixée à 24 heures par la constante DOWNLOAD_TTL_HOURS, et cette échéance sert de base au purge planifiée. | [#44dd721f941d7c5b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:29-30` | Javadoc : Selon la javadoc, un token valide, c'est-à-dire non consommé et non expiré, n'entre dans aucune condition de suppression et n'est jamais purgé. | [#8cb3eecf98829cbc-1] |

## Traitements batch {#t-batch_job}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:59-60` | La purge des exports expirés est planifiée en fixedDelay avec un intervalle par défaut de 3 600 000 ms (1 h) et un premier passage différé par défaut de 300 000 ms (5 min). | [#975432c3f0e38e69-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:70-71` | La purge des tokens est planifiée en fixedDelay avec un intervalle par défaut de 86 400 000 ms (24 h) et un premier passage différé par défaut de 300 000 ms (5 min). | [#99a2df300c170ed7-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:75` | Le filtre réel de suppression (consommé ou expiré avant la fenêtre) est délégué au port et n'est pas lu dans ce lot, seule la javadoc le décrit ici. | [#9f17520211d2f332-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:31-42` | La javadoc affirme un CallerRunsPolicy à saturation pour passwordResetExecutor, alors que le bean ne définit aucun RejectedExecutionHandler (ligne 41 seulement initialize), contrairement à exportExecutor. | [#b3a9a5da67f3212a-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:119-132` | Le nom du test annonce qu'aucun email n'est envoyé, mais la méthode n'asserte que le statut 200 et l'absence d'exception, sans verify sur emailService. | [#9c0729d39059d8b1-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:63-64` | Le balayage récupère la liste complète des jobs expirés à l'instant courant via findExpired, sans pagination visible. | [#2bdf2db83a151dc3-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:55-58` | La fenêtre de rétention des tokens expirés est lue depuis app.password-reset.purge.retention-hours avec une valeur par défaut de 24 heures. | [#69a4d4a588e40595-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:53-63` | Le bean exportExecutor est un ThreadPoolTaskExecutor avec corePoolSize 2, maxPoolSize 4, queueCapacity 50, préfixe de threads export-. | [#b583274d61001cee-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java:17-19` | La classe SchedulingConfig est un @Configuration annotée @EnableScheduling, qui active le support @Scheduled pour l'application. | [#dc82ba7965b0fc6c-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:59-60` | La méthode run est annotée @Async sur l'executor exportExecutor et @Transactional, et elle est appelée via un bean distinct. | [#626250add9b61251-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:81-82` | Commentaire : Le code d'erreur d'échec est une constante bornée, et le message ou la stack de l'exception ne sont pas stockés sur le job. | [#626250add9b61251-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:61-62` | La méthode purgeExpired est annotée @Transactional et s'exécute dans une transaction unique couvrant tout le balayage. | [#5715b77c36e0dbb9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:68-73` | Pour chaque job, le fichier est supprimé en premier via exportStorage.delete si la référence n'est pas nulle, puis la ligne est supprimée via deleteById. | [#5715b77c36e0dbb9-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:70` | Commentaire : Selon le commentaire, la suppression du fichier avant la ligne rend l'opération idempotente, une référence absente étant traitée comme un no-op. | [#5715b77c36e0dbb9-3] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:75-79` | Une RuntimeException sur un job est capturée par job, journalisée avec le seul nom de la classe d'exception, et le balayage continue avec les jobs suivants. | [#5715b77c36e0dbb9-4] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:127-131` | Toute RuntimeException de la tâche async est capturée et n'est jamais propagée, et seul le nom de la classe d'exception est journalisé en error. | [#dee487f1a42e30d1-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:39-40` | Javadoc : Selon la javadoc, le scheduler réutilise l'activation @EnableScheduling déjà présente, sans seconde activation. | [#ca82cae005b299e2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:34-42` | Le bean passwordResetExecutor est un ThreadPoolTaskExecutor avec corePoolSize 2, maxPoolSize 4 et queueCapacity 100, préfixe de threads pwd-reset-. | [#c856ebdf3b1791e2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:60` | L'executor exportExecutor définit explicitement un CallerRunsPolicy comme RejectedExecutionHandler, ce qui fait exécuter la tâche sur le thread appelant à saturation. | [#3a7fe13cb6f4e406-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java:14-15` | Javadoc : Selon la javadoc, un seul scheduler mono-thread suffit et le TaskScheduler par défaut n'est pas surchargé. | [#00195f9f0d4bce64-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:75-79` | Le latch est libéré dans une méthode @AfterEach pour qu'aucun thread async ne reste bloqué entre les tests. | [#6905db6da4e28531-1] |
