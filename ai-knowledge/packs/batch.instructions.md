---
pack: batch
kind: transversal
name: Tâches planifiées et asynchrones
generated_at: 2026-11-18T12:00:00Z
generator: synth/1
base_sha256: fdcbb25631235367ccad8623d570ec570aba54c591f72818c3aed9649d49bf66
facts_in_base: 49
facts_in_pool: 40
facts_cited: 26
sections: batch.sections.json
details: [batch.details.md]
lang: fr
curated_at: 2026-11-18T14:30:00Z
curation: batch.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `(Scheduler|SchedulingConfig|AsyncExportRunner|AsyncConfig)`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Invariants
- Les méthodes planifiées de purge et le worker d'export sont @Transactional. [#cebb04ed84733eef-1] [#31adec434d6b04c0-1] [#8c0af7c8fb9efde8-2]
### Export asynchrone
- Le worker run s'exécute sur l'executor exportExecutor. [#8c0af7c8fb9efde8-1]
- Le job passe de PENDING à RUNNING, puis à COMPLETED avec référence de stockage et expiration à 24 h après la fin. [#12b6799eaf5bd99b-1] [#12b6799eaf5bd99b-2] [#0b16217c50dbabb3-1]
- Toute RuntimeException fait passer le job de RUNNING à FAILED avec le code GENERATION_ERROR. [#12b6799eaf5bd99b-3]
### Purges planifiées
- La purge des exports tourne en fixedDelay toutes les heures, premier passage après 5 minutes, réglable par app.export.purge.*. [#30f78007217e46da-1]
- Chaque job d'export est purgé dans son propre try, le fichier est supprimé avant la ligne, et en cas d'erreur le job reste pour un passage ultérieur. [#cebb04ed84733eef-3] [#cebb04ed84733eef-2]
- La purge des tokens de réinitialisation supprime ce qui est antérieur à maintenant moins la rétention (24 h par défaut), toutes les 24 h par défaut. [#10f3525a1962c7b1-1] [#96832c023d97aa46-1] [#e9bc5986e153aab5-1]
### Réinitialisation de mot de passe
- requestReset est @Async sur passwordResetExecutor (2 à 4 threads, file de 100). [#00500c928da212f7-1] [#dc6e00eaeabd737d-1]
- Selon le commentaire du test, il injecte le bean réel proxifié et non un mock pour tester le proxy @Async. [#e41545f9a57c55d3-1]

## 4. Structure {#structure}

#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AsyncExportRunner.run | Le job lu par findDomainById passe de PENDING à RUNNING via markRunning avant d'être sauvegardé. (partiel) | L62-68 | [#12b6799eaf5bd99b-1] |
| AsyncExportRunner.run | Le job passe de RUNNING à COMPLETED via markCompleted, avec la référence de stockage et l'expiration, après assemblage, rendu et stockage sans exception. (partiel) | L71-78 | [#12b6799eaf5bd99b-2] |
| AsyncExportRunner.run | Le job passe de RUNNING à FAILED avec le code borné GENERATION_ERROR lorsqu'une RuntimeException est capturée. (partiel) | L80-83 | [#12b6799eaf5bd99b-3] |

## 5. Mise en œuvre par domaine {#surface}

### Export de données
- La purge des exports lit les jobs expirés à l'instant courant via le dépôt des jobs d'export, dans `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:63-64`. [#a30bdab607e005e7-1]
### Réinitialisation de mot de passe
- La purge des tokens délègue au port du dépôt la suppression des tokens consommés ou expirés avant un seuil, et récupère le nombre de lignes supprimées, dans `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:75`. [#b50470acdd691e30-1]

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (6 sur 10), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 9 | convention 3, state_transition 3, business_rule 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java` | 7 | business_rule 2, convention 2, batch_job 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java` | 6 | convention 4, batch_job 1, persistence_query 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java` | 4 | config 3, suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java` | 3 | convention 2, test_case 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java` | 2 | config 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 34 | 24 | oui |

- Faits du pool par pack d'origine : timeline 34, batch 6

## 8. Tests attendus {#tests}

- Les tests fixent qu'une purge d'export supprime le fichier du stockage et la ligne d'un job COMPLETED expiré [#13a687a0a7ac9bcb-1], et conserve fichier et ligne d'un job COMPLETED non expiré [#d105cdff3ecccfc0-1]. Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:94-118`, avec [#44e804e9277ae7fe-1].
- Les tests fixent que la purge d'export est idempotente : si le fichier est déjà absent, aucune exception n'est levée et la ligne est quand même purgée [#c8adfcfac47fe93a-1].
- Les tests fixent que la purge des tokens de réinitialisation supprime les tokens consommés et ceux expirés depuis 48 heures, et garde le token valide et celui expiré depuis 30 minutes [#2476578c8ac84af6-1]. Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:88-116`.
- Les tests fixent que requestReset est asynchrone : l'appel via le proxy rend la main en moins de 4000 ms alors que l'envoi d'email est bloqué sur un verrou de 5 secondes [#5dd507c53997f001-1]. Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:88-113`.
- Pour vérifier l'asynchronisme, le test appelle le service par le proxy pour que l'annotation @Async s'applique, et bloque l'envoi d'email sur un CountDownLatch [#5dd507c53997f001-1].

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- Dans `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:80-85`, seules les RuntimeException sont capturées, donc une Error levée pendant la génération ne fait pas passer le job à FAILED et il reste RUNNING . Si vous modifiez ce bloc [#e9b8732b8a56d766-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 14 ; avec au moins un fait en base : 10 ; sans fait après remise en file : 0.
- Faits en base : 49, repris d'autres packs : +0, hors périmètre : -9, doublons écartés à la déduplication : -0, soit 40 dans le pool.
- Faits du pool venus d'un autre pack : 34 (par pack : section Relations).
- Destination des 40 faits du pool : Règles du motif 26 ; Mise en œuvre par domaine 2 ; Tests attendus 6 ; Alertes / Questions ouvertes 3 ; annexe seule 1 ; écartés (sorte `other` ou inconnue) 2.
- Passe transversale : scope 14 fichiers, tous lus.
- Base : sha256 fdcbb2563123…, générée le 2026-11-17.
