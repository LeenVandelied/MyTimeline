# Annexe : authorization

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` | 33 | test_case 26, convention 6, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 24 | validation 8, convention 7, config 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 21 | convention 11, endpoint 4, role_check 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 18 | other 6, validation 5, config 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java` | 17 | test_case 12, other 2, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java` | 15 | business_rule 4, convention 4, suspicious 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 13 | convention 6, other 2, external_call 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 12 | business_rule 3, other 3, config 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java` | 12 | test_case 8, convention 2, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java` | 11 | other 5, convention 3, validation 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java` | 10 | convention 4, validation 3, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenServiceTest.java` | 10 | test_case 9, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java` | 10 | test_case 6, convention 3, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java` | 9 | test_case 5, convention 2, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java` | 8 | test_case 5, convention 2, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java` | 7 | other 4, validation 2, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 7 | test_case 6, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitTunableCeilingTest.java` | 7 | test_case 5, other 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java` | 5 | convention 3, validation 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java` | 5 | convention 2, test_case 2, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java` | 4 | convention 2, config 1, endpoint 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java` | 4 | convention 2, other 1, validation 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerDevProfileCookieTest.java` | 4 | test_case 2, other 1, suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CallerResolverTest.java` | 4 | test_case 4 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java` | 4 | convention 2, other 1, test_case 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfigWriteJsonErrorTest.java` | 4 | test_case 3, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitConfig.java` | 3 | other 2, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java` | 3 | convention 1, suspicious 1, test_case 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizerTest.java` | 3 | test_case 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java` | 3 | test_case 2, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitDefaultCeilingsIntegrationTest.java` | 3 | test_case 2, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitE2eProfileIntegrationTest.java` | 3 | test_case 2, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingDisabledIntegrationTest.java` | 3 | config 1, other 1, test_case 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetails.java` | 2 | other 1, suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/AuthErrorContractIntegrationTest.java` | 2 | test_case 2 |

## Structure (suite) {#t-structure_overflow}

| Pointeur | Symbole | Énoncé | Fait |
|---|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:173` | SecurityConfig.securityFilterChain | Toutes les routes /api/auth/** sont publiques (permitAll). | [#8bc3a1ce71fe4ba9-3] |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Le filtre JWT lit le cookie jwt puis l'en-tête Bearer, et ignore toutes les routes /api/auth. [#f6e75e0a5e5133b6-1] [#46ef396b46b51aa9-1] | deducible |
| rules | - Les tokens d'export portent le type export-download, et verify renvoie vide pour tout autre type. [#d8826804a37c379f-1] | deducible |
| rules | - L'IP de session est anonymisée (dernier octet IPv4 à zéro, IPv6 compressée rejetée en null). [#bbcbbc470a2c01f0-1] [#7c998a23437b5ed1-2] [#9f6301fc68e15c21-1] | deducible |
| rules | - La clé de limitation est l'IP du socket, X-Forwarded-For n'étant lu que si trust-forwarded-header est vrai (faux par défaut). [#454cce6a9210f047-2] [#e19475c1bbc12f34-1] | deducible |
| surface | - Les routes /actuator/health et /error sont également ouvertes sans authentification. [#8bc3a1ce71fe4ba9-1] [#8bc3a1ce71fe4ba9-2] | deducible |
| tests | - Les tests fixent que le reset-password est limité à 5 tentatives par token quelle que soit l'IP. [#3a1d4eba463adcd8-1] [#3a1d4eba463adcd8-2] | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:231` | Le plafond par token est fixé à 5 tentatives par fenêtre d'une minute, constante non configurable. | [#6c4a9b97036ab115-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:425-428` | Quand la limitation est désactivée, doFilterInternal transmet la requête à la chaîne sans aucun contrôle. | [#d3225cdbefff589a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:459-462` | Seule la paire POST /api/auth/reset-password déclenche en plus le contrôle par token, qui passe par handleResetPasswordTokenThrottle. | [#4984030ad4075ec2-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:501-510` | Le contrôle par token ne s'applique que si le token extrait est non vide et de longueur au plus 128 caractères ; sinon seule la limite par IP s'applique. | [#3b7851a0e2375f02-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:88-95` | Le plafond de PUT /api/me/preferences est de 30 requêtes par minute et par utilisateur, constante codée. | [#14fc3c289ebcf10d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:124-127` | Quand rateLimitEnabled vaut false, la requête est transmise à la chaîne sans compter. | [#0833c211a9b3191d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:135-139` | Une requête anonyme n'est pas comptée et est transmise à la chaîne, où AuthorizationFilter répond 401. | [#ef91d216c638ddd0-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:156-166` | Le /me renvoie le même 401 générique qu'un token invalide lorsque le username du token ne correspond à aucun utilisateur. | [#1f64459ad84ee7af-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:168-171` | Le /me renvoie 401 générique si validateToken renvoie false pour le token et le CustomUserDetails reconstruit. | [#1f64459ad84ee7af-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:179-182` | Le /me renvoie 401 si sessionService.isSessionActive renvoie false pour le jti du token, donc pour un jti révoqué ou inconnu. | [#1f64459ad84ee7af-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:191-201` | Toute JwtException levée dans /me, dont SignatureException, est rattrapée et renvoie un 401 générique. | [#71768ef1221dd0c4-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:282-289` | Le refresh renvoie le même 401 générique qu'un token invalide lorsque le username du token ne correspond à aucun utilisateur. | [#71768ef1221dd0c4-4] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:311-314` | Le refresh renvoie 401 si le jti du token n'est pas actif, donc pour un token révoqué même encore valide. | [#71768ef1221dd0c4-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:328-333` | Toute JwtException levée dans le refresh renvoie un 401 générique et jamais une réémission de token. | [#45963e6abfde34bd-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:402-411` | revokeSessionSilently ne fait rien si le token est null ou vide, et avale les JwtException levées par extractJti. | [#ce32ba49f6d0e534-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:64-68` | currentUser renvoie Optional.empty si l'authentification est absente, non authentifiée ou anonyme. | [#99a5ef0b25688c6e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:69-72` | currentUser renvoie Optional.empty si le nom du principal est null ou vide. | [#99a5ef0b25688c6e-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:34-37` | Une IPv6 contenant "::" renvoie null et n'est pas tronquée. | [#9f6301fc68e15c21-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:46-47` | Commentaire : Un format d'IP non reconnu renvoie null et rien n'est stocké. | [#9f6301fc68e15c21-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:25` | Un username absent lève UsernameNotFoundException avec le message User not found. | [#0e335be309423a61-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:65-83` | Au démarrage, un secret non décodable en Base64 standard ou de moins de 32 octets lève IllegalStateException sans journaliser la valeur. | [#74e368afa0b30e7b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:120-122` | verify renvoie Optional.empty si le claim typ n'est pas export-download, ce qui isole ces tokens des tokens d'authentification. | [#d8826804a37c379f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:126-134` | verify attrape toute RuntimeException et renvoie Optional.empty sans détail d'erreur. | [#d8826804a37c379f-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:86-90` | Si la validation du jeton ou la vérification de session échoue, le contexte reste anonyme et un message debug est journalisé. | [#a96762a98f4f12bc-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:81-91` | Une clé invalide fait échouer le démarrage par IllegalStateException, sans journaliser la valeur ni le message de l'exception, seulement son type. | [#6360ce8288ddaeff-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:220-223` | parseClaims lève MalformedJwtException pour un jeton null ou blanc, avant tout parsing. | [#c9ffe973525260e3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:229-233` | Tout jeton dont l'en-tête n'annonce pas RS256 est refusé par UnsupportedJwtException. | [#c9ffe973525260e3-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:238-245` | validateToken exige que le sujet du jeton corresponde au username du UserDetails et que le jeton ne soit pas expiré. | [#fb1379c87ec9acba-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:242-244` | Toute exception levée pendant la validation fait renvoyer false à validateToken. | [#fbaec435c4ca8a5b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:433-436` | Le chemin est normalisé (décodé, contexte retiré) par UrlPathHelper avant la recherche dans la table des limites, ce qui empêche de contourner la limite par un encodage pourcent. | [#ef1ceb9ef6e0e2d9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:482-485` | Si Content-Length dépasse 8 Kio, le corps n'est pas bufferisé et le contrôle par token est sauté. | [#fea6a7ed68a4df50-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:67-72` | Une clé privée non CRT est refusée par une GeneralSecurityException, car la clé publique ne peut pas en être dérivée. | [#b35aa50b9a94d73f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:147-155` | asRsa refuse une clé publique non RSA avec une GeneralSecurityException avant la publication JWKS. | [#ffd4d59416ca11e8-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:165-171` | Un modulus RSA inférieur à 2048 bits est refusé par une GeneralSecurityException lors du chargement de la clé. | [#ad94765637b5f497-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:141-145` | Un principal authentifié sans identifiant de compte est refusé en 401 unauthorized (fail-closed), sans être compté. | [#ef91d216c638ddd0-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:151-155` | Quand le bucket est épuisé, la requête reçoit un 429 écrit par RateLimitingFilter.writeTooManyRequests avec Retry-After. | [#ef91d216c638ddd0-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:192-202` | Le test fixe que initKeyMaterial lève IllegalStateException pour une clé RSA de 1024 bits, le message mentionnant 2048. | [#d5b19d3ec8ffffa2-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitTunableCeilingTest.java:80` | Le constructeur du filtre refuse une valeur de plafond inférieure à 1 avec une IllegalArgumentException au boot. | [#426f7fd182552932-1] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:82-83` | Le jeton authentifié reçoit ses autorités depuis userDetails.getAuthorities(), donc les contrôles de rôle dépendent de l'implémentation de UserDetailsService. | [#86b78ba7d0919381-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:176` | Commentaire : Les routes /api/events/** exigent l'autorité ROLE_USER. | [#20c936dfaa725a62-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:182` | Commentaire : Les routes /api/export/** exigent l'autorité ROLE_USER. | [#97bb366257dc7594-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:183` | Commentaire : Toute autre requête exige une authentification via anyRequest().authenticated(). | [#20c936dfaa725a62-3] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:66` | Le constructeur reçoit un CustomUserDetailsService nommé userDetailsService mais ne l'affecte à aucun champ de la classe. | [#7ee28be5964c768b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:173-177` | Selon le commentaire, /api/auth/** est bypassé par JwtFilter, donc la révocation n'est pas vérifiée par la chaîne Security et le contrôle est fait dans le contrôleur. | [#0f8f0c618cab0f72-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetails.java:40-41` | Le commentaire indique que les contrôles de compte restent à implémenter, et les méthodes de statut de compte renvoient true. | [#4d2974e303bf7b00-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:78-79` | Selon le commentaire, un token révoqué laisse le contexte anonyme et la réponse 401 est produite par SecurityConfig.authenticationEntryPoint, fichier non inclus dans ce lot. | [#af86537e34083429-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:145-156` | generateToken(String) n'ajoute aucun claim jti, contrairement à la surcharge generateToken(Authentication) qui en génère un pour chaque jeton. | [#7daa5bfd6bbe5c58-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:108-111` | Selon la javadoc de classe, les limites sont par instance : avec N réplicas derrière un répartiteur, le plafond effectif est N fois la limite configurée. | [#f3607fc5c5498940-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:265` | La map des compartiments par IP et chemin n'a pas d'éviction ; la javadoc de classe l'admet et annonce une révision si l'espace de clés grandit. | [#41dd62aea9e27bf0-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:317` | Selon la javadoc du champ, ProfileSafetyGuard refuse le démarrage en prod effectif quand la limitation est désactivée ; ce refus est hors de ce fichier. | [#892ed24198145182-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:199-201` | Selon le commentaire, un addFilterAfter(…, JwtFilter.class) n'est pas garanti de trouver jwtFilter, car il est injecté en @Lazy sous forme de proxy. | [#20c936dfaa725a62-4] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerDevProfileCookieTest.java:134` | Le test passe par MockMvc standalone sur AuthController seul, il n'exerce ni SecurityConfig ni JwtFilter. | [#61b557ebf16d9a04-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java:44-47` | Selon la javadoc, les placeholders DB_PASSWORD, CORS_ALLOWED_ORIGINS et STORAGE_AVATAR_PATH de application-prod.properties sont sans valeur par défaut et ne sont pas résolus dans ce contexte minimal, ce qui est un cas non couvert par le test. | [#5a3cbe961913151c-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java:141-150` | Selon la javadoc, une variable APP_CORS_ALLOWED_ORIGINS exportée vide rend CORS refusant toutes les origines, et le correctif retenu consiste à ne jamais la déclarer dans un fichier chargé automatiquement, sans garde-fou blanc vers défaut dans SecurityConfig. | [#2763c0c8c10f2d3e-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:28` | La javadoc affirme que ces tests sont exécutés en CI systématiquement, alors que CLAUDE.md du projet indique CI Aucun. | [#6ffda618975aeb38-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:39-40` | Selon la javadoc, le cas d'un principal authentifié hors CustomUserDetails est inatteignable par la chaîne réelle et ne peut être produit qu'en posant le contexte à la main. | [#a6d52ce30e287272-1] |

## Endpoints {#t-endpoint}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:43-46` | Commentaire : La chaîne de test ouvre le chemin /api/test-support/** à toutes les requêtes sans authentification via anyRequest().permitAll(). | [#29834486a5e7f72f-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:73-74` | Si le contexte de sécurité est vide, le filtre charge l'utilisateur via UserDetailsService à partir du subject du jeton. | [#bf058b267a9f5a0f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:644-648` | La réponse 429 porte uniquement l'en-tête Retry-After, en type application/json, avec le corps générique too_many_requests, sans en-tête X-RateLimit. | [#58e6409667bf91c9-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:78` | La durée de vie du cookie jwt et de la session enregistrée est fixée à deux jours en secondes. | [#0b2c93fb218c098f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:83-84` | L'attribut Secure du cookie jwt est injecté depuis la propriété app.cookie.secure. | [#14d0f1bd964c4c7d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:86-87` | L'attribut Domain du cookie jwt est injecté depuis la propriété app.cookie.domain. | [#fd50fbed31accdb3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:33-34` | La classe de configuration de la chaîne de test est annotée @Profile("e2e") et n'existe donc que dans ce profil. | [#acda6f4b59cf5bd6-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:50-51` | Le secret de signature des tokens d'export est injecté depuis la propriété app.export.token-secret. | [#1c09c53b23e982bd-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:32` | La durée de vie des jetons est fixée à deux jours par une constante publique. | [#43cd43636bd862bb-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:39-40` | La clé privée de signature est lue depuis la propriété jwt.private-key, avec une valeur vide par défaut. | [#0a82116312df662d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:58-64` | Au démarrage, si la clé privée est vide une paire RSA éphémère est générée, sinon la clé configurée est chargée. | [#77f20da63fc7487d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitConfig.java:23-26` | Le bean TimeMeter nommé rateLimitTimeMeter fournit la source de temps des buckets de rate limiting, avec TimeMeter.SYSTEM_NANOTIME en production. | [#b5d374d654448f84-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:373-374` | La propriété app.rate-limit.trust-forwarded-header vaut false par défaut, et app.rate-limit.enabled vaut true par défaut. | [#e19475c1bbc12f34-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:76` | Les origines CORS sont lues depuis la propriété app.cors.allowed-origins, avec http://localhost:3000 en valeur par défaut. | [#ae9963070524a927-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:211-213` | Commentaire : La configuration CORS active allowCredentials à true et applique les origines configurées. | [#ef3c62108ec2c748-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:94-95` | Les limites par route sont une constante Map.of codée en dur, sans propriété de configuration. | [#485955adb2298a8b-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:114-119` | Le filtre est désactivable par la propriété app.rate-limit.enabled, dont la valeur par défaut est true. | [#ce501683220be0d6-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:77-78` | Le setUp injecte par réflexion cookieSecure à true et cookieDomain à mytimeline.example dans AuthController, sans passer par Spring. | [#a85bfcf10ff3f0bd-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java:44` | La constante de test désigne la variable d'environnement APP_CORS_ALLOWED_ORIGINS comme pilote de app.cors.allowed-origins en profil dev. | [#b7ae165b13b4e2f0-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitE2eProfileIntegrationTest.java:28` | Javadoc : Selon la javadoc, la stack E2E tourne avec le filtre de limitation armé depuis #547. | [#d497fe374b280812-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:91-96` | Javadoc : Selon la javadoc, la clé de limitation est l'adresse socket remoteAddr, car X-Forwarded-For est ignoré par défaut via la propriété app.rate-limit.trust-forwarded-header. | [#88d3a03dc75af1a3-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingDisabledIntegrationTest.java:28-30` | La classe de test désactive le rate limiting via la propriété app.rate-limit.enabled=false, dans un contexte Spring distinct de la suite toujours active. | [#f114140ab5886803-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java:38-40` | La classe de test démarre le contexte Spring Boot avec allow-bean-definition-overriding à true, puis active MockMvc avec la chaîne de sécurité complète. | [#82c151e9191119d2-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:210-218` | Le test fixe qu'avec le commutateur app.rate-limit.enabled à false, le filtre de limitation par utilisateur reste inerte, même pour un principal étranger. | [#3cb545553201e896-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:98-109` | Le cookie jwt est construit avec HttpOnly, Secure lu en configuration, Path à la racine, Domain seulement si non vide et SameSite Lax. | [#0b02e0ffe1c36b2e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:118-119` | Après authenticate, le login place l'Authentication dans le SecurityContextHolder puis génère le token JWT. | [#aead2d24ee2c1154-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:127-131` | Le login pose le JWT uniquement dans le cookie jwt et renvoie dans le corps seulement un message de succès. | [#aead2d24ee2c1154-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:146` | Le endpoint /me lit le JWT uniquement depuis le cookie jwt via @CookieValue et ne lit pas l'en-tête Authorization. | [#6fe0d789832e1431-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:221-228` | L'inscription attribue en dur le rôle ROLE_USER au nouvel utilisateur, sans paramètre de rôle dans la requête. | [#451be34991dcd0e9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:390-395` | L'enregistrement de session persiste l'IP anonymisée via ClientIpAnonymizer et non l'adresse distante complète. | [#bbcbbc470a2c01f0-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:390-395` | La session enregistrée expire à la même échéance que le cookie jwt, soit COOKIE_MAX_AGE secondes après la création. | [#bbcbbc470a2c01f0-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:40-46` | Commentaire : Une SecurityFilterChain dédiée, ordonnée à 1, est restreinte par securityMatcher au seul chemin de test. | [#5c51836231285cad-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:44-45` | Commentaire : La chaîne de test désactive CSRF et passe la gestion de session en STATELESS. | [#5c51836231285cad-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:73-74` | La résolution du User du caller passe par le port UserService et renvoie Optional.empty si aucun compte ne correspond. | [#0fc229f09fd1eed3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:19-21` | anonymize renvoie null si l'IP est null ou vide. | [#7c998a23437b5ed1-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:25-28` | Une IPv4 à quatre octets décimaux voit son dernier octet remplacé par zéro. | [#7c998a23437b5ed1-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ClientIpAnonymizer.java:38-42` | Une IPv6 non compressée conserve ses trois premiers hextets suivis de deux-points doubles. | [#7c998a23437b5ed1-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:23-27` | loadUserByUsername charge le User via le port UserRepository par son username. | [#9c5d8fc04a9de815-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:27` | Une seule autorité est construite à partir du rôle du User, sous la forme SimpleGrantedAuthority. | [#9c5d8fc04a9de815-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:26-27` | Javadoc : Selon la javadoc, les tokens d'export utilisent une signature HMAC HS256 sur un secret dédié, séparé de l'authentification. | [#f7ef9d9f0bead836-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:85-88` | La clé de signature est décodée en Base64 puis construite en clé HMAC via Keys.hmacShaKeyFor. | [#f9ea39ae95757724-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:94-103` | sign produit un JWT HS256 portant sub égal au jobId, uid égal à l'ownerId, typ égal à export-download et une expiration fournie. | [#3fab3c2439483928-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:114-119` | verify contrôle la signature HMAC et l'expiration contre le Clock injecté via Jwts.parser. | [#395eed39142c0760-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:46-60` | Le filtre lit le jeton d'abord dans le cookie nommé jwt, puis dans l'en-tête Authorization au format Bearer si aucun cookie ne le fournit. | [#f6e75e0a5e5133b6-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:62-68` | Lorsqu'aucun jeton n'est trouvé, le filtre journalise en debug et poursuit la chaîne sans authentifier la requête. | [#f6e75e0a5e5133b6-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:80-81` | Chaque requête portant un jeton vérifie le jti via le port SessionService.isSessionActive, en plus de la signature et de l'expiration. | [#f6e75e0a5e5133b6-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:92-96` | Les JwtException (expiration, format, signature) sont interceptées et journalisées en debug, la requête restant anonyme. | [#197122bdd1e5948a-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:97-100` | Toute autre exception est interceptée et journalisée en error, puis la chaîne de filtres continue. | [#af86537e34083429-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:106-108` | Le filtre est ignoré pour toutes les routes dont le chemin de servlet commence par /api/auth. | [#46ef396b46b51aa9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:145-156` | generateToken(String) signe le jeton en RS256 avec la clé privée et fixe l'expiration à partir de TOKEN_VALIDITY_MS, sans claim jti. | [#7daa5bfd6bbe5c58-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:164-174` | generateToken(Authentication) ajoute un UUID comme claim jti, le claim role issu des autorités, et signe en RS256. | [#7daa5bfd6bbe5c58-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:224-227` | La signature du jeton est vérifiée avec la clé publique de vérification via parseSignedClaims. | [#b4abadd3d950429f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:90-92` | Javadoc : Selon la javadoc de classe, PUT /api/me/preferences n'est pas dans la table de ce filtre mais est limité par utilisateur authentifié par UserRateLimitingFilter, car ce filtre s'exécute avant JwtFilter et ne voit que l'IP. | [#948cf8b91f5231d8-5] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:99-100` | Javadoc : Selon la javadoc de classe, ce filtre s'exécute avant le filtre d'autorisation, de sorte qu'une requête en dépassement est rejetée avant le parsing du multipart. | [#948cf8b91f5231d8-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:442-444` | Chaque compartiment est indexé par IP et par couple méthode et chemin, de sorte que GET et POST sur la même URI ont des compartiments distincts. | [#ef1ceb9ef6e0e2d9-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:610-618` | La clé de limitation est l'adresse IP du socket (getRemoteAddr) ; le premier saut de X-Forwarded-For n'est utilisé que si trustForwardedHeader est vrai. | [#454cce6a9210f047-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:103-105` | toSpkiBase64 encode la clé publique au format SPKI en Base64 standard, sans donnée privée. | [#2ea47e30d969cd50-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:138-145` | jwkThumbprint calcule le SHA-256 de la forme JWK canonique (e, kty, n) en Base64url sans padding, valeur utilisée comme kid. | [#84ae8c2cf16c4ba1-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:158-163` | base64UrlUnsigned retire l'octet de signe 0x00 ajouté par BigInteger.toByteArray avant l'encodage Base64url du modulus et de l'exposant. | [#5e8a159cd90adf80-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:41-43` | La classe active la sécurité web et la sécurité au niveau méthode par les annotations @EnableWebSecurity et @EnableMethodSecurity. | [#f4f137f56892cc79-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:80` | Le constructeur injecte JwtFilter en @Lazy, pour éviter une dépendance circulaire au démarrage. | [#2cb55328a8ddf794-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:96-102` | L'AuthenticationManager est un ProviderManager qui s'appuie sur un DaoAuthenticationProvider couplé au UserDetailsService et au PasswordEncoder. | [#924c29fbd827888e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:109` | La protection CSRF est désactivée sur la chaîne de filtres. | [#93676e7880662cfc-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:156` | La politique de session est STATELESS, aucune session serveur n'est créée. | [#20c936dfaa725a62-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:187` | Commentaire : La réponse d'un point d'entrée non authentifié est un 401 avec le corps JSON produit par writeJsonError, code unauthorized. | [#20c936dfaa725a62-5] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:189` | Commentaire : Un accès refusé renvoie un 403 avec le corps JSON produit par writeJsonError, code forbidden. | [#20c936dfaa725a62-6] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:194-195` | Commentaire : rateLimitingFilter et jwtFilter sont insérés avant UsernamePasswordAuthenticationFilter, dans cet ordre. | [#13b3d505076e28f3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:202` | Commentaire : userRateLimitingFilter est inséré avant AuthorizationFilter, donc après l'authentification posée par jwtFilter. | [#20c936dfaa725a62-7] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:232-234` | Commentaire : Selon le commentaire, la protection CSRF repose sur l'absence de form-POST navigateur et sur le cookie HttpOnly avec des clients fetch CORS. | [#20c936dfaa725a62-8] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:261-267` | writeJsonError écrit une réponse JSON de la forme error et reste package-private pour être réutilisée par UserRateLimitingFilter. | [#d398379ffa312273-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:84-85` | UserRateLimitingFilter est un composant Spring qui étend OncePerRequestFilter et limite par utilisateur authentifié. | [#4967cc3e212efe58-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:148-149` | Un bucket est créé par couple identifiant de compte et route, clé userKey suivie de la méthode et du chemin. | [#0833c211a9b3191d-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java:52-53` | La classe de test utilise un contexte Spring minimal (SpringJUnitWebConfig) avec collaborateurs mockés, et charge classpath:application-prod.properties pour résoudre les attributs cookie. | [#6508c16485bcbbda-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java:26-32` | Javadoc : Selon la javadoc, le test charge le vrai application-dev.properties et résout la vraie expression de placeholder SecurityConfig.ALLOWED_ORIGINS_EXPRESSION, puis vérifie la liste posée par corsConfigurationSource(). | [#71f8efd07dd0f3e4-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java:217-224` | Javadoc : Selon la javadoc, la classe de test utilise @TestConfiguration et non @Configuration, afin d'être exclue du component scan des autres @SpringBootTest. | [#18a719335d23533e-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:24-26` | Javadoc : Selon la javadoc, la signature d'authentification passe de HS256 à RS256 pour permettre la vérification côté Edge dans frontend/middleware.ts sans publier de clé de signature. | [#f5fd2f40247ba684-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java:37-38` | Javadoc : Selon la javadoc, le filtre de limitation par utilisateur lit le principal posé par JwtFilter juste avant l'autorisation. | [#cbf0c99cf6bf91d5-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java:45-46` | Javadoc : Selon la javadoc, un filtre monté avant l'authentification ne compterait aucune requête, et le premier test doit le détecter. | [#cbf0c99cf6bf91d5-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java:37` | Javadoc : Selon la javadoc, les tests de variantes de chemin passent par un vrai serveur pour traverser Tomcat, le pare-feu, JwtFilter puis le limiteur. | [#4e8a6ccfb48eddcb-3] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java:52` | Javadoc : Selon la javadoc, les requêtes de ces tests sont authentifiées, pour qu'un 401 ne masque pas le routage. | [#4e8a6ccfb48eddcb-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitDefaultCeilingsIntegrationTest.java:28` | Javadoc : Selon la javadoc, le jeton bucket4j est consommé avant le contrôleur, quel que soit le résultat applicatif de la requête. | [#f2a817d32133d78b-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:40-42` | Javadoc : Selon la javadoc, la classe passe par la vraie chaîne de filtres Spring Security, de sorte que le RateLimitingFilter et la configuration des en-têtes de SecurityConfig s'exécutent réellement. | [#1f1977016bbaf972-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:48-49` | La classe de test démarre le contexte Spring Boot complet avec MockMvc et l'autoconfiguration qui applique la chaîne de filtres Spring Security, avec la surcharge de beans autorisée. | [#1f1977016bbaf972-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:65-71` | Une classe de configuration de test déclare un bean rateLimitTimeMeter de type ControllableTimeMeter qui remplace le TimeMeter de production de SecurityConfig pour piloter la fenêtre d'une minute sans attente réelle. | [#10e1dcb84bdb7f8b-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:73-89` | La classe ControllableTimeMeter implémente l'interface TimeMeter de bucket4j avec une horloge en nanosecondes avancée manuellement par la méthode advance, sans être liée à l'horloge murale. | [#c4dd99b04e72cca6-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:548-561` | Le helper assertRetryAfterContract vérifie que chaque 429 porte un Retry-After entier compris entre 1 et 60 secondes et qu'aucun en-tête X-RateLimit-* n'est émis. | [#56e6d855e584fc01-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:644-653` | La constante EXPECTED_CSP fixe la politique Content-Security-Policy exacte attendue, avec default-src, script-src, style-src et frame-ancestors none, sans 'unsafe-inline'. | [#9ee195dfeb4b43e0-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java:30-31` | Javadoc : Selon la javadoc, le test passe par la vraie chaîne Spring Security, donc le RateLimitingFilter s'applique aux requêtes. | [#c66e121df6e12c83-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java:48-55` | Une classe TestConfiguration remplace le bean rateLimitTimeMeter par un ControllableTimeMeter pilotable, afin d'avancer la fenêtre de limitation sans attente réelle. | [#12b6f3f8bbf24bd3-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java:80-87` | Le helper reset fixe une adresse distante différente à chaque requête, ce qui neutralise le throttle par IP pendant le test du throttle par token. | [#ab7d650673977f72-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfigWriteJsonErrorTest.java:19-25` | Javadoc : Selon la javadoc, writeJsonError ne doit plus concaténer le JSON à la main. | [#71c967ee9ad64977-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:21-23` | Javadoc : Selon la javadoc, l'acceptation de la CVE repose sur une politique SessionCreationPolicy.STATELESS et une authentification par cookie JWT HttpOnly, sans HttpSession serveur. | [#17f6be83bd05c1cb-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:33-34` | Javadoc : Selon la javadoc, une règle ArchUnit nommée productionCodeShouldNotUseHttpSession complète ce garde-fou par une vérification statique du code de production. | [#dfdf8e57a3c9a03c-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:33-38` | Javadoc : Selon la javadoc, le filtre de limitation par utilisateur refuse en 401, sans passage, tout principal authentifié qui n'est pas rattachable à un identifiant de compte. | [#e9f6b77c109a95b7-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:36-37` | Javadoc : Selon la javadoc, l'ancien repli sur le nom du principal est supprimé et seul JwtFilter authentifie, toujours avec un CustomUserDetails chargé en base. | [#d20c6bedaf84195f-1] |
