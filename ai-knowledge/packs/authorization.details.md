# Annexe : authorization

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java` | 20 | test_case 9, config 4, validation 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 18 | convention 9, role_check 3, config 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 16 | convention 9, config 3, validation 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java` | 15 | other 4, config 3, convention 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 13 | convention 5, business_rule 2, suspicious 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 12 | test_case 11, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java` | 11 | test_case 8, config 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 10 | config 4, role_check 2, validation 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java` | 9 | convention 8, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 7 | convention 3, business_rule 1, state_transition 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java` | 5 | test_case 3, other 1, validation 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfigWriteJsonErrorTest.java` | 5 | test_case 4, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/AuthErrorContractIntegrationTest.java` | 4 | test_case 3, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java` | 4 | test_case 2, config 1, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` | 4 | convention 2, config 1, test_case 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java` | 3 | convention 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/CallerResolverTest.java` | 3 | other 2, test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenServiceTest.java` | 3 | test_case 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java` | 2 | convention 1, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java` | 2 | validation 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java` | 2 | config 1, test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java` | 2 | convention 1, test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java` | 2 | convention 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java` | 2 | convention 1, test_case 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java` | 1 | config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerDevProfileCookieTest.java` | 1 | test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java` | 1 | convention 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - L'application est sans état : CSRF désactivé et session STATELESS, aucune HttpSession n'est créée. [#ad28b56cd87034dc-1] [#ad28b56cd87034dc-2] | deducible |
| rules | - JwtFilter lit le cookie jwt puis, à défaut, l'en-tête Bearer. Sans token la requête continue en anonyme. [#fef399d03b004ac4-1] [#1c9397f1d29ff038-1] | deducible |
| rules | - Le contexte devient authentifié seulement si le token est valide pour l'utilisateur et si le jti est actif. [#899c7ea5383e6ca6-1] | deducible |
| rules | - Le cookie jwt est toujours HttpOnly et SameSite Lax, et dure deux jours comme le token. Secure et Domain viennent de app.cookie.*. [#03a820aa895fbd68-1] [#44a12a49a4222fe7-1] [#1d5bb827d7e881fd-1] [#576b8e44a57e017a-1] [#3e44a2721972a4a7-1] | deducible |
| rules | - Le logout efface le cookie et aboutit même avec un token expiré ou malformé. [#3cadf6fc90bdd39e-1] [#6f4fd7175cc688af-2] | deducible |
| rules | - L'autorité accordée est la valeur brute du rôle, sans préfixe, et /register crée toujours ROLE_USER. [#d6bfbebcb81346de-1] [#98d23af3a1ea2539-1] | deducible |
| rules | - La chaîne ouvrant /api/test-support/** n'existe qu'en profil e2e. [#32ec48ae7b076e69-4] [#ba23fd92d01c6a54-1] | deducible |
| tests | - Les tests fixent qu'un jeton inconnu, de signature invalide, vide ou Bearer invalide donne le même 401 unauthorized, sans révéler l'absence du compte. [#b8cd600ee6c54ef8-1] [#a4725f8346547455-1] [#6f069449c511560e-1] [#5d1bd38fa6374df7-1] | deducible |
| tests | - Les tests fixent qu'un jeton d'export et un jeton d'authentification ne sont pas interchangeables. [#5822862f5a0bc9b4-1] [#fb56934486522018-1] | deducible |
| tests | - Les tests fixent le plafond par utilisateur (429 au-delà, Retry-After 60, 15 puis 1, sans X-RateLimit), le 401 d'un principal étranger et le passage des anonymes. [#25ff27952ab0ad57-1] [#a6ccf2b05e781477-1] [#4eedfeba9390561d-1] [#525f7db1c48296a2-1] [#28087f52d4e126cb-1] | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:76-79` | Commentaire : Selon le commentaire, un token révoqué laisse le contexte anonyme, ce qui conduit SecurityConfig à répondre 401, et la révocation est vérifiée par jti à chaque requête. | [#7bf638e03b67c801-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:58-64` | Au démarrage, la paire de clés est chargée depuis la configuration si la valeur est présente, sinon une paire RSA éphémère est générée. | [#2acb131f0ebd7c9c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:164-174` | La surcharge generateToken(Authentication) ajoute un claim jti UUID aléatoire et un claim role issu des autorités de l'utilisateur. | [#6e5f12c53197589c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:425-428` | Quand rateLimitEnabled vaut false, doFilterInternal appelle directement chain.doFilter et ignore tous les seaux de limitation. | [#34f5463dee4aedca-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:168-171` | Si jwtService.validateToken renvoie false pour le token et le CustomUserDetails construit, /me renvoie 401 unauthorized. | [#bcafc46980fb2c8b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:300-303` | Dans /refresh, un token dont la validation échoue (expiration ou signature) renvoie 401 unauthorized avant toute ré-émission. | [#754999e9442d5b02-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:328-333` | Toute JwtException levée dans /refresh, dont une expiration ou une signature invalide, renvoie 401 unauthorized. | [#754999e9442d5b02-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:23-25` | loadUserByUsername lève UsernameNotFoundException avec le message User not found lorsque le username est absent du repository. | [#57e7bd46761b02fc-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:62-68` | Une requête sans token ne reçoit aucune authentification et poursuit la chaîne de filtres en mode anonyme, le log étant au niveau debug. | [#1c9397f1d29ff038-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:222-223` | Un jeton null ou blanc lève une MalformedJwtException, sous-type de JwtException, au lieu d'une IllegalArgumentException. | [#591cd24092b70532-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:238-245` | validateToken renvoie false pour toute exception et sinon compare le sujet du token au nom d'utilisateur et vérifie que le token n'est pas expiré. | [#20744147a64efc6a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:406-413` | tunableCeiling lève une IllegalArgumentException au démarrage quand un plafond configuré est inférieur à 1. | [#4f0198a0e07b3760-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:610-618` | La méthode clientIp utilise la première valeur de X-Forwarded-For uniquement si trustForwardedHeader vaut true et que l'en-tête n'est pas vide, sinon elle retourne getRemoteAddr. | [#7d74000ff16db622-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:67-73` | La méthode refuse une clé privée RSA qui n'est pas de type CRT en levant une GeneralSecurityException, puis appelle assertLongEnough. | [#48e6f6949702d043-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:165-171` | La méthode refuse un modulus RSA de moins de MIN_MODULUS_BITS (2048) bits en levant une GeneralSecurityException. | [#105846cf9aaec1b8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:140-145` | Un appelant authentifié sans identifiant de compte est refusé en 401 unauthorized, selon le principe fail-closed décrit dans la javadoc de classe. | [#7a92a5b41b351244-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:150-155` | Lorsque le bucket est épuisé, la requête reçoit un 429 avec Retry-After via RateLimitingFilter.writeTooManyRequests, sans appeler la suite de la chaîne. | [#7a92a5b41b351244-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java:26-37` | Javadoc : Selon la javadoc de classe, la garde de JwtService.extractUsername (jeton vide ou blanc vers MalformedJwtException) est partagée par JwtFilter. | [#0fa515c1e1e3211d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:177-190` | Le test fixe que initKeyMaterial lève IllegalStateException pour une clé mal formée, avec un message qui nomme JWT_PRIVATE_KEY et PKCS#8 sans reprendre la valeur configurée. | [#da5705e3190095f0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:192-202` | Le test fixe que initKeyMaterial lève IllegalStateException pour une clé RSA de 1024 bits, le message devant mentionner 2048. | [#da5705e3190095f0-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:206-211` | Javadoc : Selon la javadoc, parseClaims doit lever une MalformedJwtException et non une IllegalArgumentException pour un jeton vide. | [#e6f735354497862d-1] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:599-600` | Javadoc : Selon la javadoc, les endpoints throttlés sous /api/auth sont permitAll et non authentifiés, ce qui motive le fait de ne pas faire confiance à X-Forwarded-For. | [#47a470781cc7c61f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:173` | Toutes les routes /api/auth/** sont accessibles sans authentification. | [#98b2cdbd7d200daa-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:174-182` | Commentaire : Les routes /api/users, /api/products, /api/events, /api/sessions, /api/me et /api/export exigent l'autorité ROLE_USER, avec la même convention de matcher pour chaque préfixe. | [#98b2cdbd7d200daa-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:183` | Commentaire : Toute requête non couverte par un matcher précédent exige un principal authentifié, sans contrôle de rôle supplémentaire. | [#98b2cdbd7d200daa-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:134-139` | Une requête anonyme ou non authentifiée n'est pas comptée et passe au filtre suivant, l'AuthorizationFilter répondant alors 401. | [#7ec7fee86ff9e720-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:170-179` | La clé de compte est construite uniquement si le principal est un CustomUserDetails porteur d'un identifiant non null, sinon la méthode renvoie null. | [#3bf0876a32c079d9-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:145-146` | Le endpoint /me lit le JWT depuis le cookie brut via @CookieValue et ne passe pas par CallerResolver, alors que la javadoc de CallerResolver décrit cette extraction comme remplacée par la lecture du contexte de sécurité. | [#36aa78900fe7b738-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:92-100` | Les exceptions JwtException sont journalisées en debug, toute autre exception est journalisée en error puis la chaîne continue en mode anonyme, sans rejet explicite de la requête. | [#20661afcf565be41-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:97-99` | En mode éphémère, la paire RS256 est régénérée à chaque démarrage et journalise un avertissement indiquant que les jetons émis sont invalidés au redémarrage. | [#6d1d59909a7eca5b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:241-244` | validateToken avale toute exception via catch (Exception) et renvoie false, sans journalisation. | [#dfeb9a6862fd5358-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:111` | Selon le commentaire de classe, la map des seaux par IP et chemin n'a aucune éviction, ce qui laisse sa taille croître avec les couples IP et chemin observés. | [#7225e4d8c88bda58-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:128-133` | La table LIMITS ne contient qu'une seule clé exacte, si bien que toute autre requête authentifiée n'est pas plafonnée par ce filtre. | [#3d2d7f98e0c7f971-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java:217-224` | Selon la javadoc, une classe @Configuration imbriquée dans un test serait ramassée par le component scan de tous les @SpringBootTest et provoquerait une collision de bean homonyme avec SecurityConfig. | [#4e183745eb20150e-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:265-266` | Selon le commentaire de test, la paire éphémère est une limite qui interdit ce mode en prod, garde-fou ProfileSafetyGuard #323. | [#45b99f776d63a593-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:78` | La durée de vie du cookie jwt et de la session enregistrée est fixée à deux jours, soit 60 × 60 × 24 × 2 secondes. | [#44a12a49a4222fe7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:83-84` | L'attribut Secure du cookie jwt est lu dans la propriété app.cookie.secure. | [#576b8e44a57e017a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:86-87` | L'attribut Domain du cookie jwt est lu dans la propriété app.cookie.domain et n'est posé que si la valeur n'est pas vide. | [#3e44a2721972a4a7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:37` | Le seul chemin ouvert par la chaîne est la constante TEST_SUPPORT_PATH_PATTERN, valant /api/test-support/**. | [#ba23fd92d01c6a54-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:26-27` | Javadoc : Selon la javadoc, les tokens de téléchargement d'export sont signés avec un secret dédié app.export.token-secret, séparé de jwt.secret depuis #323. | [#a6b728e36d491210-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:39-40` | La clé privée de signature est lue depuis la propriété jwt.private-key, avec une valeur vide par défaut. | [#9c8678588ef7b906-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:265` | Les seaux de limitation sont stockés dans une ConcurrentHashMap en mémoire, propre à chaque instance de la JVM. | [#03b7dff5982812dc-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:373` | Le constructeur lit la propriété app.rate-limit.trust-forwarded-header avec la valeur par défaut false, qui pilote la confiance accordée à X-Forwarded-For. | [#4fe1dcaa01e92220-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:374` | Le constructeur lit la propriété app.rate-limit.enabled avec la valeur par défaut true, et doFilterInternal laisse passer toutes les requêtes sans contrôle quand elle vaut false. | [#4fe1dcaa01e92220-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:76` | L'expression de placeholder lit les origines CORS autorisées depuis app.cors.allowed-origins, avec http://localhost:3000 comme valeur par défaut. | [#54930c3b746c841e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:226-235` | Commentaire : Le commentaire indique que le cookie jwt reste en SameSite=Lax, et que la protection CSRF repose sur le cookie HttpOnly et les clients fetch CORS. | [#9790d2029eefa934-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:88` | La clé de limitation est la méthode HTTP et le chemin exact PUT /api/me/preferences. | [#a45be4f888638a0b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:90-91` | Le plafond par utilisateur est fixé à 30 requêtes par minute, sans propriété de configuration, selon la javadoc de classe. | [#1d61137988d01278-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:98` | Le nombre de buckets (utilisateur, route) gardés en mémoire est plafonné à 100 000 par une LRU. | [#c9565e3232d203cd-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:114-119` | Le filtre lit la propriété app.rate-limit.enabled, avec true par défaut, et laisse passer toutes les requêtes lorsqu'elle vaut false. | [#4c6f499e43b70a14-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java:53` | La classe de test charge le fichier application-prod.properties via TestPropertySource pour résoudre les valeurs du cookie jwt en profil prod. | [#8252ff5d90fd62b8-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java:230-231` | La liste des origines CORS autorisées est injectée par @Value depuis la constante SecurityConfig.ALLOWED_ORIGINS_EXPRESSION. | [#ce087cd4dc011cbd-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:40-46` | La paire de test est générée avec KeyPairGenerator RSA initialisé à 2048 bits. | [#5b0b0f7486e11554-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:48-53` | Le helper injecte le matériel de clé privée dans JwtService par réflexion (champ privateKeyMaterial) puis appelle initKeyMaterial. | [#9c7be4d4a0eee9be-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:99-108` | Le test vérifie que le matériel de clé accepte un bloc PEM avec en-têtes et retours à la ligne, avec le même SPKI qu'une clé en base64 simple. | [#a8888d1b86460d4a-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:258-268` | Le test fixe qu'un matériel de clé vide ou blanc déclenche une paire RSA éphémère, différente à chaque instance de JwtService. | [#de3d42ef1df5bea7-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:644-653` | La constante EXPECTED_CSP fixe la politique Content-Security-Policy exacte, avec frame-ancestors none et object-src none, sans sources permissives. | [#7b90b6a7421a2ce2-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:46-47` | Le filtre est construit avec un TimeMeter et un booléen qui active ou désactive la limitation, le test utilise TimeMeter.SYSTEM_MILLISECONDS et true. | [#b0ca78d83c17d7e6-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:211-219` | Le test affirme que, lorsque le booléen de activation est à false (app.rate-limit.enabled), le filtre laisse passer un principal étranger sans le toucher. | [#897f9342829e535e-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:98-109` | Le cookie jwt est construit toujours HttpOnly, avec Path à la valeur COOKIE_PATH et SameSite à Lax, la durée de vie étant passée en paramètre. | [#03a820aa895fbd68-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:111-119` | Le login authentifie via AuthenticationManager à partir du username et du mot de passe, puis place l'Authentication dans le SecurityContextHolder et génère le JWT. | [#9807c0fff40d65d4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:127-131` | Le JWT est posé uniquement dans le cookie jwt, et le corps de la réponse de login ne contient qu'un message. | [#9807c0fff40d65d4-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:173-177` | Commentaire : Selon le commentaire, /api/auth/** est bypassé par JwtFilter, donc la révocation n'est pas vérifiée par la chaîne Security et doit l'être dans /me. | [#d95f8227e736eebc-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:185-201` | Les exceptions ExpiredJwtException, MalformedJwtException et JwtException levées dans /me renvoient toutes 401 unauthorized. | [#d95f8227e736eebc-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:210-228` | Le endpoint /register n'applique aucun contrôle de rôle sur l'appelant et crée l'utilisateur avec le rôle fixe ROLE_USER. | [#98d23af3a1ea2539-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:258-260` | Le logout efface le cookie jwt en réémettant buildJwtCookie avec une valeur vide et un maxAge à 0. | [#3cadf6fc90bdd39e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:381-389` | registerSession extrait le jti du token et ne crée aucune session si l'utilisateur est introuvable ou si le jti est absent. | [#cd20403b9fe1ce69-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:406-410` | Une JwtException pendant la révocation est ignorée sans erreur, si bien que le logout aboutit même avec un token expiré ou malformé. | [#6f4fd7175cc688af-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:14-15` | Javadoc : Selon la javadoc, la chaîne n'est active qu'en profil e2e et n'ouvre que le chemin /api/test-support/**. | [#32ec48ae7b076e69-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:22` | Javadoc : Selon la javadoc, sans profil e2e le chemin retombe sur la chaîne principale et répond 401. | [#32ec48ae7b076e69-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:27-28` | Javadoc : Selon la javadoc, le canal de test est anonyme, en lecture seule et sans état, sans HttpSession. | [#32ec48ae7b076e69-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:32-34` | La classe est annotée @Configuration et @Profile("e2e"), donc la chaîne de sécurité de test n'existe que dans ce profil. | [#32ec48ae7b076e69-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:39-41` | Commentaire : Le bean porte @Order(1), donc il est consulté avant la chaîne principale qui n'est pas ordonnée. | [#abec5e5b784c11ad-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:43` | Commentaire : La chaîne ne s'applique qu'aux requêtes qui correspondent à TEST_SUPPORT_PATH_PATTERN. | [#abec5e5b784c11ad-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:44-45` | Commentaire : Sur cette chaîne, la protection CSRF est désactivée et la gestion de session est STATELESS. | [#abec5e5b784c11ad-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:46` | Commentaire : Sur le chemin de test, toutes les requêtes sont autorisées sans authentification via permitAll. | [#abec5e5b784c11ad-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:14-16` | Javadoc : Selon la javadoc, l'identité authentifiée est peuplée en amont par JwtFilter à partir du cookie jwt ou du header Authorization Bearer. | [#82ced4a9a8092e82-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:33-35` | Javadoc : Selon la javadoc, SecurityConfig impose ROLE_USER en amont, de sorte qu'un contrôleur n'est atteint qu'authentifié. SecurityConfig n'est pas lu dans cette passe. | [#82ced4a9a8092e82-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:59-60` | currentUser lit l'Authentication dans le SecurityContextHolder et renvoie un Optional<User>. | [#c0c828341c6dbb57-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:27` | Le UserDetails renvoyé porte une seule GrantedAuthority égale à la valeur brute du champ role de l'utilisateur, sans préfixe ajouté. | [#d6bfbebcb81346de-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:24` | JwtFilter étend OncePerRequestFilter et est déclaré @Component, il est donc enregistré comme filtre de servlet une fois par requête. | [#3a7b6a8b2d3bfde3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:46-60` | Le filtre lit le token d'abord dans le cookie nommé jwt, puis, à défaut, dans l'en-tête Authorization au format Bearer. | [#fef399d03b004ac4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:105-108` | Le filtre ignore toutes les requêtes dont le chemin de servlet commence par /api/auth. | [#e18907b3ce64ed01-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:30-32` | La durée de vie des tokens est fixée à deux jours via la constante TOKEN_VALIDITY_MS, et la javadoc la rattache à BR-AUT-007. | [#1d5bb827d7e881fd-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:111-113` | La clé publique de vérification est exposée en SPKI Base64 et sert au log de démarrage, la javadoc précisant qu'elle n'est plus recopiée dans le frontend. | [#93b5b8b66d654cbe-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:130-137` | Le JWKS publié contient une seule entrée RSA de usage sig, dérivée à chaque appel de la clé de vérification courante, avec l'algorithme RS256. | [#d02ef1da9edc3272-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:154` | Les tokens sont signés en RS256 avec la clé privée, l'algorithme étant figé explicitement. | [#40d48297b0756461-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:220-236` | Toute lecture de token passe par parseClaims, qui vérifie la signature avec la clé publique, rejette les jetons vides et refuse tout algorithme autre que RS256. | [#006c110809de4e75-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:91-92` | Javadoc : Selon la javadoc, ce filtre s'exécute avant JwtFilter et ne peut donc clé que sur l'IP, ce qui a motivé le throttle par utilisateur authentifié confié à UserRateLimitingFilter. | [#98b599acaf72072e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:99-100` | Javadoc : Selon la javadoc de classe, le filtre de rate limiting est monté avant le filtre d'autorisation, donc un dépassement de quota est rejeté avant le parsing du multipart. | [#98b599acaf72072e-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:597-618` | Javadoc : Selon la javadoc, la clé de limitation est l'IP de la socket (getRemoteAddr) par défaut, car X-Forwarded-For est contrôlable par le client. | [#feebeae96e43db7c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:42-43` | La classe active la sécurité web et la sécurité au niveau méthode via @EnableWebSecurity et @EnableMethodSecurity. | [#6118b2628faba525-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:96-103` | L'AuthenticationManager repose sur un DaoAuthenticationProvider construit avec le userDetailsService et le passwordEncoder. | [#cb705a79f45cce85-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:108-109` | La chaîne de filtres désactive la protection CSRF. | [#ad28b56cd87034dc-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:156` | La session est configurée en STATELESS, donc aucune session HTTP n'est créée par Spring Security. | [#ad28b56cd87034dc-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:185-190` | Commentaire : Les réponses d'échec d'authentification et de refus d'accès sont produites par writeJsonError avec les codes 401 unauthorized et 403 forbidden. | [#ad28b56cd87034dc-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:194` | Commentaire : Le rateLimitingFilter est placé avant le filtre UsernamePasswordAuthenticationFilter, donc avant jwtFilter. | [#ad28b56cd87034dc-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:202` | Commentaire : Le userRateLimitingFilter est placé avant AuthorizationFilter, donc après l'authentification posée par jwtFilter. | [#ad28b56cd87034dc-5] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:211-215` | Commentaire : La configuration CORS autorise les identifiants et les en-têtes Authorization, Content-Type et Cookie. | [#9fe690aaca62310d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:225` | Commentaire : Les en-têtes exposés au navigateur sont Set-Cookie et Retry-After. | [#9fe690aaca62310d-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:148-149` | Le bucket est indexé par l'identifiant de compte suivi de la méthode et du chemin, avec un bucket par minute créé à la demande. | [#8c0ce53d79d11153-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:24` | Javadoc : Selon la javadoc de classe, la signature d'authentification passe de HS256 à RS256 pour permettre la vérification côté Edge du frontend sans publier de clé de signature. | [#186206f32cc3a216-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:29-30` | Javadoc : Selon la javadoc de classe, aucune clé n'est committée et la paire RSA de test est générée dans une méthode @BeforeAll. | [#8005b20ae94ead13-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java:36-38` | Javadoc : Selon la javadoc, le test passe par la vraie chaîne Spring Security où JwtFilter pose le principal et UserRateLimitingFilter le lit avant l'autorisation. | [#f0db7050b8653b7c-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java:36-38` | Javadoc : Selon la javadoc, les requêtes de test traversent Tomcat, le pare-feu StrictHttpFirewall, JwtFilter, le limiteur puis le routage MVC, sans court-circuit MockMvc. | [#53fa048f99fc2d28-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:61-68` | Javadoc : Selon la javadoc, le bean de test rateLimitTimeMeter remplace le bean TimeMeter de SecurityConfig pour piloter la fenêtre de limitation sans attente réelle. | [#e56b7e4d25bd05ea-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:195` | Javadoc : Selon la javadoc du test de non-régression #58, RateLimitingFilter est placé avant l'AuthorizationFilter, si bien qu'un 429 court-circuite la requête même sans JWT valide. | [#b5ece9354720a9bf-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java:27-31` | Javadoc : Selon la javadoc, le test passe par la vraie chaîne Spring Security via @AutoConfigureMockMvc, pour que le RateLimitingFilter soit appliqué. | [#24ca424fcd8a0d38-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java:49-55` | Une @TestConfiguration remplace le bean rateLimitTimeMeter par un ControllableTimeMeter pour piloter la fenêtre du rate limit sans attente réelle. | [#93d188c7a2fde6e3-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:21-23` | Javadoc : Selon la javadoc, l'application est STATELESS via SessionCreationPolicy.STATELESS dans SecurityConfig, avec une authentification par cookie JWT HttpOnly et sans HttpSession serveur. | [#2cc6346d5dc0f499-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:36-40` | Javadoc : Selon la javadoc, un principal authentifié qui n'est pas un CustomUserDetails est refusé en 401 (fail-closed) par UserRateLimitingFilter, au lieu de passer hors plafond. | [#c834ee4dab2c86fc-1] |
