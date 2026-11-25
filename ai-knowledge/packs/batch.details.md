# Annexe : batch

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java` | 7 | convention 3, batch_job 1, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 6 | state_transition 3, convention 2, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java` | 5 | convention 3, batch_job 1, persistence_query 1 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java` | 4 | test_case 4 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java` | 3 | config 2, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java` | 3 | test_case 2, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java` | 2 | business_rule 1, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java` | 2 | config 1, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java` | 2 | convention 1, test_case 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Le worker d'export tourne sur exportExecutor (2 à 4 threads, file de 50) et, à saturation, CallerRunsPolicy exécute le travail chez l'appelant. [#626250add9b61251-1] [#3a7fe13cb6f4e406-1] | deducible |
| rules | - Toute RuntimeException de génération passe le job en FAILED avec le code fixe GENERATION_ERROR, sans message ni stack. [#92871d4006ddb92f-3] | deducible |
| rules | - Pour chaque export expiré, le fichier est supprimé avant la ligne, seulement si la référence de stockage existe. [#5715b77c36e0dbb9-2] | deducible |
| rules | - Une erreur sur un job est isolée, journalisée par type d'exception seul, et la purge continue avec les suivants. [#d40ee25765e10173-1] | deducible |
| tests | - Les tests fixent que la purge est idempotente, car un job expiré dont le fichier est déjà absent est purgé sans exception et sa ligne est supprimée [#3e2957bcbbbe0496-1]. | deducible |
| surface | - Le scheduler d'export lit à chaque tick les jobs expirés à l'instant courant, dans une transaction, via `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:62-64` [#2bdf2db83a151dc3-1] | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:103-108` | Commentaire : Si l'email est inconnu, requestReset retourne sans action ni signal, et la branche async ne produit aucun effet. | [#eda0213cb31236d8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:74-75` | La borne de suppression est l'instant courant moins la rétention, et le repository supprime les tokens consommés ou expirés avant cette borne. | [#7c0346410c8ee205-1] |

## Traitements batch {#t-batch_job}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:53-62` | La purge des exports expirés est déclenchée par @Scheduled avec un délai fixe configurable, 3600000 ms par défaut, et un délai initial de 300000 ms par défaut. | [#975432c3f0e38e69-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:70-73` | La purge des tokens est déclenchée par @Scheduled à délai fixe configurable, 86400000 ms (24 h) par défaut, avec un délai initial de 300000 ms par défaut. | [#99a2df300c170ed7-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:30-32` | La javadoc affirme que le rejet par défaut est CallerRunsPolicy, alors que passwordResetExecutor ne configure aucun handler et que la javadoc d'exportExecutor indique que le défaut Spring est AbortPolicy. | [#b3a9a5da67f3212a-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:116-117` | La javadoc annonce un aucun envoi pour l'email inconnu, mais le corps du test ne contient aucune vérification sur emailService. | [#9c0729d39059d8b1-2] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:62-64` | Chaque tick lit les jobs expirés à l'instant courant via findExpired, dans une transaction @Transactional. | [#2bdf2db83a151dc3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:75` | La suppression est confiée à deleteConsumedOrExpiredBefore du port, qui renvoie le nombre de lignes purgées. | [#9f17520211d2f332-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:55-58` | La fenêtre de rétention des tokens expirés est lue depuis app.password-reset.purge.retention-hours, valeur par défaut 24. | [#69a4d4a588e40595-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:34-43` | L'executor passwordResetExecutor a un pool core 2, max 4, une file de 100 et le préfixe de thread pwd-reset-, sans RejectedExecutionHandler explicite. | [#c856ebdf3b1791e2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:53-63` | L'executor exportExecutor a un pool core 2, max 4, une file de 50, le préfixe export- et un CallerRunsPolicy explicite en cas de saturation. | [#3a7fe13cb6f4e406-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java:4-18` | La classe SchedulingConfig active @Scheduled pour toute l'application via @EnableScheduling, sans bean TaskScheduler personnalisé. | [#00195f9f0d4bce64-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:26-27` | Javadoc : Selon la javadoc, @Async n'agit que sur un appel inter-bean via proxy, jamais en self-invocation, d'où le worker séparé de ExportServiceImpl. | [#ce8a59037f3a80e1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:59-60` | La méthode run s'exécute en @Async sur l'executor exportExecutor et porte aussi @Transactional. | [#626250add9b61251-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:68-74` | Pour chaque job expiré, le fichier est supprimé via StoragePort.delete avant la suppression de la ligne par deleteById, uniquement si la référence de stockage n'est pas nulle. | [#5715b77c36e0dbb9-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:75-79` | Une RuntimeException sur un job est isolée par un try/catch par job, journalisée avec le type d'exception seulement, et le traitement des jobs suivants continue. | [#d40ee25765e10173-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:81-83` | Le journal de fin de purge ne contient que le nombre de jobs purgés, sans identifiant ni donnée personnelle. | [#5715b77c36e0dbb9-5] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:99-100` | requestReset s'exécute en @Async sur l'executor passwordResetExecutor et porte aussi @Transactional. | [#eeb34aa142262593-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:29-30` | Javadoc : Selon la javadoc, un token valide non consommé et non expiré n'entre dans aucune condition de suppression, le DELETE SQL étant hors de ce fichier. | [#ca82cae005b299e2-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:38-40` | Javadoc : Selon la javadoc, la purge réutilise l'activation @EnableScheduling de SchedulingConfig, sans seconde activation. | [#ca82cae005b299e2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:78-79` | Le journal de purge ne contient que le nombre de tokens supprimés, sans token, identifiant utilisateur ni email. | [#4303970440508e20-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java:14-15` | Javadoc : Selon la javadoc, un unique scheduler mono-thread suffit et le TaskScheduler par défaut n'est pas surchargé. | [#00195f9f0d4bce64-2] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:40` | Javadoc : Selon la javadoc, ce test garde les propriétés par défaut afin de partager le contexte SpringBootTest commun. | [#0ef78d8bbde88b98-1] |
