---
pack: authorization
kind: transversal
name: Autorisation
generated_at: 2026-11-19T10:19:38Z
generator: synth/1
base_sha256: 420223323de8e9184d65ec406fc11303302b894cb52140ec6d3d4ff9374f5372
facts_in_base: 291
facts_in_pool: 192
facts_cited: 49
sections: authorization.sections.json
details: [authorization.details.md]
lang: fr
curated_at: 2026-11-19T10:32:37Z
curation: authorization.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : authorization, autorisation, role, rôle, security, sécurité, rate limit, jwt
- Chemins : `^mytimeline:backend/.*/(SecurityConfig|JwtFilter|JwtService|CustomUserDetailsService|[A-Za-z]*RateLimitingFilter|CallerResolver)[A-Za-z0-9]*\.java$`

## 2. Lexique {#lexicon}

Aucun fait de la base ne relève de cette section.

## 3. Règles du motif {#rules}

### Invariants
- Une jwt.private-key vide donne une paire RSA éphémère, une clé invalide, non CRT ou de moins de 2048 bits fait échouer le démarrage. [#0a82116312df662d-1] [#5bce4b2b35400bce-1] [#ad94765637b5f497-1] [#aad4f7e728fc2479-1]
- La chaîne est STATELESS et sans CSRF, qui repose selon le commentaire sur le cookie HttpOnly et l'absence de form-POST navigateur. [#93676e7880662cfc-1] [#20c936dfaa725a62-1] [#20c936dfaa725a62-7]
### Authentification des requêtes
- Si la validation échoue, le contexte reste anonyme et le 401 vient de SecurityConfig. [#f6e75e0a5e5133b6-3]
- Sur /me et /refresh, toute JwtException donne un 401 générique et les autres exceptions un 500, un jeton vide levant MalformedJwtException. [#8f1db677a53572c6-4] [#78a820cabbe925f7-3] [#c9ffe973525260e3-2]
- CallerResolver renvoie Optional.empty pour un appelant anonyme ou sans User en base. [#99a5ef0b25688c6e-1] [#0fc229f09fd1eed3-3]
- Le rôle stocké est l'unique authority, sans préfixe ajouté. [#9c5d8fc04a9de815-1]
### Limitation de débit
- Le limiteur par IP ne contrôle que les paires méthode et chemin listées, avec un compteur par IP et par paire, et se désactive par app.rate-limit.enabled. [#ef1ceb9ef6e0e2d9-3] [#ef1ceb9ef6e0e2d9-4] [#4505cafcc3a4dbe2-1]
- L'IP est l'adresse du socket, X-Forwarded-For n'est lu que si trustForwardedHeader vaut true. [#454cce6a9210f047-1] [#843166042d2f6a3e-1]
- Le limiteur par utilisateur ne plafonne que PUT /api/me/preferences, à 30 par minute, et renvoie le même 429 que le limiteur IP. [#589eeb31cac50d43-1] [#e752f9ef4f24e41f-1] [#0833c211a9b3191d-4]
### Vérifié dans le code
- SecurityConfig.securityFilterChain garde /error en permitAll pour qu'une exception non gérée ne ressorte pas en 401 trompeur [#20c936dfaa725a62-2] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:166`.
- AuthControllerDevProfileCookieTest (standaloneSetup) ne prouve que le contenu du cookie. L'authentification et les filtres se couvrent par un test @SpringBootTest avec @AutoConfigureMockMvc, comme SessionRevocationIntegrationTest [#session/9d1fc0fa65838096-1] [#session/2ef4abcad452d6cf-1] `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:37-59`.

## 4. Structure {#structure}

#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AuthController.login | Un utilisateur anonyme passe à authentifié après authenticationManager.authenticate, puis un jti est enregistré en session et le cookie jwt est posé. (partiel) | L115-127 | [#bfe467a84207cfa3-1] |
| AuthController.logout | Le logout révoque le jti du cookie courant en base puis pose un cookie jwt vide avec maxAge 0. (partiel) | L257-260 | [#ed68a63fc2b66b67-1] |
| AuthController.refreshToken | Le refresh révoque l'ancien jti puis enregistre le jti du nouveau token, et pose un nouveau cookie jwt. (partiel) | L316-326 | [#10efe7ec9942ce01-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SecurityConfig.securityFilterChain | Le endpoint JWKS, défini par JwksController.JWKS_PATH, est accessible sans authentification. | L172 | [#8bc3a1ce71fe4ba9-1] |

## 5. Mise en œuvre par domaine {#surface}

### Clés de signature JWT
- Le endpoint JWKS (chemin défini par la constante du contrôleur JWKS) est ouvert sans authentification dans la chaîne de filtres, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:172`. [#8bc3a1ce71fe4ba9-1]

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 28), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 20 | convention 11, config 4, role_check 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 16 | convention 8, state_transition 3, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java` | 21 | convention 8, other 7, config 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 15 | convention 7, config 3, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 12 | convention 5, validation 3, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 8 | convention 5, business_rule 1, external_call 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java` | 20 | test_case 12, convention 5, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java` | 4 | validation 3, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` | 7 | convention 4, test_case 2, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java` | 4 | convention 3, validation 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 13 | test_case 13 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| user | 72 | 30 | oui |
| session | 50 | 24 | oui |
| backend-socle | 67 | 0 |  |
| export | 3 | 3 | oui |

- Faits du pool par pack d'origine : user 72, backend-socle 67, session 50, export 3

## 8. Tests attendus {#tests}

- Les tests fixent que les jetons sont émis en RS256, que HS256 forgé depuis la clé publique et alg none sont rejetés. [#1d6343583ff4cb9a-1] [#35c98d343af70d16-1] [#59230c81582d34b3-1]
- Les tests fixent qu'un jeton vide lève une JwtException, que validateToken renvoie false et que le filtre reste non authentifié. [#5d2f68edb7108f3e-1] [#8ae00d6ecf2dc04f-1] [#70d4d7a5fcf8ca5c-2]
- Les tests fixent un cookie jwt HttpOnly, absent du corps, Secure en prod, non Secure avec Domain localhost en dev, aux attributs identiques entre login, refresh et logout. [#947ec0951545e427-1] [#029d78f2484a600b-1] [#b59e1cc447f03d19-1] [#5fd40af78c2a4f52-1]
- Les tests fixent que le limiteur par utilisateur est lié à l'utilisateur, renvoie 429 avec Retry-After arrondi sans X-RateLimit, et refuse en 401 un principal étranger ou sans identifiant. [#e6e137afcb49a159-1] [#c65fbe64d8da475f-1] [#e5f96f735ac2600b-1] [#8fd0d9f8dd6f46c8-1]

## 9. Questions ouvertes {#questions}

- Faut-il borner la carte de buckets du filtre de débit par IP et chemin ? Selon la javadoc, il n'y a aucune éviction et la carte croît avec les couples vus, aucun fait de code ne le confirme ni ne le contredit, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:111`. [#41dd62aea9e27bf0-1] [#948cf8b91f5231d8-2]
- Le filtre de débit par utilisateur évince-t-il vraiment les buckets en LRU ? Selon la javadoc, un attaquant peut en créer en ouvrant des comptes et l'éviction efface l'historique du moins récent, mais les faits de code ne décrivent pas cette éviction, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:78-79`. [#28035b740c80cb01-1] [#4967cc3e212efe58-1]

## 10. Alertes {#alerts}

- Dans le filtre JWT, toute exception autre que JwtException est journalisée en erreur puis la chaîne continue avec un contexte anonyme, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:97-100`. Une panne technique de validation du jeton ne bloque donc pas la requête et ressort comme un refus d'accès anonyme, alors ne comptez pas sur ce filtre pour signaler une erreur serveur. [#af86537e34083429-1]
- Le constructeur d'AuthController reçoit un CustomUserDetailsService qui n'est ni stocké ni utilisé, voir `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:66`. Ce paramètre laisse croire que le contrôleur charge l'utilisateur lui-même, alors ne vous y fiez pas pour la logique d'authentification et retirez-le si vous touchez au constructeur. [#7ee28be5964c768b-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 35 ; avec au moins un fait en base : 34 ; sans fait après remise en file : 0.
- Faits en base : 291, repris d'autres packs : +0, hors périmètre : -99, doublons écartés à la déduplication : -0, soit 192 dans le pool.
- Faits du pool venus d'un autre pack : 192 (par pack : section Relations).
- Destination des 192 faits du pool : Règles du motif 108 ; Mise en œuvre par domaine 1 ; Tests attendus 54 ; Alertes / Questions ouvertes 7 ; annexe seule 4 ; écartés (sorte `other` ou inconnue) 18.
- Passe transversale : scope 35 fichiers, tous lus.
- Base : sha256 420223323de8…, générée le 2026-11-19.
