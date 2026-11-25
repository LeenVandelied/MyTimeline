---
pack: integrations
kind: transversal
name: Intégrations et services externes
generated_at: 2026-11-24T17:40:00
generator: synth/1
base_sha256: 70a6a11875397223da9a551b75c79325cb06706e2ed2efecf7f2d44bd1541400
facts_in_base: 427
facts_in_pool: 223
facts_cited: 35
sections: integrations.sections.json
details: [integrations.details.md]
lang: fr
curated_at: 2026-11-25T15:00:00
curation: integrations.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : integration, intégration, storage, stockage, brevo, renderer, apiclient
- Chemins : `^backend:src/.*/(ZipExportRenderer|MarkdownExportRenderer|JsonExportRenderer|CsvExportRenderer|LocalStorageAdapter|BrevoEmailService|BrevoHealthIndicator)[^/]*\.java$`, `^frontend:.*/apiClient[^/]*$`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Client HTTP du frontend
- Une réponse 401 hors routes auth inline pose le verrou isRedirecting, affiche le toast de session expirée, puis redirige après 1 500 ms vers la connexion de la locale. [#ebe8f14e30148918-3]
- Cinq routes auth échappent au traitement global des erreurs, la correspondance se fait par égalité ou suffixe du pathname et non par sous-chaîne. [#17e17e177c3c1115-1] [#371afdf6b26a2509-1]
- Le token est rafraîchi toutes les 6 heures côté navigateur, erreurs ignorées. [#9bce6d27ef674db6-1]
### Stockage local
- Le nom de fichier stocké est un UUID plus une extension de 1 à 5 caractères a-z ou 0-9, jamais le nom du client. [#a3b8181473ac234b-1] [#eb4a963db93f2f39-1]
- Une référence vide, avec séparateur de chemin ou deux points, ou sortant du répertoire de base, lève IllegalArgumentException, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:86-97`. [#68cad5d7a30c3ac4-1] [#68cad5d7a30c3ac4-2]
### Export de données
- Tout champ CSV commençant par =, +, -, @, tabulation ou retour reçoit une apostrophe en préfixe avant l'échappement des guillemets. [#0bcf5a6ce1ee7408-1] [#1323a64f4a7c32e4-1]
### Email Brevo
- Sans clé API, l'envoi du mail de réinitialisation journalise un avertissement et ne fait aucun appel HTTP. [#25504d1bcaa2eac3-1]
- Le nom et le lien sont échappés en HTML dans htmlContent seulement, to.name reçoit le nom brut. [#d01536aff913607e-1] [#11d4aa8f36e6fb68-1]

## 4. Structure {#structure}

#### frontend:services/apiClient.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| apiClient.interceptors.response | Une réponse 401 hors routes auth inline pose le verrou isRedirecting, affiche le toast de session expirée, puis redirige après 1 500 ms vers la page de connexion de la locale courante. (partiel) | L223-232 | [#ebe8f14e30148918-3] |
#### backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| E2eResetTokenEndpointIntegrationTest.ENDPOINT | Le test cible la route de test-support /api/test-support/password-reset-token, appelée en GET avec un paramètre email. | L47 | [#8e6a9b9608499d60-1] |

## 5. Mise en œuvre par domaine {#surface}

### Réinitialisation de mot de passe (support des tests E2E)
- La route de test-support `/api/test-support/password-reset-token` s'appelle en GET avec un paramètre email, selon le test d'intégration `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java:47` [#8e6a9b9608499d60-1]
- Le jeton est retrouvé par un adapter JPA en lecture seule, qui ne fait aucune écriture, dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:37-38` [#12e77eb7b9e6d0c0-1]
- La requête ne renvoie que la colonne du jeton, filtre sur l'utilisateur, un jeton non utilisé et non expiré, puis prend le plus récent par date d'expiration puis identifiant, dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:54-58` [#12e77eb7b9e6d0c0-2]

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 52), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `frontend:services/apiClient.ts` | 17 | convention 14, batch_job 1, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 9 | convention 4, validation 3, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java` | 8 | external_call 5, convention 2, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java` | 9 | convention 3, test_case 3, endpoint 2 |
| `frontend:services/productService.ts` | 5 | convention 3, suspicious 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventConditionalCheckConstraintIntegrationTest.java` | 6 | convention 2, validation 2, persistence_query 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductRestoreIntegrationTest.java` | 5 | convention 3, persistence_query 1, role_check 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java` | 10 | test_case 5, convention 3, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java` | 4 | persistence_query 2, convention 1, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductPathOwnershipIntegrationTest.java` | 5 | convention 3, role_check 1, test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventOptimisticLockConflictIntegrationTest.java` | 8 | test_case 4, other 2, convention 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| event | 38 | 20 | oui |
| frontend-core | 43 | 0 |  |
| export | 24 | 16 | oui |
| user | 29 | 11 | oui |
| backend-core | 38 | 0 |  |
| product | 20 | 13 | oui |
| category | 13 | 10 | oui |
| session | 14 | 9 | oui |
| frontend-app | 4 | 0 |  |

- Faits du pool par pack d'origine : frontend-core 43, backend-core 38, event 38, user 29, export 24, product 20, session 14, category 13, frontend-app 4

## 8. Tests attendus {#tests}

- Les tests fixent que le JWKS est servi sans authentification avec une seule clé RS256, des champs publics seuls et Cache-Control max-age=300. [#55d8b6063ef603d7-1] [#55d8b6063ef603d7-2] [#1a4b52a04a5ce838-1]
- Les tests fixent que le modulus RSA publié fait 256 octets sans octet de signe. [#b4948134aa5100d5-1]
- Les tests fixent qu'un jeton de l'ancienne clé passe avec une session active et reçoit 401 sans elle. [#3f3601366becf82a-1] [#2d73c7817bef6558-1]
- Les tests fixent que l'email Brevo retombe en français pour une locale nulle, vide ou inconnue, échappe le nom en HTML et n'envoie rien sans clé API. [#3ed12223e1cbaea3-1] [#d1466f3125d055e6-1] [#09a37a45eae01aae-1]
- Les tests fixent que l'indicateur de santé Brevo est DOWN sans clé, cite BREVO_API_KEY et ne divulgue jamais la clé. [#8803c3c2db66a608-1] [#d0b0e4666b224c10-1]
- Un test frontend de 403 remplace l'adaptateur apiClient puis le restaure, et un témoin sans opt-out doit déclencher le toast global pour prouver l'intercepteur. [#778f32aa13a579b0-1] [#fc8e923984346ff1-4]
- Les tests d'intégration vérifient le palier et les produits par SQL natif, hors filtre d'entité. [#8ef7ed59392ccacb-1] [#f2246d8f6a77ed7d-2]

## 9. Questions ouvertes {#questions}

- getProducts doit-il valider la réponse avec Zod comme le fait getCategories ? La base montre que getProducts retourne response.data sans validation, ce qui diverge de la convention de categoryService (voir `frontend:services/productService.ts:6-16`). [#bdb861ee54c6c577-1]

## 10. Alertes {#alerts}

- Le nom de catégorie saisi par l'utilisateur est inséré tel quel dans l'export Markdown, alors que le CSV neutralise les caractères spéciaux, donc un nom contenant du Markdown altère le rendu (voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:64-65`). Consigne : échapper les caractères spéciaux avant l'insertion si on touche à ce rendu. [#75dbb39e88e401fb-1]
- restoreProduct n'accepte pas de paramètre options, contrairement aux autres mutations produit, donc un 403 ne peut pas y être déclaré comme traité inline (voir `frontend:services/productService.ts:124-131`). Consigne ⇒ ajouter le paramètre avant de dépendre d'un traitement inline du 403 sur la restauration [#145742ba350d6f89-1]
- Le mock de apiClient des tests d'erreurs inline ne fournit que post et patch, donc le transport de l'option vers delete (deleteProduct, deleteCategory) n'est testé nulle part dans ce fichier (voir `frontend:services/inlineErrorHandling.test.ts:18-23`). Consigne ⇒ ajouter delete au mock avant de modifier ce transport, un test vert ne prouve rien pour lui [#e882b29be28028b9-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 109 ; avec au moins un fait en base : 87 ; sans fait après remise en file : 0.
- Faits en base : 427, repris d'autres packs : +0, hors périmètre : -204, doublons écartés à la déduplication : -0, soit 223 dans le pool.
- Faits du pool venus d'un autre pack : 223 (par pack : section Relations).
- Destination des 223 faits du pool : Règles du motif 103 ; Mise en œuvre par domaine 7 ; Tests attendus 81 ; Alertes / Questions ouvertes 10 ; annexe seule 5 ; écartés (sorte `other` ou inconnue) 17.
- Passe transversale : scope 109 fichiers, lus 89 (81 %), non lus 20 : ce pack décrit le motif sur un échantillon, pas sur tout son scope.
- Base : sha256 70a6a1187539…, générée le 2026-11-24.
