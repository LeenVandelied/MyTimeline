---
pack: batch
kind: transversal
name: Tâches planifiées et asynchrones
generated_at: 2026-11-17T10:36:11Z
generator: synth/1
base_sha256: 067c23bf121ebb16543bb4b826c0452c22a3d1e64ba6b1f98c5e9898cbb2dc5d
facts_in_base: 49
facts_in_pool: 49
facts_cited: 34
sections: batch.sections.json
details: [batch.details.md]
lang: fr
curated_at: 2026-11-17T10:45:42Z
curation: batch.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `(Scheduler|SchedulingConfig|AsyncExportRunner|AsyncConfig)`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Exports asynchrones
- Le job passe de PENDING à RUNNING au début de run, puis à COMPLETED avec une expiration à 24 heures après la fin, ou à FAILED avec le code GENERATION_ERROR sur toute RuntimeException [#12b6799eaf5bd99b-1] [#12b6799eaf5bd99b-2] [#0b16217c50dbabb3-1] [#12b6799eaf5bd99b-3].
- L'export inline refuse un format asynchrone et la soumission async refuse un format synchrone, les deux avec ExportFormatNotSupportedException [#da258a571801b5f1-1] [#b1f4915fcd1d3924-1].
- Le téléchargement d'un job non téléchargeable renvoie un résultat vide sans lever d'exception [#b1943dd1c98a8a1b-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:59` (pointeur, détail en annexe) [#8c0af7c8fb9efde8-1] [#027974c1249cea1d-1] [#027974c1249cea1d-2].
- submitAsync n'est pas transactionnel, il persiste le job PENDING puis appelle run, qui est lui @Transactional [#8a7db72a12a3e330-2] [#8c0af7c8fb9efde8-2].
### Purges planifiées
- La purge des exports tourne en fixedDelay toutes les heures, premier passage après 5 minutes, réglable par app.export.purge.* [#30f78007217e46da-1].
- La purge des tokens de réinitialisation tourne toutes les 24 heures, avec un seuil égal à maintenant moins 24 heures de rétention par défaut (app.password-reset.purge.retention-hours) [#e9bc5986e153aab5-1] [#96832c023d97aa46-1] [#10f3525a1962c7b1-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:61-62` (pointeur, détail en annexe) [#cebb04ed84733eef-1] [#31adec434d6b04c0-1] [#1c6c381999d571b0-2].
### Réinitialisation de mot de passe
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:99-100` (pointeur, détail en annexe) [#00500c928da212f7-1] [#dc6e00eaeabd737d-1] [#00500c928da212f7-2].

## 4. Structure {#structure}

#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AsyncExportRunner.run | Le job lu par findDomainById passe de PENDING à RUNNING via markRunning avant d'être sauvegardé. (partiel) | L62-68 | [#12b6799eaf5bd99b-1] |
| AsyncExportRunner.run | Le job passe de RUNNING à COMPLETED via markCompleted, avec la référence de stockage et l'expiration, après assemblage, rendu et stockage sans exception. (partiel) | L71-78 | [#12b6799eaf5bd99b-2] |
| AsyncExportRunner.run | Le job passe de RUNNING à FAILED avec le code borné GENERATION_ERROR lorsqu'une RuntimeException est capturée. (partiel) | L80-83 | [#12b6799eaf5bd99b-3] |

## 5. Mise en œuvre par domaine {#surface}

### Exports
- La purge des exports sélectionne les jobs dont l'échéance est dépassée à l'instant courant avant de les traiter, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:63-64` [#a30bdab607e005e7-1].
### Réinitialisation de mot de passe
- La purge des tokens de réinitialisation supprime ceux déjà consommés ou expirés avant un seuil, via le port du dépôt qui renvoie le nombre de lignes supprimées, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java:75` [#b50470acdd691e30-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (8 sur 10), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 9 | convention 3, state_transition 3, business_rule 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeScheduler.java` | 7 | business_rule 2, convention 2, batch_job 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java` | 5 | convention 2, validation 2, business_rule 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java` | 6 | convention 4, batch_job 1, persistence_query 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java` | 4 | config 3, suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java` | 6 | test_case 4, convention 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java` | 4 | convention 2, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/SchedulingConfig.java` | 2 | config 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 0 | 29 | oui |

- Faits du pool par pack d'origine : timeline 43, batch 6

## 8. Tests attendus {#tests}

- Les tests fixent qu'un job d'export COMPLETED expiré perd son fichier (supprimé via exportStorage) et sa ligne, qu'un job non expiré garde les deux, et qu'un fichier déjà absent n'empêche ni l'absence d'exception ni la purge de la ligne [#44e804e9277ae7fe-1] [#d105cdff3ecccfc0-1] [#c8adfcfac47fe93a-1].
- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/PasswordResetTokenPurgeSchedulerIntegrationTest.java:88-116` (pointeur, détail en annexe) [#2476578c8ac84af6-1].
- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:88-113` (pointeur, détail en annexe) [#5dd507c53997f001-1] [#5dd507c53997f001-2] [#4370cecfbb806173-1] [#70fee24738ff43ee-1].

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:80-85` (pointeur, détail en annexe) [#e9b8732b8a56d766-1].
- Selon la javadoc de `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/AsyncConfig.java:29-33`, le rejet se fait par CallerRunsPolicy à saturation, mais le code du bean passwordResetExecutor (cœur 2, max 4, file de 100) ne définit aucun gestionnaire de rejet, contrairement à exportExecutor . Se fier au code ⇒ ajouter explicitement le gestionnaire voulu ou corriger la javadoc [#8dc64bf06c402044-1] [#dc6e00eaeabd737d-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 14 ; cités par au moins un fait : 10 ; non cités définitifs : 0.
- Faits en base : 49 ; dans le pool après déduplication : 49 (dont 0 repris d'autres packs) ; cités dans ce pack : 34 ; en annexe : 34 ; ni cités ni en annexe : 1 ; écartés (sorte `other`) : 3.
- Fichiers dont au moins un fait est cité ici : 10 sur 14.
- Passe transversale : scope 14 fichiers, lus 14 (100 %), non lus 0 : ce pack décrit le motif sur un échantillon, pas sur tout son scope.
- Base : sha256 067c23bf121e…, générée le 2026-11-17.
