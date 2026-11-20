---
pack: batch
kind: transversal
name: Tâches planifiées et asynchrones
generated_at: 2026-11-20T11:40:00Z
generator: synth/1
base_sha256: 0d07ab7cb84e04d03c30302c0ea27f37d98e2a7b72d8508752a362b0e5dda6f1
facts_in_base: 36
facts_in_pool: 34
facts_cited: 24
sections: batch.sections.json
details: [batch.details.md]
lang: fr
curated_at: 2026-11-20T12:45:00Z
curation: batch.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : batch, scheduler, scheduled, cron, purge, async
- Chemins : `^backend:src/.*/(PasswordResetTokenPurgeScheduler|ExportPurgeScheduler|SchedulingConfig|AsyncConfig|AsyncExportRunner)[^/]*\.java$`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Invariants
- Selon la javadoc, les purges réutilisent le @EnableScheduling de SchedulingConfig, qui ne définit aucun TaskScheduler personnalisé. [#ca82cae005b299e2-1] [#00195f9f0d4bce64-1]
### Exports asynchrones
- Le job passe à RUNNING au démarrage, puis à COMPLETED avec une expiration à 24 heures. [#92871d4006ddb92f-1] [#92871d4006ddb92f-2]
### Purges planifiées
- La purge des exports expirés tourne à délai fixe de 3600000 ms, avec un délai initial de 300000 ms, tous deux configurables. [#975432c3f0e38e69-1]
- Les tokens de réinitialisation consommés ou expirés avant now moins 24 h (configurable) sont supprimés, une fois par jour par défaut. [#69a4d4a588e40595-1] [#99a2df300c170ed7-1] [#7c0346410c8ee205-1]
- Selon la javadoc, un token valide, non consommé et non expiré n'est jamais supprimé. [#ca82cae005b299e2-2]
### Réinitialisation de mot de passe
- requestReset est asynchrone sur passwordResetExecutor (2 à 4 threads, file de 100, sans handler de rejet explicite). [#eeb34aa142262593-2] [#c856ebdf3b1791e2-1]

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AsyncExportRunner.run | Le worker reprend le job par son identifiant, l'abandonne si introuvable, puis le fait passer à l'état RUNNING via markRunning avant sauvegarde. (partiel) | L61-68 | [#92871d4006ddb92f-1] |
| AsyncExportRunner.run | Après assemblage, rendu et stockage réussis, le job passe à COMPLETED via markCompleted avec la référence de stockage et une expiration à now plus 24 heures. (partiel) | L75-79 | [#92871d4006ddb92f-2] |
| AsyncExportRunner.run | Toute RuntimeException de la génération passe le job en FAILED avec le code fixe GENERATION_ERROR, sans message ni stack. (partiel) | L80-84 | [#92871d4006ddb92f-3] |

## 5. Mise en œuvre par domaine {#surface}

### Export de données
- Le planificateur `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:62-64` lit à chaque tick les jobs d'export expirés à l'instant courant, dans une transaction [#2bdf2db83a151dc3-1] [#export/bb8b6ba05aa82340-2]
### Réinitialisation de mot de passe
- Le planificateur `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:75` confie la suppression des jetons consommés ou expirés au port du dépôt, qui renvoie le nombre de lignes purgées [#9f17520211d2f332-1] [#user/80685ae3287ab06e-1]

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (7 sur 9), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java` | 7 | convention 3, batch_job 1, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 6 | state_transition 3, convention 2, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java` | 5 | convention 3, batch_job 1, persistence_query 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java` | 3 | config 2, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java` | 2 | business_rule 1, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java` | 3 | test_case 2, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java` | 2 | config 1, convention 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| export | 15 | 10 | oui |
| user | 14 | 9 | oui |
| backend-core | 5 | 0 |  |

- Faits du pool par pack d'origine : export 15, user 14, backend-core 5

## 8. Tests attendus {#tests}

- Les tests fixent que la purge des exports supprime le fichier et la ligne d'un job COMPLETED expiré, et laisse intact un job COMPLETED non expiré, via un appel direct à purgeExpired [#976217c793029b36-1] [#4d438c4f5ca95c37-1] (`backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:94-118`).
- Les tests fixent que la purge des tokens de réinitialisation supprime les tokens consommés et ceux expirés depuis 48 h, et conserve le token valide et celui expiré depuis 30 min [#1ffca7439a8f14e1-1] (`backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:88-116`).
- Les tests fixent que requestReset, appelé via le proxy, rend la main en moins de 4000 ms pendant que l'envoi est bloqué, l'envoi et la création du token s'exécutant en asynchrone [#0457acca23533817-1] (`backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:88-113`).
- Le test forgot-password avec un email inconnu fixe une réponse 200 sans exception, mais ne vérifie pas l'absence d'envoi [#9c0729d39059d8b1-1] (`backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:119-132`).

## 9. Questions ouvertes {#questions}

- Un email inconnu produit-il vraiment aucune action ni signal dans requestReset ? Selon le commentaire BR-AUT-012, la méthode retourne sans effet et la branche async ne fait rien, mais aucun fait de code ne le confirme, voir `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:103-108` [#eda0213cb31236d8-1].

## 10. Alertes {#alerts}

- Selon la javadoc de passwordResetExecutor, le rejet par défaut est CallerRunsPolicy, mais le code ne définit aucun handler de rejet (pool 2 à 4 threads, file de 100), et la javadoc d'exportExecutor cite AbortPolicy comme défaut. Qui compte sur l'exécution par l'appelant à saturation risque un rejet à la place, donc se fier au code et ne pas supposer CallerRunsPolicy, ou poser un handler explicite et corriger la javadoc, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:30-43` [#b3a9a5da67f3212a-1] [#c856ebdf3b1791e2-1].
- La javadoc du test d'email inconnu annonce qu'aucun envoi n'a lieu, mais le corps ne vérifie rien sur emailService, il contrôle seulement la réponse 200 sans exception. Ce test ne protège donc pas contre un envoi pour un email inconnu, donc ajouter une vérification d'absence d'envoi avant de s'y fier, voir `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:116-132` [#9c0729d39059d8b1-2] [#9c0729d39059d8b1-1].

## 11. Couverture {#coverage}

- Fichiers du pack : 9 ; avec au moins un fait en base : 9 ; sans fait après remise en file : 0.
- Faits en base : 36, repris d'autres packs : +0, hors périmètre : -2, doublons écartés à la déduplication : -0, soit 34 dans le pool.
- Faits du pool venus d'un autre pack : 34 (par pack : section Relations).
- Destination des 34 faits du pool : Règles du motif 21 ; Mise en œuvre par domaine 2 ; Tests attendus 7 ; Alertes / Questions ouvertes 3 ; annexe seule 0 ; écartés (sorte `other` ou inconnue) 1.
- Passe transversale : scope 9 fichiers, tous lus.
- Base : sha256 0d07ab7cb84e…, générée le 2026-11-20.
