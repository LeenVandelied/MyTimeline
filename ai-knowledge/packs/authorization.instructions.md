---
pack: authorization
kind: transversal
name: Autorisation et sécurité
generated_at: 2026-11-19T16:00:00Z
generator: synth/1
base_sha256: e5725a063e222d9594e3df240e8af61e55eb67cccd1c4cda6b8c3c3e1b3011bb
facts_in_base: 301
facts_in_pool: 177
facts_cited: 33
sections: authorization.sections.json
details: [authorization.details.md]
lang: fr
curated_at: 2026-11-19T16:38:00Z
curation: authorization.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : authorization, autorisation, security, sécurité, rate limit, role, jwt
- Chemins : `^backend:src/.*/(SecurityConfig|JwtFilter|JwtService|RateLimitingFilter|UserRateLimitingFilter|CustomUserDetailsService)[^/]*\.java$`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Invariants
- Les jetons sont signés et lus en RS256 uniquement, et parseClaims refuse tout autre algorithme ainsi que les jetons vides. [#40d48297b0756461-1] [#006c110809de4e75-1]
- Sans jwt.private-key, une paire RSA éphémère est générée. Une clé fournie mais invalide, non CRT ou de moins de 2048 bits fait échouer le démarrage. [#2acb131f0ebd7c9c-1] [#48e6f6949702d043-1] [#105846cf9aaec1b8-1]
### Limitation de débit
- Un plafond configuré inférieur à 1 fait échouer le démarrage, et les seaux sont en mémoire par instance. [#4f0198a0e07b3760-1] [#03b7dff5982812dc-1]
- UserRateLimitingFilter limite PUT /api/me/preferences à 30 requêtes par minute et par compte, avec 100 000 seaux au plus. [#1d61137988d01278-1] [#a45be4f888638a0b-1] [#c9565e3232d203cd-1]
- Un authentifié sans identifiant de compte reçoit 401 (fail-closed), un seau épuisé donne 429. [#7a92a5b41b351244-1] [#7a92a5b41b351244-2]
### Vérifié dans le code
- Un token sans jti (legacy pré-#73) est accepté : SessionServiceImpl.isSessionActive(null) renvoie true et JwtFilter l'authentifie [#session/6a0da51faf97aa4c-1] [#session/6e267b0acf8be06d-1] `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:55-61`.
- Capturer JwtException (comme JwtFilter) et non IllegalArgumentException pour un jeton null ou blanc, car JwtService.parseClaims lève MalformedJwtException [#20661afcf565be41-1] `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:92-96`.

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwtFilter.doFilterInternal | Le contexte de sécurité passe de anonyme à authentifié uniquement si le nom d'utilisateur est présent, le contexte est vide, le token est valide pour l'utilisateur chargé et le jti est actif. (partiel) | L73-85 | [#899c7ea5383e6ca6-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SecurityConfig.securityFilterChain | Le endpoint /actuator/health est accessible sans authentification. | L161 | [#10ab0800c4c3ca76-1] |
| JwksController.JWKS_PATH | Le chemin JWKS est accessible sans authentification, la javadoc du bloc précisant qu'il doit rester public pour la vérification RS256 côté middleware. | L167-172 | [#6bf025d08b434efd-1] |

## 5. Mise en œuvre par domaine {#surface}

### Vérification des jetons côté middleware
- Le chemin JWKS est ouvert sans authentification, et la javadoc du bloc précise qu'il doit rester public pour la vérification RS256 côté middleware. `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:167-172` [#6bf025d08b434efd-1]

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 27), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 16 | convention 9, config 3, validation 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 18 | convention 9, role_check 3, config 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 13 | convention 5, business_rule 2, suspicious 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java` | 20 | test_case 9, config 4, validation 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java` | 15 | other 4, config 3, convention 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 10 | config 4, role_check 2, validation 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 7 | convention 3, business_rule 1, state_transition 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java` | 9 | convention 8, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java` | 11 | test_case 8, config 2, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 12 | test_case 11, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java` | 4 | test_case 2, config 1, suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| user | 100 | 57 | oui |
| backend-core | 62 | 0 |  |
| session | 14 | 3 | oui |
| export | 1 | 0 | oui |

- Faits du pool par pack d'origine : user 100, backend-core 62, session 14, export 1

## 8. Tests attendus {#tests}

- Les tests fixent un 401 anonyme et un 403 forbidden sans ROLE_USER, en JSON, via la chaîne complète. [#f5eb141422bbbbcb-1] [#aae3d7977f8dcf62-1]
- Les tests fixent le cookie jwt Secure à false en dev et true en prod, HttpOnly, absent du corps, avec des attributs identiques au login, refresh et logout. [#80aae410574f341d-1] [#8c46899cb4ce82da-1] [#3c5a78a8da443252-1] [#f58b26a1c675bc5a-1]
- Les tests fixent l'absence de session serveur et la CSP exacte. [#85caeada9614f594-1] [#1d2a655bc933e21a-1]
- Un test du contrôleur d'auth force cookieSecure par réflexion et simule sessionService.isSessionActive à true pour /me. [#d95f3adb1ce89629-1] [#7271124452b70525-1]
- Un test de SecurityConfig passe par réflexion pour writeJsonError, ou construit la classe avec des null pour le CORS. [#2b18a3f419b512a7-1] [#427229d3685c539b-1]

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- Dans JwtFilter, toute exception autre que JwtException est journalisée en error puis la requête continue en anonyme, sans rejet explicite . Une panne technique de la vérification (par exemple la session) ne bloque donc rien dans le filtre, et seule la configuration de sécurité aval protège les routes ⇒ Ne pas supposer que le filtre échoue fermé [#20661afcf565be41-1]
- validateToken avale toute exception et renvoie false sans journaliser [#dfeb9a6862fd5358-1]. Une cause d'invalidation réelle (clé, format) reste invisible dans les logs, donc ajouter de la journalisation avant de diagnostiquer un 401 inexpliqué.
- La table des plafonds par utilisateur ne contient qu'une clé exacte, donc toute autre requête authentifiée n'est pas plafonnée par ce filtre [#3d2d7f98e0c7f971-1]. Ajouter une route sensible exige d'ajouter sa clé exacte (méthode et chemin), sinon elle reste sans limite par utilisateur.
- L'endpoint /me lit le jwt depuis le cookie brut et ne passe pas par CallerResolver [#36aa78900fe7b738-1]. Il ne suit pas le chemin par contexte de sécurité décrit par la javadoc de CallerResolver, donc une règle ajoutée à ce chemin ne l'atteint pas. L'y appliquer explicitement.

## 11. Couverture {#coverage}

- Fichiers du pack : 35 ; avec au moins un fait en base : 30 ; sans fait après remise en file : 0.
- Faits en base : 301, repris d'autres packs : +0, hors périmètre : -121, doublons écartés à la déduplication : -3, soit 177 dans le pool.
- Faits du pool venus d'un autre pack : 177 (par pack : section Relations).
- Destination des 177 faits du pool : Règles du motif 96 ; Mise en œuvre par domaine 2 ; Tests attendus 49 ; Alertes / Questions ouvertes 10 ; annexe seule 6 ; écartés (sorte `other` ou inconnue) 14.
- Passe transversale : scope 35 fichiers, tous lus.
- Base : sha256 e5725a063e22…, générée le 2026-11-19.
