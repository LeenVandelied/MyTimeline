# Annexe : authorization

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 27 | other 9, config 5, role_check 5 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 18 | test_case 15, other 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 14 | role_check 4, convention 3, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 13 | convention 5, config 3, validation 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java` | 13 | test_case 9, validation 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 12 | convention 5, validation 4, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java` | 12 | test_case 8, config 2, convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 10 | convention 5, business_rule 1, external_call 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java` | 9 | validation 4, convention 3, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` | 8 | test_case 5, convention 2, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenServiceTest.java` | 5 | test_case 3, config 1, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java` | 4 | validation 3, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerDevProfileCookieTest.java` | 4 | test_case 2, other 1, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/AuthErrorContractIntegrationTest.java` | 4 | test_case 2, other 1, role_check 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java` | 3 | config 1, convention 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java` | 3 | convention 1, persistence_query 1, validation 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java` | 3 | convention 1, other 1, test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java` | 3 | convention 1, other 1, test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfigWriteJsonErrorTest.java` | 3 | test_case 2, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java` | 3 | convention 2, test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java` | 2 | other 1, test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java` | 2 | convention 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java` | 1 | convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/CallerResolverTest.java` | 1 | other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java` | 1 | convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingDisabledIntegrationTest.java` | 1 | test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java` | 1 | convention 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Une propriété jwt.private-key vide fait générer une paire éphémère au démarrage. [#9c8678588ef7b906-1] [#2acb131f0ebd7c9c-1] | deducible |
| rules | - JwtFilter lit le cookie jwt, puis l'en-tête Bearer si aucun cookie. [#fef399d03b004ac4-1] [#fef399d03b004ac4-3] | deducible |
| rules | - Le login ne renvoie qu'un message, le JWT passe par le cookie seul. [#9807c0fff40d65d4-2] | deducible |
| rules | - La session est STATELESS et le CSRF désactivé. [#ad28b56cd87034dc-2] [#ad28b56cd87034dc-1] | deducible |
| rules | - Un anonyme passe sans comptage, un authentifié sans identifiant reçoit 401, un bucket vide donne 429 avec Retry-After. [#7ec7fee86ff9e720-1] [#7a92a5b41b351244-1] [#7a92a5b41b351244-2] | deducible |
| rules | - Le filtre se désactive par app.rate-limit.enabled (true par défaut). [#4c6f499e43b70a14-1] | deducible |
| surface | - Trois zones sont ouvertes sans authentification dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:161`, la santé de l'application [#10ab0800c4c3ca76-1], le JWKS [#6bf025d08b434efd-1] et toutes les routes /api/auth/** [#98b2cdbd7d200daa-1]. | deducible |
| tests | - Les tests fixent que JwtService n'accepte que RS256 et lève une JwtException pour un HS256 forgé avec la clé publique, un alg none, une autre clé ou une chaîne vide. [#24de4698d7f1bcdb-1] [#5621feee827ec7d0-1] [#d961c38d7c34e172-1] [#6fddf12db3acfa6d-1] | deducible |
| tests | - Les tests fixent que le cookie jwt est HttpOnly, Secure à false en dev et à true en prod, avec les mêmes attributs après login, refresh et logout (maxAge 0 au logout). [#3c5a78a8da443252-1] [#80aae410574f341d-2] [#8c46899cb4ce82da-1] [#f58b26a1c675bc5a-1] [#f58b26a1c675bc5a-2] | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:80-81` | Le contexte d'authentification n'est renseigné que si la signature et l'expiration sont valides et si le jti n'est pas révoqué via SessionService.isSessionActive. | [#7592b341eaabca2a-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:185-201` | ExpiredJwtException, MalformedJwtException et JwtException sont chacune converties en 401 avec le même code UNAUTHORIZED. | [#d95f8227e736eebc-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:300-303` | Le refresh valide l'expiration et la signature du token courant avant toute réémission, et renvoie 401 si validateToken échoue. | [#754999e9442d5b02-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:328-333` | Toute JwtException levée pendant le refresh est convertie en 401 sans ré-émission de token. | [#754999e9442d5b02-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:25` | Un utilisateur absent provoque une UsernameNotFoundException de message User not found. | [#57e7bd46761b02fc-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:65-83` | Au démarrage, validateSecret appelle getSigningKey et lève une IllegalStateException sans la valeur du secret si la clé est invalide. | [#8848356f2c8c0732-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:109-112` | verify renvoie Optional.empty pour un token null ou blanc, sans appeler le parseur. | [#ca82dcefc6247794-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:120-122` | verify refuse un token dont le claim typ n'est pas export-download, ce qui isole ces tokens des autres familles. | [#ca82dcefc6247794-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:126-134` | verify intercepte toute RuntimeException et renvoie Optional.empty, sans exposer le détail d'erreur. | [#ca82dcefc6247794-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:220-223` | parseClaims lève MalformedJwtException pour un jeton null ou blanc avant tout parsing. | [#006c110809de4e75-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:230-233` | parseClaims refuse tout jeton dont l'en-tête alg n'est pas RS256 et lève UnsupportedJwtException. | [#591cd24092b70532-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:238-241` | validateToken compare le subject du jeton au username de UserDetails et vérifie que le jeton n'est pas expiré. | [#20744147a64efc6a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:242-244` | validateToken capture toute Exception et renvoie false, sans journalisation. | [#dfeb9a6862fd5358-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:67-73` | Une clé privée RSA sans paramètres CRT lève une GeneralSecurityException, car la clé publique ne peut pas en être dérivée. | [#48e6f6949702d043-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:147-155` | Toute clé publique non RSA est refusée par une GeneralSecurityException avant la publication JWKS. | [#6176d475cd780b9a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:165-171` | Un modulus RSA de moins de 2048 bits est refusé par une GeneralSecurityException, levée au chargement de la clé. | [#105846cf9aaec1b8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:140-145` | Un utilisateur authentifié sans identifiant de compte reçoit un 401 unauthorized et la requête n'atteint pas la chaîne. | [#7a92a5b41b351244-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:150-155` | Quand le bucket de l'utilisateur est vide, la requête reçoit un 429 avec Retry-After, identique au limiteur par IP. | [#7a92a5b41b351244-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenServiceTest.java:100-116` | Le test fixe que validateSecret lève une IllegalStateException nommant EXPORT_TOKEN_SECRET pour un secret non base64, sans reprendre la valeur configurée dans le message. | [#fc990fb7f770d8ce-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:179-190` | Le test fixe que initKeyMaterial lève une IllegalStateException nommant JWT_PRIVATE_KEY et PKCS#8 pour une clé mal formée, sans reprendre la valeur configurée. | [#da5705e3190095f0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:192-202` | Le test fixe qu'une clé RSA de 1024 bits est refusée au boot avec une IllegalStateException dont le message mentionne 2048. | [#64bec9020ef6d204-1] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:82-85` | Lorsque le jeton est accepté, un UsernamePasswordAuthenticationToken est créé avec les autorités de l'utilisateur chargé puis placé dans le SecurityContextHolder. | [#5b34073031bd998e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:174` | Commentaire : La route /api/users/{userId}/products/** exige l'autorité ROLE_USER. | [#98b2cdbd7d200daa-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:177` | Commentaire : La route /api/users/** exige l'autorité ROLE_USER. | [#98b2cdbd7d200daa-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:182` | Commentaire : La route /api/export/** exige l'autorité ROLE_USER. | [#98b2cdbd7d200daa-5] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:183` | Commentaire : Toute requête non listée explicitement exige une authentification. | [#98b2cdbd7d200daa-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:186-189` | Commentaire : Une requête non authentifiée reçoit un 401 avec le corps unauthorized, et une requête refusée reçoit un 403 avec le corps forbidden. | [#ad28b56cd87034dc-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:48-51` | Javadoc : Selon la javadoc, la clé de limitation est l'UUID du compte porté par CustomUserDetails, et une requête anonyme n'est pas comptée mais reçoit un 401 de l'AuthorizationFilter. | [#0f0a3b28c9b9367f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:53-65` | Javadoc : Selon la javadoc, un principal authentifié sans identifiant de compte est refusé avec un 401 unauthorized (fail-closed). | [#0f0a3b28c9b9367f-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:134-139` | Une requête absente, non authentifiée ou anonyme passe le filtre sans être comptée. | [#7ec7fee86ff9e720-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:170-171` | La clé de quota est l'UUID du compte, lu depuis le principal CustomUserDetails, sous la forme id:<UUID>. | [#3bf0876a32c079d9-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/AuthErrorContractIntegrationTest.java:49` | Javadoc : Selon la javadoc, la règle authorizeHttpRequests avec hasAuthority("ROLE_USER") refuse l'accès aux utilisateurs authentifiés qui n'ont pas cette autorité. | [#b0916813f0616d9d-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:97-99` | Le message WARN indique que le profil prod refuse le mode éphémère, mais aucun contrôle de profil n'apparaît dans ce fichier. | [#6d1d59909a7eca5b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:199-201` | Le commentaire signale qu'un ordre enregistré sous la classe proxy de JwtFilter ne se retrouve pas forcément par JwtFilter.class, d'où l'ancrage sur AuthorizationFilter. | [#dad4d9053e5be1a1-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerDevProfileCookieTest.java:134` | Le test utilise MockMvc en standaloneSetup, donc la chaîne de filtres de SecurityConfig n'est pas appliquée et ce test ne couvre pas l'autorisation. | [#519761a96abfc2f1-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:73-74` | Le filtre charge l'utilisateur via UserDetailsService.loadUserByUsername à chaque requête où le contexte est vide et où le subject est présent. | [#899c7ea5383e6ca6-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:130-143` | Le JWKS contient une seule entrée RSA de type sig avec l'algorithme RS256, et une GeneralSecurityException est convertie en IllegalStateException sans détail. | [#d02ef1da9edc3272-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:23-25` | loadUserByUsername charge l'utilisateur par username via le port UserRepository. | [#57e7bd46761b02fc-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:78` | La durée de vie du cookie jwt et de la session enregistrée est fixée à 60 * 60 * 24 * 2 secondes, soit deux jours. | [#44a12a49a4222fe7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:83-84` | L'attribut Secure du cookie jwt est lu depuis la propriété app.cookie.secure. | [#576b8e44a57e017a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:86-87` | L'attribut Domain du cookie jwt est lu depuis la propriété app.cookie.domain. | [#3e44a2721972a4a7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:33-34` | La classe de configuration de la chaîne de capture E2E est annotée @Profile("e2e") et n'existe que sous ce profil. | [#32ec48ae7b076e69-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:50` | Le secret de signature des tokens d'export est lu depuis la propriété app.export.token-secret. | [#cfd450177e31b9df-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:39-40` | La clé privée de signature est lue depuis la propriété jwt.private-key, une valeur vide déclenchant la génération d'une paire éphémère au démarrage. | [#9c8678588ef7b906-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:23-25` | Javadoc : Selon la javadoc, seule la clé privée RSA est configurée côté backend, et la clé publique en est dérivée. | [#9f60a5905f689a63-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:43` | La classe active la sécurité au niveau méthode en plus de la sécurité web, via @EnableMethodSecurity. | [#6118b2628faba525-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:76` | Les origines CORS autorisées sont lues depuis app.cors.allowed-origins, avec localhost:3000 comme valeur par défaut. | [#54930c3b746c841e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:109` | La protection CSRF est désactivée sur la chaîne de filtres. | [#ad28b56cd87034dc-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:156` | La gestion de session est STATELESS, donc aucune session serveur n'est créée. | [#ad28b56cd87034dc-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:211-215` | Commentaire : La configuration CORS autorise les credentials, et les en-têtes Authorization, Content-Type et Cookie. | [#9fe690aaca62310d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:91` | Le plafond de PUT /api/me/preferences est fixé à 30 requêtes par minute et par utilisateur par constante, sans propriété de configuration. | [#1d61137988d01278-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:116` | Le filtre est désactivable par app.rate-limit.enabled, dont la valeur par défaut est true. | [#4c6f499e43b70a14-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenServiceTest.java:33-35` | Javadoc : Selon la javadoc, le secret des jetons d'export est désormais app.export.token-secret, lié à EXPORT_TOKEN_SECRET, distinct de jwt.secret, et le mécanisme reste HS256. | [#b603684c02c90708-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:644-653` | La constante EXPECTED_CSP fixe la politique Content-Security-Policy exacte attendue, sans default-src permissif ni 'unsafe-inline'. | [#7b90b6a7421a2ce2-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:46-47` | Le filtre de test est construit avec TimeMeter.SYSTEM_MILLISECONDS et un drapeau d'activation à true. | [#b0ca78d83c17d7e6-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:210-219` | Avec le drapeau du constructeur à false, le filtre reste inerte pour un principal étranger, le message de test nommant la propriété app.rate-limit.enabled. | [#897f9342829e535e-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:98-109` | Le cookie jwt est construit avec HttpOnly, Secure, Path, Domain et SameSite=Lax, et les mêmes attributs servent à la pose et à la suppression. | [#03a820aa895fbd68-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:128-131` | Le login renvoie uniquement un message dans le corps de la réponse, le JWT étant transmis par le cookie seul. | [#9807c0fff40d65d4-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:146` | L'endpoint /api/auth/me lit l'identité uniquement depuis le cookie jwt via @CookieValue, sans passer par le SecurityContext. | [#36aa78900fe7b738-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:173-177` | Commentaire : Selon le commentaire, /api/auth/** est bypassé par JwtFilter, donc la révocation n'est pas vérifiée par la chaîne Security pour ces routes. | [#d95f8227e736eebc-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:260` | Le logout efface le cookie jwt en posant un cookie vide de maxAge 0 construit avec les mêmes attributs que la pose. | [#3cadf6fc90bdd39e-1] |
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
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:30-32` | Commentaire : La durée de vie du jeton est fixée à deux jours via la constante TOKEN_VALIDITY_MS, selon le commentaire qui la relie à BR-AUT-007. | [#1d5bb827d7e881fd-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:59-64` | Le matériel de signature est chargé au démarrage via @PostConstruct, soit depuis la clé configurée, soit depuis une paire éphémère si la propriété est vide. | [#2acb131f0ebd7c9c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:118-119` | Javadoc : La clé publique est publiée au format JWK Set et dérivée à chaque appel du matériel de signature courant, selon la javadoc. | [#d02ef1da9edc3272-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:145-156` | La surcharge generateToken(String) signe le jeton en RS256 avec une expiration de TOKEN_VALIDITY_MS, sans claim jti. | [#40d48297b0756461-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:164-173` | La surcharge generateToken(Authentication) ajoute un claim jti UUID unique et un claim role, puis signe en RS256. | [#6e5f12c53197589c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:99-100` | Javadoc : Selon la javadoc de la classe, ce filtre s'exécute avant le filtre d'autorisation, ce qui fait que les requêtes en dépassement sont rejetées avant le parsing de la requête. | [#98b599acaf72072e-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:80` | JwtFilter est injecté dans le constructeur avec @Lazy, sous forme de proxy. | [#6fb657e69fc8e578-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:194` | Commentaire : Le rateLimitingFilter est placé avant UsernamePasswordAuthenticationFilter, donc avant jwtFilter. | [#ad28b56cd87034dc-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:195` | Commentaire : Le jwtFilter est placé avant UsernamePasswordAuthenticationFilter, à la même position que le rate limit par IP. | [#ad28b56cd87034dc-6] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:202` | Commentaire : Le userRateLimitingFilter est placé avant AuthorizationFilter, donc après jwtFilter. | [#ad28b56cd87034dc-5] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:37-38` | Javadoc : Selon la javadoc, le filtre est monté après l'authentification et juste avant la décision d'autorisation. | [#23b7acde7d8744f5-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:128` | La clé de route est la méthode HTTP suivie du chemin décodé dans l'application. | [#3d2d7f98e0c7f971-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:129` | Seules les routes présentes dans la table LIMITS sont comptées, les autres passent sans contrôle. | [#8c0ce53d79d11153-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:77` | Le setUp force manuellement les champs cookieSecure à true et cookieDomain via ReflectionTestUtils, simulant le profil prod en contexte standalone. | [#d95f3adb1ce89629-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java:208-235` | Le test instancie la vraie classe SecurityConfig avec des filtres nuls et appelle sa méthode corsConfigurationSource() pour obtenir le CorsConfigurationSource de production. | [#427229d3685c539b-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java:45-52` | Le test construit JwtFilter avec des JwtService, UserDetailsService et SessionService mockés, et vide le SecurityContextHolder avant chaque test. | [#b32d79b48dfcaf48-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:40-46` | Le test génère sa paire RSA 2048 dans un BeforeAll au lieu de committer une clé. | [#5b0b0f7486e11554-1] |
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
