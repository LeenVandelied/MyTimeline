# Annexe : session

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 36 | role_check 11, config 10, other 9 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 26 | convention 8, suspicious 4, business_rule 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 17 | other 5, convention 4, business_rule 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java` | 16 | test_case 8, convention 3, other 2 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java` | 13 | test_case 12, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java` | 12 | endpoint 3, convention 2, other 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java` | 12 | test_case 5, convention 3, suspicious 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java` | 11 | entity 7, convention 3, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java` | 9 | service_method 4, business_rule 3, role_check 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionControllerTest.java` | 9 | test_case 6, other 2, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java` | 9 | convention 4, test_case 4, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java` | 8 | persistence_query 7, convention 1 |
| `frontend:services/sessionService.ts` | 6 | convention 3, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java` | 5 | other 2, config 1, endpoint 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java` | 5 | other 2, test_case 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java` | 4 | convention 3, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/SessionRepository.java` | 4 | other 4 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/JwkResponse.java` | 3 | other 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/SessionMapper.java` | 3 | convention 1, other 1, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/JwksResponse.java` | 2 | convention 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/SessionNotFoundException.java` | 2 | other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Session.java` | 2 | business_rule 1, entity 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/SessionService.java` | 2 | other 2 |

## Structure (suite) {#t-structure_overflow}

| Pointeur | Symbole | Énoncé | Fait |
|---|---|---|---|
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
| rules | - Seul l'algorithme RS256 est accepté, tout autre en-tête alg est refusé par une UnsupportedJwtException après vérification de la signature. [#f1306e305069dfd4-1] | deducible |
| tests | - Les tests fixent qu'une session révoquée donne 401 sur /api/sessions, /api/auth/me et /api/auth/refresh, après logout compris [#e8702e2e8b84b510-1] [#974887b2ab9e5056-1] [#45ca44ddedec74ce-1] [#cf95e32ee886311d-1]. | deducible |
| tests | - Les tests fixent que isSessionActive est faux pour un jti révoqué ou inconnu, et vrai pour un jti null sans appel au repository [#596a893d76664618-1] [#0e8d9b8b5f7cd86a-1] [#6f80d87a0206c9ad-1]. | deducible |
| tests | - Les tests fixent que le jti courant vient du Bearer seul ou du cookie, que le cookie prime, et que sans appelant la réponse est 401 sans appel au service [#5762506a39094d45-1] [#923691090fc40de0-1] [#1f9ee4243fea0596-1]. | deducible |
| tests | - Les tests fixent un jti unique par login et un jti jamais sérialisé dans GET /api/sessions [#9e33e219983ab7d7-1] [#96a2da2db2368e08-1]. | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:36-51` | createSession crée une session avec un UUID aléatoire, lastActivity et createdAt à l'instant courant, revokedAt à null, puis la persiste. | [#015cc172ae17c133-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:56-61` | Commentaire : Lorsque le jti est null, isSessionActive renvoie vrai. | [#6e267b0acf8be06d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:65-68` | isSessionActive renvoie vrai seulement si une session porte ce jti, qu'elle n'est pas expirée (expiresAt absent ou postérieur à maintenant) et qu'elle n'est pas révoquée. | [#6a0da51faf97aa4c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Session.java:86-89` | isActive renvoie vrai si revokedAt est null. | [#3f43cda45ff96445-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:73` | Le filtre ne tente l'authentification que si un username est extrait et si le SecurityContext ne contient pas encore d'authentification. | [#aea9c4e6ee386f14-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:80-81` | Le contexte d'authentification n'est renseigné que si la signature et l'expiration sont valides et si le jti n'est pas révoqué via SessionService.isSessionActive. | [#authorization/7592b341eaabca2a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:80-81` | L'utilisateur est authentifié seulement si validateToken réussit et si isSessionActive renvoie vrai pour le jti du token. | [#aea9c4e6ee386f14-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:59-63` | Au démarrage, si la clé privée est absente ou blanche, une paire RSA éphémère est générée, sinon la clé configurée est chargée. | [#6769c7a7beb96ee0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:95-102` | Sans clé configurée, une paire RS256 éphémère est générée et un avertissement WARN est journalisé, indiquant que les jetons seront invalidés au redémarrage. | [#63d04ffab6f92b7c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:229-235` | Après vérification de la signature, un jeton dont l'en-tête alg n'est pas RS256 est refusé par une UnsupportedJwtException. | [#f1306e305069dfd4-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:111-117` | Un JwtException levé par jwtService.extractJti est intercepté et converti en null, le jti courant étant alors absent. | [#integrations/00bc4163b1a4b807-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:79-92` | Une clé configurée qui ne peut pas être chargée comme clé RSA PKCS#8 en Base64 lève une IllegalStateException, ce qui fait échouer le démarrage. | [#87b7671f67ae8eec-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:220-223` | Un jeton null ou blanc lève une MalformedJwtException avant tout parsing. | [#8c65c6d6ba12890e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:238-241` | validateToken compare le subject du jeton au username de UserDetails et vérifie que le jeton n'est pas expiré. | [#authorization/20744147a64efc6a-1] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:91-94` | revokeSession ne révoque une session que si son userId correspond à l'utilisateur appelant, sinon lève SessionNotFoundException. | [#b02b89ecab5f6e75-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:25-28` | Javadoc : Selon la javadoc, le chemin JWKS est listé en permitAll dans SecurityConfig, donc accessible sans authentification. | [#integrations/c219dcc0ad52c39c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:53-56` | Si CallerResolver ne fournit aucun utilisateur, la réponse est 401 sans corps. | [#f6041a5ba9631bb4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:84-92` | La révocation d'une session est déléguée à sessionService.revokeSession avec l'identifiant de l'appelant, l'ownership étant porté par le service et une session d'autrui renvoyant 404. | [#integrations/4c5faca65e6e3a35-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:82-85` | Lorsque le jeton est accepté, un UsernamePasswordAuthenticationToken est créé avec les autorités de l'utilisateur chargé puis placé dans le SecurityContextHolder. | [#authorization/5b34073031bd998e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:161` | Le endpoint /actuator/health est accessible sans authentification. | [#ca4e294476944c3f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:166` | Le endpoint /error est accessible sans authentification. | [#ca4e294476944c3f-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:172` | Le endpoint JWKS est accessible sans authentification. | [#ca4e294476944c3f-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:173` | Toutes les routes /api/auth/** sont accessibles sans authentification. | [#ca4e294476944c3f-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:174` | Commentaire : La route /api/users/{userId}/products/** exige l'autorité ROLE_USER. | [#authorization/98b2cdbd7d200daa-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:177` | Commentaire : La route /api/users/** exige l'autorité ROLE_USER. | [#authorization/98b2cdbd7d200daa-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:178` | Commentaire : Les routes /api/sessions/** exigent l'autorité ROLE_USER. | [#ca4e294476944c3f-6] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:179` | Commentaire : Les routes /api/me/** exigent l'autorité ROLE_USER. | [#ca4e294476944c3f-7] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:182` | Commentaire : La route /api/export/** exige l'autorité ROLE_USER. | [#authorization/98b2cdbd7d200daa-5] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:183` | Commentaire : Toute requête non listée explicitement exige une authentification. | [#authorization/98b2cdbd7d200daa-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:186-189` | Commentaire : Une requête non authentifiée reçoit un 401 avec le corps unauthorized, et une requête refusée reçoit un 403 avec le corps forbidden. | [#authorization/ad28b56cd87034dc-3] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/SessionMapper.java:6` | Le mapper du package application importe l'entité JPA SessionEntity du package infrastructure, ce qui s'écarte de la règle de couches décrite dans les conventions du projet. | [#ea2aa584a13cae72-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:101` | Si currentJti vaut null, le repository révoque toutes les sessions actives du user, y compris la session du token qui a servi à l'appel. | [#aadbb406fc45f69a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:83-93` | Le contrôleur ne compare pas l'id ciblé au jti courant, la session en cours peut donc être révoquée via cet endpoint, alors que la javadoc de SessionResponse indique le contraire. | [#69c02407ebf58772-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:101` | resolveToken ignore un cookie jwt vide et repasse sur le header Bearer, alors que JwtFilter prend la valeur du cookie même vide. | [#3e1b4d06bfdf7fb8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:49` | Le filtre affecte la valeur du cookie jwt même vide, sans repli sur le header Bearer, à la différence de SessionController.resolveToken. | [#9a5d02db20d27ca0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:97-99` | Le message WARN indique que le profil prod refuse le mode éphémère, mais aucun contrôle de profil n'apparaît dans ce fichier. | [#authorization/6d1d59909a7eca5b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:145-156` | La surcharge generateToken(String) n'ajoute pas de claim jti, alors que la surcharge generateToken(Authentication) en ajoute un et que la javadoc affirme qu'aucun token n'est émis sans jti. | [#backend-core/46b3392f051dc8d7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:158-161` | La javadoc de generateToken(Authentication) affirme qu'aucun token n'est émis sans jti, alors que la surcharge generateToken(String) n'ajoute aucun claim jti. | [#733ba35b6d359059-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:242-243` | validateToken capture toute Exception et renvoie false, sans distinguer signature invalide, format, expiration ou erreur d'exécution. | [#640569fd00aada47-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:199-201` | Le commentaire signale qu'un ordre enregistré sous la classe proxy de JwtFilter ne se retrouve pas forcément par JwtFilter.class, d'où l'ancrage sur AuthorizationFilter. | [#authorization/dad4d9053e5be1a1-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java:3` | Ce test utilise les assertions JUnit, alors que EventCreationRequestContractTest utilise AssertJ, ce qui fait un écart entre les deux tests du lot. | [#backend-core/d468f061532819b7-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java:62-67` | Selon le commentaire, si ce test renvoie 401 il ne faut pas modifier l'assertion, car cela signale que la whitelist de SecurityConfig a sauté et que la découverte de clé du middleware Next boucle. | [#integrations/342785e73525bb29-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java:132-138` | L'assertion de taille 256 octets suppose une clé de 2048 bits, taille qui n'est fixée nulle part dans ce fichier. | [#d74c4e97b146b890-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:49-52` | Selon le commentaire, le flux POST /register réel présente un bug de persistance lié à @Version et à un id assigné, hors périmètre de ce test. | [#3806e8fd4aed6364-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:245-248` | Selon le commentaire, /api/auth/** est bypassé par JwtFilter, donc GET /me doit vérifier lui-même la révocation du jti. | [#79290e016b56afb1-1] |

## Méthodes de service {#t-service_method}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:72-75` | getActiveSessions délègue au repository la liste des sessions actives du user. | [#8c3307ce437f84b4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:78-84` | revokeCurrentSession ne fait rien si le jti est null, sinon révoque la session portant ce jti. | [#2df1b0746c9671ed-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:97-102` | revokeOtherSessions révoque les sessions actives du user sauf celle du jti courant et renvoie le nombre révoqué. | [#bd09bd20419dc5c2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:104-109` | revokeAllSessions révoque toutes les sessions actives du user en passant null comme jti épargné. | [#38af0486d696291c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:182-187` | Renvoie le claim jti du jeton, ou null lorsque le jeton fourni est null. | [#bf45aacd2052239c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:238-245` | Renvoie vrai si le sujet du jeton correspond au username de l'utilisateur et si le jeton n'est pas expiré. | [#63afccc0b7927446-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:73-74` | Le filtre charge l'utilisateur via UserDetailsService.loadUserByUsername à chaque requête où le contexte est vide et où le subject est présent. | [#authorization/899c7ea5383e6ca6-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:130-143` | Le JWKS contient une seule entrée RSA de type sig avec l'algorithme RS256, et une GeneralSecurityException est convertie en IllegalStateException sans détail. | [#authorization/d02ef1da9edc3272-1] |

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
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:42-43` | La durée de fraîcheur annoncée par JwksController vaut 5 minutes. | [#d288e3edd411767d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:105-108` | Le filtre est ignoré pour les requêtes dont le chemin servlet commence par /api/auth. | [#fdd139bf8bd1a5f1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:30-32` | La durée de vie des jetons est fixée à deux jours par la constante TOKEN_VALIDITY_MS, exprimée en millisecondes. | [#backend-core/ba79c292ff5ef085-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:35-40` | La clé privée de signature est lue depuis jwt.private-key avec une valeur par défaut vide, ce qui déclenche une paire RS256 éphémère. | [#backend-core/891330b9b1514b8d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:43` | La classe active la sécurité au niveau méthode en plus de la sécurité web, via @EnableMethodSecurity. | [#authorization/6118b2628faba525-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:76` | Les origines CORS sont lues depuis app.cors.allowed-origins, avec http://localhost:3000 comme valeur de repli. | [#079fdb3ce46307a4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:108-109` | La protection CSRF est désactivée dans la chaîne de filtres de sécurité. | [#5c1b482224ff60aa-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:112` | L'en-tête X-Frame-Options est fixé à DENY. | [#5c1b482224ff60aa-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:119-122` | Strict-Transport-Security est émis avec max-age de 31536000 secondes, sous-domaines inclus, sur toutes les requêtes. | [#5c1b482224ff60aa-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:144-154` | La CSP émise par l'API impose default-src 'self', script-src 'self', object-src 'none' et frame-ancestors 'none'. | [#5c1b482224ff60aa-4] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:156` | La politique de session est STATELESS, aucune session HTTP n'est créée par Spring Security. | [#5c1b482224ff60aa-5] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:211-215` | Commentaire : La configuration CORS autorise les credentials, et les en-têtes Authorization, Content-Type et Cookie. | [#authorization/9fe690aaca62310d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:211-213` | Commentaire : La configuration CORS autorise les credentials et limite les origines à la liste allowedOrigins. | [#b59d39faaf63cbef-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:225` | Commentaire : Les en-têtes Set-Cookie et Retry-After sont exposés au navigateur dans la configuration CORS. | [#b59d39faaf63cbef-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:55-57` | Commentaire : Selon le commentaire, la signature JWT se fait en RS256 avec une paire éphémère générée au boot du contexte quand jwt.private-key est vide en profil test. | [#c864fde175536f6f-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/JwkResponse.java:18-20` | Javadoc : Selon la javadoc, kid est une empreinte RFC 7638 et JwtService n'émet pas d'en-tête kid. | [#ad3bda18cda4f859-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/JwksResponse.java:16` | Un document de format normé est un record Java qui enveloppe une liste de clés. | [#backend-core/8870cb8fb2aa9b0e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java:11` | Javadoc : Selon la javadoc, la projection n'expose jamais le jti, ni userId ni revokedAt. | [#77ee74f48eacb8da-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java:20-28` | Une projection HTTP sans état mutable est un record Java, construit depuis le domaine par une méthode statique fromDomain. | [#backend-core/795dadaac9fca189-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java:35` | Le booléen current est calculé par comparaison du jti de la session avec le jti du token courant, et le jti n'est pas un champ du record. | [#backend-core/ebef872f478e286f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/SessionMapper.java:12-13` | Un mapper de session suit la même forme que les autres mappers, classe annotée @Component avec toDomain et toEntity qui copient les champs un à un. | [#backend-core/4421b1e51c50d256-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:75-78` | Commentaire : Selon le commentaire, revokeOtherSessions résout le jti courant avec la même logique que JwtFilter, cookie puis Bearer, pour éviter une révocation de toutes les sessions avec un client Bearer seul. | [#integrations/0c4739f6d39c9521-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:100-108` | resolveToken prend le cookie jwt en priorité, puis le header Authorization Bearer, sinon renvoie null. | [#ff08c9e080d3cf26-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:29-32` | SessionRepositoryJpaImpl étend SimpleJpaRepository et implémente le port SessionRepository. | [#eec2d1f4aad5dd92-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:13-14` | Javadoc : Selon la javadoc, le mapping doit correspondre exactement à la migration V10 avec ddl-auto=validate. | [#c0895783855b6bae-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:28-31` | Commentaire : Selon le commentaire, l'id UUID est assigné applicativement avant persist, sans @GeneratedValue. | [#af3f484b70febb0e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:129-140` | equals compare les entités sur un id non nul, et hashCode renvoie le hash de la classe. | [#c5b6bac1f40ce1a2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:40-42` | Le filtre JWT étend OncePerRequestFilter et lit le jeton dans le cookie jwt, puis dans l'en-tête Authorization au format Bearer si aucun cookie ne le fournit. | [#authorization/fef399d03b004ac4-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:46-47` | Le cookie jwt est recherché en premier, et le filtre s'arrête au premier cookie nommé jwt. | [#authorization/fef399d03b004ac4-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:55-60` | L'en-tête Authorization n'est lu que si aucun jeton n'a été trouvé dans les cookies, et seul le préfixe Bearer est accepté. | [#authorization/fef399d03b004ac4-3] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:92-100` | Les JwtException sont journalisées en debug comme cas nominal, les autres exceptions en error, et la requête poursuit dans tous les cas sans authentification. | [#authorization/20661afcf565be41-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:28` | La journalisation passe par un logger SLF4J statique nommé log, créé avec LoggerFactory.getLogger(Classe.class). | [#backend-core/bed04d0dbf37c4c9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:58-64` | Le matériel de clé est chargé et validé une seule fois au démarrage par une méthode annotée @PostConstruct. | [#backend-core/3372992d7afb3aab-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:79-93` | Une clé mal formée lève IllegalStateException avec le seul type de la cause, sans reprendre la valeur configurée ni le message de l'exception. | [#backend-core/1e299e939b17e348-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:118-119` | Javadoc : La clé publique est publiée au format JWK Set et dérivée à chaque appel du matériel de signature courant, selon la javadoc. | [#authorization/d02ef1da9edc3272-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:130-143` | La clé publique est publiée sous forme de JwksResponse dérivé du matériel de signature courant, et toute erreur d'encodage lève IllegalStateException. | [#backend-core/1b189dde85701d34-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:154` | Les jetons sont signés explicitement avec l'algorithme RS256 et la clé privée. | [#fb0adae7be618db0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:164-173` | La surcharge generateToken(Authentication) ajoute un claim jti UUID unique et un claim role, puis signe en RS256. | [#authorization/6e5f12c53197589c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:164-174` | Le jeton est construit avec Jwts.builder, un claim jti UUID aléatoire, une expiration issue de TOKEN_VALIDITY_MS et une signature RS256 explicite. | [#backend-core/0e3f907dd14ff23f-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:80` | Le constructeur injecte JwtFilter avec l'annotation @Lazy, pour éviter une dépendance circulaire au démarrage. | [#9d5ef4fdac7f544b-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:91-93` | Le PasswordEncoder de l'application est un BCryptPasswordEncoder. | [#f86b818bdd5e682d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:96-103` | Le AuthenticationManager est un ProviderManager qui contient un DaoAuthenticationProvider branché sur le UserDetailsService et le PasswordEncoder. | [#6f77a6fffc444044-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:194-195` | Commentaire : Le rateLimitingFilter et le jwtFilter sont insérés avant UsernamePasswordAuthenticationFilter, le rate limiting précédant le filtre JWT. | [#0b8854dd812e03a0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:202` | Commentaire : Le userRateLimitingFilter est inséré avant AuthorizationFilter, donc après l'authentification posée par jwtFilter. | [#0b8854dd812e03a0-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java:37-38` | Javadoc : Selon la javadoc, SecurityConfig termine par anyRequest().authenticated(), donc l'oubli du permitAll sur le JWKS produirait un 401 pour un appel anonyme. | [#integrations/9452b0b6b0b4a11c-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java:51` | La classe de test est un @SpringBootTest avec @AutoConfigureMockMvc, qui étend AbstractPostgresIntegrationTest. | [#1f47bb1d469a35d3-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java:150-155` | Le helper rebuildFromJwks reconstruit la clé publique RSA uniquement à partir des paramètres n et e servis par HTTP. | [#74b9ca616b6920f6-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionControllerTest.java:52-53` | Le test construit le contrôleur à la main avec des mocks de SessionService, CallerResolver et JwtService, puis MockMvcBuilders.standaloneSetup, sans contexte Spring. | [#67d6ad21188825d9-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:58-60` | La classe de test est annotée @SpringBootTest et @AutoConfigureMockMvc et hérite d'AbstractPostgresIntegrationTest, ce qui exécute la vraie chaîne Spring Security. | [#b0e56d0b364d78e8-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:81` | Un compteur statique AtomicInteger fournit une adresse distante distincte à chaque login via nextIp, dans le sous-réseau 10.73.x.y. | [#dfdebd22325d4c05-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:97-105` | La classe vide le SecurityContextHolder avant et après chaque test. | [#3558463a50bbc290-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java:45-52` | Le test construit JwtFilter avec des JwtService, UserDetailsService et SessionService mockés, et vide le SecurityContextHolder avant chaque test. | [#authorization/b32d79b48dfcaf48-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:21` | Javadoc : Selon la javadoc, l'acceptation de la CVE-2026-40973 dans la documentation repose sur l'hypothèse que l'application est STATELESS. | [#authorization/2cc6346d5dc0f499-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:23` | Javadoc : Selon la javadoc, SecurityConfig applique SessionCreationPolicy.STATELESS et l'authentification se fait par cookie JWT. | [#authorization/f4658d8432291c0d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:33-34` | Javadoc : Selon la javadoc, une règle ArchUnit nommée productionCodeShouldNotUseHttpSession, dans ArchitectureTest, interdit au code de production de dépendre de HttpSession. Cette règle n'est pas lue dans cette passe. | [#authorization/a114dec4d8a74350-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:36-38` | La classe est annotée @SpringBootTest et @AutoConfigureMockMvc et hérite d'AbstractPostgresIntegrationTest, ce qui exécute la vraie chaîne de filtres Spring Security. | [#a3deef6d8aacba54-1] |
| `frontend:services/sessionService.ts:2` | Le service importe le schéma Zod SessionListSchema et le type Session depuis '@/types/settings'. | [#dcf3228d83442a8b-1] |
| `frontend:services/sessionService.ts:14-17` | Les services de liste appellent apiClient.get avec un chemin relatif puis valident la réponse avec un schéma Zod de liste (SessionListSchema.parse). | [#frontend-core/0135de84623de5bb-1] |
| `frontend:services/sessionService.ts:19-25` | Les actions sans retour (DELETE) sont des fonctions async Promise<void> qui font await apiClient.delete sans traiter la réponse. | [#frontend-core/4eba82f1c00195c6-1] |
