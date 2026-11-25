---
pack: authorization
kind: transversal
name: Autorisation et sécurité
generated_at: 2026-11-20T11:40:00Z
generator: synth/1
base_sha256: 12e1e57c60d15b6fb93a1ebb100fab3abfe317dae735876d79ee45a2dc4c0906
facts_in_base: 286
facts_in_pool: 181
facts_cited: 34
sections: authorization.sections.json
details: [authorization.details.md]
lang: fr
curated_at: 2026-11-20T12:45:00Z
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
- Selon la javadoc, seule la clé privée RSA est configurée et la clé publique en est dérivée. Un modulus sous 2048 bits ou sans paramètres CRT est refusé au chargement. [#9f60a5905f689a63-1] [#105846cf9aaec1b8-1] [#48e6f6949702d043-1]
- parseClaims refuse un jeton dont alg n'est pas RS256 et un jeton vide. [#591cd24092b70532-2] [#006c110809de4e75-1]
- Les tokens d'export utilisent le secret dédié app.export.token-secret, validé au démarrage sans divulguer sa valeur. [#cfd450177e31b9df-1] [#8848356f2c8c0732-1]
- verify refuse un token d'export dont typ diffère, et toute erreur renvoie un résultat vide. [#ca82dcefc6247794-1] [#ca82dcefc6247794-2]
### Authentification par cookie
- Le contexte n'est renseigné que si signature, expiration et jti non révoqué sont valides, sinon la requête continue en anonyme. [#7592b341eaabca2a-1] [#20661afcf565be41-1]
- JwtFilter ignore /api/auth, et /api/auth/me lit le cookie sans SecurityContext. [#e18907b3ce64ed01-1] [#36aa78900fe7b738-1]
- Le cookie dure deux jours, et pose et suppression partagent les mêmes attributs. [#44a12a49a4222fe7-1] [#03a820aa895fbd68-1] [#3cadf6fc90bdd39e-1]
### Limitation de débit par utilisateur
- Seules les routes de la table LIMITS sont comptées, PUT /api/me/preferences plafonné à 30 par minute. [#8c0ce53d79d11153-2] [#1d61137988d01278-1]

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwtFilter.doFilterInternal | Le contexte de sécurité passe de anonyme à authentifié lorsque validateToken et isSessionActive(jti) sont vrais, sinon il reste anonyme et la requête poursuit sans authentification. (partiel) | L80-90 | [#899c7ea5383e6ca6-2] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SecurityConfig.securityFilterChain | Le endpoint /actuator/health est accessible sans authentification. | L161 | [#10ab0800c4c3ca76-1] |
| SecurityConfig.securityFilterChain | Le endpoint JWKS (JwksController.JWKS_PATH) est public, et la javadoc de la règle précise qu'il ne contient que le modulus et l'exposant public. | L172 | [#6bf025d08b434efd-1] |
| SecurityConfig.securityFilterChain | Les routes /api/auth/** sont accessibles sans authentification. | L173 | [#98b2cdbd7d200daa-1] |

## 5. Mise en œuvre par domaine {#surface}

### Configuration de la chaîne de filtres
- Toute nouvelle route sous /api/auth/** est publique d'office, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:173` [#98b2cdbd7d200daa-1].
- Le JWKS public est ouvert à tous, `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:172`, et selon la règle ne doit exposer que le modulus et l'exposant public [#6bf025d08b434efd-1].
### Chargement de l'utilisateur
- L'identité est chargée par nom d'utilisateur via le port UserRepository, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:23-25` [#57e7bd46761b02fc-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 28), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 27 | other 9, config 5, role_check 5 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 12 | convention 5, validation 4, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 14 | role_check 4, convention 3, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 13 | convention 5, config 3, validation 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 10 | convention 5, business_rule 1, external_call 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java` | 9 | validation 4, convention 3, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java` | 13 | test_case 9, validation 2, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java` | 12 | test_case 8, config 2, convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java` | 4 | validation 3, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 18 | test_case 15, other 2, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` | 8 | test_case 5, convention 2, config 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| user | 77 | 33 | oui |
| session | 55 | 30 | oui |
| backend-core | 39 | 0 |  |
| export | 9 | 5 | oui |
| event | 1 | 0 |  |

- Faits du pool par pack d'origine : user 77, session 55, backend-core 39, export 9, event 1

## 8. Tests attendus {#tests}

- Les tests fixent l'isolation dans les deux sens entre jetons d'authentification et jetons de download. [#5822862f5a0bc9b4-1] [#fb56934486522018-1]
- Les tests fixent que le plafond de requêtes est par utilisateur et non par IP, et que le 429 porte un Retry-After arrondi au supérieur, sans en-tête X-RateLimit-*. [#7766521a36087fc7-1] [#a6ccf2b05e781477-1] [#4eedfeba9390561d-1]
- Un test de filtre de plafond fige l'horloge pour vérifier le Retry-After, et un principal étranger ou sans identifiant sur une route plafonnée reçoit 401. [#a6ccf2b05e781477-1] [#525f7db1c48296a2-1] [#bbe0cb4c74f874f7-1]
- Les tests fixent que logout, /api/me et le suivi des jobs d'export restent hors du rate limit sur 30 requêtes. [#5c6d5fea73721965-1] [#cba057cd17a08d89-1] [#fb57d9c20f4b8757-1]

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- Le test du cookie en profil dev monte MockMvc en standaloneSetup, donc la chaîne de filtres de SecurityConfig n'est pas appliquée et il ne prouve rien sur l'autorisation. Ne t'appuie pas sur lui pour valider un changement de règle d'accès, utilise un test d'intégration complet. `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerDevProfileCookieTest.java:134` [#519761a96abfc2f1-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 35 ; avec au moins un fait en base : 33 ; sans fait après remise en file : 0.
- Faits en base : 286, repris d'autres packs : +0, hors périmètre : -105, doublons écartés à la déduplication : -0, soit 181 dans le pool.
- Faits du pool venus d'un autre pack : 181 (par pack : section Relations).
- Destination des 181 faits du pool : Règles du motif 86 ; Mise en œuvre par domaine 4 ; Tests attendus 51 ; Alertes / Questions ouvertes 4 ; annexe seule 8 ; écartés (sorte `other` ou inconnue) 28.
- Passe transversale : scope 35 fichiers, tous lus.
- Base : sha256 12e1e57c60d1…, générée le 2026-11-20.
