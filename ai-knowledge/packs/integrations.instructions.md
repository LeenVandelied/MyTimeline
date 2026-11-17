---
pack: integrations
kind: transversal
name: Intégrations externes et export
generated_at: 2026-11-17T10:36:11Z
generator: synth/1
base_sha256: 58dd0a873cad30eaaadf481787cc688ad5fb8a5bd07d619705a99235b34df65c
facts_in_base: 384
facts_in_pool: 382
facts_cited: 76
sections: integrations.sections.json
details: [integrations.details.md]
lang: fr
curated_at: 2026-11-17T10:45:42Z
curation: integrations.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `(Brevo|ExportRenderer|ZipExport|PasswordResetEmailTemplate|EmailService|StorageConfig|LocalStorage)`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Export de données
- Le statut d'un job est limité à son propriétaire et un job inconnu ou d'un autre utilisateur donne 404, car la requête filtre déjà sur id et propriétaire. [#56e43ee98ca9934b-1] [#c05b820dcd88abfc-1]
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java:144-147` (pointeur, détail en annexe) [#425236d1c4331a0f-1] [#01b5d011c58851d6-1].
- Le token est ajouté à l'URL sans encodage explicite. [#1917a78ae13ac238-1]
- Le CSV préfixe d'une apostrophe les valeurs qui commencent par =, +, -, @, tabulation ou saut de ligne, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/CsvExportRenderer.java:118-126`. [#64f39489a8c24fb5-1] [#8b52ae90d30c1625-1]
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportFilenames.java:16` (pointeur, détail en annexe) [#ad7a976572cedf7b-1] [#e5671440e45049bd-1] [#35a51e5f0043333c-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ExportJobRepositoryJpaImpl.java:47-57` (pointeur, détail en annexe) [#77e7ea3349966710-2].
### Stockage de fichiers
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:43-57` (pointeur, détail en annexe) [#1a1fec74340ec77e-1] [#6f4983af9414aa47-1].
- Toute référence vide, avec séparateur, avec deux points ou hors du répertoire de base est rejetée, et la suppression est idempotente. [#381d4591926b8291-1] [#381d4591926b8291-2] [#2657ab0430e16622-1]
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java:51-55` (pointeur, détail en annexe) [#54e96a576c000c98-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/config/StorageConfig.java:44-45` (pointeur, détail en annexe) [#3a8615964c21dcf2-1].
### Email Brevo
- Sans clé API, aucun appel n'est fait et l'envoi est un no-op avec un warning. [#60b20fc9921c8347-1]
- Une RestClientException est journalisée avec le seul nom de classe et n'est pas propagée, donc un échec d'envoi ne remonte pas au contrôleur. [#60b20fc9921c8347-3] [#b9b9446d1558c287-1]
- Le nom et le lien sont échappés en HTML avant le template, qui attend des valeurs déjà échappées. [#1c9019c73cd45014-1] [#4629fb93ffcd3c8e-1]
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/PasswordResetEmailTemplate.java:85-96` (pointeur, détail en annexe) [#424bd631166a816d-1] [#7b3034446febe012-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoHealthIndicator.java:25-27` (pointeur, détail en annexe) [#0f6cc63a210dd110-1].
### JWKS et support e2e
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:39-40` (pointeur, détail en annexe) [#a365be61224e5c6d-1] [#ccdcce622dfccc22-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:44-46` (pointeur, détail en annexe) [#4c61ca6e2f106b0b-1] [#36811d6a17cb74fa-2].

## 4. Structure {#structure}

#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportController.submitAsync | Le POST /api/export soumet un job asynchrone via exportService.submitAsync et répond 202 ACCEPTED avec un ExportJobResponse. (partiel) | L77-88 | [#2b18bf12bda7aa89-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SessionRepositoryJpaImpl.revokeByJti | La révocation par jti met revokedAt à l'instant courant, uniquement pour les sessions dont revokedAt est encore nul, par un UPDATE JPQL idempotent. (partiel) | L88-97 | [#20d82e6d0c58db82-1] |
| SessionRepositoryJpaImpl.revokeById | La révocation par id met revokedAt à l'instant courant, uniquement pour une session encore active, par un UPDATE JPQL. (partiel) | L99-108 | [#495912b73d8f6736-1] |
#### mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwksEndpointIntegrationTest.jwks_isReachableAnonymously_andExposesOneRs256SigningKey | Le test asserte qu'un GET anonyme sur le chemin JWKS répond 200 en JSON, avec une seule clé RSA de signature RS256. | L68-70 | [#b1cbd278e4a1e919-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| E2eResetTokenController.latestUsableResetToken | Lorsqu'aucun token n'est exploitable, la réponse est un 404 sans corps. | L79 | [#e2dcd55a97c66d7b-2] |

## 5. Mise en œuvre par domaine {#surface}

- Les points d'entrée testés ou de support se lisent dans `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java:68-70` et `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:79` [#b1cbd278e4a1e919-1] [#e2dcd55a97c66d7b-2].
### Authentification et accès anonymes
- Le chemin JWKS répond 200 en JSON à un GET anonyme et n'expose qu'une seule clé RSA de signature RS256 [#b1cbd278e4a1e919-1].
- La route de test-support du jeton de réinitialisation est appelée sans cookie JWT ni authentification, et renvoie un 404 sans corps quand aucun token n'est exploitable [#e061a6e6b7610f20-1] [#e2dcd55a97c66d7b-2].
### Purge RGPD et nettoyage
- La purge des catégories d'un utilisateur est un SQL natif filtré sur owner_id, ce qui exclut les catégories système, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:121-127` [#eef195bd2f48601c-1].
- La purge des événements d'un utilisateur passe par les produits qu'il possède (product_id IN), pas par un lien direct, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java:109` [#164a5ad44b0abdcb-1].
- La purge des tokens de réinitialisation supprime ceux déjà utilisés ou expirés avant un seuil, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java:93-97` [#757e913cb9162988-1].
### Requêtes dont le résultat surprend
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java:157-162` (pointeur, détail en annexe) [#f0bd0687e6c8a6e3-1].
- Voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:71-85` (pointeur, détail en annexe) [#b68389625852c1f7-1].
- La recherche d'une catégorie par propriétaire et nom est bornée à un résultat, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java:57-68` [#fbacb4352f182c9b-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (9 sur 64), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportEndpointsIntegrationTest.java` | 19 | test_case 8, config 3, convention 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java` | 12 | external_call 5, convention 4, config 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java` | 10 | convention 4, role_check 2, business_rule 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/LocalStorageAdapter.java` | 9 | convention 4, validation 3, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java` | 15 | test_case 6, external_call 4, convention 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java` | 12 | test_case 5, convention 3, validation 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/CategoryRepositoryJpaImpl.java` | 8 | convention 4, persistence_query 2, role_check 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java` | 7 | convention 4, suspicious 2, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java` | 12 | test_case 6, convention 5, suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 0 | 154 | oui |

- Faits du pool par pack d'origine : timeline 327, integrations 22, backend-socle 17, frontend-socle 11, authorization 5

## 8. Tests attendus {#tests}

- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java:57-67` (pointeur, détail en annexe) [#2ee6e70558a01924-1] [#f0a09a282602d057-1].
- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportEndpointsIntegrationTest.java:203-211` (pointeur, détail en annexe) [#577a8cb676fa0e03-1] [#577a8cb676fa0e03-2] [#88e738ef954efa54-1] [#08dcf40750e3e764-1].
- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/export/ExportRenderersTest.java:144-163` (pointeur, détail en annexe) [#271360493da3f939-1] [#271360493da3f939-2] [#4b329fceed9b26ff-1].
- Les tests Brevo fixent le repli en français pour une locale inconnue, l'échappement du nom, l'absence d'exception et l'absence d'appel HTTP sans clé API [#3de9961cfcdacd70-1] [#72cded3f8ca31e3c-1] [#fd66bd245160df70-1] [#52720a500310ccdf-1].
- Les tests fixent que l'indicateur de santé Brevo est DOWN sans clé et ne expose jamais la valeur de la clé [#e671c9d0e878ab41-2] [#e671c9d0e878ab41-4].
- Les tests fixent que le JWKS n'expose que des champs publics et que le modulus fait 256 octets sans octet de signe [#84e78eb149834ed3-1] [#a6e459a10869f945-1].
- Voir `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportPackageGuardTest.java:85-88` (pointeur, détail en annexe) [#249fc45dc37b4ad5-2] [#c22623aac178b189-1] [#b7b57705de195f43-1].
- Les tests fixent que load et delete du stockage local rejettent une référence de traversée par IllegalArgumentException [#6370768e2f4f6dde-1] [#e4b07cd063572333-1].
- Un test d'intégration étend AbstractPostgresIntegrationTest [#420e1dbb8817ab88-1], et le test d'envoi asynchrone bloque l'envoi d'email pour prouver que la requête rend la main [#925eda645ab40484-1].

## 9. Questions ouvertes {#questions}

- La recherche de catégorie par nom seul, non scopée par propriétaire, est-elle encore appelée ? Le commentaire la dit legacy et conservée pour compatibilité, sans autre fait qui la confirme [#cd46c425426a7197-1].
- Un exceptJti nul dans la révocation de sessions est-il voulu ? Selon le commentaire, il révoque alors toutes les sessions actives, y compris la courante, et aucun fait de code complet ne le confirme [#43a257f98e513c20-1].
- GET /api/auth/me vérifie-t-il bien lui-même la révocation du jti ? Le commentaire du test dit que /api/auth/** échappe au JwtFilter, sans fait de code correspondant [#a2a411a91d5b73c4-1].

## 10. Alertes {#alerts}

- Le endpoint de test qui renvoie un token de réinitialisation à partir d'un email est sans authentification dès que le profil e2e est actif, et son fichier ne porte aucune garde supplémentaire [#239ba25d7e70eb6d-1]. Activer e2e hors des tests exposerait la prise de contrôle de comptes, donc n'activez jamais ce profil en production et gardez ce controller dans le package testsupport, dont `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportPackageGuardTest.java:124-149` vérifie qu'aucun mapping de production hors package ne prend le préfixe /api/test-support [#5f7caf7aac4284e9-1].
- Selon la javadoc de ce garde-fou, un controller hors du package mais mappé sous le préfixe réservé hériterait d'un accès anonyme sans condition de profil [#8ee6d95b9ae64c74-1]. Ne mappez jamais un endpoint métier sous le préfixe /api/test-support.
- Sans clé BREVO_API_KEY, l'envoi de l'email de réinitialisation est ignoré avec un simple log WARN, sans signal externe [#1e979c5fd365d269-1]. L'utilisateur ne reçoit rien et l'appelant ne le sait pas, donc ne comptez pas sur une erreur et vérifiez BrevoHealthIndicator en profil prod.
- Selon la javadoc du test JWKS, un 401 signale une whitelist de SecurityConfig cassée, alors que le test asserte un GET anonyme en 200 avec une seule clé RS256 . Si ce test échoue en 401 ⇒ corrigez la whitelist et ne modifiez pas l'assertion [#4c7add49c7251530-1] [#b1cbd278e4a1e919-1]
- Deux tests de contrainte en base acceptent n'importe quelle exception, sans vérifier qu'il s'agit d'une violation de contrainte [#24915c20890dd350-1] [#f74a7ee5d23ad2ee-1]. Ils restent verts pour une autre cause, donc ne les prenez pas comme preuve de la contrainte et resserrez le type attendu si vous touchez au schéma.

## 11. Couverture {#coverage}

- Fichiers du pack : 85 ; cités par au moins un fait : 64 ; non cités définitifs : 0.
- Faits en base : 384 ; dans le pool après déduplication : 382 (dont 0 repris d'autres packs) ; cités dans ce pack : 76 ; en annexe : 234 ; ni cités ni en annexe : 89 ; écartés (sorte `other`) : 29.
- Fichiers dont au moins un fait est cité ici : 30 sur 85.
- Passe transversale : scope 85 fichiers, lus 72 (85 %), non lus 13 : ce pack décrit le motif sur un échantillon, pas sur tout son scope.
- Base : sha256 58dd0a873cad…, générée le 2026-11-17.
