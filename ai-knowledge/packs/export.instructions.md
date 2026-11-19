---
pack: export
kind: domain
name: Export de données
generated_at: 2026-11-19T10:32:37Z
generator: synth/1
base_sha256: 9807af7b9f0064ee479ee35d726baab4256d4affd97cd2823ee91534c0e757c1
facts_in_base: 533
facts_in_pool: 579
facts_cited: 92
sections: export.sections.json
details: [export.details.md]
lang: fr
curated_at: 2026-11-19T10:32:37Z
curation: export.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : export, exporter, zip, csv, markdown, json
- Routes : `/api/export`
- Entités : ExportJobEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| ownerId et user_id | Le même propriétaire d'un job d'export, nommé ownerId dans le modèle de domaine sans annotation de persistance et user_id dans l'entité JPA. | [#5d78bcd81aad2ffb-1] [#e5310f4744270c73-1] |
| user_id (colonne) | Simple colonne UUID non nulle de l'entité, la clé étrangère vers users n'existant que dans le DDL et pas comme association JPA. | [#7234330aa18ccba8-1] [#e5310f4744270c73-1] |
| status et format | Des chaînes de 16 caractères non nulles dans l'entité, pas des enums JPA. | [#22140398eaee939d-1] |
| phase | Étape courante du flux d'export dans l'interface, qui détermine la clé de traduction du titre affiché. | [#1b603774c55bd69c-1] |
| expiresAt | Date d'expiration d'un export, nullable dans le schéma frontend et affichée par un message riche enveloppant la date dans un élément time. | [#f577776383d9d0e5-1] [#2645ac6a99c0b30e-1] |

## 3. Règles {#rules}

### Invariants
- Au démarrage, le secret des jetons de téléchargement doit être du Base64 standard décodant à au moins 32 octets, sinon une IllegalStateException est levée. [#97c6ffbc9f90a7c7-1]
- Le jeton est refusé si son claim typ n'est pas export-download, et un jeton null ou blanc rend Optional.empty sans parsing. [#5518a4ccbe66c43e-1] [#9df4eccae353d025-1]
### Cycle d'un export asynchrone
- Un job est téléchargeable seulement s'il est COMPLETED, avec fichier et expiration renseignés, et avant expiresAt. [#81521953162492b3-1]
- Le fichier expire à l'heure de complétion plus DOWNLOAD_TTL_HOURS heures, soit environ 24 h selon le test. [#81287d1d93072e46-2] [#83b9ba463b32f52f-1]
- La purge planifiée tourne toutes les 3600000 ms par défaut (app.export.purge.interval-ms) et supprime le fichier avant la ligne du job. [#integrations/93e7f2eb215791bd-1] [#615d012cf62ba1aa-1]
- L'URL de téléchargement vaut null si le job n'est pas COMPLETED ou sans expiresAt. [#c9609cb29dcf3902-1]
- Côté interface, le polling du job s'arrête sur COMPLETED ou FAILED, sinon il repart toutes les 4000 ms. [#6017043edb1a6398-1]
### Stockage et rendu
- Une référence de stockage vide, avec séparateur ou .., ou résolue hors du répertoire de base lève une IllegalArgumentException. [#397906559a89ee45-1] [#397906559a89ee45-2]
- Le CSV préfixe d'une apostrophe toute valeur commençant par =, +, -, @, tabulation, CR ou LF, nombres négatifs compris. [#1bc565c665c6a8ab-1]
### Vérifié dans le code
- ExportJobRepositoryJpaImpl.findExpired ne renvoie que les jobs avec expiresAt non nul et antérieur à now [#integrations/58f04da5e5caa546-1] [#021ed4321a602727-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:89-93`.
- Le throttling 429 de la soumission d'export est testé dans RateLimitingAndHeadersIntegrationTest#exportSubmission_sixthWithinWindow_returns429 (5 requêtes par minute et par IP), pas dans ExportEndpointsIntegrationTest qui désactive app.rate-limit.enabled [#authorization/967569dbcbf3865f-1] `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:203-215`.

## 4. Structure {#structure}

#### mytimeline:frontend/src/hooks/useExportFlow.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useExportFlow.inlineMutation | Après un export sync réussi, le hook déclenche le téléchargement navigateur puis passe de confirm à ready. (partiel) | L68-71 | [#750efb372849270b-1] |
| useExportFlow.submitMutation | Après une soumission async réussie, le hook garde le jobId et passe de confirm à preparing. (partiel) | L81-85 | [#98c1260204c56b6c-1] |
| useExportFlow.submitMutation | Quand la soumission async échoue, le hook pose errorKey network et passe de confirm à error. (partiel) | L86-89 | [#98c1260204c56b6c-2] |
| useExportFlow.polling | Pendant preparing, quand la réponse du polling a le statut COMPLETED, le hook enregistre le job et passe à ready. (partiel) | L107-111 | [#007d85f3cc1db91e-1] |
| useExportFlow.polling | Pendant preparing, quand la réponse du polling a le statut FAILED, le hook pose errorKey jobFailed et passe à error. (partiel) | L112-114 | [#007d85f3cc1db91e-2] |
| useExportFlow.polling | Pendant preparing, une erreur du polling pose errorKey network et passe à error. (partiel) | L115-119 | [#007d85f3cc1db91e-3] |
| useExportFlow.downloadMutation | Quand le téléchargement d'un job async échoue, le hook pose errorKey network et passe de ready à error pour proposer une relance. (partiel) | L126-131 | [#73fdf21f36c45b00-1] |
| useExportFlow.reset | La fonction reset ramène la phase à confirm et vide jobId, completedJob et errorKey. (partiel) | L151-156 | [#a03c03471a26e5c7-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AsyncExportRunner.run | Le job lu par findDomainById passe à RUNNING via markRunning puis est sauvegardé avant la génération. (partiel) | L62-68 | [#integrations/4bc09dd6c60c1854-1] |
| AsyncExportRunner.run | Après assemble, render et store sans exception, le job passe à COMPLETED avec la référence de stockage et l'expiration. (partiel) | L77-78 | [#integrations/4bc09dd6c60c1854-2] |
#### mytimeline:frontend/src/components/settings/useDeleteAccountFlow.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useDeleteAccountFlow.reset | reset ramène l'étape à warn et réinitialise le champ confirmUsername à une chaîne vide. | L64-67 | [#e454c8b034384822-1] |
| useDeleteAccountFlow.goConfirm | L'étape passe de warn à confirm via goConfirm, sans condition dans le code. | L74 | [#6a8da54ffea0b7f8-1] |
| useDeleteAccountFlow.goWarn | L'étape passe de confirm à warn via goWarn, sans condition dans le code. | L75 | [#e31e2136dcb09739-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportJob.markRunning | Passe le job de PENDING à RUNNING via AsyncExportRunner.run, sans contrôle de l'état source, après lecture du job par son id. (partiel) | L48-50 | [#670b7a016efa4162-1] |
| ExportJob.markCompleted | Passe le job de RUNNING à COMPLETED et renseigne storageRef, completedAt et expiresAt, après stockage réussi du fichier. (partiel) | L52-57 | [#b21a9a2d98a21c45-1] |
| ExportJob.markFailed | Passe le job à FAILED et enregistre un code d'erreur, sans contrôle de l'état source. (partiel) | L59-62 | [#6b8a1d473273a345-1] |
#### mytimeline:frontend/src/components/settings/DeleteAccountSteps.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| DeleteAccountSteps | Depuis l'étape warn, le bouton delete-account-continue appelle goConfirm, ce qui fait passer au formulaire de confirmation par re-saisie du username. (partiel) | L44-68 | [#8d7155c843879412-1] |
| DeleteAccountSteps | Le bouton Retour du formulaire de confirmation appelle goWarn pour revenir à l'étape d'avertissement. (partiel) | L118 | [#8d7155c843879412-2] |
#### mytimeline:frontend/src/components/settings/SettingsShell.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SettingsShell.onKeyDown | Le chapitre actif passe à la cible calculée par onKeyDown, puis le focus est placé sur l'onglet cible. | L62-75 | [#e8b495eb9f25c4aa-1] |
| SettingsShell | Un clic sur un onglet met le chapitre actif à cet onglet. | L100 | [#35182be47be78d9e-1] |
#### mytimeline:frontend/src/services/networkStatus.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| networkStatusStore.reportTimeout | Le store passe à l'état timeout depuis null ou server-error via reportTimeout, et émet un changement. (partiel) | L38-43 | [#eb3ba8fe53e10a8d-1] |
| networkStatusStore.reportServerError | Le store passe à l'état server-error depuis null ou timeout via reportServerError, et émet un changement. (partiel) | L44-49 | [#5bc98e045f6604f1-1] |
| networkStatusStore.clear | Le store repasse à null via clear, uniquement si un état est posé. (partiel) | L51-56 | [#ea90a5107a1b6a71-1] |
#### mytimeline:frontend/src/components/settings/mobile/MobileSettings.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| MobileSettings | Le mode passe de l'index à un détail en appelant setActive avec le chapitre touché dans SettingsIndex. | L36-41 | [#ca602740f121cbed-1] |
| MobileSettings | Le bouton retour remet active à null, ce qui réaffiche l'index. (partiel) | L54-58 | [#ca602740f121cbed-2] |
#### mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportEndpointsIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| POST /api/export | La soumission POST /api/export avec format zip renvoie 202 Accepted. | L209-210 | [#3835bc3197cf73ff-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportController | Le contrôleur est mappé sur le préfixe de route /api/export. | L46 | [#de0bc85fd312dc8f-1] |
| ExportController.exportInline | GET /api/export avec le paramètre format renvoie le fichier inline pour un format synchrone. | L65-74 | [#9c6a60a36e277cd6-1] |
| ExportController.submitAsync | POST /api/export avec le paramètre format soumet un job asynchrone et renvoie 202 ACCEPTED avec un ExportJobResponse. | L77-88 | [#b4da90ec2a492ed4-1] |
| ExportController.jobStatus | GET /api/export/job/{jobId} renvoie le statut du job de l'appelant, avec URL de téléchargement si le job est terminé. | L91-102 | [#f1b5d7e3f47f86f4-1] |

## 5. Endpoints et écrans {#surface}

- Le contrôleur est monté sur le préfixe /api/export dans `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:46` [#de0bc85fd312dc8f-1]. Le parcours écran est dans `mytimeline:frontend/src/components/settings/ExportDataFlow.tsx:96-135` [#d8c8eda7735c3dcc-1].
- Le format choisit la voie. GET /api/export renvoie le fichier directement pour les formats synchrones (JSON ou MARKDOWN), POST /api/export crée un job PENDING pour ZIP ou CSV et répond 202 [#9c6a60a36e277cd6-1] [#b4da90ec2a492ed4-1] [#a2e995cf5ee333e1-1] [#3220477240ce1b58-1].
- Le job est persisté en PENDING avant le déclenchement de la génération, qui tourne ensuite sur l'executor exportExecutor dans sa propre transaction [#5ae974f70943fd90-1] [#baeff23ee580d812-1].
- Un job d'un autre utilisateur et un job absent donnent le même 404 sur GET /api/export/job/{jobId}, car l'appartenance est filtrée dans la requête SQL [#09f4761f4127c7d2-1] [#288f7f5d3e590ae5-1] [#f1b5d7e3f47f86f4-1].
- Le téléchargement GET /api/export/download/{jobId} exige un token. Il répond 404 si le token est invalide ou expiré, ou si son jobId ou son ownerId diffère du job demandé ou de l'appelant, et un test vérifie que B reçoit 404 sur l'URL signée de A [#8e1198c694a1e3a4-1] [#0ca6271d7be3edbf-1].
- L'export synchrone répond 401 quand aucun utilisateur courant n'est résolu [#c76aa1b25065c8c0-1].
- La purge sélectionne seulement les jobs dont expiresAt est non null et antérieur à maintenant. Les jobs PENDING ou RUNNING sans expiresAt ne sont jamais purgés [#021ed4321a602727-1] [#ec5c33b517cb4a6e-1].
- L'écran enchaîne confirm, preparing, ready. Le téléchargement asynchrone n'est proposé que si le job est terminé et que sa date d'expiration n'est pas dépassée, sinon le bloc expiré s'affiche [#d8c8eda7735c3dcc-1] [#d1710eebf051e128-1] [#a4f6d4232526f3fc-1].
- Le polling du statut n'est actif que si un jobId existe et que la phase vaut preparing [#10c111d44b1ff9db-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 75), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:frontend/src/services/apiClient.ts` | 16 | business_rule 11, config 2, suspicious 2 |
| `mytimeline:frontend/src/hooks/useExportFlow.ts` | 17 | state_transition 8, external_call 4, business_rule 3 |
| `mytimeline:frontend/src/lib/schemas/auth.ts` | 17 | validation 8, business_rule 5, convention 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportEndpointsIntegrationTest.java` | 20 | test_case 10, config 2, role_check 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java` | 11 | endpoint 5, role_check 4, business_rule 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 11 | validation 4, convention 2, external_call 2 |
| `mytimeline:frontend/src/lib/schemas/settings.ts` | 12 | validation 6, other 3, business_rule 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java` | 12 | convention 4, business_rule 3, state_transition 2 |
| `mytimeline:frontend/src/components/settings/useDeleteAccountFlow.ts` | 11 | state_transition 3, other 2, business_rule 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java` | 10 | business_rule 2, service_method 2, validation 2 |
| `mytimeline:frontend/src/services/exportService.ts` | 14 | service_method 6, convention 3, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java` | 12 | convention 4, other 4, validation 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| integrations | 49 | 28 |  |
| authorization | 9 | 9 |  |
| backend-socle | 8 | 4 |  |

## 8. Tests attendus {#tests}

- Les tests fixent qu'un token de téléchargement est accepté à 23 h et refusé à 25 h [#bc4aa8d32fe42d49-1] [#6dfed67a095b6ad1-1], et refusé si la signature est altérée, la clé différente ou les claims sub ou uid absents [#040a578cc997a78b-1] [#e4e3b8483c4932fa-1] [#a45d733d11d2cbcf-1].
- Les tests fixent l'étanchéité entre jetons : un token d'authentification est refusé par ExportTokenService et un token de download est refusé par JwtService [#6446c73cbcd77798-1] [#37360d362a1e8679-1].
- Les tests fixent le flux asynchrone zip et csv : soumission, polling jusqu'à COMPLETED avec downloadUrl, puis téléchargement au bon type MIME [#abad5aa561722721-1] [#8938ae10a08f52d9-1].
- Les tests fixent que le CSV protège les champs à virgule et préfixe d'une apostrophe un nom commençant par un saut de ligne, et que le ZIP contient data.json, data.md et data.csv [#474f401bb0362543-1] [#474f401bb0362543-2] [#e63725fc4482ae7d-1].
- Les tests fixent que themePreference apparaît dans les trois rendus, à null en JSON quand aucun choix n'est fait [#c794f089d108fbda-3] [#474f401bb0362543-3] [#77413e39b9ecd753-2].

## 9. Questions ouvertes {#questions}

- Le job de purge reste-t-il isolé par job si une exception survient ? Chaque job a son try/catch dans une seule méthode transactionnelle, et la base ne montre pas l'effet de l'exception sur la transaction partagée [#8cb218475cc93f3e-1].

## 10. Alertes {#alerts}

- Le record RenderedExport expose son tableau d'octets directement et ses equals et hashCode comparent les références, malgré la javadoc qui parle de valeur immuable [#backend-socle/aa81f9b911dcabe9-1]. Comparer deux exports ou modifier le tableau reçu donne des résultats faux, donc comparer le contenu à part et ne jamais muter le tableau.
- Le commentaire de `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:99` dit que le service ne passe que jpg, png et webp, alors que l'export passe json, md, zip et csv [#ea7fd73d5bdcae8e-1]. Le code accepte toute extension de 1 à 5 caractères a-z0-9 et lève IllegalArgumentException sinon [#034728f94739a0d6-1], donc se fier au code et corriger le commentaire.
- Selon la javadoc de classe, chaque demande d'export est journalisée, or download et getJob ne contiennent aucun appel de log [#d6ca15f932a49ab7-1]. Les téléchargements ne laissent aucune trace, donc ajouter les logs si l'audit est attendu ou corriger la javadoc.
- Le titre d'événement et le nom de produit sont insérés dans le Markdown sans échappement, alors que le CSV neutralise les formules [#4a46a37ed4d6c39c-1] [#integrations/9e65d14dde7b0ffe-1]. Un texte saisi par l'utilisateur peut casser ou injecter du balisage dans l'export, donc échapper ces champs avant d'ajouter un nouveau rendu.
- Le nom de fichier d'export ne contient que la date au jour [#1f983012c678fee1-1]. Deux exports du même jour portent le même nom, donc ne pas s'en servir comme identifiant.
- Le nom de repli de downloadAsyncExport est mytimeline-export sans extension, alors qu'exportInline ajoute celle du format [#afea5a17cb2d273d-1]. Un téléchargement sans nom fourni donne un fichier sans extension, donc aligner le repli sur exportInline.
- Le commentaire de `mytimeline:frontend/src/lib/schemas/export.ts:37-45` décrit format comme ZIP ou CSV, mais le champ accepte les quatre formats ⇒ Ne pas restreindre l'affichage à deux formats sur la foi du commentaire [#95f695b70feea45b-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 75 ; avec au moins un fait en base : 75 ; sans fait après remise en file : 0.
- Faits en base : 533, repris d'autres packs : +107, hors périmètre : -0, doublons écartés à la déduplication : -61, soit 579 dans le pool.
- Faits du pool venus d'un autre pack : 66 (par pack : section Relations).
- Destination des 579 faits du pool : Lexique 12 ; Règles 104 ; Endpoints et écrans 77 ; Tests attendus 145 ; Alertes / Questions ouvertes 24 ; annexe seule 120 ; écartés (sorte `other` ou inconnue) 97.
- Base : sha256 9807af7b9f00…, générée le 2026-11-19.
