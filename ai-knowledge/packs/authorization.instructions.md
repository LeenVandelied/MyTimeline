---
pack: authorization
kind: transversal
name: Autorisation et limitation de débit
generated_at: 2026-11-18T16:18:53Z
generator: synth/1
base_sha256: a0b1a27029cf3cac174115766fd52f9e0995c050d19c9a1ad5c449ad576e601e
facts_in_base: 304
facts_in_pool: 303
facts_cited: 54
sections: authorization.sections.json
details: [authorization.details.md]
lang: fr
curated_at: 2026-11-18T16:25:37Z
curation: authorization.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `(Security|Jwt|RateLimit|RateLimiting|CustomUserDetails|ExportToken|CallerResolver|AuthController)`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Invariants
- Les jetons d'authentification sont signés en RS256 et tout en-tête annonçant un autre algorithme est refusé par UnsupportedJwtException. [#c9ffe973525260e3-2] [#7daa5bfd6bbe5c58-2]
- Au démarrage, une clé jwt.private-key vide génère une paire RSA éphémère. Une clé invalide ou de modulus inférieur à 2048 bits fait échouer le boot. [#77f20da63fc7487d-1] [#6360ce8288ddaeff-1] [#ad94765637b5f497-1]
- Le secret app.export.token-secret doit être du Base64 d'au moins 32 octets, sinon le démarrage échoue. [#74e368afa0b30e7b-1]
### Session et jeton
- Chaque requête avec jeton vérifie signature, expiration et jti actif, sinon elle reste anonyme. [#f6e75e0a5e5133b6-3] [#a96762a98f4f12bc-1]
- Le refresh renvoie 401 si le jti est révoqué, sinon il révoque l'ancien jti puis enregistre le nouveau. [#71768ef1221dd0c4-2] [#10efe7ec9942ce01-1]
- Le cookie jwt dure deux jours, comme la session enregistrée, avec HttpOnly et SameSite Lax. [#0b2c93fb218c098f-1] [#bbcbbc470a2c01f0-2] [#0b02e0ffe1c36b2e-1]
- L'inscription attribue en dur ROLE_USER et le logout révoque le jti du cookie avant d'effacer celui-ci. [#451be34991dcd0e9-1] [#ed68a63fc2b66b67-1]
### Limitation de débit
- Le chemin est normalisé avant recherche et chaque compartiment est propre à l'IP, à la méthode et au chemin. [#ef1ceb9ef6e0e2d9-1] [#ef1ceb9ef6e0e2d9-2]
- Seul POST /api/auth/reset-password a un contrôle par token, limité à 5 tentatives par minute. [#4984030ad4075ec2-1] [#6c4a9b97036ab115-1]
- Ce contrôle est sauté si Content-Length dépasse 8 Kio ou si le token est vide ou dépasse 128 caractères. [#fea6a7ed68a4df50-1] [#3b7851a0e2375f02-1]
- Une requête anonyme n'est pas comptée, un principal sans identifiant de compte reçoit 401. [#ef91d216c638ddd0-1] [#ef91d216c638ddd0-3]
- Un 429 porte Retry-After sans en-tête X-RateLimit. [#58e6409667bf91c9-1]
### Vérifié dans le code
- Un jeton révoqué reçoit son 401 de SecurityConfig.authenticationEntryPoint, car JwtFilter laisse alors le contexte anonyme [#timeline/6ed4c57e2cbe7ed7-4] [#20c936dfaa725a62-5] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:185-187`.
- Le test de cookie dev (standaloneSetup sur AuthController) ne couvre pas la chaîne de sécurité ; l'authentification et la révocation sont exercées par SessionRevocationIntegrationTest (@SpringBootTest + @AutoConfigureMockMvc) [#timeline/93dc60b640f0fdc8-1] `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:58-59`.

## 4. Structure {#structure}

#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AuthController.logout | Le logout appelle revokeSessionSilently sur le jti du cookie, ce qui révoque la session en base, puis efface le cookie jwt avec maxAge à zéro. (partiel) | L256-260 | [#ed68a63fc2b66b67-1] |
| AuthController.refreshToken | Le refresh valide la signature et l'expiration du token avant toute réémission, et renvoie 401 si validateToken renvoie false. (partiel) | L300-303 | [#71768ef1221dd0c4-1] |
| AuthController.refreshToken | Le refresh génère un nouveau token, révoque l'ancien jti via revokeSessionSilently puis enregistre le nouveau jti via registerSession. (partiel) | L319-326 | [#10efe7ec9942ce01-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwtFilter.doFilterInternal | Le contexte de sécurité passe d'un état sans authentification à un UsernamePasswordAuthenticationToken lorsque la signature, l'expiration et le jti valides sont confirmés. (partiel) | L73-85 | [#197122bdd1e5948a-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SecurityConfig.securityFilterChain | La route /actuator/health est accessible sans authentification (permitAll). | L161 | [#8bc3a1ce71fe4ba9-1] |
| SecurityConfig.securityFilterChain | La route /error est accessible sans authentification (permitAll). | L166 | [#8bc3a1ce71fe4ba9-2] |
| SecurityConfig.securityFilterChain | Le endpoint JWKS est public (permitAll), la clé publique RS256 étant consommée avant toute authentification. | L172 | [#97bb366257dc7594-1] |

## 5. Mise en œuvre par domaine {#surface}

### Configuration de sécurité HTTP
- Le point d'entrée de la politique d'accès est `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:161-173`, qui déclare les routes ouvertes sans authentification. [#8bc3a1ce71fe4ba9-1] [#8bc3a1ce71fe4ba9-2] [#97bb366257dc7594-1] [#8bc3a1ce71fe4ba9-3]
- Toute la famille /api/auth/** est publique, donc un nouvel endpoint ajouté sous ce préfixe est accessible sans jeton, sans autre déclaration. [#8bc3a1ce71fe4ba9-3]
- Le endpoint JWKS est public parce que la clé publique RS256 doit être lue avant toute authentification. [#97bb366257dc7594-1]

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (10 sur 35), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 24 | validation 8, convention 7, config 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 21 | convention 11, endpoint 4, role_check 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java` | 15 | business_rule 4, convention 4, suspicious 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 18 | other 6, validation 5, config 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` | 33 | test_case 26, convention 6, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 13 | convention 6, other 2, external_call 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 12 | business_rule 3, other 3, config 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java` | 10 | convention 4, validation 3, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java` | 17 | test_case 12, other 2, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java` | 11 | other 5, convention 3, validation 3 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 188 | 103 | oui |

- Faits du pool par pack d'origine : timeline 188, authorization 115

## 8. Tests attendus {#tests}

- Les tests fixent que le login est plafonné à 10 par minute et par IP, que la 11e requête reçoit un 429 JSON too_many_requests, et qu'un X-Forwarded-For変 ne donne aucun quota en plus. [#d166ff51ac03a3ee-1] [#bb4775b4fb472a5b-1]
- Les tests fixent que le 429 porte un Retry-After arrondi au supérieur et décroissant, sans X-RateLimit, et exposé en CORS. [#906ca2a37eed7918-1] [#3b7844dbdf7895d7-1] [#c026bf33d0385f17-1]
- Les tests fixent que le plafond de PUT /api/me/preferences est par utilisateur et non par IP, qu'un anonyme reçoit 401 et non 429, et qu'un principal sans identifiant est refusé en 401. [#e6e137afcb49a159-2] [#eae91849f47e80fd-3] [#90d187d27a2f51aa-1]
- Les tests fixent les défauts 5, 10 et 5, les valeurs e2e 30, 30 et 15, qu'une valeur vide retombe sur le défaut et qu'une valeur non numérique fait échouer le contexte. [#a5d93c546ee998ce-1] [#e85209018fc3ba02-1] [#3c3ee02e4eae24a0-1] [#4df99d11b2cc773d-1]
- Les tests fixent que le token d'export expire à 24 h et qu'il n'est pas interchangeable avec le JWT d'authentification, dans les deux sens. [#757872f5a786c6e4-1] [#59e0bbca86f288c7-1] [#eab3e61c44fe8201-1]
- Un test de fenêtre avance un TimeMeter contrôlable de 61 secondes au lieu d'attendre. [#2d913739f7a4d843-1]

## 9. Questions ouvertes {#questions}

- Les placeholders de application-prod.properties sans valeur par défaut sont-ils un cas à couvrir ? Selon la javadoc du test, ils ne sont pas résolus dans le contexte minimal et ce cas n'est pas testé, alors que le test charge ce fichier [#5a3cbe961913151c-1] [#6508c16485bcbbda-1].

## 10. Alertes {#alerts}

- generateToken(String) n'ajoute aucun jti, alors que la surcharge generateToken(Authentication) en génère un [#7daa5bfd6bbe5c58-1] et que le filtre et le /me vérifient le jti via isSessionActive [#f6e75e0a5e5133b6-3] [#1f64459ad84ee7af-2]. Un jeton émis sans jti ne peut pas être suivi ni révoqué par session, donc utiliser la surcharge Authentication pour tout jeton destiné à passer ces contrôles, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:145-156`.
- La map des compartiments du limiteur de débit (IP et chemin) n'a aucune éviction, et la javadoc de classe l'admet [#41dd62aea9e27bf0-2]. Elle grossit avec le nombre de clés distinctes, donc ajouter une éviction avant d'élargir l'espace de clés ou de limiter de nouveaux chemins.

## 11. Couverture {#coverage}

- Fichiers du pack : 37 ; avec au moins un fait en base : 35 ; sans fait après remise en file : 0.
- Faits en base : 304, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -1, soit 303 dans le pool.
- Faits du pool venus d'un autre pack : 188 (par pack : section Relations).
- Destination des 303 faits du pool : Règles du motif 136 ; Mise en œuvre par domaine 4 ; Tests attendus 108 ; Alertes / Questions ouvertes 9 ; annexe seule 10 ; écartés (sorte `other` ou inconnue) 36.
- Passe transversale : scope 37 fichiers, tous lus.
- Base : sha256 a0b1a27029cf…, générée le 2026-11-18.
