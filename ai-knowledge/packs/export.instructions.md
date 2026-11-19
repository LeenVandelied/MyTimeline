---
pack: export
kind: domain
name: Export de données
generated_at: 2026-11-19T16:00:00Z
generator: synth/1
base_sha256: 32254321c408312d5996e79d4fb30d34184d3ff230683e6ee2fb39e1b77d4fd7
facts_in_base: 184
facts_in_pool: 222
facts_cited: 49
sections: export.sections.json
details: [export.details.md]
lang: fr
curated_at: 2026-11-19T16:38:00Z
curation: export.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : export, exportjob, zip, csv, markdown, téléchargement
- Routes : `/api/export`
- Entités : ExportJobEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| Format synchrone | Format rendu directement (JSON et Markdown), par opposition aux formats asynchrones (ZIP et CSV). | [#4bd95503fc046d97-1] |
| ExportJob | Suivi d'un export côté métier, avec propriétaire, format, statut, référence de stockage, code d'erreur et dates. | [#b99866367a7951cd-1] |
| Statut du job | L'un des quatre états du cycle de vie d'un job d'export. | [#6656955aaab09cd8-1] |
| jobId | Nom de l'identifiant du job dans la réponse HTTP, que le modèle appelle id. | [#77cf525b7fee76c0-1] [#b99866367a7951cd-1] |
| ownerId | Propriétaire du job dans le modèle, stocké dans la colonne user_id sans association ManyToOne. | [#b99866367a7951cd-1] [#997ec849433df630-1] |
| storageRef | Référence du fichier produit, présente dans le modèle et absente de la réponse HTTP. | [#b99866367a7951cd-1] [#77cf525b7fee76c0-1] |
| errorCode | Code d'échec optionnel du job (64 caractères au plus en base), non exposé dans la réponse HTTP. | [#e507314132deba19-1] [#77cf525b7fee76c0-1] |
| RenderedExport | Résultat d'un rendu en mémoire, avec contenu en octets, type MIME et nom de fichier proposé. | [#03baa01101752491-1] |

## 3. Règles {#rules}

### Invariants
- Au démarrage, le secret du jeton de téléchargement doit être du Base64 décodant à au moins 32 octets, sinon une IllegalStateException est levée sans afficher la valeur. [#authorization/8848356f2c8c0732-1] [#14dc8c12f2d89795-1]
- Une référence de stockage vide, avec séparateur ou '..', ou dont le chemin sort du répertoire de base est rejetée. [#integrations/68cad5d7a30c3ac4-1] [#790e58e7428b8de3-2]
- Une extension de fichier doit respecter a-z0-9 sur 1 à 5 caractères, sinon elle est rejetée. [#1d69cc7d64ef1ede-1]
### Soumission et génération
- L'export inline refuse un format asynchrone et la soumission asynchrone refuse un format synchrone, avec une ExportFormatNotSupportedException. [#23f4df0fb15daa38-1] [#3eab0f691637f6a9-1]
- Le job passe à COMPLETED avec une expiration à 24 heures, ou à FAILED avec le code GENERATION_ERROR si une RuntimeException survient, et seul le nom de la classe est journalisé. [#batch/92871d4006ddb92f-2] [#5686ec4dee42298d-2] [#batch/92871d4006ddb92f-3]
### Téléchargement et purge
- La purge tourne toutes les heures avec un premier passage après 5 minutes, et ignore les jobs sans expiration. [#batch/975432c3f0e38e69-1] [#0b261b34efdb01b7-1]
### Vérifié dans le code
- Les jobs d'export FAILED ne reçoivent jamais expiresAt (ExportJob.markFailed), donc ExportPurgeScheduler.purgeExpired via findExpired ne les supprime pas [#64e186046ab03d57-1] [#backend-core/10c17a2eae05786b-1] `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:59-62`.
- Le token de téléchargement expire à job.expiresAt, fixé à la complétion à now + DOWNLOAD_TTL_HOURS (24 h) [#5686ec4dee42298d-2] [#3022eecb67051870-1] [#batch/92871d4006ddb92f-2] `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java:76-77`.

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AsyncExportRunner.run | La méthode run passe le job au statut RUNNING via markRunning puis le persiste avant la génération du fichier. (partiel) | L61-68 | [#batch/92871d4006ddb92f-1] |
| AsyncExportRunner.run | Si assemble, render et store réussissent, le job passe à COMPLETED avec la référence de stockage et une expiration calculée à partir de DOWNLOAD_TTL_HOURS. (partiel) | L70-78 | [#batch/92871d4006ddb92f-2] |
| AsyncExportRunner.run | Toute RuntimeException dans la génération fait passer le job à FAILED avec le code borné GENERATION_ERROR, et seul le nom de la classe d'exception est journalisé. (partiel) | L80-85 | [#batch/92871d4006ddb92f-3] |
#### backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportJob.markRunning | markRunning passe le statut à RUNNING sans contrôle de l'état courant. (partiel) | L48-50 | [#79d4aa70838aab63-1] |
| ExportJob.markCompleted | markCompleted passe le statut à COMPLETED et renseigne storageRef, completedAt et expiresAt, sans contrôle de l'état courant. | L52-57 | [#99122a29b71383fb-1] |
| ExportJob.markFailed | markFailed passe le statut à FAILED et enregistre le code d'erreur, sans renseigner de date d'expiration ni de référence de stockage. (partiel) | L59-62 | [#64e186046ab03d57-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportJobRepositoryJpaImpl.save | Lors d'une mise à jour, save recharge l'entité gérée et recopie le statut, storageRef, errorCode, completedAt et expiresAt, sans toucher à userId, format ni createdAt. (partiel) | L47-55 | [#8f109801a30e7c20-1] |
#### backend:src/test/java/com/matimeline/eventmanager/domain/models/export/ExportJobTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportJob.markCompleted | Le job passe au statut COMPLETED via markCompleted, avec storageRef, completedAt et expiresAt fournis en paramètres. (partiel) | L25 | [#542eb1c1541ea9af-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportController | Le contrôleur est exposé sous le préfixe /api/export. | L45-47 | [#ff6b6a3fb840af3b-1] |
| ExportController.exportInline | GET /api/export renvoie le fichier inline pour le format demandé, ou 401 si aucun utilisateur n'est résolu. | L65-74 | [#319b045aa097c00f-1] |

## 5. Endpoints et écrans {#surface}

- Les points d'entrée sont le contrôleur `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:45-47`, exposé sous /api/export [#ff6b6a3fb840af3b-1].
- GET /api/export génère le fichier de façon synchrone pour le format demandé, tandis que POST /api/export crée un job asynchrone et répond 202 avec la réponse du job [#319b045aa097c00f-1] [#071643b5944b880b-1].
- Le token de téléchargement est un JWT HS256 avec un claim de type export-download, et verify rejette tout autre type, ce qui empêche d'utiliser un token d'authentification pour télécharger (voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:94-122`) [#41542a3ee2b2eb0f-1] [#1a5dc55516cc4fdf-1].
- Le job asynchrone est sauvegardé au statut PENDING pour le propriétaire avant le déclenchement du worker, sans référence de stockage ni date de fin [#f659c11a50bc696a-1] [#4f9f821f123b0ae9-1].
- Le fichier téléchargé est relu depuis le stockage et nommé mytimeline-export avec l'extension du format [#0560779bcdf672c9-1].
- Une panne d'écriture du stockage local lève une UncheckedIOException au message générique stockage indisponible, et un échec d'écriture du ZIP lève une UncheckedIOException zip export rendering failed [#integrations/b7c7165d3a6fcdda-1] [#integrations/956bcf8c3be783c0-1].
- La purge sélectionne les jobs dont expiresAt est renseigné et antérieur à l'instant courant, les jobs sans expiration ne sont donc jamais purgés [#23f40870088204f8-1] [#bb8b6ba05aa82340-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 31), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java` | 18 | endpoint 8, role_check 5, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 13 | validation 4, business_rule 3, convention 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java` | 21 | other 7, convention 5, validation 4 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java` | 14 | other 6, business_rule 5, suspicious 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 10 | business_rule 3, state_transition 3, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java` | 12 | convention 5, other 4, business_rule 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java` | 10 | service_method 3, other 2, validation 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java` | 8 | business_rule 3, convention 2, batch_job 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java` | 7 | state_transition 3, business_rule 1, convention 1 |
| `backend:src/main/resources/db/migration/V13__export_jobs.sql` | 8 | db_change 5, convention 2, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java` | 14 | test_case 5, other 4, config 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| integrations | 29 | 10 |  |
| batch | 11 | 7 |  |
| authorization | 8 | 3 |  |
| backend-core | 2 | 5 |  |

## 8. Tests attendus {#tests}

- Les tests fixent qu'un job COMPLETED expiré voit son fichier supprimé via exportStorage et sa ligne export_jobs purgée, et qu'un job non expiré garde les deux [#b1133c4f22973caa-1] [#db8c6b4bd7c1bc1e-1] (voir `backend:src/test/java/com/matimeline/eventmanager/application/services/ExportPurgeSchedulerIntegrationTest.java:94-118`).
- Les tests fixent que la purge est idempotente, car un job expiré dont le fichier est déjà absent ne lève aucune exception et sa ligne est tout de même purgée [#09fc7d2e43ffd52d-1] [#batch/3e2957bcbbbe0496-1].
- Les tests fixent que markCompleted passe le statut à COMPLETED et garde storageRef, completedAt et expiresAt tels que fournis, sans les dériver du TTL [#253bd8cf626b7473-1] (voir `backend:src/test/java/com/matimeline/eventmanager/domain/models/export/ExportJobTest.java:18-31`).
- Les tests fixent que StorageConfig câble deux beans distincts, avatarStorage et exportStorage, et que l'export est écrit sous export-path [#eb9cd80429fb3f30-1].
- Les tests fixent que le contexte échoue au démarrage quand app.storage.export-path est absent [#9d07ba752a943c26-1] (voir `backend:src/test/java/com/matimeline/eventmanager/infrastructure/config/StorageConfigTest.java:59-66`).

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- Le rendu CSV fait passer chaque champ par escape, y compris les nombres convertis en texte, donc une valeur négative comme durationValue reçoit aussi l'apostrophe en préfixe, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:74`. Un export relu par un outil numérique contient du texte au lieu d'un nombre, donc ne supposez pas que les colonnes numériques restent numériques et exemptez-les d'escape si vous les corrigez [#8d302dbc450961e7-1].
- Le rendu Markdown insère les titres d'événements, les noms et les descriptions de catégories saisis par l'utilisateur sans échappement, contrairement au CSV qui neutralise les formules, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:99`. Un texte contenant des caractères de mise en forme casse ou détourne le document produit, donc échappez ces valeurs avant d'ajouter un nouveau champ texte [#95a518ab54976556-1] [#integrations/75dbb39e88e401fb-1].

## 11. Couverture {#coverage}

- Fichiers du pack : 31 ; avec au moins un fait en base : 31 ; sans fait après remise en file : 0.
- Faits en base : 184, repris d'autres packs : +75, hors périmètre : -0, doublons écartés à la déduplication : -37, soit 222 dans le pool.
- Faits du pool venus d'un autre pack : 50 (par pack : section Relations).
- Destination des 222 faits du pool : Lexique 12 ; Règles 47 ; Endpoints et écrans 24 ; Tests attendus 10 ; Alertes / Questions ouvertes 8 ; annexe seule 65 ; écartés (sorte `other` ou inconnue) 56.
- Base : sha256 32254321c408…, générée le 2026-11-19.
