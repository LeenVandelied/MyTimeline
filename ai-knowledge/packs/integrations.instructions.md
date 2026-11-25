---
pack: integrations
kind: transversal
name: Intégrations et services externes
generated_at: 2026-11-20T11:40:00Z
generator: synth/1
base_sha256: 822c2fc41a4cac8f8153823bb72fa9ff6f39fb4cb106f53e8fc08716e20aa55a
facts_in_base: 350
facts_in_pool: 186
facts_cited: 42
sections: integrations.sections.json
details: [integrations.details.md]
lang: fr
curated_at: 2026-11-20T12:45:00Z
curation: integrations.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : integration, intégration, storage, stockage, brevo, renderer, apiclient
- Chemins : `^backend:src/.*/(ZipExportRenderer|MarkdownExportRenderer|JsonExportRenderer|CsvExportRenderer|LocalStorageAdapter|BrevoEmailService|BrevoHealthIndicator)[^/]*\.java$`, `^frontend:.*/apiClient[^/]*$`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Email Brevo
- Le nom et le lien sont échappés en HTML dans htmlContent, mais to.name reçoit le nom brut. [#d01536aff913607e-1] [#11d4aa8f36e6fb68-1]
### Export de données
- Le CSV neutralise toute valeur commençant par =, +, -, @, tabulation ou retour par une apostrophe, puis met entre guillemets les champs à virgule, guillemet ou saut de ligne. [#0bcf5a6ce1ee7408-1] [#1323a64f4a7c32e4-1]
- Le ZIP réutilise les rendus JSON, Markdown et CSV, et les noms de fichiers commencent par mytimeline-export- sans identifiant utilisateur. [#19b3fc4ec346a739-1] [#0fde468ee74ce390-1]
### Client HTTP du frontend
- Un seul intercepteur de réponse gère réseau, 401 et toasts 400, 403, 500, voir `frontend:services/apiClient.ts:180-285`. [#ebe8f14e30148918-1]
- Un 401 hors des cinq routes auth inline affiche la session expirée puis redirige après 1 500 ms. La correspondance se fait par égalité ou suffixe du pathname. [#ebe8f14e30148918-3] [#17e17e177c3c1115-1] [#371afdf6b26a2509-1]
- Le toast 400 saute /me/change-password, et les toasts 403 et 500 sautent les statuts déclarés dans inlineHandledStatuses. [#0ef3c42e524af8fe-1] [#ebe8f14e30148918-4] [#ebe8f14e30148918-7] [#327d68bab6520eaf-1]
- Le timeout par défaut est de 15 000 ms, mais un corps FormData passe à 0 et perd son Content-Type. [#99da2bca3c86383d-1] [#708cf9ff39788961-1]
- Le token est rafraîchi toutes les 6 heures côté navigateur, erreurs ignorées. [#9bce6d27ef674db6-1]

## 4. Structure {#structure}

#### frontend:services/apiClient.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| apiClient.interceptors.response | Une réponse 401 hors routes auth inline pose le verrou isRedirecting, affiche le toast de session expirée, puis redirige après 1 500 ms vers la page de connexion de la locale courante. (partiel) | L223-232 | [#ebe8f14e30148918-3] |
#### backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| E2eResetTokenEndpointIntegrationTest.ENDPOINT | Le test cible la route de test-support /api/test-support/password-reset-token, appelée en GET avec un paramètre email. | L47 | [#8e6a9b9608499d60-1] |
#### backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwksEndpointIntegrationTest.jwks_isReachableAnonymously_andExposesOneRs256SigningKey | Le test appelle GET /.well-known/jwks.json sans cookie ni Bearer et attend un 200 JSON avec Cache-Control max-age=300 et une seule clé RSA de signature RS256. | L68-81 | [#f3b5f265303d01f1-1] |

## 5. Mise en œuvre par domaine {#surface}

### Authentification et jeton de réinitialisation
- La route de test-support `/api/test-support/password-reset-token` s'appelle en GET avec un paramètre email, selon `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java:47` [#8e6a9b9608499d60-1]
- Le finder lit en lecture seule et ne projette que la colonne token. Il ne retient que les jetons de l'utilisateur non utilisés et non expirés, le plus tardif en expiration d'abord, puis le plus grand id [#12e77eb7b9e6d0c0-1] [#12e77eb7b9e6d0c0-2]
### Clés publiques JWT
- L'endpoint JWKS est joignable sans cookie ni Bearer, répond en JSON avec un cache de 300 secondes et n'expose qu'une clé RSA de signature RS256, vérifié par `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java:68-81` [#f3b5f265303d01f1-1]
### Produits et catégories
- Le test de restauration lit la colonne archived de la table products après la requête HTTP, voir `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductRestoreIntegrationTest.java:112-117` [#92f4076df0c73295-1]
### Événements

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 43), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `frontend:services/apiClient.ts` | 17 | convention 14, batch_job 1, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 9 | convention 4, validation 3, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java` | 8 | external_call 5, convention 2, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java` | 9 | convention 3, test_case 3, endpoint 2 |
| `frontend:services/productService.ts` | 5 | convention 3, suspicious 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventConditionalCheckConstraintIntegrationTest.java` | 6 | convention 2, validation 2, persistence_query 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java` | 8 | test_case 4, convention 1, endpoint 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductRestoreIntegrationTest.java` | 5 | convention 3, persistence_query 1, role_check 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/CategoryDeleteReassignIntegrationTest.java` | 10 | test_case 5, convention 3, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java` | 4 | persistence_query 2, convention 1, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/ProductArchivedFilterIntegrationTest.java` | 6 | convention 3, other 1, persistence_query 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| frontend-core | 43 | 0 |  |
| backend-core | 38 | 0 |  |
| export | 24 | 13 | oui |
| product | 17 | 12 | oui |
| user | 21 | 7 | oui |
| event | 18 | 5 | oui |
| category | 13 | 7 | oui |
| session | 8 | 5 | oui |
| frontend-app | 4 | 0 |  |

- Faits du pool par pack d'origine : frontend-core 43, backend-core 38, export 24, user 21, event 18, product 17, category 13, session 8, frontend-app 4

## 8. Tests attendus {#tests}

- Les tests fixent que le JWKS n'expose que kty, use, alg, kid, n et e, que le modulus fait 256 octets sans octet de signe, et qu'un jeton RS256 émis par le backend se vérifie avec cette clé. [#1a4b52a04a5ce838-1] [#b4948134aa5100d5-1] [#1122fa951f33f39c-1]
- Le health Brevo est DOWN sans clé, cite BREVO_API_KEY et ne divulgue jamais la clé. [#dc542e72e594e1dd-1] [#8803c3c2db66a608-1] [#d0b0e4666b224c10-1]
- Les tests fixent que l'export JSON omet le hash du mot de passe et que le CSV préfixe d'une apostrophe les champs commençant par @, = ou - ou un saut de ligne. [#ee835f4d91e2a8c5-1] [#37c0d7455e6beb36-1] [#3c6450bbae77f0ab-1]
- Les tests fixent que forgot-password renvoie 200 pour un email inconnu et que reset-password renvoie 400 pour token inconnu, non UUID ou mot de passe trop court. [#20c09aee2ec1f179-1] [#230eadc9415bea9f-1] [#d72c7a45f2930324-1] [#ed6ce70fde4bb79a-1]
- Les tests front remplacent l'adaptateur d'apiClient par un 403 et vérifient que l'intercepteur journalise sans toast, avec un témoin sans opt-out qui produit un toast. [#778f32aa13a579b0-1] [#1faea9b005c2fedd-1] [#1faea9b005c2fedd-2]

## 9. Questions ouvertes {#questions}

- Le 404 (et non 403) pour la restauration d'un produit archivé d'un autre utilisateur est-il bien appliqué par le code de production ? Selon la javadoc du test, c'est voulu par anti-énumération, mais aucun fait de code ne le confirme dans ce lot, voir `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductRestoreIntegrationTest.java:208-225` [#be58d90301a09953-1].

## 10. Alertes {#alerts}

- getProducts renvoie response.data sans validation Zod, alors que getCategories valide sa réponse, donc une réponse mal formée du backend passe sans erreur côté produit. Ajouter un schéma Zod comme dans categoryService, voir `frontend:services/productService.ts:6-16` [#bdb861ee54c6c577-1].
- restoreProduct n'accepte pas de paramètre options, contrairement aux autres mutations produit, donc un 403 ne peut pas y être déclaré comme traité inline. Ajouter le paramètre avant de gérer cette erreur dans l'interface, voir `frontend:services/productService.ts:124-131` [#145742ba350d6f89-1].
- Le mock de apiClient dans le test d'erreurs inline ne fournit que post et patch, donc le passage de l'option vers delete (deleteProduct, deleteCategory) n'est testé nulle part. Compléter le mock avant de modifier ce transport, voir `frontend:services/inlineErrorHandling.test.ts:18-23` [#e882b29be28028b9-1].

## 11. Couverture {#coverage}

- Fichiers du pack : 97 ; avec au moins un fait en base : 71 ; sans fait après remise en file : 0.
- Faits en base : 350, repris d'autres packs : +0, hors périmètre : -164, doublons écartés à la déduplication : -0, soit 186 dans le pool.
- Faits du pool venus d'un autre pack : 186 (par pack : section Relations).
- Destination des 186 faits du pool : Règles du motif 96 ; Mise en œuvre par domaine 8 ; Tests attendus 55 ; Alertes / Questions ouvertes 8 ; annexe seule 4 ; écartés (sorte `other` ou inconnue) 15.
- Passe transversale : scope 97 fichiers, lus 73 (75 %), non lus 24 : ce pack décrit le motif sur un échantillon, pas sur tout son scope.
- Base : sha256 822c2fc41a4c…, générée le 2026-11-20.
