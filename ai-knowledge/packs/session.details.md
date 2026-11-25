# Annexe : session

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 48 | convention 16, config 11, role_check 8 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java` | 36 | test_case 18, convention 7, business_rule 5 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 32 | convention 7, validation 7, business_rule 6 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java` | 22 | convention 5, test_case 5, other 4 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 17 | other 5, convention 4, business_rule 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java` | 16 | business_rule 4, endpoint 4, convention 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/KeyRotationSessionIntegrationTest.java` | 14 | test_case 7, convention 3, other 3 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java` | 13 | test_case 12, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java` | 11 | entity 7, convention 3, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java` | 10 | test_case 8, convention 1, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java` | 9 | service_method 4, business_rule 3, role_check 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/DevCorsStartupLogger.java` | 9 | convention 4, other 3, config 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionControllerTest.java` | 9 | test_case 5, other 2, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java` | 9 | convention 4, test_case 4, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java` | 8 | persistence_query 7, convention 1 |
| `frontend:services/sessionService.ts` | 6 | convention 3, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java` | 5 | other 2, config 1, endpoint 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java` | 5 | other 2, test_case 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java` | 4 | convention 3, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/SessionRepository.java` | 4 | other 4 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/JwkResponse.java` | 3 | other 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/SessionMapper.java` | 3 | convention 1, other 1, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/JwksResponse.java` | 2 | config 1, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/SessionNotFoundException.java` | 2 | other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Session.java` | 2 | business_rule 1, entity 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/SessionService.java` | 2 | other 2 |

## Structure (suite) {#t-structure_overflow}

