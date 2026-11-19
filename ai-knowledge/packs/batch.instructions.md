---
pack: batch
kind: transversal
name: Tâches planifiées et asynchrones
generated_at: 2026-11-18T16:18:53Z
generator: synth/1
base_sha256: 52ae3fc06bf2f35892836c58c0ce264b69a39ffbbbbcd940a938ed75065acbfd
facts_in_base: 48
facts_in_pool: 33
facts_cited: 21
sections: batch.sections.json
details: [batch.details.md]
lang: fr
curated_at: 2026-11-18T16:25:37Z
curation: batch.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `(Scheduler|SchedulingConfig|AsyncExportRunner|AsyncConfig)`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Export asynchrone
- Un job créé par submitAsync entre en PENDING, puis le worker asynchrone est lancé sur son identifiant. [#27110603918edb71-1]
- Après génération et stockage sans exception, le job passe à COMPLETED avec une expiration à la date courante plus 24 heures, ce qui le rend éligible à la purge. [#12b6799eaf5bd99b-2] [#0b16217c50dbabb3-1] [#f15732d31ea166fa-1]
- Toute RuntimeException pendant la génération met le job en FAILED avec le code fixe GENERATION_ERROR, sans journaliser message ni stack. [#12b6799eaf5bd99b-3]
### Purges planifiées
- Le fichier est supprimé via le port exportStorage avant la suppression de la ligne, et selon la javadoc un job en échec reste en base et est retenté au tick suivant. [#cebb04ed84733eef-3] [#cc6101d705d01b36-1]
- La purge des tokens de réinitialisation tourne toutes les 24 heures par défaut (app.password-reset.purge.interval-ms) et garde les tokens expirés 24 heures par défaut (retention-hours). [#e9bc5986e153aab5-1] [#96832c023d97aa46-1]
- Les méthodes planifiées sont @Transactional, et le TaskScheduler par défaut n'est pas surchargé. [#cebb04ed84733eef-1] [#31adec434d6b04c0-1] [#1c6c381999d571b0-2]
### Tests
- Le test de purge des exports fixe initial-delay-ms et interval-ms à 3600000 pour neutraliser le tick automatique. [#13a687a0a7ac9bcb-1]
### Vérifié dans le code
- Dans ForgotPasswordAsyncTest, PasswordResetService est le bean réel proxifié (@Async sur PasswordResetServiceImpl.requestReset) et seuls UserRepository, PasswordResetTokenRepository et EmailService sont mockés [#e41545f9a57c55d3-1] [#integrations/b84ecc560bc2eb6d-1] [#e41545f9a57c55d3-2] `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:60-71`.

## 4. Structure {#structure}

#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AsyncExportRunner.run | Après génération et stockage sans exception, le job passe à COMPLETED avec la référence de stockage et une expiration. (partiel) | L77 | [#12b6799eaf5bd99b-2] |
| AsyncExportRunner.run | Toute RuntimeException pendant la génération fait passer le job à FAILED avec le code fixe GENERATION_ERROR, sans journaliser le message ni la stack. (partiel) | L80-85 | [#12b6799eaf5bd99b-3] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportServiceImpl.submitAsync | Un job créé par submitAsync entre dans l'état PENDING par ExportJob.pending, puis le worker asynchrone est déclenché sur son identifiant. (partiel) | L84-85 | [#27110603918edb71-1] |

## 5. Mise en œuvre par domaine {#surface}

### Export de données
### Réinitialisation de mot de passe
- Le scheduler calcule une date limite égale à maintenant moins la durée de rétention, puis supprime en une seule requête les tokens consommés ou expirés avant cette date, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:74-75` [#b50470acdd691e30-1]

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (7 sur 10), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 6 | business_rule 2, convention 2, state_transition 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java` | 6 | convention 5, persistence_query 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java` | 5 | convention 2, batch_job 1, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java` | 5 | test_case 3, config 1, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java` | 3 | config 2, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java` | 2 | config 1, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java` | 2 | convention 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 28 | 23 | oui |

- Faits du pool par pack d'origine : timeline 28, batch 5

## 8. Tests attendus {#tests}

- Les tests fixent que la purge des exports supprime le fichier d'un job COMPLETED expiré via le stockage d'export et la ligne export_jobs correspondante, voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:94-106` [#44e804e9277ae7fe-1].
- Les tests fixent qu'un job COMPLETED non expiré garde son fichier et sa ligne après la purge, voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:109-118` [#d105cdff3ecccfc0-1].
- Les tests fixent que la purge est idempotente, elle ne lève pas d'exception si le fichier est déjà absent et la ligne est tout de même supprimée, voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:120-133` [#c8adfcfac47fe93a-1].
- Les tests fixent que la purge des tokens de réinitialisation de mot de passe supprime les tokens consommés et ceux expirés depuis plus que la rétention, et conserve un token valide et un token expiré dans la fenêtre de rétention, voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:88-116` [#2476578c8ac84af6-1].

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

Aucun fait de la base ne relève de cette section.

## 11. Couverture {#coverage}

- Fichiers du pack : 14 ; avec au moins un fait en base : 10 ; sans fait après remise en file : 0.
- Faits en base : 48, repris d'autres packs : +0, hors périmètre : -13, doublons écartés à la déduplication : -2, soit 33 dans le pool.
- Faits du pool venus d'un autre pack : 28 (par pack : section Relations).
- Destination des 33 faits du pool : Règles du motif 25 ; Mise en œuvre par domaine 2 ; Tests attendus 4 ; Alertes / Questions ouvertes 1 ; annexe seule 1 ; écartés (sorte `other` ou inconnue) 0.
- Passe transversale : scope 14 fichiers, tous lus.
- Base : sha256 52ae3fc06bf2…, générée le 2026-11-18.
