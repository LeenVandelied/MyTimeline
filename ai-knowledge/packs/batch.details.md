# Annexe : batch

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 9 | convention 3, state_transition 3, business_rule 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java` | 7 | business_rule 2, convention 2, batch_job 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java` | 6 | convention 4, batch_job 1, persistence_query 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java` | 4 | config 3, suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java` | 4 | test_case 4 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java` | 3 | convention 2, test_case 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java` | 2 | convention 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java` | 2 | config 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java` | 2 | other 1, test_case 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java` | 1 | convention 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - exportExecutor a 2 threads de cœur, 4 au maximum et une file de 50, et à saturation la tâche s'exécute sur le thread appelant. [#027974c1249cea1d-1] [#027974c1249cea1d-2] | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:75-77` | L'expiration du job COMPLETED est fixée à la date de fin de génération plus DOWNLOAD_TTL_HOURS, soit 24 heures. | [#0b16217c50dbabb3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:25-35` | Javadoc : Selon la javadoc, un token valide n'est jamais supprimé, quelle que soit la fenêtre de rétention. | [#c5605d596e3be48d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:74` | Le seuil de purge est l'instant courant moins la fenêtre de rétention. | [#10f3525a1962c7b1-1] |

## Traitements batch {#t-batch_job}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:59-60` | La purge des exports expirés est déclenchée par @Scheduled en fixedDelay, intervalle configurable par app.export.purge.interval-ms (défaut 3600000 ms, soit 1 heure) et premier passage après app.export.purge.initial-delay-ms (défaut 300000 ms, soit 5 minutes). | [#30f78007217e46da-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:70-71` | La purge des tokens est déclenchée par @Scheduled en fixedDelay, intervalle configurable par app.password-reset.purge.interval-ms (défaut 86400000 ms, soit 24 heures) et premier passage après 5 minutes par défaut. | [#e9bc5986e153aab5-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:80-85` | Seules les RuntimeException sont capturées : une Error levée pendant la génération sortirait du try sans passage au statut FAILED, le job resterait RUNNING. | [#e9b8732b8a56d766-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:29-33` | Le commentaire annonce un rejet par CallerRunsPolicy à saturation, mais passwordResetExecutor ne définit aucun RejectedExecutionHandler, contrairement à exportExecutor. | [#8dc64bf06c402044-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:73` | Le fichier généré est stocké via le port StoragePort qualifié exportStorage, qui renvoie la référence enregistrée dans le job. | [#268128fbdd845ce2-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:63-64` | La purge lit la liste des jobs expirés à l'instant now via exportJobRepository.findExpired. | [#a30bdab607e005e7-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:75` | La purge délègue au port tokenRepository.deleteConsumedOrExpiredBefore la suppression des tokens consommés ou expirés avant le seuil, et reçoit le nombre de lignes supprimées. | [#b50470acdd691e30-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:55-58` | La fenêtre de rétention des tokens expirés est lue depuis app.password-reset.purge.retention-hours, avec 24 heures par défaut. | [#96832c023d97aa46-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:34-43` | Le bean passwordResetExecutor est un ThreadPoolTaskExecutor de cœur 2, de maximum 4, avec une file de 100 et le préfixe de threads pwd-reset-. | [#dc6e00eaeabd737d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:53-63` | Le bean exportExecutor est un ThreadPoolTaskExecutor de cœur 2, de maximum 4, avec une file de 50 et le préfixe de threads export-. | [#027974c1249cea1d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:60` | À saturation, exportExecutor applique CallerRunsPolicy, donc la tâche s'exécute sur le thread appelant. | [#027974c1249cea1d-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java:14-15` | Javadoc : Selon la javadoc, un scheduler mono-thread suffit et le TaskScheduler par défaut n'est pas surchargé. | [#1c6c381999d571b0-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java:17-19` | La classe active @EnableScheduling et ne déclare aucun bean TaskScheduler. | [#1c6c381999d571b0-2] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:26-27` | Javadoc : Selon la javadoc, le worker est un bean séparé de ExportServiceImpl parce que @Async n'agit que sur un appel inter-bean via proxy. | [#3bf00b99fee4a5ee-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:59` | La méthode run est annotée @Async et s'exécute sur l'executor nommé exportExecutor. | [#8c0af7c8fb9efde8-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:60-61` | La méthode async run est aussi annotée @Transactional. | [#8c0af7c8fb9efde8-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:33-35` | Javadoc : Selon la javadoc, la purge n'enregistre dans les logs qu'un compte, sans email, user_id, storage_ref ni jobId. | [#cc6101d705d01b36-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:61-62` | La méthode planifiée purgeExpired est annotée @Transactional. | [#cebb04ed84733eef-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:67-79` | Chaque job est traité dans son propre try, une RuntimeException est journalisée par nom de classe seulement et le job reste pour un passage ultérieur. | [#cebb04ed84733eef-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:68-73` | Pour chaque job ayant une référence de stockage, le fichier est supprimé via exportStorage.delete avant la suppression de la ligne par deleteById. | [#cebb04ed84733eef-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:76-87` | submitAsync persiste le job PENDING puis appelle asyncRunner.run avec son identifiant, sans annotation @Transactional sur la méthode. | [#8a7db72a12a3e330-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:99-100` | La méthode requestReset est annotée @Async sur l'executor passwordResetExecutor et @Transactional. | [#00500c928da212f7-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:72-73` | La méthode planifiée purgeConsumedAndExpired est annotée @Transactional. | [#31adec434d6b04c0-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:77-78` | Commentaire : Le journal de purge n'émet que le nombre de tokens supprimés, sans token, user_id ni email. | [#31adec434d6b04c0-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:42` | Javadoc : Selon la javadoc, la méthode requestReset de PasswordResetServiceImpl est annotée @Async pour déporter l'envoi hors du thread de requête. | [#f2468d648cf81a9c-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:60` | Commentaire : Le test injecte le bean PasswordResetService réel, proxifié par Spring, et non un mock, afin de tester le proxy @Async. | [#e41545f9a57c55d3-1] |
