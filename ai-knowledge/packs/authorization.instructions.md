---
pack: authorization
kind: transversal
name: Autorisation et sécurité
generated_at: 2026-11-25T17:05:00
generator: synth/1
base_sha256: 83952796cbdcf46f65dbaa52cb542a8895aa99ef5c476877c41a6e91d5194fe0
facts_in_base: 362
facts_in_pool: 241
facts_cited: 22
sections: authorization.sections.json
details: [authorization.details.md]
lang: fr
curated_at: 2026-11-25T17:05:00
curation: authorization.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : authorization, autorisation, security, sécurité, rate limit, role, jwt
- Chemins : `^backend:src/.*/(SecurityConfig|JwtFilter|JwtService|UserRateLimitingFilter|CustomUserDetailsService|ExportTokenService)[^/]*\.java$`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Invariants
- Pendant une rotation, la clé précédente ne sert qu'à vérifier, et seulement si le jeton n'a pas de kid désignant la clé courante. [#d3efb86687b6fde7-1] [#23ecabbb7b430cab-1]
### Authentification des requêtes
- JwtFilter lit le cookie jwt puis, à défaut, l'en-tête Bearer, et ne s'applique pas aux chemins /api/auth. [#fef399d03b004ac4-3] [#e18907b3ce64ed01-1]
- Dans la chaîne de filtres de sécurité, une requête non authentifiée reçoit 401 et un accès refusé 403 avec un corps JSON d'erreur, mais les contrôleurs peuvent renvoyer 401 ou 403 sans corps [#ad28b56cd87034dc-3] [#ad28b56cd87034dc-7]
### Limitation de débit
- Selon les commentaires de SecurityConfig, le limiteur par IP passe avant jwtFilter et le limiteur par utilisateur juste avant AuthorizationFilter, donc après l'authentification. [#ad28b56cd87034dc-4] [#ad28b56cd87034dc-5]
- Le limiteur par utilisateur ne compte que les routes de la table LIMITS, laisse passer les anonymes, répond 401 sans identifiant de compte et 429 avec Retry-After quand le bucket est vide. [#8c0ce53d79d11153-2] [#7ec7fee86ff9e720-1] [#7a92a5b41b351244-1] [#7a92a5b41b351244-2]
- PUT /api/me/preferences est plafonné à 30 par minute et par utilisateur, et le filtre se coupe avec app.rate-limit.enabled (true par défaut). [#1d61137988d01278-1] [#4c6f499e43b70a14-1]
### Vérifié dans le code
- Une clé RSA de moins de 2048 bits (RsaKeyMaterial.MIN_MODULUS_BITS) fait échouer le démarrage de JwtService avec une IllegalStateException [#105846cf9aaec1b8-1] `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:184-190`.

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AuthController.logout | Le logout révoque le jti du token courant en base, puis pose le cookie jwt avec maxAge à 0 et les mêmes attributs que la pose. (partiel) | L250-262 | [#3cadf6fc90bdd39e-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwtFilter.doFilterInternal | Le contexte de sécurité passe de anonyme à authentifié lorsque validateToken et isSessionActive(jti) sont vrais, sinon il reste anonyme et la requête poursuit sans authentification. (partiel) | L80-90 | [#899c7ea5383e6ca6-2] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SecurityConfig.securityFilterChain | La route /actuator/health est accessible sans authentification. | L166 | [#10ab0800c4c3ca76-1] |
| SecurityConfig.securityFilterChain | La route /error est accessible sans authentification. | L171 | [#10ab0800c4c3ca76-2] |
| SecurityConfig.securityFilterChain | L'endpoint JWKS, défini par JwksController.JWKS_PATH, est accessible sans authentification. | L177 | [#6bf025d08b434efd-1] |
| SecurityConfig.securityFilterChain | Toutes les routes sous /api/auth/** sont accessibles sans authentification. | L178 | [#98b2cdbd7d200daa-1] |

## 5. Mise en œuvre par domaine {#surface}

### Authentification et session
- Toutes les routes sous /api/auth/** sont ouvertes sans authentification, donc tout nouvel endpoint ajouté sous ce préfixe est public d'office. [#98b2cdbd7d200daa-1]
- L'endpoint JWKS, dont le chemin vient de la constante du contrôleur JWKS, est ouvert sans authentification (ligne 177 de la même classe). [#6bf025d08b434efd-1]
- Les routes /actuator/health et /error sont ouvertes sans authentification (lignes 166 et 171). [#10ab0800c4c3ca76-1] [#10ab0800c4c3ca76-2]
### Utilisateurs
- Le chargement de l'utilisateur pour l'authentification passe par le port du dépôt utilisateur, par nom d'utilisateur, dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:23-25`. [#57e7bd46761b02fc-1]

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 31), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 36 | convention 15, other 9, config 4 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 15 | convention 5, role_check 3, config 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java` | 28 | test_case 16, other 4, validation 4 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java` | 25 | test_case 14, validation 5, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 14 | role_check 4, convention 3, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 13 | convention 4, validation 3, config 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 10 | convention 5, business_rule 1, external_call 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 23 | test_case 16, config 2, convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java` | 9 | validation 4, convention 3, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java` | 12 | test_case 8, config 2, convention 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` | 8 | test_case 5, convention 2, config 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| session | 94 | 52 | oui |
| user | 84 | 47 | oui |
| backend-core | 52 | 0 |  |
| export | 9 | 5 | oui |
| event | 1 | 0 |  |

- Faits du pool par pack d'origine : session 94, user 84, backend-core 52, export 9, event 1, (aucun) 1

## 8. Tests attendus {#tests}

Aucun fait de la base ne relève de cette section.

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

Aucun fait de la base ne relève de cette section.

## 11. Couverture {#coverage}

- Fichiers du pack : 37 ; avec au moins un fait en base : 35 ; sans fait après remise en file : 0.
- Faits en base : 362, repris d'autres packs : +0, hors périmètre : -120, doublons écartés à la déduplication : -1, soit 241 dans le pool.
- Faits du pool venus d'un autre pack : 240 (par pack : section Relations).
- Destination des 241 faits du pool : Règles du motif 109 ; Mise en œuvre par domaine 5 ; Tests attendus 74 ; Alertes / Questions ouvertes 8 ; annexe seule 9 ; écartés (sorte `other` ou inconnue) 36.
- Passe transversale : scope 37 fichiers, tous lus.
- Base : sha256 83952796cbdc…, générée le 2026-11-25.
