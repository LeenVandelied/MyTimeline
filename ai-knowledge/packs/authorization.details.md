# Annexe : authorization

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java` | 21 | convention 8, other 7, config 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 20 | convention 11, config 4, role_check 4 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java` | 20 | test_case 12, convention 5, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 16 | convention 8, state_transition 3, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 15 | convention 7, config 3, other 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 13 | test_case 13 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 12 | convention 5, validation 3, other 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java` | 9 | test_case 8, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 8 | convention 5, business_rule 1, external_call 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java` | 7 | convention 4, test_case 2, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java` | 6 | convention 3, test_case 2, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java` | 4 | config 2, convention 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java` | 4 | convention 3, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java` | 4 | validation 3, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/AuthErrorContractIntegrationTest.java` | 4 | test_case 3, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java` | 4 | other 2, convention 1, test_case 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CallerResolverTest.java` | 3 | test_case 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java` | 3 | convention 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfigWriteJsonErrorTest.java` | 3 | test_case 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java` | 2 | convention 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerDevProfileCookieTest.java` | 2 | suspicious 1, test_case 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerProdProfileCookieTest.java` | 2 | test_case 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenServiceTest.java` | 2 | test_case 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java` | 2 | convention 1, test_case 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java` | 2 | convention 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java` | 2 | config 1, convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java` | 1 | convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitDefaultCeilingsIntegrationTest.java` | 1 | convention 1 |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Les jetons sont signés en RS256 et le parsing refuse tout autre algorithme, avec une durée de vie de deux jours. [#7daa5bfd6bbe5c58-1] [#c9ffe973525260e3-1] [#450a0e1370acc130-1] | deducible |
| rules | - Le cookie jwt est HttpOnly, SameSite Lax, avec Secure et Domain lus depuis app.cookie.*, et le login ne renvoie le JWT que par ce cookie. [#0b02e0ffe1c36b2e-1] [#aead2d24ee2c1154-2] | deducible |
| rules | - Le filtre JWT lit le cookie jwt puis l'en-tête Bearer, ignore /api/auth et ne renseigne le contexte que si signature, expiration et jti actif sont valides. [#f6e75e0a5e5133b6-1] [#46ef396b46b51aa9-1] [#197122bdd1e5948a-1] | deducible |
| rules | - Le logout révoque le jti du cookie, le refresh exige un jeton valide et une session active puis révoque l'ancien jti et enregistre le nouveau. [#ed68a63fc2b66b67-1] [#10efe7ec9942ce01-1] [#78a820cabbe925f7-1] | deducible |
| rules | - Une requête anonyme n'est pas comptée, un authentifié sans identifiant de compte reçoit un 401. [#ec01adc45bc94244-1] [#ef91d216c638ddd0-1] | deducible |
| tests | - Les tests fixent qu'une clé mal formée ou de 1024 bits échoue au démarrage sans citer la valeur, et qu'une clé vide donne une paire éphémère. [#43c1e867b063ff3c-1] [#db857f66b9712a0f-1] [#3984130a369246b7-1] | deducible |
| tests | - Les tests fixent qu'un anonyme traverse le limiteur pour que l'autorisation réponde 401. [#aab32edaff52b556-1] | deducible |
| tests | - Les tests fixent un 401 JSON unauthorized sans jeton ou avec jeton invalide, et un 403 JSON forbidden sans autorité requise, via la chaîne Spring Security complète. [#6b7b176f943d1d6e-1] [#2b0651e580d6decd-1] [#85dc61653939a8c9-1] | deducible |
| tests | - Les tests fixent qu'un jeton d'export est refusé par JwtService et un jeton d'authentification par ExportTokenService. [#59e0bbca86f288c7-1] [#eab3e61c44fe8201-1] | deducible |
| tests | - Pour tester le cookie en prod, un test charge application-prod.properties via TestPropertySource, ou injecte cookieSecure par réflexion en setup standalone. [#33a46b2f30d59b71-1] [#9a1ded8654da5ea2-1] | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:80-85` | Le contexte d'authentification n'est renseigné que si la signature et l'expiration sont valides et si le jti du jeton est reconnu comme session active. | [#197122bdd1e5948a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:30-32` | La durée de vie du jeton est fixée à deux jours via la constante TOKEN_VALIDITY_MS. | [#450a0e1370acc130-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:64-68` | currentUser renvoie Optional.empty si l'authentification est nulle, non authentifiée ou anonyme. | [#99a5ef0b25688c6e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:58-64` | Au démarrage, le matériel de clé est chargé et validé : une clé configurée invalide fait échouer le boot via IllegalStateException. | [#5bce4b2b35400bce-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:220-236` | Le parsing vérifie la signature avec la clé publique et refuse tout jeton dont l'en-tête alg n'est pas RS256 en levant UnsupportedJwtException. | [#c9ffe973525260e3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:221-223` | Un jeton null ou blanc lève MalformedJwtException, sous-type de JwtException, pour rester dans la hiérarchie attendue par les appelants. | [#c9ffe973525260e3-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:70-71` | Une clé privée RSA qui n'est pas de type CRT est refusée par une GeneralSecurityException, car la clé publique ne peut pas en être dérivée. | [#aad4f7e728fc2479-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:147-155` | Une clé publique non RSA lève une GeneralSecurityException avant toute publication JWKS. | [#ffd4d59416ca11e8-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:165-171` | Un modulus RSA de moins de MIN_MODULUS_BITS (2048) bits lève une GeneralSecurityException au chargement de la clé. | [#ad94765637b5f497-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:140-145` | Un appelant authentifié sans identifiant de compte reçoit un 401 unauthorized, sans être compté. | [#ef91d216c638ddd0-1] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:161` | Le chemin /actuator/health est accessible sans authentification. | [#97bb366257dc7594-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:173` | Les routes /api/auth/** sont accessibles sans authentification. | [#97bb366257dc7594-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:174-182` | Commentaire : Les routes /api/users, /api/products, /api/events, /api/sessions, /api/me et /api/export exigent l'autorité ROLE_USER, de même que le sous-chemin /api/users/{userId}/products. | [#97bb366257dc7594-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:183` | Commentaire : Toute autre requête exige une authentification. | [#97bb366257dc7594-4] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:134-139` | Une requête anonyme n'est pas comptée et passe au filtre d'autorisation en aval, qui répond 401. | [#ec01adc45bc94244-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:66` | Le constructeur reçoit un paramètre CustomUserDetailsService userDetailsService qui n'est jamais affecté à un champ ni utilisé dans le corps. | [#7ee28be5964c768b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:173-177` | Selon le commentaire, /api/auth/** est bypassé par JwtFilter, donc la révocation n'est pas vérifiée par la chaîne Security sur cette route et doit être contrôlée à la main. | [#6fe0d789832e1431-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:97-100` | Les exceptions non JwtException sont journalisées en erreur puis la chaîne continue sans authentification, le contexte restant anonyme. | [#af86537e34083429-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:108` | Selon la javadoc de classe, les limites sont par instance : derrière un répartiteur de charge à N réplicas, le plafond effectif est N fois le débit configuré. | [#f3607fc5c5498940-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:111` | Selon la javadoc de classe, les buckets par couple IP et chemin ne sont jamais évincés, la carte pouvant croître avec le nombre de couples vus. | [#41dd62aea9e27bf0-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:78-79` | Selon la javadoc, un attaquant peut faire croître le nombre de buckets en créant des comptes, et l'éviction LRU efface l'historique du moins récent. | [#28035b740c80cb01-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerDevProfileCookieTest.java:134` | Le test utilise standaloneSetup, donc la chaîne de filtres de sécurité n'est pas traversée et seul le contenu du cookie est vérifié. | [#61b557ebf16d9a04-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:28-30` | Le filtre interroge le port SessionService à chaque requête pour vérifier que le jti n'est pas révoqué. | [#c77c2fb06ca1c19b-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:83-87` | Les attributs Secure et Domain du cookie jwt sont injectés depuis app.cookie.secure et app.cookie.domain. | [#14d0f1bd964c4c7d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:32-34` | La configuration de sécurité du canal E2E n'existe que sous le profil e2e. | [#acda6f4b59cf5bd6-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:41-46` | Commentaire : La chaîne E2E ne s'applique qu'au chemin /api/test-support/** via securityMatcher. | [#ffb3a3a8c64351a1-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:39-40` | La clé privée de signature est lue depuis la propriété jwt.private-key, avec une valeur vide qui déclenche une paire RSA éphémère au démarrage. | [#0a82116312df662d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:303` | Javadoc : Selon la javadoc du champ, le défaut de trustForwardedHeader est false et ne doit rester false que si le service tourne derrière un proxy inverse de confiance. | [#19c3131987ab5742-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:425` | Lorsque app.rate-limit.enabled vaut false, doFilterInternal transmet toutes les requêtes sans appliquer aucune limite. | [#4505cafcc3a4dbe2-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:611` | La méthode clientIp n'utilise le premier saut de X-Forwarded-For que si trustForwardedHeader vaut true. | [#843166042d2f6a3e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:42-43` | La classe active la sécurité web et la sécurité au niveau méthode par les annotations @EnableWebSecurity et @EnableMethodSecurity. | [#f4f137f56892cc79-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:76` | Les origines CORS autorisées sont lues depuis la propriété app.cors.allowed-origins, avec http://localhost:3000 en repli. | [#ae9963070524a927-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:156` | La politique de session est STATELESS, aucune session HTTP n'est créée par la chaîne de sécurité. | [#93676e7880662cfc-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:211-215` | Commentaire : La configuration CORS active allowCredentials et n'autorise que les en-têtes Authorization, Content-Type et Cookie. | [#ef3c62108ec2c748-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:88` | Seule la route PUT /api/me/preferences est plafonnée par la table LIMITS. | [#589eeb31cac50d43-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:91` | Le plafond est fixé à 30 requêtes par minute et par utilisateur, sans propriété de configuration. | [#e752f9ef4f24e41f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:116` | Le filtre peut être désactivé par la propriété app.rate-limit.enabled, dont la valeur par défaut est true. | [#ce501683220be0d6-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:185` | Le message d'erreur de démarrage cite la variable JWT_PRIVATE_KEY lorsque la clé privée est invalide. | [#10f31de83256cea2-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:92-93` | Javadoc : Selon la javadoc, la clé de rate limiting est le remoteAddr du socket, et X-Forwarded-For est ignoré par défaut via app.rate-limit.trust-forwarded-header. | [#58e3283bcbef4145-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java:38-40` | La classe de test est annotée avec allow-bean-definition-overriding à true et avec @AutoConfigureMockMvc, ce qui applique la chaîne de filtres Spring Security au test. | [#82c151e9191119d2-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java:211-219` | Le constructeur de UserRateLimitingFilter reçoit un booléen d'activation, et avec ce booléen à false le filtre laisse passer les requêtes. | [#2d7737ca59da087a-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:98-109` | Le cookie jwt est construit avec HttpOnly activé, Secure lu depuis app.cookie.secure, Path à la racine, SameSite Lax et Domain seulement si la propriété n'est pas vide. | [#0b02e0ffe1c36b2e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:118-119` | Le login place l'objet Authentication dans le SecurityContextHolder puis génère le JWT à partir de cette authentification. | [#aead2d24ee2c1154-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:127-131` | La réponse de login ne contient que le message de succès, le JWT n'est transmis que par le cookie. | [#aead2d24ee2c1154-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:168-171` | Dans /me, la signature et l'expiration du token sont validées par jwtService.validateToken avant tout retour de profil. | [#8f1db677a53572c6-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:185-205` | Dans /me, ExpiredJwtException et MalformedJwtException puis tout JwtException renvoient le même 401 générique, les autres exceptions renvoient 500. | [#8f1db677a53572c6-4] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:283-300` | Dans /refresh, un username absent renvoie le même 401 que un token invalide, et le token courant doit être valide avant ré-émission. | [#78a820cabbe925f7-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:328-333` | Dans /refresh, toute JwtException renvoie 401 générique et les autres exceptions renvoient 500. | [#78a820cabbe925f7-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:402-411` | revokeSessionSilently ne fait rien si le token est null ou vide, et ignore une JwtException sans propager d'erreur. | [#337392db081b55cd-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:41-48` | Commentaire : Sur ce chemin, la chaîne applique permitAll à toutes les requêtes, sans CSRF et en session STATELESS, et est ordonnée @Order(1). | [#5c51836231285cad-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eTestSupportSecurityConfig.java:45` | Commentaire : La chaîne E2E crée les sessions en mode STATELESS, sans HttpSession. | [#5c51836231285cad-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:39` | Javadoc : Selon la javadoc, la méthode ne lève jamais d'exception et c'est l'appelant qui décide du statut HTTP. | [#0fc229f09fd1eed3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:59-60` | currentUser lit l'authentification courante depuis le SecurityContextHolder, sans extraire le JWT du cookie. | [#0fc229f09fd1eed3-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CallerResolver.java:73-74` | Un username sans User correspondant en base donne Optional.empty via findDomainUserByUsername. | [#0fc229f09fd1eed3-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:22-28` | loadUserByUsername charge le User par username et lui attribue pour unique authority le role stocké, sans préfixe ajouté. | [#9c5d8fc04a9de815-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetailsService.java:24-25` | Un username absent renvoie une UsernameNotFoundException avec le message User not found. | [#9c5d8fc04a9de815-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/ExportTokenService.java:94-103` | sign signe le token en HS256 avec la clé dérivée du secret d'export, avec subject jobId, claim uid et expiration fournie. | [#3fab3c2439483928-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:23-24` | La classe JwtFilter est un composant Spring qui étend OncePerRequestFilter pour authentifier chaque requête à partir d'un jeton JWT. | [#15df60dee66a1c9f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:46-60` | Le filtre lit le jeton d'abord dans le cookie nommé jwt, puis, à défaut, dans l'en-tête Authorization au format Bearer. | [#f6e75e0a5e5133b6-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:73` | Le filtre ne recharge pas l'authentification si le contexte de sécurité en contient déjà une. | [#f6e75e0a5e5133b6-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:86-90` | Lorsque la validation échoue, le contexte reste anonyme et le message est journalisé au niveau debug, la réponse 401 étant laissée à SecurityConfig. | [#f6e75e0a5e5133b6-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:106-108` | Le filtre ignore toutes les requêtes dont le chemin de servlet commence par /api/auth. | [#46ef396b46b51aa9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:25-26` | JwtService est un service Spring qui assure la génération, la lecture et la validation des jetons JWT signés en RS256. | [#06331b678c00eed1-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:154` | Les jetons sont signés en RS256 avec la clé privée, l'algorithme étant figé explicitement. | [#7daa5bfd6bbe5c58-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:164-172` | La variante de génération à partir d'une Authentication ajoute un claim jti UUID unique et un claim role contenant les autorités. | [#7daa5bfd6bbe5c58-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:182-187` | L'extraction du jti renvoie null pour un jeton sans claim jti, sans lever d'erreur. | [#a6456c890ea2fa34-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:238-245` | La validation renvoie false sur toute exception et exige que le sujet du jeton corresponde au nom d'utilisateur et que le jeton ne soit pas expiré. | [#7b752e752ce70a41-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:47-48` | Javadoc : Selon la javadoc de classe, seules les paires (méthode, chemin exact) listées dans DEFAULT_LIMITS sont limitées, les autres requêtes passent sans contrôle. | [#299d4d6e79a70d25-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:92` | Javadoc : Selon la javadoc de classe, ce filtre s'exécute avant JwtFilter, ce qui limite la clé de débit à l'IP et exclut une limite par utilisateur authentifié à ce niveau. | [#948cf8b91f5231d8-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:99` | Javadoc : Selon la javadoc de classe, ce filtre est monté avant le filtre d'autorisation, de sorte qu'une requête en dépassement est rejetée avant l'autorisation. | [#ef1ceb9ef6e0e2d9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:115` | La classe RateLimitingFilter, annotée @Component, étend OncePerRequestFilter, donc le contrôle de débit s'exécute comme filtre de servlet une fois par requête. | [#948cf8b91f5231d8-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:433` | Le chemin utilisé pour la recherche est décodé et débarrassé du context-path via getPathWithinApplication avant la comparaison, afin qu'une URI réencodée ne contourne pas la limite. | [#ef1ceb9ef6e0e2d9-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:436` | Le filtre recherche la méthode et le chemin dans la table des limites et, si aucune limite n'existe, transmet la requête sans contrôle. | [#ef1ceb9ef6e0e2d9-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:444` | La clé du bucket combine l'IP client et la paire méthode et chemin, donc chaque couple méthode et chemin a son propre compteur par IP. | [#ef1ceb9ef6e0e2d9-4] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingFilter.java:617` | Par défaut, clientIp renvoie l'adresse du socket (getRemoteAddr) et ignore l'en-tête X-Forwarded-For. | [#454cce6a9210f047-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/RsaKeyMaterial.java:62-77` | La clé RSA est lue au format PKCS#8 (Base64, armure PEM tolérée), puis la clé publique de vérification est dérivée du modulus et de l'exposant public de la clé privée. | [#b35aa50b9a94d73f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:96-103` | L'AuthenticationManager est un ProviderManager qui s'appuie sur un DaoAuthenticationProvider construit avec le UserDetailsService. | [#4b79e02762884bf2-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:109` | La protection CSRF est désactivée pour toute la chaîne de filtres. | [#20c936dfaa725a62-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:162-166` | Commentaire : Selon le commentaire, le chemin /error doit être public, faute de quoi une erreur 500 ressort en 401 trompeur. | [#20c936dfaa725a62-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:185-190` | Commentaire : Une absence d'authentification renvoie 401 avec le corps JSON error unauthorized, et un refus d'accès renvoie 403 avec le corps JSON error forbidden. | [#20c936dfaa725a62-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:194-195` | Commentaire : jwtFilter est inséré dans la chaîne avant UsernamePasswordAuthenticationFilter, comme rateLimitingFilter. | [#20c936dfaa725a62-4] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:199-201` | Commentaire : Selon le commentaire, le filtre de plafond par utilisateur est ancré sur AuthorizationFilter et non sur JwtFilter, car jwtFilter est injecté en proxy @Lazy. | [#20c936dfaa725a62-5] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:202` | Commentaire : userRateLimitingFilter est inséré avant AuthorizationFilter, donc après l'authentification par jwtFilter. | [#20c936dfaa725a62-6] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:227` | Commentaire : Selon le commentaire, le cookie jwt est posé en SameSite=Lax (AuthController.COOKIE_SAME_SITE), et non en Strict. | [#2dced2f70a904614-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:233-235` | Commentaire : Selon le commentaire, la protection CSRF repose sur le cookie HttpOnly et sur les clients fetch en CORS, sans form-POST navigateur sur l'API. | [#20c936dfaa725a62-7] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:241-243` | Commentaire : Le bean UserDetailsService est une instance de CustomUserDetailsService construite à partir de UserRepository. | [#8d810440f2704ab4-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:261` | Javadoc : writeJsonError est package-private et est réutilisée par UserRateLimitingFilter pour produire le même 401 que l'entry point. | [#d398379ffa312273-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:84-85` | Le filtre est un composant Spring qui étend OncePerRequestFilter. | [#4967cc3e212efe58-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:128` | La clé de limitation est la méthode HTTP suivie du chemin décodé dans l'application. | [#0833c211a9b3191d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:129-133` | Une requête dont la clé ne figure pas dans LIMITS passe sans comptage. | [#0833c211a9b3191d-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:148-149` | Le bucket est indexé par la clé de compte suivie du chemin, et chaque bucket est créé avec un plafond par minute. | [#0833c211a9b3191d-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:151-155` | Un dépassement de plafond renvoie le même 429 que le limiteur par IP, Retry-App compris. | [#0833c211a9b3191d-4] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:160-164` | Un Authentication absent, non authentifié ou de type AnonymousAuthenticationToken est traité comme anonyme. | [#89aa9e5f87c6c7b2-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:170-179` | La clé de compte est construite à partir de l'UUID de CustomUserDetails, et vaut null si l'id est absent. | [#a9fa6312570c62bb-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/AuthErrorContractIntegrationTest.java:47-50` | Javadoc : Selon la javadoc, la règle hasAuthority("ROLE_USER") de authorizeHttpRequests refuse l'accès à un appelant authentifié sans cette autorité, et le accessDeniedHandler répond 403. | [#d331275915dbdc89-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java:26-32` | Javadoc : Selon la javadoc, le test charge le vrai application-dev.properties et résout la vraie expression de placeholder de SecurityConfig avant d'appeler corsConfigurationSource(). | [#71f8efd07dd0f3e4-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java:147-150` | Javadoc : Selon la javadoc, la variable APP_CORS_ALLOWED_ORIGINS ne doit jamais être déclarée dans un fichier chargé automatiquement, et le correctif retenu n'est pas un garde-fou dans SecurityConfig. | [#2763c0c8c10f2d3e-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/CorsAllowedOriginsConfigIntegrationTest.java:229-234` | La sonde de test injecte la liste d'origines via @Value(SecurityConfig.ALLOWED_ORIGINS_EXPRESSION) puis instancie SecurityConfig et appelle sa méthode corsConfigurationSource(). | [#02f78449123654f9-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java:26-28` | Javadoc : Selon la javadoc, la garde de jeton vide posée dans JwtService.extractUsername est partagée par JwtFilter. | [#e3759e750180d203-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java:34-35` | Javadoc : Selon la javadoc, JwtService est mocké dans ce test et son comportement réel est vérifié dans un autre test. | [#0c410f5b572fc2c3-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java:65` | Le test transporte le jeton dans un cookie nommé jwt. | [#5c8f355cd8d08140-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:24-25` | Javadoc : Selon la javadoc, la signature d'authentification passe de HS256 à RS256 pour permettre la vérification côté Edge sans publier de clé de frappe. | [#35d96af5bdd28ae5-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:29-30` | Javadoc : Selon la javadoc, aucune clé n'est committée et la paire de test est générée au lancement des tests. | [#47a0c46dc9a43831-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:40-46` | La paire RSA de test est générée en mémoire dans une méthode annotée BeforeAll, avec une taille de 2048 bits. | [#47a0c46dc9a43831-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:49-52` | Le helper de test injecte le matériel de clé dans le champ privateKeyMaterial par réflexion, puis appelle initKeyMaterial. | [#63af88fd0b84c16c-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:211` | Javadoc : Selon la javadoc, parseClaims doit lever une MalformedJwtException pour un jeton vide plutôt que laisser fuiter une IllegalArgumentException. | [#aef99abf1bede29a-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitIntegrationTest.java:36-38` | Javadoc : Selon la javadoc, le plafond de débit par utilisateur s'appuie sur le principal posé par JwtFilter, lu par UserRateLimitingFilter juste avant l'autorisation. | [#cbf0c99cf6bf91d5-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java:29-38` | Javadoc : Selon la javadoc, les variantes de chemin sont testées sur un vrai serveur (RANDOM_PORT) pour que Tomcat et le pare-feu StrictHttpFirewall soient traversés avant JwtFilter et le limiteur. | [#4e8a6ccfb48eddcb-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/PreferencesUserRateLimitPathVariantsIntegrationTest.java:97-112` | Le helper de login récupère le cookie jwt depuis l'en-tête Set-Cookie de la réponse et le rejoue ensuite dans l'en-tête Cookie. | [#b40969a242fe4338-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitDefaultCeilingsIntegrationTest.java:28-32` | Javadoc : Selon la javadoc, les corps de requête sont volontairement invalides, car le filtre s'exécute avant le contrôleur et le jeton bucket4j est consommé quel que soit le résultat applicatif. | [#f2a817d32133d78b-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:195-197` | Javadoc : Selon la javadoc, le RateLimitingFilter est placé avant l'AuthorizationFilter, de sorte que le 429 court-circuite l'authz même sans JWT valide. | [#a8b79801df770424-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:218-222` | Javadoc : Selon la javadoc, le filtre de rate limiting court-circuite avant l'authz pour le GET inline /api/export, dont la limite est de 5 par minute et par IP. | [#7ff5bdf0c56e2d88-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:432-434` | Javadoc : Selon la javadoc, GET /api/me reste volontairement hors de la map de rate limiting, ce que le test de non-régression vérifie. | [#a8b79801df770424-4] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/RateLimitingAndHeadersIntegrationTest.java:667-668` | Javadoc : Selon la javadoc, la chaîne de filtres de sécurité écrit les en-têtes avant l'authentification, si bien que le CSP est présent sur les endpoints publics permitAll. | [#c3cb60092da846fb-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java:30-31` | Javadoc : Selon la javadoc, le test passe par la vraie chaîne Spring Security via @AutoConfigureMockMvc, afin que le RateLimitingFilter soit exécuté. | [#c66e121df6e12c83-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:21-23` | Javadoc : Selon la javadoc, l'application est stateless grâce à SessionCreationPolicy.STATELESS dans SecurityConfig, avec authentification par cookie JWT HttpOnly. | [#dfdf8e57a3c9a03c-1] |
