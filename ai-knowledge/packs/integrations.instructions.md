---
pack: integrations
kind: transversal
name: Intégrations et services externes
generated_at: 2026-11-19T16:00:00Z
generator: synth/1
base_sha256: a64f6c05a7ac93cdec814fefc1b51ab8c6b34d6feeac3fd66b060880ee5f337a
facts_in_base: 228
facts_in_pool: 130
facts_cited: 24
sections: integrations.sections.json
details: [integrations.details.md]
lang: fr
curated_at: 2026-11-19T16:38:00Z
curation: integrations.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : integration, intégration, storage, stockage, brevo, renderer, apiclient
- Chemins : `^backend:src/.*/(ZipExportRenderer|MarkdownExportRenderer|JsonExportRenderer|CsvExportRenderer|LocalStorageAdapter|BrevoEmailService|BrevoHealthIndicator)[^/]*\.java$`, `^frontend:.*/apiClient[^/]*$`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Client HTTP frontend
- Un 401 sur une requête hors endpoints auth gérés inline (login, register, forgot-password, reset-password, /auth/me) affiche un toast de session expirée puis redirige vers le login après 1 500 ms, avec un verrou contre les redirections multiples [#ebe8f14e30148918-3].
- Le timeout par défaut est 15 000 ms, mais il passe à 0 pour un envoi FormData [#99da2bca3c86383d-1] [#708cf9ff39788961-1].
### E-mail Brevo
- Sans clé brevo.api.key (vide par défaut), l'envoi est ignoré sans appel HTTP et un warning est journalisé [#25504d1bcaa2eac3-1] [#34158f5b5cd49dab-2].
- Une RestClientException est journalisée puis non propagée au contrôleur, donc l'échec d'envoi reste invisible de l'appelant [#825c5740d504fe2d-2].
### Stockage de fichiers
- Une référence vide, avec séparateur ou '..', ou hors du répertoire de base est refusée [#68cad5d7a30c3ac4-1].
### Exports
- Le CSV neutralise les valeurs débutant par = + - @ avant l'échappement RFC 4180 [#0bcf5a6ce1ee7408-1] [#1323a64f4a7c32e4-1].
### Vérifié dans le code
- Un 401 sur /auth/login (et register, forgot-password, reset-password, /auth/me) est relayé tel quel par l'intercepteur apiClient et doit être rendu inline par l'écran appelant [#frontend-core/2da5f9f87ce62f1b-1] `frontend:services/apiClient.ts:213-216`.

## 4. Structure {#structure}

#### backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| E2eResetTokenEndpointIntegrationTest.ENDPOINT | Le test cible la route de test-support /api/test-support/password-reset-token, appelée en GET avec un paramètre email. | L47 | [#8e6a9b9608499d60-1] |

## 5. Mise en œuvre par domaine {#surface}

### Réinitialisation de mot de passe en test E2E
- Le test d'intégration cible la route de support de test, appelée en GET avec un paramètre email, pour récupérer le jeton de réinitialisation, voir `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java:47` [#8e6a9b9608499d60-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 31), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `frontend:services/apiClient.ts` | 14 | convention 12, config 1, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 10 | convention 6, validation 2, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java` | 9 | convention 3, external_call 3, config 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenEndpointIntegrationTest.java` | 9 | convention 3, test_case 3, endpoint 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapterTest.java` | 7 | test_case 3, validation 3, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ZipExportRenderer.java` | 5 | convention 4, external_call 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java` | 8 | test_case 5, external_call 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java` | 5 | convention 5 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailServiceLocaleTest.java` | 7 | test_case 3, business_rule 1, config 1 |
| `frontend:services/productService.ts` | 5 | convention 5 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/UserRoleConstraintIntegrationTest.java` | 5 | convention 2, test_case 2, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventDeleteStatisticsIntegrationTest.java` | 7 | test_case 3, convention 2, config 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| export | 29 | 13 | oui |
| user | 19 | 14 | oui |
| backend-core | 27 | 0 |  |
| frontend-core | 19 | 0 |  |
| product | 12 | 7 | oui |
| session | 8 | 2 | oui |
| category | 5 | 4 | oui |
| event | 8 | 1 | oui |
| frontend-app | 3 | 0 |  |

- Faits du pool par pack d'origine : export 29, backend-core 27, frontend-core 19, user 19, product 12, event 8, session 8, category 5, frontend-app 3

## 8. Tests attendus {#tests}

- Les tests de l'endpoint e2e de token fixent 200 sans authentification avec le token le plus récent, 400 sans paramètre email, et selon la javadoc 404 sans corps pour un compte inconnu [#0e34c06d58c55f15-1] [#11148e37efef51d0-1] [#ae9881f8d08a67e6-1].
- Les tests du client front fixent que FormData reste une instance de FormData avec un timeout à 0, et qu'un appel JSON garde un timeout supérieur à 0 [#55f5e5ec1f18de4b-1] [#55f5e5ec1f18de4b-2] [#55f5e5ec1f18de4b-3].
- Un test d'intégration avec Postgres combine SpringBootTest, AutoConfigureMockMvc et Transactional et hérite d'AbstractPostgresIntegrationTest, comme `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductRestoreIntegrationTest.java:51-54` [#fc1214a23e5bc828-2].
- Le test du service Brevo construit le service avec un RestClient.Builder interceptable, et selon le commentaire le nom saisi reste échappé dans le HTML en toute locale [#68f36af5363d4ef1-1] [#d1466f3125d055e6-1].

## 9. Questions ouvertes {#questions}

- Un 403 ne déconnecte-t-il vraiment pas et ne prend-il pas le verrou isRedirecting ? Seul le commentaire de la branche l'affirme [#ebe8f14e30148918-4], aucun fait de code ne le confirme.

## 10. Alertes {#alerts}

- Si la clé Brevo est absente ou vide, l'email de réinitialisation n'est pas envoyé, sans appel HTTP et avec un simple warning [#25504d1bcaa2eac3-1]. Selon le commentaire du test, forgot-password doit répondre 200 dans tous les cas [#d1ec0fa0c1cb7fa1-1], donc l'utilisateur ne voit aucune erreur. Vérifier la clé et les logs en cas de mail non reçu, et ne pas transformer ce cas en exception sans revoir cette réponse 200 : `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java:79-84`.
- Le rendu Markdown de l'export insère noms et descriptions saisis par l'utilisateur sans échappement, alors que le rendu CSV neutralise les formules [#75dbb39e88e401fb-1]. Un nom contenant du Markdown déforme ou détourne le document exporté. Échapper ces champs avant d'ajouter un rendu : `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/MarkdownExportRenderer.java:58-66`.
- Les tests de rejet de rôle invalide n'attendent que la classe Exception générique . Ils passent quelle que soit l'erreur, donc ils ne prouvent pas que la contrainte CHECK est en cause ⇒ Préciser le type d'exception ou la contrainte en modifiant ces tests : `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/UserRoleConstraintIntegrationTest.java:68-73` [#ea446db909e94ef5-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 97 ; avec au moins un fait en base : 46 ; sans fait après remise en file : 0.
- Faits en base : 228, repris d'autres packs : +0, hors périmètre : -96, doublons écartés à la déduplication : -2, soit 130 dans le pool.
- Faits du pool venus d'un autre pack : 130 (par pack : section Relations).
- Destination des 130 faits du pool : Règles du motif 78 ; Mise en œuvre par domaine 1 ; Tests attendus 30 ; Alertes / Questions ouvertes 8 ; annexe seule 3 ; écartés (sorte `other` ou inconnue) 10.
- Passe transversale : scope 97 fichiers, lus 69 (71 %), non lus 28 : ce pack décrit le motif sur un échantillon, pas sur tout son scope.
- Base : sha256 a64f6c05a7ac…, générée le 2026-11-19.
