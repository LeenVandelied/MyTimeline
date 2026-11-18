# Annexe : batch

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 6 | business_rule 2, convention 2, state_transition 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java` | 6 | convention 5, persistence_query 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java` | 5 | convention 2, batch_job 1, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java` | 5 | test_case 3, config 1, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java` | 3 | config 2, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java` | 2 | config 1, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java` | 2 | convention 1, test_case 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java` | 2 | convention 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java` | 1 | state_transition 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java` | 1 | convention 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - La méthode run est @Async sur exportExecutor et @Transactional, et selon la javadoc elle vit dans un bean séparé, car @Async n'agit que par appel inter-bean via le proxy. [#8c0af7c8fb9efde8-1] [#3bf00b99fee4a5ee-1] | deducible |
| rules | - exportExecutor compte 2 à 4 threads et 50 places de file, et à saturation la tâche tourne sur le thread appelant, ce qui évite selon la javadoc un job PENDING orphelin. [#027974c1249cea1d-2] [#310320ec87a30534-1] | deducible |
| rules | - La purge des exports est un fixedDelay réglé par app.export.purge.interval-ms (défaut 1 heure), voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:59-60`. [#30f78007217e46da-1] | deducible |
| rules | - Chaque job expiré est traité dans son propre try/catch, et l'échec journalise seulement le nom de la classe d'exception. [#cebb04ed84733eef-2] | deducible |
| rules | - requestReset est @Async sur passwordResetExecutor (2 threads, 4 au maximum, file de 100) et @Transactional. [#00500c928da212f7-1] [#dc6e00eaeabd737d-1] | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:35` | La durée de vie du fichier téléchargeable est fixée à 24 heures par une constante. | [#f15732d31ea166fa-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:76` | À la fin d'un export réussi, la date d'expiration du job est calculée comme la date courante plus DOWNLOAD_TTL_HOURS, et c'est cette date qui rend le job éligible à la purge. | [#0b16217c50dbabb3-1] |

## Traitements batch {#t-batch_job}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:70-71` | La purge des tokens est déclenchée par @Scheduled en fixedDelay, avec un intervalle lu dans app.password-reset.purge.interval-ms et une valeur par défaut de 86400000 ms (24 heures). | [#e9bc5986e153aab5-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:30-31` | Le commentaire de classe indique des migrations V1..V14, alors que le commentaire de PasswordResetTokenPurgeSchedulerIntegrationTest décrit la même chaîne comme V1..V15. | [#18fa02c9628634b8-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:63-64` | À chaque tick, la purge lit la liste des jobs expirés à la date courante via findExpired. | [#a30bdab607e005e7-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:74-75` | La date limite est calculée comme maintenant moins la rétention, puis passée au repository qui supprime en une fois les tokens consommés ou expirés avant cette date. | [#b50470acdd691e30-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:58` | La fenêtre de rétention des tokens expirés est lue dans app.password-reset.purge.retention-hours, avec une valeur par défaut de 24 heures. | [#96832c023d97aa46-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:34-43` | L'executor passwordResetExecutor est un pool de 2 threads de base, 4 au maximum et une file de 100 places, avec le préfixe de thread pwd-reset-. | [#dc6e00eaeabd737d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:53-63` | L'executor exportExecutor est un pool de 2 à 4 threads avec une file de 50 places, et à saturation la tâche s'exécute sur le thread appelant via CallerRunsPolicy. | [#027974c1249cea1d-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java:17-19` | La classe de configuration active le support @Scheduled par @EnableScheduling, sans surcharger le TaskScheduler par défaut. | [#1c6c381999d571b0-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:43-47` | Le test surcharge les propriétés app.export.purge.initial-delay-ms et interval-ms à 3600000 pour neutraliser le tick automatique. | [#13a687a0a7ac9bcb-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:26-27` | Javadoc : Selon la javadoc, AsyncExportRunner est un bean séparé de ExportServiceImpl, car @Async n'agit que sur un appel inter-bean passant par le proxy. | [#3bf00b99fee4a5ee-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:59-61` | La méthode run est annotée @Async sur l'executor nommé exportExecutor et @Transactional. | [#8c0af7c8fb9efde8-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:32-33` | Javadoc : Selon la javadoc, un job en échec est retenté au tick suivant, car il reste en base. | [#cc6101d705d01b36-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:59-60` | La purge est déclenchée par @Scheduled en fixedDelay, avec un intervalle lu dans app.export.purge.interval-ms et une valeur par défaut de 3600000 ms (1 heure). | [#30f78007217e46da-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:61-62` | La méthode planifiée purgeExpired est annotée @Transactional. | [#cebb04ed84733eef-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:66-79` | Chaque job est traité dans son propre try/catch RuntimeException, et un échec est journalisé avec le seul nom de la classe d'exception. | [#cebb04ed84733eef-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:68-73` | Pour chaque job expiré ayant une référence de stockage, le fichier est supprimé via le port exportStorage avant la suppression de la ligne par deleteById. | [#cebb04ed84733eef-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:99-100` | requestReset est annotée @Async sur l'executor passwordResetExecutor et @Transactional. | [#00500c928da212f7-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:29-30` | Javadoc : Selon la javadoc, un token valide, c'est-à-dire non consommé et non expiré, ne correspond à aucune condition du DELETE. La clause SQL elle-même n'est pas dans ce lot et n'est pas vérifiée. | [#c5605d596e3be48d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:72-73` | La méthode planifiée purgeConsumedAndExpired est annotée @Transactional. | [#31adec434d6b04c0-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:50-51` | Javadoc : Selon la javadoc, le défaut AbortPolicy de Spring rejetterait la tâche et laisserait le job PENDING orphelin, d'où le choix de CallerRunsPolicy. | [#310320ec87a30534-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java:14` | Javadoc : Selon la javadoc, un unique scheduler mono-thread suffit pour la purge horaire, et le TaskScheduler par défaut n'est pas surchargé. | [#1c6c381999d571b0-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:39-42` | Javadoc : Selon la javadoc, le test garde les propriétés par défaut pour partager le contexte Spring, afin d'éviter un pool Hikari supplémentaire. | [#59ae3e6cc760e934-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:42-43` | Javadoc : Selon la javadoc, la méthode PasswordResetServiceImpl.requestReset est annotée @Async après correctif. | [#f2468d648cf81a9c-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:60-62` | Commentaire : Selon le commentaire, le bean PasswordResetService injecté est un proxy Spring réel portant @Async, et non un mock. | [#e41545f9a57c55d3-1] |
