---
pack: export
kind: domain
name: Export de données
generated_at: 2026-11-25T15:00:00
generator: synth/1
base_sha256: 5d1d00ef5dbefbbddbe61c55e95d9d19f3c724e245993c60a95f5cfa39990fba
facts_in_base: 222
facts_in_pool: 257
facts_cited: 49
sections: export.sections.json
details: [export.details.md]
lang: fr
curated_at: 2026-11-25T15:00:00
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
| ownerId / user_id | Le propriétaire d'un ExportJob porte deux noms selon la couche, ownerId dans le modèle de domaine et user_id dans l'entité, où il reste un UUID simple non nul sans association ManyToOne. | [#b99866367a7951cd-1] [#997ec849433df630-1] |

## 3. Règles {#rules}

### Cycle de vie d'un job
- Le worker abandonne sans rien modifier si le job est introuvable, sinon il le passe à RUNNING. [#5686ec4dee42298d-3] [#batch/92871d4006ddb92f-1]
- Après stockage réussi, le job passe à COMPLETED avec une expiration à 24 heures. [#5686ec4dee42298d-2] [#batch/92871d4006ddb92f-2]
- Les trois transitions du job ne vérifient pas l'état source. [#79d4aa70838aab63-1] [#99122a29b71383fb-1] [#64e186046ab03d57-1]
- Un job est téléchargeable si COMPLETED, avec référence et expiration, et strictement avant l'expiration, sinon le téléchargement donne un 404. [#916a992fa5c873bb-1] [#78b030e5b637f431-2]
### Purge et téléchargement
- La purge est planifiée toutes les 3600000 ms par défaut, avec un délai initial de 300000 ms. [#batch/975432c3f0e38e69-1]
- Un token doit porter le type export-download et se vérifie avec l'horloge injectée, tout échec donne un Optional vide. [#1a5dc55516cc4fdf-1] [#f823965740137381-1] [#authorization/ca82dcefc6247794-2]
- L'URL de téléchargement vaut null sauf si le job est COMPLETED avec une expiration. [#a01408ee42f6a4d7-1]
### Stockage et rendu
- La référence stockée est un UUID plus une extension de 1 à 5 caractères a-z0-9, et toute référence contenant un séparateur de chemin ou '..' est rejetée à la lecture et à la suppression [#773091294adeea81-1] [#1d69cc7d64ef1ede-1] [#790e58e7428b8de3-1]
### Vérifié dans le code
- Seule ExportJob.markCompleted renseigne expiresAt, donc ExportJobRepository.findExpired (expiresAt non nul et inférieur à now) ne remonte jamais un job PENDING ou RUNNING [#99122a29b71383fb-1] [#backend-core/66742a1c0e93eafc-1] `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java:52-57`.

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AsyncExportRunner.run | Le worker reprend le job par son identifiant, l'abandonne si introuvable, puis le fait passer à l'état RUNNING via markRunning avant sauvegarde. (partiel) | L61-68 | [#batch/92871d4006ddb92f-1] |
| AsyncExportRunner.run | Passe le job de PENDING à RUNNING via markRunning, si le job est trouvé par son id, pour le worker asynchrone. (partiel) | L62-68 | [#5686ec4dee42298d-3] |
| AsyncExportRunner.run | Après assemblage, rendu et stockage réussis, le job passe à COMPLETED via markCompleted avec la référence de stockage et une expiration à now plus 24 heures. (partiel) | L75-79 | [#batch/92871d4006ddb92f-2] |
| AsyncExportRunner.run | Toute RuntimeException de la génération passe le job en FAILED avec le code fixe GENERATION_ERROR, sans message ni stack. (partiel) | L80-84 | [#batch/92871d4006ddb92f-3] |
#### backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportJob.markRunning | markRunning pose le statut RUNNING sans vérifier l'état source. (partiel) | L48-50 | [#79d4aa70838aab63-1] |
| ExportJob.markCompleted | markCompleted pose le statut COMPLETED et renseigne storageRef, completedAt et expiresAt, sans vérifier l'état source. | L52-57 | [#99122a29b71383fb-1] |
| ExportJob.markFailed | markFailed pose le statut FAILED et renseigne le code d'erreur, sans vérifier l'état source. (partiel) | L59-62 | [#64e186046ab03d57-1] |
#### backend:src/test/java/com/matimeline/eventmanager/domain/models/export/ExportJobTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportJob.markCompleted | markCompleted fait passer le job au statut COMPLETED en recevant storageRef, completedAt et expiresAt fournis. (partiel) | L25-27 | [#542eb1c1541ea9af-1] |

## 5. Endpoints et écrans {#surface}

- Les quatre endpoints d'export sont dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:65-129`, et chacun répond 401 quand aucun utilisateur n'est résolu [#c86feeadc072b9fe-1] [#319b045aa097c00f-1].
- GET /api/export avec le paramètre format rend l'export inline du caller sans rien persister, alors que POST /api/export crée un job asynchrone et répond 202 avec le jobId et l'URL de téléchargement éventuelle [#319b045aa097c00f-1] [#071643b5944b880b-1].
- Le service expose deux voies distinctes selon le format, exportInline pour les formats synchrones et submitAsync pour les asynchrones, qui sauvegarde un job PENDING puis déclenche le runner asynchrone `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:65-87` [#23f4df0fb15daa38-1] [#3eab0f691637f6a9-1].
- GET /api/export/job/{jobId} renvoie 404 aussi bien pour un job inconnu que pour un job d'un autre utilisateur, car la recherche est scopée au propriétaire (pas de 403) [#d815bdbebdce9373-1] [#542c65ac19d97770-1] [integrations/477aa0cd75160647-1].
- GET /api/export/download/{jobId} exige le paramètre token, et le job et le propriétaire du token doivent correspondre au job demandé et au caller, sinon 404 [#b496e1abe39faec9-1] [#integrations/1953bae609178bc1-1].
- Le token de téléchargement est un JWT HS256 de type export-download, portant le jobId en sujet et l'ownerId en claim uid, signé dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:94-103` [#41542a3ee2b2eb0f-1].
- verify renvoie un Optional vide au lieu de lever une exception si la signature, le type ou l'expiration sont invalides, ce qui se traduit par un 404 côté téléchargement [#ac160ab52e306a11-2] [#integrations/1953bae609178bc1-1].
- Un secret de signature invalide fait échouer le démarrage de l'application (IllegalStateException au @PostConstruct, sans la valeur du secret dans le message) `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:65-83` [#14dc8c12f2d89795-1].
- download renvoie un Optional vide pour un job qui n'est pas téléchargeable ou qui n'appartient pas au propriétaire, sans distinguer les deux cas `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java:96-111` [#78b030e5b637f431-1].
- Les jobs expirés sont purgés par un planificateur, qui supprime le fichier puis la ligne et journalise le nombre purgé, en lisant l'expiration avec la date de l'horloge injectée `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:61-84` [#bb8b6ba05aa82340-1] [#bb8b6ba05aa82340-2].
- Une erreur d'écriture du stockage local lève une UncheckedIOException au message générique, sans détail pour l'appelant `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:51-55` [#3e9853bbead0161a-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 35), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java` | 19 | business_rule 5, convention 3, service_method 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java` | 18 | endpoint 7, role_check 5, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 13 | convention 7, state_transition 4, business_rule 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java` | 19 | other 5, convention 4, business_rule 3 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java` | 15 | convention 3, business_rule 2, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java` | 12 | business_rule 5, other 3, suspicious 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 10 | convention 4, validation 3, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java` | 10 | convention 4, state_transition 3, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java` | 10 | convention 5, business_rule 2, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/AvatarServiceImplTest.java` | 17 | test_case 13, suspicious 2, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java` | 8 | business_rule 2, convention 2, batch_job 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| integrations | 22 | 16 |  |
| backend-core | 21 | 14 |  |
| batch | 10 | 5 |  |
| authorization | 4 | 5 |  |

## 8. Tests attendus {#tests}

- Les tests fixent que purgeExpired supprime le fichier et la ligne d'un job COMPLETED expiré, laisse intact un job non expiré, et ne lève pas d'exception quand le fichier est déjà absent [#b1133c4f22973caa-1] [#db8c6b4bd7c1bc1e-1] [#09fc7d2e43ffd52d-1].
- Les tests fixent que getAvatar lève AvatarNotFoundException sans référence d'avatar ou quand le fichier référencé est introuvable [#8142833c9904614b-1] [#4da7d9df67898b83-1].

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- La purge `backend:src/main/java/com/matimeline/eventmanager/application/services/ExportPurgeScheduler.java:61-75` est une seule transaction qui capture chaque RuntimeException par job, sans sous-transaction, donc les jobs partagent le même sort transactionnel. Ne supposez pas qu'un échec est isolé par job, et ajoutez une transaction par job si l'isolation est voulue. [#450d17525574aab3-3]
- Le Markdown insère le nom de catégorie saisi par l'utilisateur sans échappement, contrairement au CSV qui neutralise les formules. Un nom contenant des caractères spéciaux modifie le rendu, donc échappez-le avant d'ajouter d'autres champs libres. [#integrations/75dbb39e88e401fb-1]
- La neutralisation CSV s'applique à toutes les valeurs, y compris les nombres négatifs convertis en texte comme durationValue, qui reçoivent une apostrophe en tête. Un consommateur qui relit le CSV obtient du texte au lieu d'un nombre, donc traitez les champs numériques à part si le format doit rester numérique. [#83fd00ed9710ea05-1]
- hashCode de ExportJobEntity renvoie la même valeur pour toutes les instances, alors que equals compare l'id. Les collections à base de hash dégénèrent, donc évitez d'y stocker beaucoup d'entités. [#752a3fa184eda39d-1]
- Les tests d'avatar disent plus que ce qu'ils vérifient : l'un annonce un 400 sans contrôler de code HTTP, l'autre annonce une suppression après le save sans contrôler l'ordre. Ne les prenez pas pour une garantie, et ajoutez ces assertions si vous touchez à ces comportements. [#b282546a26cdd2d8-1] [#466e0069e2a28f6c-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 35 ; avec au moins un fait en base : 35 ; sans fait après remise en file : 0.
- Faits en base : 222, repris d'autres packs : +97, hors périmètre : -0, doublons écartés à la déduplication : -62, soit 257 dans le pool.
- Faits du pool venus d'un autre pack : 57 (par pack : section Relations).
- Destination des 257 faits du pool : Lexique 7 ; Règles 52 ; Endpoints et écrans 39 ; Tests attendus 26 ; Alertes / Questions ouvertes 20 ; annexe seule 77 ; écartés (sorte `other` ou inconnue) 36.
- Base : sha256 5d1d00ef5dbe…, générée le 2026-11-24.
