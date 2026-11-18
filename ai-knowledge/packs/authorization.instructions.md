---
pack: authorization
kind: transversal
name: Autorisation et limitation de débit
generated_at: 2026-11-18T12:00:00Z
generator: synth/1
base_sha256: 79fe7ac550198fd61b4de8153c546f47e114f1257e38cadcecaa22a52a34d6cb
facts_in_base: 271
facts_in_pool: 270
facts_cited: 42
sections: authorization.sections.json
details: [authorization.details.md]
lang: fr
curated_at: 2026-11-18T14:30:00Z
curation: authorization.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Chemins : `(Security|Jwt|RateLimit|RateLimiting|CustomUserDetails|ExportToken|CallerResolver|AuthController)`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Invariants
- Les jetons d'authentification émis par JwtService sont signés en RS256 et parseClaims refuse tout autre algorithme, la clé publique étant dérivée de la clé privée PKCS#8 sans configuration séparée [#b4abadd3d950429f-1] [#b35aa50b9a94d73f-1]
- Une clé RSA de moins de 2048 bits lève une GeneralSecurityException au chargement. [#ad94765637b5f497-1]
- Un jeton blanc lève MalformedJwtException, et selon la javadoc du test AuthController et JwtFilter ne capturent que JwtException. [#c9ffe973525260e3-1] [#a98e0ccf08a5ccb4-1]
### Jeton et session
- Un jeton vit deux jours. [#43cd43636bd862bb-1]
- JwtFilter lit le cookie jwt puis, à défaut, l'en-tête Bearer, et ignore les chemins /api/auth. [#f6e75e0a5e5133b6-1] [#46ef396b46b51aa9-1]
- Le contexte n'est renseigné que si le jeton est valide et son jti non révoqué, sinon il reste anonyme et la requête continue. [#197122bdd1e5948a-1] [#197122bdd1e5948a-2]
- /me et le refresh répondent 401 si la validation échoue ou si le jti n'est plus actif. [#1f64459ad84ee7af-1] [#1f64459ad84ee7af-2] [#71768ef1221dd0c4-1] [#71768ef1221dd0c4-2]
- Le login ne distingue pas username inconnu et mot de passe faux, l'inscription fixe ROLE_USER et la session stocke une IP anonymisée. [#edc7dcbdf92af882-1] [#451be34991dcd0e9-1] [#bbcbbc470a2c01f0-1]
### Limitation de débit par IP
- Selon la javadoc, seules les paires méthode et chemin exact de DEFAULT_LIMITS sont limitées, avant JwtFilter, donc par IP. [#948cf8b91f5231d8-1] [#948cf8b91f5231d8-2]
- Le bucket est indexé par IP, méthode et chemin décodé, et un bucket vide donne un 429 too_many_requests. [#ef1ceb9ef6e0e2d9-1] [#ef1ceb9ef6e0e2d9-2] [#c110fb621d545244-1]
- Selon la javadoc des tests, les plafonds par minute et par IP sont register 5, login 10, reset-password 5, et 30, 30, 15 sous le profil e2e. [#3fef0a6f36c9a7dd-1] [#efbe8c05f28f64e5-1]
- POST /api/auth/reset-password ajoute un plafond par token de 5 par minute, non configurable. [#4984030ad4075ec2-1] [#6c4a9b97036ab115-1]
- Au-delà de la taille maximale de corps, le contrôle par token est sauté, et une lecture bornée dépassée donne un 400. [#fea6a7ed68a4df50-1] [#fea6a7ed68a4df50-2]
### Limitation de débit par utilisateur
- PUT /api/me/preferences est plafonné à 30 par minute et par utilisateur, avec un bucket par utilisateur et route. [#485955adb2298a8b-1] [#0833c211a9b3191d-2]
### Vérifié dans le code
- RateLimitingFilter.buckets (ConcurrentHashMap clé IP|méthode chemin) n'a aucune éviction. Revoir si l'espace des clés grandit, par exemple avec trust-forwarded-header activé [#ef1ceb9ef6e0e2d9-2] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:431-432`.

## 4. Structure {#structure}

#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AuthController.logout | Le logout révoque le jti du token courant via sessionService.revokeCurrentSession, puis efface le cookie jwt. (partiel) | L250-260 | [#ed68a63fc2b66b67-1] |
| AuthController.refreshToken | Le refresh génère un nouveau token à partir de token, révoque le jti de l'ancien token avec revokeSessionSilently, puis enregistre le jti du nouveau token avec registerSession. | L319-324 | [#10efe7ec9942ce01-1] |
| AuthController.forgotPassword | La route forgot-password renvoie toujours un 200 avec le même message, après appel de passwordResetService.requestReset, quel que soit le résultat de la recherche. | L354-360 | [#ebe5ee4325e1c2af-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| RateLimitingFilter.doFilterInternal | Lorsque le bucket n'a plus de jeton, la requête est interrompue et writeTooManyRequests renvoie un statut 429 avec le corps too_many_requests. (partiel) | L434-437 | [#c110fb621d545244-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SecurityConfig.securityFilterChain | Le chemin /actuator/health est accessible sans authentification. | L159 | [#8bc3a1ce71fe4ba9-1] |
| SecurityConfig.securityFilterChain | Les chemins /error et JwksController.JWKS_PATH sont accessibles sans authentification, la javadoc de la section JWKS indiquant que la clé publique n'est pas un secret. | L164-170 | [#8bc3a1ce71fe4ba9-2] |
| SecurityConfig.securityFilterChain | Le préfixe /api/auth/** est accessible sans authentification. | L171 | [#8bc3a1ce71fe4ba9-3] |

## 5. Mise en œuvre par domaine {#surface}

### Réinitialisation du mot de passe
- La route forgot-password répond 200 avec le même message quel que soit le résultat de la recherche du compte, tant que la requête est valide et que la limite de 5 requêtes par minute et par IP n'est pas dépassée [#ebe5ee4325e1c2af-1].
### Accès public de la chaîne de sécurité
- Le préfixe /api/auth/** est ouvert sans authentification, donc toute nouvelle route placée sous ce préfixe est publique par défaut (`mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:171`) [#8bc3a1ce71fe4ba9-3].
- Le chemin /actuator/health est ouvert sans authentification dans la même chaîne (`mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:159`) [#8bc3a1ce71fe4ba9-1].
- Les chemins /error et celui des clés publiques JWKS sont aussi ouverts, la javadoc de la section JWKS précisant que la clé publique n'est pas un secret (`mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:164-170`) [#8bc3a1ce71fe4ba9-2].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (10 sur 30), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 23 | convention 6, validation 6, other 5 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java` | 26 | convention 10, other 7, config 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 12 | convention 5, config 2, validation 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 14 | config 4, convention 4, endpoint 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java` | 14 | test_case 8, config 2, convention 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` | 21 | test_case 17, config 3, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitTunableCeilingTest.java` | 12 | test_case 5, validation 3, other 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 19 | test_case 15, convention 3, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java` | 12 | test_case 5, config 2, other 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java` | 8 | convention 3, config 2, test_case 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| timeline | 155 | 55 | oui |

- Faits du pool par pack d'origine : timeline 155, authorization 115

## 8. Tests attendus {#tests}

- Le quota se libère après 61 secondes d'un TimeMeter contrôlable. [#2d913739f7a4d843-1]
- Le plafond sur PUT /api/me/preferences est par utilisateur, et l'anonyme passe pour recevoir un 401. [#e6e137afcb49a159-1] [#aab32edaff52b556-1]
- Les tokens d'export et d'authentification s'excluent mutuellement. [#59e0bbca86f288c7-1] [#eab3e61c44fe8201-1]

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- Le endpoint /me lit le token uniquement depuis le cookie jwt, alors que CallerResolver accepte aussi un header Authorization Bearer selon sa javadoc, donc un client qui n'envoie que le Bearer n'est pas reconnu sur /me. Avant de toucher à l'un des deux chemins, aligner les sources de token ou documenter l'écart, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:145-153` [#6fe0d789832e1431-1].

## 11. Couverture {#coverage}

- Fichiers du pack : 37 ; avec au moins un fait en base : 30 ; sans fait après remise en file : 0.
- Faits en base : 271, repris d'autres packs : +0, hors périmètre : -0, doublons écartés à la déduplication : -1, soit 270 dans le pool.
- Faits du pool venus d'un autre pack : 155 (par pack : section Relations).
- Destination des 270 faits du pool : Règles du motif 123 ; Mise en œuvre par domaine 4 ; Tests attendus 92 ; Alertes / Questions ouvertes 8 ; annexe seule 2 ; écartés (sorte `other` ou inconnue) 41.
- Passe transversale : scope 37 fichiers, tous lus.
- Base : sha256 79fe7ac55019…, générée le 2026-11-17.