| Pointeur | Symbole | Énoncé | Fait |
|---|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:61` | JwksController.jwks | GET /.well-known/jwks.json renvoie en JSON le JWK Set courant produit par JwtService.getPublicJwks. | [#ff90bd1f8455cf75-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:24-26` | SessionEntity | SessionEntity est mappée sur la table sessions, sans relation JPA vers un utilisateur, user_id étant un UUID simple. | [#8aa2c92b12bee978-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:33-34` | SessionEntity.jti | La colonne jti est non nulle et unique. | [#5f9266f4536bd3d7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:36-37` | SessionEntity.userId | La colonne user_id est non nulle et de type UUID. | [#7f18ac021244ba2a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:45-46` | SessionEntity.lastActivity | La colonne last_activity est non nulle. | [#16ee1b21ae4b5ff4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:48-49` | SessionEntity.createdAt | La colonne created_at est non nulle et non modifiable après insertion. | [#fcc6db9146cf180a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:51-52` | SessionEntity.expiresAt | La colonne expires_at est non nulle. | [#bee8c18cd186f89b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:54-55` | SessionEntity.revokedAt | La colonne revoked_at est nullable, une valeur nulle signifiant session non révoquée. | [#b51b5b00bbc48ec4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Session.java:18-28` | Session | Session est un modèle domaine sans annotation de framework, portant jti, userId, lastActivity, createdAt, expiresAt et revokedAt. | [#97667c4e427f282c-1] |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Une clé précédente identique à la clé courante est ignorée. [#c29ceac2db4c60f2-1] [#f9b09080c472ce18-1] | deducible |
| rules | - Un jeton signé par la clé précédente est refusé sans jti, sans iat ou si exp moins iat dépasse TOKEN_VALIDITY_MS, une durée égale étant acceptée. [#a01b1edabe5a3e57-1] [#d9421fd5495545ab-1] [#5518daeb5bddac47-1] | deducible |
| rules | - Un jeton null ou blanc, d'algorithme autre que RS256, ou de kid inconnu est refusé avant d'être accepté. [#8c65c6d6ba12890e-1] [#f1306e305069dfd4-1] [#354c7d9d6d9e4ba3-1] | deducible |
| rules | - Le jti courant se lit dans le cookie jwt d'abord, puis dans le Bearer, et une JwtException donne un jti null sans erreur. [#3e1b4d06bfdf7fb8-1] [#06689378095ccb3a-1] | deducible |
| surface | - Révoquer la session d'un autre utilisateur renvoie 404 et non 403, et la session du propriétaire reste utilisable, ce qui évite d'énumérer les identifiants [#a91119d810dc7730-1]. Le contrôle d'appartenance est dans le service `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:91-94`, pas dans le contrôleur [#b02b89ecab5f6e75-1] [#integrations/4c5faca65e6e3a35-1]. | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:36-51` | createSession crée une session avec un UUID aléatoire, lastActivity et createdAt à l'instant courant, revokedAt à null, puis la persiste. | [#015cc172ae17c133-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:56-61` | Commentaire : Lorsque le jti est null, isSessionActive renvoie vrai. | [#6e267b0acf8be06d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:65-68` | isSessionActive renvoie vrai seulement si une session porte ce jti, qu'elle n'est pas expirée (expiresAt absent ou postérieur à maintenant) et qu'elle n'est pas révoquée. | [#6a0da51faf97aa4c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Session.java:86-89` | isActive renvoie vrai si revokedAt est null. | [#3f43cda45ff96445-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:75-78` | Le jti courant est résolu comme dans JwtFilter, cookie jwt d'abord puis Bearer, pour éviter un jti nul en mode Bearer seul. | [#c6a553e36c35c3eb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:89-91` | Commentaire : Selon le commentaire, le service lève SessionNotFoundException (404) si la session est inconnue ou appartient à un autre utilisateur. | [#69c02407ebf58772-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:100-107` | Le token est lu dans le cookie jwt en priorité, puis dans le header Authorization Bearer, sinon il vaut null. | [#3e1b4d06bfdf7fb8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:111-117` | Si JwtService.extractJti lève une JwtException, le jti est remplacé par null au lieu de provoquer une erreur. | [#06689378095ccb3a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:73` | Le filtre ne tente l'authentification que si un username est extrait et si le SecurityContext ne contient pas encore d'authentification. | [#aea9c4e6ee386f14-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:80-81` | Le contexte d'authentification n'est renseigné que si la signature et l'expiration sont valides et si le jti n'est pas révoqué via SessionService.isSessionActive. | [#authorization/7592b341eaabca2a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:80-81` | L'utilisateur est authentifié seulement si validateToken réussit et si isSessionActive renvoie vrai pour le jti du token. | [#aea9c4e6ee386f14-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:40-41` | Javadoc : Selon la javadoc, le profil prod exige une valeur explicite pour la clé privée. | [#b43f4337fb9fb867-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:77-79` | Si la clé privée est vide ou blanche, une paire RSA éphémère est générée au démarrage au lieu de lire la clé configurée. | [#6769c7a7beb96ee0-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:141-144` | Si la clé publique précédente est identique à la clé courante, elle est ignorée et null est retourné. | [#c29ceac2db4c60f2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:224-234` | generateToken(Authentication) ajoute à chaque jeton un jti UUID aléatoire, un claim role et une expiration de TOKEN_VALIDITY_MS, signé en RS256. | [#18ac6a4eeb2d5d37-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:301-316` | Commentaire : Un jeton avec kid est vérifié uniquement avec la clé désignée, et un jeton sans kid est tenté avec la clé courante puis la précédente. | [#a7bc18bee4ee1c08-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:317-319` | Un jeton vérifié avec la clé précédente est soumis à assertBoundedPreviousKeyToken. | [#a7bc18bee4ee1c08-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:199` | Commentaire : Le filtre de rate-limit est placé avant UsernamePasswordAuthenticationFilter, puis le JwtFilter est placé à la même position. | [#0b8854dd812e03a0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:207` | Commentaire : Le filtre de rate-limit par utilisateur est placé avant AuthorizationFilter, donc après l'authentification JWT. | [#0b8854dd812e03a0-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:152-163` | Chaque login émet un JWT portant un jti distinct des autres logins du même utilisateur. | [#9e33e219983ab7d7-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:239-240` | Le jti n'apparaît jamais dans la réponse JSON de GET /api/sessions. | [#1f74ef3f450205c2-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:266-277` | Commentaire : Un refresh avec un token dont le jti est révoqué renvoie 401 avec le code d'erreur unauthorized. | [#45ca44ddedec74ce-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:133-141` | Commentaire : Si le kid désigne la clé courante, la clé précédente n'est pas essayée et une signature signée par la clé précédente est refusée avec SignatureException. | [#49e827aaf1e9b65a-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:201-209` | Un jeton signé par la clé précédente sans claim jti est refusé avec MissingClaimException, alors que le même cas signé par la clé courante reste accepté. | [#483e95c36697e19d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:220-228` | Un jeton signé par la clé précédente sans claim iat est refusé avec MissingClaimException mentionnant iat. | [#d9421fd5495545ab-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:230-254` | Un jeton signé par la clé précédente dont la durée de vie dépasse JwtService.TOKEN_VALIDITY_MS est refusé avec IncorrectClaimException, une durée égale à cette valeur étant acceptée. | [#5518daeb5bddac47-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:290-298` | Si la clé précédente est identique à la clé courante, une seule clé est publiée dans le JWKS et aucun avertissement de rotation n'est émis. | [#f9b09080c472ce18-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:111-117` | Un JwtException levé par jwtService.extractJti est intercepté et converti en null, le jti courant étant alors absent. | [#integrations/00bc4163b1a4b807-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:134-139` | Une clé publique précédente mal formée lève IllegalStateException au démarrage sans reprendre la valeur ni la cause. | [#666c65b5e0f814dd-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:281-283` | Un jeton null ou blanc lève MalformedJwtException avant toute vérification de signature. | [#8c65c6d6ba12890e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:287-291` | Un jeton dont l'algorithme d'en-tête n'est pas RS256 est refusé par UnsupportedJwtException. | [#f1306e305069dfd4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:331-334` | Un jeton de la clé précédente sans jti est refusé par MissingClaimException. | [#a01b1edabe5a3e57-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:342-345` | Un jeton de la clé précédente dont la durée exp moins iat dépasse TOKEN_VALIDITY_MS est refusé par IncorrectClaimException. | [#a01b1edabe5a3e57-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:365-370` | Un kid absent des clés connues lève SignatureException avec le message de kid non reconnu. | [#354c7d9d6d9e4ba3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:385-392` | validateToken compare le subject au username de UserDetails et exige que le jeton ne soit pas expiré, et renvoie false sur toute exception. | [#authorization/20744147a64efc6a-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:300-310` | Le test fixe qu'une clé précédente de moins de 2048 bits fait échouer le démarrage avec IllegalStateException, message citant jwt.previous-public-key et 2048, sans la valeur ni cause. | [#authorization/c6230b4b8d33fca0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:300-310` | Une clé publique précédente de moins de 2048 bits fait échouer l'initialisation avec IllegalStateException, dont le message cite jwt.previous-public-key sans reprendre la valeur de la clé. | [#70ea429214c7be50-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:312-324` | Le test fixe qu'une clé privée collée comme clé précédente fait échouer le démarrage avec IllegalStateException, sans reprendre la valeur ni cause. | [#authorization/587ab2d0fa63dd26-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:312-324` | Une clé privée collée à la place de la clé publique précédente fait échouer l'initialisation avec IllegalStateException, sans reprendre la valeur collée. | [#c8b1405ba801256b-1] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:91-94` | revokeSession ne révoque une session que si son userId correspond à l'utilisateur appelant, sinon lève SessionNotFoundException. | [#b02b89ecab5f6e75-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:25-28` | Javadoc : Selon la javadoc, le chemin JWKS est listé en permitAll dans SecurityConfig, donc accessible sans authentification. | [#integrations/c219dcc0ad52c39c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:53-55` | Si CallerResolver ne fournit aucun utilisateur courant, GET /api/sessions répond 401 sans corps. | [#f6041a5ba9631bb4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:84-92` | La révocation d'une session est déléguée à sessionService.revokeSession avec l'identifiant de l'appelant, l'ownership étant porté par le service et une session d'autrui renvoyant 404. | [#integrations/4c5faca65e6e3a35-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:82-85` | Lorsque le jeton est accepté, un UsernamePasswordAuthenticationToken est créé avec les autorités de l'utilisateur chargé puis placé dans le SecurityContextHolder. | [#authorization/5b34073031bd998e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:301-321` | Une SignatureException avec la clé courante n'est retentée avec la clé précédente que si le jeton n'a pas de kid désignant la clé courante. | [#authorization/23ecabbb7b430cab-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:171` | Le chemin /error est accessible sans authentification. | [#ca4e294476944c3f-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:178` | Toutes les routes /api/auth/** sont accessibles sans authentification. | [#ca4e294476944c3f-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:179` | Commentaire : Les routes produits par utilisateur, produits, événements et utilisateurs exigent l'autorité ROLE_USER. | [#ca4e294476944c3f-5] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:182` | Commentaire : La route /api/users/** exige l'autorité ROLE_USER. | [#authorization/98b2cdbd7d200daa-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:183` | Commentaire : Les routes /api/users/{userId}/products/**, /api/products/**, /api/events/**, /api/users/**, /api/sessions/**, /api/me/** et /api/export/** exigent l'autorité ROLE_USER. | [#authorization/98b2cdbd7d200daa-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:184` | Commentaire : Les routes /api/me/** exigent l'autorité ROLE_USER. | [#ca4e294476944c3f-7] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:187` | Commentaire : La route /api/export/** exige l'autorité ROLE_USER. | [#authorization/98b2cdbd7d200daa-5] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:188` | Commentaire : Toute autre requête exige une authentification, via anyRequest().authenticated(). | [#authorization/98b2cdbd7d200daa-3] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionControllerTest.java:107-116` | Sans utilisateur authentifié, le test attend un 401 et aucune interaction avec SessionService. | [#1f9ee4243fea0596-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:181-194` | La suppression d'une session appartenant à un autre utilisateur renvoie 404, et la session du propriétaire reste utilisable. | [#a91119d810dc7730-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/SessionMapper.java:6` | Le mapper du package application importe l'entité JPA SessionEntity du package infrastructure, ce qui s'écarte de la règle de couches décrite dans les conventions du projet. | [#ea2aa584a13cae72-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:101` | Si currentJti vaut null, le repository révoque toutes les sessions actives du user, y compris la session du token qui a servi à l'appel. | [#aadbb406fc45f69a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:49` | Le filtre affecte la valeur du cookie jwt même vide, sans repli sur le header Bearer, à la différence de SessionController.resolveToken. | [#9a5d02db20d27ca0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:205-216` | generateToken(String) émet un jeton sans claim jti et sans claim role, contrairement à generateToken(Authentication), donc non révocable par session. | [#18ac6a4eeb2d5d37-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:225` | generateToken(Authentication) force le principal en CustomUserDetails sans contrôle de type préalable. | [#733ba35b6d359059-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:389-390` | validateToken capture toute Exception et renvoie false, sans journalisation de la cause. | [#640569fd00aada47-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java:3` | Ce test utilise les assertions JUnit, alors que EventCreationRequestContractTest utilise AssertJ, ce qui fait un écart entre les deux tests du lot. | [#backend-core/d468f061532819b7-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java:67-69` | Selon le commentaire, un 401 sur ce test signale que la whitelist de SecurityConfig a sauté, et le commentaire interdit d'adapter l'assertion. | [#e0b547f9c3a392c8-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:49-53` | Selon la javadoc, le flux réel POST /register souffre d'un bug de persistance indépendant, hors périmètre du test, et les utilisateurs sont donc seedés via EntityManager. | [#c03ac42f0de3f8d5-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:245-248` | Selon le commentaire, /api/auth/** est bypassé par JwtFilter, donc GET /api/auth/me doit vérifier lui-même la révocation du jti. | [#79290e016b56afb1-1] |

## Méthodes de service {#t-service_method}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:72-75` | getActiveSessions délègue au repository la liste des sessions actives du user. | [#8c3307ce437f84b4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:78-84` | revokeCurrentSession ne fait rien si le jti est null, sinon révoque la session portant ce jti. | [#2df1b0746c9671ed-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:97-102` | revokeOtherSessions révoque les sessions actives du user sauf celle du jti courant et renvoie le nombre révoqué. | [#bd09bd20419dc5c2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:104-109` | revokeAllSessions révoque toutes les sessions actives du user en passant null comme jti épargné. | [#38af0486d696291c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:59-61` | Les sessions du service sont converties en SessionResponse en passant le jti courant à fromDomain. | [#fce618ae607e1674-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:79` | Le contrôleur délègue à SessionService.revokeOtherSessions l'identifiant de l'appelant et le jti courant. | [#f62f1b9bd46da8f8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/DevCorsStartupLogger.java:37-40` | Sur l'événement ApplicationReadyEvent, la méthode écrit au niveau INFO la liste allowedOrigins résolue, préfixée par [BOOT dev]. | [#ad0103ff7cf78d1d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:183-196` | getPublicJwks renvoie un JwksResponse contenant la clé courante en premier, puis la clé précédente si elle est chargée. | [#0bc08a85f4e60fca-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:104` | Le AuthenticationManager est un ProviderManager porteur d'un DaoAuthenticationProvider avec le UserDetailsService et le PasswordEncoder injectés. | [#6f77a6fffc444044-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:247` | Commentaire : Le bean UserDetailsService est une instance de CustomUserDetailsService construite à partir du UserRepository. | [#7129008338cf280a-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:73-74` | Le filtre charge l'utilisateur via UserDetailsService.loadUserByUsername à chaque requête où le contexte est vide et où le subject est présent. | [#authorization/899c7ea5383e6ca6-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:46-49` | Commentaire : Le commentaire indique que save sert à la création uniquement, les mutations d'état passant par des UPDATE bindés dédiés. | [#integrations/b3b3642e190cf8e1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:53-63` | findByJti exécute une requête JPQL sur le jti et renvoie au plus une session convertie en domaine. | [#6307260e9bd7a1d7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:71-85` | findActiveByUserId exécute une requête JPQL sur les sessions non révoquées et non expirées du user, triées par lastActivity décroissante. | [#7ea75b50e37269a6-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:88-97` | revokeByJti pose revokedAt à l'instant courant sur les sessions actives portant ce jti, par UPDATE JPQL sans chargement d'entité. | [#a50852c3ebf29c5f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:100-108` | revokeById pose revokedAt à l'instant courant sur la session d'id donné si elle est active, par UPDATE JPQL. | [#1c55879186386ba2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:111-130` | Si exceptJti est null, revokeAllByUserIdExcept révoque toutes les sessions actives du user, sinon il épargne la session portant exceptJti. | [#bc24459718a8de0e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:122-129` | La variante avec exceptJti exclut la session de ce jti via la condition s.jti <> :exceptJti dans l'UPDATE JPQL. | [#bc24459718a8de0e-2] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/JwksResponse.java:8-10` | Javadoc : La Javadoc indique que la clé publique précédente, lue depuis la variable JWT_PREVIOUS_PUBLIC_KEY, est publiée en second pendant une rotation de clé. | [#backend-core/a4d1504a48e35f38-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:43` | La réponse JWKS annonce une durée de cache de 5 minutes en Cache-Control public. | [#d288e3edd411767d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/DevCorsStartupLogger.java:25` | Le logger de démarrage CORS n'est actif qu'en profil dev hors profil e2e, déclaré par l'annotation @Profile. | [#backend-core/1dec19dbcf2e4e7e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:105-108` | Le filtre est ignoré pour les requêtes dont le chemin servlet commence par /api/auth. | [#fdd139bf8bd1a5f1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:43` | La clé privée de signature se lit via @Value avec la propriété jwt.private-key, dont la valeur par défaut est vide, ce qui déclenche une paire RSA éphémère. | [#backend-core/891330b9b1514b8d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:52` | La clé publique précédente, utilisée pour la rotation, se lit via @Value avec la propriété jwt.previous-public-key et une valeur par défaut vide. | [#backend-core/4779a60e4f36c94a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:76-78` | Javadoc : Selon la javadoc, la valeur par défaut interne localhost:3000 est un filet fail-safe si la propriété est absente, jamais un wildcard, et ne dispense pas le profil dev de porter sa propre valeur. | [#authorization/54930c3b746c841e-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:81` | La propriété app.cors.allowed-origins est lue par une expression de placeholder publique dont la valeur par défaut est http://localhost:3000. | [#backend-core/f6eff35f5e88fbf7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:114` | La protection CSRF est désactivée sur la chaîne de filtres. | [#5c1b482224ff60aa-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:117` | L'en-tête X-Frame-Options est fixé à DENY. | [#5c1b482224ff60aa-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:126` | L'en-tête Strict-Transport-Security est posé avec une durée de 31536000 secondes, sous-domaines inclus, sur toutes les requêtes. | [#5c1b482224ff60aa-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:158` | La politique Content-Security-Policy de l'API se limite à self pour script, style, connect, img, font et base-uri, avec object-src none et frame-ancestors none. | [#5c1b482224ff60aa-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:161` | La gestion de session est STATELESS, sans création de session HTTP. | [#5c1b482224ff60aa-5] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:216` | Commentaire : La configuration CORS active allowCredentials et reprend la liste allowedOrigins injectée depuis la propriété. | [#b59d39faaf63cbef-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:219` | Commentaire : Les méthodes CORS autorisées sont GET, POST, PATCH, PUT, DELETE et OPTIONS. | [#b59d39faaf63cbef-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:220` | Commentaire : La configuration CORS autorise les credentials, et les en-têtes Authorization, Content-Type et Cookie. | [#authorization/9fe690aaca62310d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:230` | Commentaire : Les en-têtes exposés au navigateur sont Set-Cookie et Retry-After. | [#b59d39faaf63cbef-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/KeyRotationSessionIntegrationTest.java:64-67` | Les propriétés jwt.private-key et jwt.previous-public-key sont injectées avec des paires RSA générées en mémoire. | [#f2fa089e143b7c95-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:55-57` | Commentaire : Selon le commentaire, l'auth signe en RS256 sur une paire éphémère générée au boot, jwt.private-key étant vide en profil test. | [#6af1cfd4bcc84aee-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:55-57` | Commentaire : Selon le commentaire, la signature JWT se fait en RS256 avec une paire éphémère générée au boot du contexte quand jwt.private-key est vide en profil test. | [#c864fde175536f6f-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/JwkResponse.java:18-20` | Javadoc : Selon la javadoc, kid est une empreinte RFC 7638 et JwtService n'émet pas d'en-tête kid. | [#ad3bda18cda4f859-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/JwksResponse.java:16` | Un DTO de réponse de cette couche est un record Java dont les composants sont déclarés dans le constructeur. | [#backend-core/8870cb8fb2aa9b0e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java:11` | Javadoc : Selon la javadoc, la projection n'expose jamais le jti, ni userId ni revokedAt. | [#77ee74f48eacb8da-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java:20-28` | Une projection HTTP sans état mutable est un record Java, construit depuis le domaine par une méthode statique fromDomain. | [#backend-core/795dadaac9fca189-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java:35` | Le booléen current est calculé par comparaison du jti de la session avec le jti du token courant, et le jti n'est pas un champ du record. | [#backend-core/ebef872f478e286f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/SessionMapper.java:12-13` | Un mapper de session suit la même forme que les autres mappers, classe annotée @Component avec toDomain et toEntity qui copient les champs un à un. | [#backend-core/4421b1e51c50d256-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:22` | Javadoc : Selon la javadoc, le contrôleur de sessions dépend des ports SessionService et CallerResolver, et non du domaine brut. | [#06da13e3977a8ee3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:75-78` | Commentaire : Selon le commentaire, revokeOtherSessions résout le jti courant avec la même logique que JwtFilter, cookie puis Bearer, pour éviter une révocation de toutes les sessions avec un client Bearer seul. | [#integrations/0c4739f6d39c9521-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:100-108` | resolveToken prend le cookie jwt en priorité, puis le header Authorization Bearer, sinon renvoie null. | [#ff08c9e080d3cf26-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:29-32` | SessionRepositoryJpaImpl étend SimpleJpaRepository et implémente le port SessionRepository. | [#eec2d1f4aad5dd92-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/DevCorsStartupLogger.java:28` | Chaque classe déclare son logger SLF4J en constante private static final log, obtenu par LoggerFactory.getLogger avec la classe courante. | [#backend-core/e9ba893d85b464d8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/DevCorsStartupLogger.java:32-34` | Les valeurs de configuration sont injectées par constructeur, avec @Value appliqué au paramètre et référence à une constante partagée de SecurityConfig. | [#backend-core/194e8d457b258769-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/DevCorsStartupLogger.java:37` | Un traitement de démarrage est une méthode void annotée @EventListener(ApplicationReadyEvent.class), déclenchée une fois l'application prête. | [#backend-core/bdf43df9f3adb6eb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/config/DevCorsStartupLogger.java:39` | Le message de journalisation de démarrage préfixe la ligne par [BOOT dev] et passe la valeur à journaliser via un placeholder {}. | [#backend-core/bdf43df9f3adb6eb-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:13-14` | Javadoc : Selon la javadoc, le mapping doit correspondre exactement à la migration V10 avec ddl-auto=validate. | [#c0895783855b6bae-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:28-31` | Commentaire : Selon le commentaire, l'id UUID est assigné applicativement avant persist, sans @GeneratedValue. | [#af3f484b70febb0e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:129-140` | equals compare les entités sur un id non nul, et hashCode renvoie le hash de la classe. | [#c5b6bac1f40ce1a2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:40-42` | Le filtre JWT étend OncePerRequestFilter et lit le jeton dans le cookie jwt, puis dans l'en-tête Authorization au format Bearer si aucun cookie ne le fournit. | [#authorization/fef399d03b004ac4-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:46-47` | Le cookie jwt est recherché en premier, et le filtre s'arrête au premier cookie nommé jwt. | [#authorization/fef399d03b004ac4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:55-60` | L'en-tête Authorization n'est lu que si aucun jeton n'a été trouvé dans les cookies, et seul le préfixe Bearer est accepté. | [#authorization/fef399d03b004ac4-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:92-100` | Les JwtException sont journalisées en debug comme cas nominal, les autres exceptions en error, et la requête poursuit dans tous les cas sans authentification. | [#authorization/20661afcf565be41-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:29-32` | Un service JWT est annoté @Service et déclare son logger SLF4J comme constante statique nommée log, initialisée avec LoggerFactory.getLogger de la classe. | [#backend-core/bed04d0dbf37c4c9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:34-36` | La durée de vie des jetons se déclare comme constante publique statique long exprimée en millisecondes, réutilisée par l'expiration et la vérification. | [#backend-core/ba79c292ff5ef085-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:75-76` | La validation de configuration se fait au démarrage dans une méthode annotée @PostConstruct, qui échoue en fail-fast, et les messages d'erreur ne reprennent ni la valeur configurée ni le message de l'exception sous-jacente. | [#backend-core/3372992d7afb3aab-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:110-119` | Les exceptions de configuration sont relancées sous forme d'IllegalStateException dont le message décrit le format attendu sans journaliser la valeur sensible. | [#backend-core/1e299e939b17e348-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:214` | Les jetons se signent avec l'algorithme RS256 passé explicitement à signWith, et la vérification fige aussi cet algorithme. | [#backend-core/0e3f907dd14ff23f-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:224-234` | La surcharge generateToken(Authentication) ajoute un jti UUID unique et signe en RS256 avec la clé courante, durée de vie TOKEN_VALIDITY_MS. | [#authorization/40d48297b0756461-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:281-283` | La lecture des claims passe par un point d'entrée unique qui refuse un jeton nul ou blanc en levant MalformedJwtException, sous-type de JwtException que les appelants traitent déjà. | [#backend-core/d4b7e95551c98baf-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:43` | SecurityConfig active la sécurité web Spring avec @EnableWebSecurity et la sécurité au niveau méthode avec @EnableMethodSecurity. | [#authorization/6118b2628faba525-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:68-69` | Javadoc : Selon la javadoc, la constante est extraite pour que le test d'intégration CorsAllowedOriginsConfigIntegrationTest résolve exactement la même expression que le constructeur. | [#authorization/6768670fe6318de2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:71-74` | Javadoc : Selon la javadoc, la constante est publique pour être relue par DevCorsStartupLogger et doit rester la seule source de l'expression, sans duplication ailleurs. | [#authorization/6768670fe6318de2-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:74` | Javadoc : La constante ALLOWED_ORIGINS_EXPRESSION est la seule déclaration de l'expression d'origines CORS, réutilisée par @Value dans SecurityConfig et dans DevCorsStartupLogger. | [#backend-core/64ad286ed4c63f09-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:85` | Le constructeur injecte JwtFilter avec l'annotation @Lazy, pour éviter une dépendance circulaire au démarrage. | [#9d5ef4fdac7f544b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:97` | Le PasswordEncoder de l'application est un BCryptPasswordEncoder. | [#f86b818bdd5e682d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:191` | Commentaire : Les réponses 401 et 403 de la chaîne de sécurité sont produites par writeJsonError avec les codes unauthorized et forbidden. | [#0b8854dd812e03a0-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:192` | Commentaire : Les erreurs 401 et 403 sont écrites en JSON avec une clé error valant unauthorized ou forbidden, via writeJsonError. | [#4484e84ec6ec2278-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:194` | Commentaire : Un accès refusé reçoit un statut 403 avec le corps JSON d'erreur "forbidden" via writeJsonError. | [#authorization/ad28b56cd87034dc-7] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:196` | Commentaire : rateLimitingFilter et jwtFilter sont enregistrés avant UsernamePasswordAuthenticationFilter, le rate limit s'exécutant avant jwtFilter. | [#authorization/0b17c87584464539-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:200` | Commentaire : Le code enregistre rateLimitingFilter puis jwtFilter avant UsernamePasswordAuthenticationFilter. | [#authorization/ad28b56cd87034dc-6] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:204` | Commentaire : Selon le commentaire, addFilterAfter avec JwtFilter.class n'est pas utilisé car jwtFilter est injecté @Lazy et son ordre est enregistré sous la classe du proxy. | [#authorization/dad4d9053e5be1a1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:232` | Commentaire : Selon le commentaire, le cookie jwt reste en SameSite=Lax et non Strict, la protection CSRF reposant sur le cookie HttpOnly et les clients fetch CORS. | [#authorization/9790d2029eefa934-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:252` | Javadoc : Selon la javadoc, writeJsonError sert à l'authenticationEntryPoint (401) et à l'accessDeniedHandler (403), ce que le code des lignes 186 à 189 réalise. | [#4484e84ec6ec2278-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:263` | Javadoc : Selon la javadoc, writeJsonError est package-private et réutilisé par UserRateLimitingFilter pour produire un 401 identique à celui de l'entry point. | [#authorization/9f5425a4a0727930-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:271` | Le corps d'erreur est sérialisé avec un ObjectMapper dédié sous la forme d'une Map avec la clé error. | [#4484e84ec6ec2278-3] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java:67-69` | Javadoc : La javadoc indique que si ce test renvoie 401, la whitelist de SecurityConfig a sauté et il ne faut pas modifier l'assertion. Selon la javadoc, la découverte de clé du middleware boucle alors. | [#integrations/f3b5f265303d01f1-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/KeyRotationSessionIntegrationTest.java:59-60` | Les deux paires de clés RSA sont générées en mémoire à chaque exécution, sans clé committée. | [#authorization/5248de6b305f100d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/KeyRotationSessionIntegrationTest.java:88-95` | Commentaire : Chaque test de rotation utilise une adresse IP distincte dans le sous-réseau 10.89, pour éviter une collision de bucket de rate-limit sur /refresh. | [#a3bde9d2136d7a50-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/KeyRotationSessionIntegrationTest.java:99-107` | La classe vide le SecurityContextHolder dans un @BeforeEach et un @AfterEach pour chaque test. | [#authorization/d13edc41979dacb9-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionControllerTest.java:52-53` | Le contrôleur est testé en standaloneSetup avec SessionService, CallerResolver et JwtService mockés, sans Spring Security. | [#67d6ad21188825d9-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:59-60` | Le test d'intégration est annoté @SpringBootTest et @AutoConfigureMockMvc et étend AbstractPostgresIntegrationTest. | [#b0e56d0b364d78e8-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:81` | Un compteur statique AtomicInteger fournit une adresse distante distincte à chaque login via nextIp, dans le sous-réseau 10.73.x.y. | [#dfdebd22325d4c05-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:83-89` | Chaque appel de login reçoit une adresse distante unique du sous-réseau 10.73.x.y pour éviter les collisions de bucket du rate limiting. | [#8150d865c8787387-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:97-105` | Les méthodes annotées @BeforeEach et @AfterEach vident le SecurityContextHolder avant et après chaque test. | [#3558463a50bbc290-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:113-127` | seedUser persiste un UserEntity avec un mot de passe encodé dans une transaction TransactionTemplate dédiée, sans passer par POST /register. | [#9030bb5aa5cc6432-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java:45-52` | Le test construit JwtFilter avec des JwtService, UserDetailsService et SessionService mockés, et vide le SecurityContextHolder avant chaque test. | [#authorization/b32d79b48dfcaf48-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:41-42` | Javadoc : Selon la javadoc, la classe couvre la sélection de la clé par l'en-tête kid, les bornes des jetons de la clé précédente et le WARN de rotation. | [#authorization/2b91b1ee89246d6d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:44-45` | Javadoc : Selon la javadoc, les tests sont purs, sans contexte Spring, et toutes les paires de clés sont générées en mémoire. | [#authorization/2b91b1ee89246d6d-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:56-61` | Une paire RSA 2048 bits courante et une paire précédente sont générées en mémoire avant les tests, et la clé privée courante est encodée en Base64. | [#92d0598455e9aa9a-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:63-75` | Un ListAppender Logback est attaché au logger de JwtService avant chaque test et détaché après chaque test pour capturer les logs. | [#c67a994fdce67824-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:89-95` | Le helper service injecte la clé privée et la clé publique précédente par réflexion, puis appelle initKeyMaterial. | [#f7b8083e42524443-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:101-109` | aliceToken construit un JWT pour alice avec un jti UUID, un iat à maintenant et un exp à 60 secondes, sans kid. | [#42cbe399b471e353-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java:363-367` | Le helper thumbprint calcule le thumbprint JWK d'une clé à partir du modulus et de l'exposant public via RsaKeyMaterial. | [#2123cc012f944603-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:21` | Javadoc : Selon la javadoc, l'acceptation de la CVE-2026-40973 dans la documentation repose sur l'hypothèse que l'application est STATELESS. | [#authorization/2cc6346d5dc0f499-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:23` | Javadoc : Selon la javadoc, SecurityConfig applique SessionCreationPolicy.STATELESS et l'authentification se fait par cookie JWT. | [#authorization/f4658d8432291c0d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:33-34` | Javadoc : Selon la javadoc, une règle ArchUnit nommée productionCodeShouldNotUseHttpSession, dans ArchitectureTest, interdit au code de production de dépendre de HttpSession. Cette règle n'est pas lue dans cette passe. | [#authorization/a114dec4d8a74350-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:36-38` | La classe est annotée @SpringBootTest et @AutoConfigureMockMvc et hérite d'AbstractPostgresIntegrationTest, ce qui exécute la vraie chaîne de filtres Spring Security. | [#a3deef6d8aacba54-1] |
| `frontend:services/sessionService.ts:2` | Le service importe le schéma Zod SessionListSchema et le type Session depuis '@/types/settings'. | [#dcf3228d83442a8b-1] |
| `frontend:services/sessionService.ts:14-17` | Les services de liste appellent apiClient.get avec un chemin relatif puis valident la réponse avec un schéma Zod de liste (SessionListSchema.parse). | [#frontend-core/0135de84623de5bb-1] |
| `frontend:services/sessionService.ts:19-25` | Les actions sans retour (DELETE) sont des fonctions async Promise<void> qui font await apiClient.delete sans traiter la réponse. | [#frontend-core/4eba82f1c00195c6-1] |
