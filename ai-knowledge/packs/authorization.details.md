# Annexe : authorization

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 36 | convention 15, other 9, config 4 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java` | 28 | test_case 16, other 4, validation 4 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java` | 25 | test_case 14, validation 5, other 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 23 | test_case 16, config 2, convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 15 | convention 5, role_check 3, config 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 14 | role_check 4, convention 3, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 13 | convention 4, validation 3, config 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java` | 12 | test_case 8, config 2, convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 10 | convention 5, business_rule 1, external_call 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java` | 9 | validation 4, convention 3, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` | 8 | test_case 5, convention 2, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenServiceTest.java` | 5 | test_case 3, config 1, validation 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerDevProfileCookieTest.java` | 4 | test_case 2, other 1, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/KeyRotationSessionIntegrationTest.java` | 4 | config 1, convention 1, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/AuthErrorContractIntegrationTest.java` | 4 | test_case 2, other 1, role_check 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java` | 3 | config 1, convention 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java` | 3 | convention 1, persistence_query 1, validation 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java` | 3 | convention 1, other 1, test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java` | 3 | convention 1, other 1, test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfigWriteJsonErrorTest.java` | 3 | test_case 2, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java` | 3 | convention 2, test_case 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java` | 2 | validation 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java` | 2 | other 1, test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java` | 2 | convention 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java` | 1 | convention 1 |
| `backend:src/main/resources/application.properties` | 1 | suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/CallerResolverTest.java` | 1 | other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java` | 1 | convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingDisabledIntegrationTest.java` | 1 | test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java` | 1 | convention 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| tests | - Les tests fixent en rotation qu'un kid de la clé précédente signé par elle passe, qu'un kid courant ou inconnu signé par la précédente est refusé. [#f69c6644001c56ca-1] [#1997b7fee73c7031-1] [#768160f3bbc9b294-1] | deducible |
| tests | - Les tests fixent que le jwt est en cookie HttpOnly hors du body, Secure=false en dev, Secure=true en prod, avec des attributs identiques après login, refresh et logout. [#3c5a78a8da443252-1] [#80aae410574f341d-2] [#8c46899cb4ce82da-1] [#f58b26a1c675bc5a-1] | deducible |
| tests | - Les tests fixent que les jetons d'export et d'authentification sont refusés l'un par l'autre. [#5822862f5a0bc9b4-1] [#fb56934486522018-1] | deducible |
| tests | - Les tests fixent que le filtre par utilisateur renvoie 429 avec Retry-After arrondi au supérieur et sans X-RateLimit-*, que le plafond est par utilisateur et non par IP, et qu'un principal étranger reçoit 401. [#a6ccf2b05e781477-1] [#4eedfeba9390561d-1] [#7766521a36087fc7-1] [#525f7db1c48296a2-1] | deducible |
| rules | - Un jeton vérifié par la clé précédente doit avoir jti, iat et exp, avec une durée inférieure ou égale à TOKEN_VALIDITY_MS. [#01f8eb0ca04f50da-1] | deducible |
| rules | - Le contexte passe à authentifié seulement si validateToken réussit et si le jti n'est pas révoqué, sinon la requête continue en anonyme. [#7592b341eaabca2a-1] [#899c7ea5383e6ca6-2] | deducible |
| rules | - Le cookie jwt est HttpOnly, SameSite Lax, vit deux jours, et son Secure et son Domain viennent de app.cookie.*. [#03a820aa895fbd68-1] [#44a12a49a4222fe7-1] [#576b8e44a57e017a-1] | deducible |
| rules | - Le login ne renvoie jamais le jeton dans le corps de la réponse. [#9807c0fff40d65d4-2] | deducible |
| rules | - Le logout révoque le jti puis expire le cookie, et ignore les JwtException pour que le logout réussisse. [#3cadf6fc90bdd39e-1] [#6f4fd7175cc688af-2] | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:80-81` | Le contexte d'authentification n'est renseigné que si la signature et l'expiration sont valides et si le jti n'est pas révoqué via SessionService.isSessionActive. | [#7592b341eaabca2a-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:185-205` | Les ExpiredJwtException, MalformedJwtException et JwtException de /me renvoient 401 avec le code unauthorized, et seule une exception hors JwtException renvoie 500. | [#754999e9442d5b02-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:185-201` | ExpiredJwtException, MalformedJwtException et JwtException sont chacune converties en 401 avec le même code UNAUTHORIZED. | [#d95f8227e736eebc-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:25` | Un utilisateur absent provoque une UsernameNotFoundException de message User not found. | [#57e7bd46761b02fc-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:65-83` | Au démarrage, validateSecret appelle getSigningKey et lève une IllegalStateException sans la valeur du secret si la clé est invalide. | [#8848356f2c8c0732-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:109-112` | verify renvoie Optional.empty pour un token null ou blanc, sans appeler le parseur. | [#ca82dcefc6247794-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:120-122` | verify refuse un token dont le claim typ n'est pas export-download, ce qui isole ces tokens des autres familles. | [#ca82dcefc6247794-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:126-134` | verify intercepte toute RuntimeException et renvoie Optional.empty, sans exposer le détail d'erreur. | [#ca82dcefc6247794-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:329-346` | Un jeton vérifié par la clé précédente doit avoir un jti, des claims iat et exp, et une durée exp moins iat inférieure ou égale à TOKEN_VALIDITY_MS, sinon il est refusé. | [#01f8eb0ca04f50da-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:369-371` | Un kid absent des clés courante et précédente lève une SignatureException de clé inconnue. | [#74bb72cbd9e8ffdd-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:385-392` | validateToken compare le subject au username de UserDetails et exige que le jeton ne soit pas expiré, et renvoie false sur toute exception. | [#20744147a64efc6a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:72-77` | fromPkcs8 lève une GeneralSecurityException si la clé privée n'est pas une RSAPrivateCrtKey, car la clé publique ne peut alors pas être dérivée. | [#48e6f6949702d043-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:184-190` | assertLongEnough lève une GeneralSecurityException si le modulus RSA est inférieur à MIN_MODULUS_BITS, fixé à 2048 bits. | [#105846cf9aaec1b8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:140-145` | Un utilisateur authentifié sans identifiant de compte reçoit un 401 unauthorized et la requête n'atteint pas la chaîne. | [#7a92a5b41b351244-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:150-155` | Quand le bucket de l'utilisateur est vide, la requête reçoit un 429 avec Retry-After, identique au limiteur par IP. | [#7a92a5b41b351244-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenServiceTest.java:100-116` | Le test fixe que validateSecret lève une IllegalStateException nommant EXPORT_TOKEN_SECRET pour un secret non base64, sans reprendre la valeur configurée dans le message. | [#fc990fb7f770d8ce-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:202-209` | Le test fixe qu'un jeton signé par la clé précédente sans claim jti est refusé par MissingClaimException dont le message cite jti. | [#aa300c1d3f879b75-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:221-228` | Le test fixe qu'un jeton signé par la clé précédente sans claim iat est refusé par MissingClaimException dont le message cite iat. | [#89924244597e60d2-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:231-241` | Le test fixe qu'un jeton de la clé précédente dont la durée iat à exp dépasse TOKEN_VALIDITY_MS est refusé par IncorrectClaimException. | [#90e951d5ccb9e4c0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:300-310` | Le test fixe qu'une clé précédente de moins de 2048 bits fait échouer le démarrage avec IllegalStateException, message citant jwt.previous-public-key et 2048, sans la valeur ni cause. | [#c6230b4b8d33fca0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:312-324` | Le test fixe qu'une clé privée collée comme clé précédente fait échouer le démarrage avec IllegalStateException, sans reprendre la valeur ni cause. | [#587ab2d0fa63dd26-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:288-298` | Le test fixe qu'une clé privée mal formée fait échouer le démarrage avec IllegalStateException, message citant JWT_PRIVATE_KEY et PKCS#8, sans reprendre la valeur. | [#da5705e3190095f0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:301-310` | Commentaire : Le test fixe qu'une clé RSA de 1024 bits fait échouer le démarrage avec IllegalStateException dont le message cite 2048. | [#64bec9020ef6d204-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:314-322` | Javadoc : Selon la javadoc, une chaîne vide ou blanche fait lever à jjwt une IllegalArgumentException, hors de la hiérarchie JwtException. | [#e6f735354497862d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:319-321` | Javadoc : Selon la javadoc, parseClaims doit lever une MalformedJwtException, sous-type de JwtException, et ne jamais laisser fuiter l'IllegalArgumentException de jjwt. | [#e6f735354497862d-2] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:146-153` | L'endpoint /me renvoie 401 quand le cookie jwt est absent, sans appeler le service de recherche d'utilisateur. | [#36aa78900fe7b738-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:168-171` | /me appelle validateToken avec un CustomUserDetails construit à partir du rôle de l'utilisateur et renvoie 401 si la validation échoue. | [#0924ac2c814539b6-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:279-303` | /refresh renvoie 401 si le cookie est absent, si l'utilisateur n'existe pas, ou si validateToken échoue, sans ré-émettre de jeton. | [#754999e9442d5b02-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:82-85` | Lorsque le jeton est accepté, un UsernamePasswordAuthenticationToken est créé avec les autorités de l'utilisateur chargé puis placé dans le SecurityContextHolder. | [#5b34073031bd998e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:286-292` | parseClaims refuse tout jeton dont l'en-tête alg n'est pas RS256 et lève UnsupportedJwtException. | [#591cd24092b70532-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:301-321` | Une SignatureException avec la clé courante n'est retentée avec la clé précédente que si le jeton n'a pas de kid désignant la clé courante. | [#23ecabbb7b430cab-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:182` | Commentaire : La route /api/users/** exige l'autorité ROLE_USER. | [#98b2cdbd7d200daa-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:183` | Commentaire : Les routes /api/users/{userId}/products/**, /api/products/**, /api/events/**, /api/users/**, /api/sessions/**, /api/me/** et /api/export/** exigent l'autorité ROLE_USER. | [#98b2cdbd7d200daa-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:187` | Commentaire : La route /api/export/** exige l'autorité ROLE_USER. | [#98b2cdbd7d200daa-5] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:188` | Commentaire : Toute autre requête exige une authentification, via anyRequest().authenticated(). | [#98b2cdbd7d200daa-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:48-51` | Javadoc : Selon la javadoc, la clé de limitation est l'UUID du compte porté par CustomUserDetails, et une requête anonyme n'est pas comptée mais reçoit un 401 de l'AuthorizationFilter. | [#0f0a3b28c9b9367f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:53-65` | Javadoc : Selon la javadoc, un principal authentifié sans identifiant de compte est refusé avec un 401 unauthorized (fail-closed). | [#0f0a3b28c9b9367f-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:134-139` | Une requête absente, non authentifiée ou anonyme passe le filtre sans être comptée. | [#7ec7fee86ff9e720-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:170-171` | La clé de quota est l'UUID du compte, lu depuis le principal CustomUserDetails, sous la forme id:<UUID>. | [#3bf0876a32c079d9-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/AuthErrorContractIntegrationTest.java:49` | Javadoc : Selon la javadoc, la règle authorizeHttpRequests avec hasAuthority("ROLE_USER") refuse l'accès aux utilisateurs authentifiés qui n'ont pas cette autorité. | [#b0916813f0616d9d-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:173-174` | Le commentaire affirme que /api/auth/** est contourné par JwtFilter, donc que la révocation n'est pas vérifiée par la chaîne Security. Ce point n'est pas vérifiable dans ce lot. | [#d95f8227e736eebc-3] |
| `backend:src/main/resources/application.properties:10` | Un test qui charge les vrais application*.properties hérite de spring.profiles.active=${SPRING_PROFILES_ACTIVE:dev} et des variables d'environnement du poste (APP_CORS_ALLOWED_ORIGINS) : fixer les profils par la propriété spring.profiles.active et isoler systemEnvironment, comme CorsAllowedOriginsConfigIntegrationTest. | [#r601dbc33de3ff963-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerDevProfileCookieTest.java:134` | Le test utilise MockMvc en standaloneSetup, donc la chaîne de filtres de SecurityConfig n'est pas appliquée et ce test ne couvre pas l'autorisation. | [#519761a96abfc2f1-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:348-359` | Le nom du test contient NotFound alors que le test asserte un 401 generique unauthorized, ce qui ne correspond pas au nom ; le test pour /me (ligne 166) a le même écart de nommage. | [#0e8ae95723dbd1f0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:28` | La javadoc affirme que ces tests s'exécutent en CI systématiquement, alors que le CLAUDE.md du projet indique CI : Aucun. | [#5f8e5e8a4a4e1344-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:317-318` | Selon la javadoc, AuthController et JwtFilter ne capturent que JwtException, si bien que sans garde le cas du cookie vide échappe au 401 attendu. | [#18663c6389d0cdca-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:73-74` | Le filtre charge l'utilisateur via UserDetailsService.loadUserByUsername à chaque requête où le contexte est vide et où le subject est présent. | [#899c7ea5383e6ca6-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:23-25` | loadUserByUsername charge l'utilisateur par username via le port UserRepository. | [#57e7bd46761b02fc-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:78` | La durée de vie du cookie jwt et de la session enregistrée est fixée à 60 * 60 * 24 * 2 secondes, soit deux jours. | [#44a12a49a4222fe7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:83-87` | Les attributs Secure et Domain du cookie jwt sont injectés depuis la propriété app.cookie.secure et app.cookie.domain. | [#576b8e44a57e017a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:33-34` | La classe de configuration de la chaîne de capture E2E est annotée @Profile("e2e") et n'existe que sous ce profil. | [#32ec48ae7b076e69-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:50` | Le secret de signature des tokens d'export est lu depuis la propriété app.export.token-secret. | [#cfd450177e31b9df-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:43-44` | La clé privée de signature RS256 est lue depuis la propriété jwt.private-key, et vide signifie une paire éphémère générée au démarrage. | [#9c8678588ef7b906-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:52-53` | La clé publique précédente est lue depuis jwt.previous-public-key et sert uniquement à la vérification pendant une rotation. | [#d3efb86687b6fde7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:76-78` | Javadoc : Selon la javadoc, la valeur par défaut interne localhost:3000 est un filet fail-safe si la propriété est absente, jamais un wildcard, et ne dispense pas le profil dev de porter sa propre valeur. | [#54930c3b746c841e-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:81` | Les origines CORS autorisées sont lues depuis la propriété app.cors.allowed-origins, avec http://localhost:3000 comme valeur par défaut. | [#54930c3b746c841e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:216` | Commentaire : La configuration CORS active allowCredentials, ce qui permet l'envoi des cookies entre origines. | [#0364890f33983479-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:220` | Commentaire : La configuration CORS autorise les credentials, et les en-têtes Authorization, Content-Type et Cookie. | [#9fe690aaca62310d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:91` | Le plafond de PUT /api/me/preferences est fixé à 30 requêtes par minute et par utilisateur par constante, sans propriété de configuration. | [#1d61137988d01278-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:116` | Le filtre est désactivable par app.rate-limit.enabled, dont la valeur par défaut est true. | [#4c6f499e43b70a14-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:73` | Commentaire : Selon le commentaire, les attributs Secure et Domain du cookie jwt sont injectés par @Value depuis app.cookie.* et ne sont pas renseignés en setup standalone. | [#d55c7d0cf74efcd2-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:77-78` | Le setup force par réflexion cookieSecure à true et cookieDomain à mytimeline.example sur le contrôleur de test. | [#d95f3adb1ce89629-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/KeyRotationSessionIntegrationTest.java:62-68` | La clé privée courante et la clé publique précédente sont injectées par DynamicPropertySource sous jwt.private-key et jwt.previous-public-key. | [#5cae954ca5ffbaa1-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenServiceTest.java:33-35` | Javadoc : Selon la javadoc, le secret des jetons d'export est désormais app.export.token-secret, lié à EXPORT_TOKEN_SECRET, distinct de jwt.secret, et le mécanisme reste HS256. | [#b603684c02c90708-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:89-95` | Le helper service injecte par réflexion les champs privateKeyMaterial et previousPublicKeyMaterial, puis appelle initKeyMaterial. | [#35576ec4a353076a-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:129-132` | Commentaire : Selon le commentaire, la valeur publiée dans AUTH_JWT_PUBLIC_KEY doit être le SPKI dérivé de la clé privée configurée. | [#0768b8a597f77149-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:644-653` | La constante EXPECTED_CSP fixe la politique Content-Security-Policy exacte attendue, sans default-src permissif ni 'unsafe-inline'. | [#7b90b6a7421a2ce2-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:46-47` | Le filtre de test est construit avec TimeMeter.SYSTEM_MILLISECONDS et un drapeau d'activation à true. | [#b0ca78d83c17d7e6-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:210-219` | Avec le drapeau du constructeur à false, le filtre reste inerte pour un principal étranger, le message de test nommant la propriété app.rate-limit.enabled. | [#897f9342829e535e-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:98-109` | Le cookie jwt est construit avec HttpOnly à true, Secure et Domain lus depuis la configuration, Path à /, SameSite à Lax et une durée maxAge fournie par l'appelant. | [#03a820aa895fbd68-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:127-131` | Le login pose le JWT uniquement dans le cookie HttpOnly et ne renvoie que le message de succès dans le corps de la réponse. | [#9807c0fff40d65d4-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:128-130` | Commentaire : Selon le commentaire, le JWT n'est jamais renvoyé dans le corps pour qu'un script XSS ne puisse pas le lire. | [#9807c0fff40d65d4-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:374-380` | Javadoc : Selon la javadoc, l'adresse IP complète n'est jamais persistée et la session expire avec la durée de vie du JWT. | [#cd20403b9fe1ce69-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:398-411` | La révocation de session ignore silencieusement les JwtException, en particulier pour un token expiré ou malformé, afin que le logout réussisse côté cookie. | [#6f4fd7175cc688af-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:39-49` | Commentaire : La chaîne dédiée, ordre 1, ne couvre que /api/test-support/** en STATELESS avec CSRF désactivé, et permet toutes les requêtes sur ce chemin. | [#abec5e5b784c11ad-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:27` | Le UserDetails renvoyé porte une seule autorité, dérivée du champ role de l'utilisateur. | [#d6bfbebcb81346de-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:26` | Javadoc : Selon la javadoc, les tokens d'export sont signés en HMAC HS256 avec un secret dédié. | [#a6b728e36d491210-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:94-102` | sign produit un token HS256 avec sub égal au jobId, uid égal à l'ownerId, typ égal à export-download et exp égal à expiresAt. | [#81394489244fcd13-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:114-119` | verify vérifie la signature avec getSigningKey et contrôle l'expiration contre le Clock injecté, et non contre l'horloge système. | [#f3622be2246a7523-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:40-42` | Le filtre JWT étend OncePerRequestFilter et lit le jeton dans le cookie jwt, puis dans l'en-tête Authorization au format Bearer si aucun cookie ne le fournit. | [#fef399d03b004ac4-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:46-47` | Le cookie jwt est recherché en premier, et le filtre s'arrête au premier cookie nommé jwt. | [#fef399d03b004ac4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:55-60` | L'en-tête Authorization n'est lu que si aucun jeton n'a été trouvé dans les cookies, et seul le préfixe Bearer est accepté. | [#fef399d03b004ac4-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:92-100` | Les JwtException sont journalisées en debug comme cas nominal, les autres exceptions en error, et la requête poursuit dans tous les cas sans authentification. | [#20661afcf565be41-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:105-108` | Le filtre JWT est ignoré pour tous les chemins dont le servletPath commence par /api/auth. | [#e18907b3ce64ed01-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:77-79` | Au démarrage, si la clé privée est absente ou blanche, une paire RSA éphémère est générée, sinon la clé configurée est chargée. | [#2acb131f0ebd7c9c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:205-216` | La surcharge generateToken(String) signe en RS256 mais n'ajoute aucun claim jti, contrairement à la surcharge generateToken(Authentication). | [#40d48297b0756461-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:224-234` | La surcharge generateToken(Authentication) ajoute un jti UUID unique et signe en RS256 avec la clé courante, durée de vie TOKEN_VALIDITY_MS. | [#40d48297b0756461-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:280-283` | parseClaims rejette un jeton null ou blanc avec une MalformedJwtException avant toute vérification de signature. | [#006c110809de4e75-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:99-100` | Javadoc : Selon la javadoc de la classe, ce filtre s'exécute avant le filtre d'autorisation, ce qui fait que les requêtes en dépassement sont rejetées avant le parsing de la requête. | [#98b599acaf72072e-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:43` | SecurityConfig active la sécurité web Spring avec @EnableWebSecurity et la sécurité au niveau méthode avec @EnableMethodSecurity. | [#6118b2628faba525-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:68-69` | Javadoc : Selon la javadoc, la constante est extraite pour que le test d'intégration CorsAllowedOriginsConfigIntegrationTest résolve exactement la même expression que le constructeur. | [#6768670fe6318de2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:71-74` | Javadoc : Selon la javadoc, la constante est publique pour être relue par DevCorsStartupLogger et doit rester la seule source de l'expression, sans duplication ailleurs. | [#6768670fe6318de2-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:85` | JwtFilter est injecté dans le constructeur avec @Lazy, sous forme de proxy. | [#6fb657e69fc8e578-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:161` | La session est configurée en STATELESS, aucune session HTTP n'est créée par Spring Security. | [#ad28b56cd87034dc-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:192` | Commentaire : Une requête non authentifiée reçoit un statut 401 avec le corps JSON d'erreur "unauthorized" via writeJsonError. | [#ad28b56cd87034dc-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:194` | Commentaire : Un accès refusé reçoit un statut 403 avec le corps JSON d'erreur "forbidden" via writeJsonError. | [#ad28b56cd87034dc-7] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:196` | Commentaire : rateLimitingFilter et jwtFilter sont enregistrés avant UsernamePasswordAuthenticationFilter, le rate limit s'exécutant avant jwtFilter. | [#0b17c87584464539-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:199` | Commentaire : Le rateLimitingFilter est placé avant UsernamePasswordAuthenticationFilter, donc avant jwtFilter. | [#ad28b56cd87034dc-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:200` | Commentaire : Le code enregistre rateLimitingFilter puis jwtFilter avant UsernamePasswordAuthenticationFilter. | [#ad28b56cd87034dc-6] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:204` | Commentaire : Selon le commentaire, addFilterAfter avec JwtFilter.class n'est pas utilisé car jwtFilter est injecté @Lazy et son ordre est enregistré sous la classe du proxy. | [#dad4d9053e5be1a1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:207` | Commentaire : userRateLimitingFilter est enregistré avant AuthorizationFilter, donc après l'authentification posée par jwtFilter. | [#ad28b56cd87034dc-5] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:232` | Commentaire : Selon le commentaire, le cookie jwt reste en SameSite=Lax et non Strict, la protection CSRF reposant sur le cookie HttpOnly et les clients fetch CORS. | [#9790d2029eefa934-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:263` | Javadoc : Selon la javadoc, writeJsonError est package-private et réutilisé par UserRateLimitingFilter pour produire un 401 identique à celui de l'entry point. | [#9f5425a4a0727930-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:271` | writeJsonError fixe le statut, le type de contenu JSON en UTF-8, puis écrit un corps {"error": code} via Jackson. | [#fa527aacf6df4f7d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:37-38` | Javadoc : Selon la javadoc, le filtre est monté après l'authentification et juste avant la décision d'autorisation. | [#23b7acde7d8744f5-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:128` | La clé de route est la méthode HTTP suivie du chemin décodé dans l'application. | [#3d2d7f98e0c7f971-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:129` | Seules les routes présentes dans la table LIMITS sont comptées, les autres passent sans contrôle. | [#8c0ce53d79d11153-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:144` | Commentaire : Selon le commentaire, /me contrôle la révocation du jti de la session, et le test stubbe isSessionActive à true pour le cas nominal. | [#d69b830f7365fd95-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:292` | Commentaire : Selon le commentaire, le refresh exige que le jti courant soit actif, ce que le test reproduit via sessionService.isSessionActive. | [#b48dd16991b4872f-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/KeyRotationSessionIntegrationTest.java:99-107` | La classe vide le SecurityContextHolder dans un @BeforeEach et un @AfterEach pour chaque test. | [#d13edc41979dacb9-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java:208-235` | Le test instancie la vraie classe SecurityConfig avec des filtres nuls et appelle sa méthode corsConfigurationSource() pour obtenir le CorsConfigurationSource de production. | [#427229d3685c539b-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java:45-52` | Le test construit JwtFilter avec des JwtService, UserDetailsService et SessionService mockés, et vide le SecurityContextHolder avant chaque test. | [#b32d79b48dfcaf48-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:41-42` | Javadoc : Selon la javadoc, la classe couvre la sélection de la clé par l'en-tête kid, les bornes des jetons de la clé précédente et le WARN de rotation. | [#2b91b1ee89246d6d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:44-45` | Javadoc : Selon la javadoc, les tests sont purs, sans contexte Spring, et toutes les paires de clés sont générées en mémoire. | [#2b91b1ee89246d6d-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:24-26` | Javadoc : Selon la javadoc, la signature d'authentification passe de HS256 à RS256 pour permettre la vérification côté Edge sans publier de clé de frappe. | [#186206f32cc3a216-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java:36-38` | Javadoc : Selon la javadoc, le plafond par utilisateur lit le principal posé par JwtFilter juste avant l'autorisation. | [#f0db7050b8653b7c-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java:34-38` | Javadoc : Selon la javadoc, la requête brute traverse le pare-feu StrictHttpFirewall, JwtFilter, le limiteur puis le routage MVC. | [#53fa048f99fc2d28-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:38-42` | Javadoc : Selon la javadoc, la classe de test passe par la vraie chaîne de filtres Spring Security (@AutoConfigureMockMvc) pour exercer RateLimitingFilter et les en-têtes de SecurityConfig. | [#a34e3a0605075d69-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:92-93` | Javadoc : Selon la javadoc, la clé de rate limit est l'IP du socket (remoteAddr), X-Forwarded-For étant ignoré par défaut. | [#f05c736f4e9284e9-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java:30-31` | Javadoc : Selon la javadoc, le test passe par la chaîne Spring Security réelle via @AutoConfigureMockMvc, de sorte que le RateLimitingFilter s'exécute. | [#24ca424fcd8a0d38-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfigWriteJsonErrorTest.java:19-20` | Javadoc : Selon la javadoc, writeJsonError ne doit plus construire le JSON par concaténation manuelle. | [#f8e1faff9543b9f4-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:21` | Javadoc : Selon la javadoc, l'acceptation de la CVE-2026-40973 dans la documentation repose sur l'hypothèse que l'application est STATELESS. | [#2cc6346d5dc0f499-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:23` | Javadoc : Selon la javadoc, SecurityConfig applique SessionCreationPolicy.STATELESS et l'authentification se fait par cookie JWT. | [#f4658d8432291c0d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:36-38` | Javadoc : Selon la javadoc, tout principal authentifié qui n'est pas un CustomUserDetails est refusé en 401, sans passer hors plafond (fail-closed). | [#c834ee4dab2c86fc-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:139-141` | Javadoc : Selon la javadoc, le 429 par utilisateur porte le même Retry-After que le limiteur par IP, sous forme d'entier arrondi au supérieur, au moins 1, sans en-tête X-RateLimit. | [#9d23b99b1cb02237-1] |
