# Annexe : session

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java` | 22 | test_case 13, convention 4, external_call 2 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java` | 16 | test_case 11, convention 2, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java` | 10 | endpoint 4, other 2, suspicious 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java` | 9 | business_rule 3, state_transition 2, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionControllerTest.java` | 9 | test_case 8, suspicious 1 |
| `frontend:components/settings/SessionList.test.tsx` | 9 | test_case 8, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java` | 8 | persistence_query 6, other 1, state_transition 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 8 | business_rule 3, convention 2, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java` | 8 | test_case 4, other 2, validation 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java` | 8 | test_case 5, other 2, convention 1 |
| `frontend:components/settings/SessionList.tsx` | 7 | business_rule 2, convention 2, ui_screen 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java` | 6 | entity 3, convention 2, other 1 |
| `frontend:hooks/useSessionManager.test.tsx` | 6 | test_case 4, convention 2 |
| `backend:src/main/resources/db/migration/V10__create_sessions.sql` | 5 | db_change 3, convention 1, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/SessionRepository.java` | 4 | business_rule 1, convention 1, other 1 |
| `frontend:hooks/useSessionManager.ts` | 4 | store_action 3, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java` | 3 | convention 2, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/SessionMapper.java` | 3 | convention 2, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Session.java` | 3 | business_rule 1, entity 1, other 1 |
| `frontend:services/sessionService.ts` | 3 | convention 2, endpoint 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/SessionNotFoundException.java` | 2 | other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/SessionService.java` | 2 | other 1, role_check 1 |

## Structure (suite) {#t-structure_overflow}

| Pointeur | Symbole | Énoncé | Fait |
|---|---|---|---|
| `frontend:components/settings/SessionList.tsx:72-90` | SessionList | SessionList affiche un spinner pendant isLoading, un message d'erreur avec role alert si isError, et un message vide si la liste est vide. | [#7b3376a7aed854a4-1] |
| `frontend:components/settings/SessionList.tsx:97-129` | SessionList | Chaque ligne affiche le nom d'appareil, ou la clé unknownDevice si deviceInfo est absent, avec le libellé current pour la session courante, puis l'IP et l'horodatage. | [#7b3376a7aed854a4-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:24-26` | SessionEntity | SessionEntity est l'entité JPA de la table sessions, sans relation ManyToOne vers l'utilisateur, user_id étant un UUID simple. | [#8aa2c92b12bee978-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:33-34` | SessionEntity.jti | Le champ jti est mappé non nul et unique. | [#5f9266f4536bd3d7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:48-49` | SessionEntity.createdAt | Le champ createdAt est mappé non nul et non modifiable après insertion. | [#fcc6db9146cf180a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Session.java:18-28` | Session | Session est un POJO domaine sans framework portant id, jti, userId, deviceInfo, ipAddress, lastActivity, createdAt, expiresAt et revokedAt. | [#97667c4e427f282c-1] |
| `frontend:hooks/useSessionManager.ts:15-42` | useSessionManager | Le hook lance une requête sur queryKeys.sessions.all avec getActiveSessions, et expose sessions, isLoading, isError, revokeOne et revokeOthers. | [#1448d857bc591a84-1] |
| `frontend:hooks/useSessionManager.ts:25-28` | useSessionManager.revokeOne | La mutation revokeOne appelle revokeSession avec l'id reçu, puis invalide queryKeys.sessions.all en cas de succès. | [#ed56bc4fa6580877-1] |
| `frontend:hooks/useSessionManager.ts:30-33` | useSessionManager.revokeOthers | La mutation revokeOthers appelle revokeOtherSessions, puis invalide queryKeys.sessions.all en cas de succès. | [#9e02d8f81987ba08-1] |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Une requête sans token n'est pas authentifiée et poursuit la chaîne en mode anonyme, avec un simple log debug. `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:62-68` [#authorization/1c9397f1d29ff038-1] | deducible |
| rules | - L'écran masque le bouton révoquer pour la session courante et le désactive pendant la révocation de cette session. `frontend:components/settings/SessionList.tsx:130-147` [#f82581af56a19982-1] | deducible |
| rules | - Le bouton révoquer les autres n'apparaît que s'il existe une session non courante et se désactive pendant l'opération. `frontend:components/settings/SessionList.tsx:152-168` [#f82581af56a19982-2] | deducible |
| tests | - Les tests fixent que révoquer la session d'un autre utilisateur donne 404 sans révocation, et que la session du propriétaire reste utilisable. [#cc657e2c785c1f7b-1] [#a91119d810dc7730-1] | deducible |
| tests | - Les tests fixent que le jti courant vient du cookie jwt ou du Bearer seul, et que le cookie prime quand les deux sont présents. [#ac879a4ffcbc1f3e-1] [#5762506a39094d45-1] [#923691090fc40de0-1] | deducible |
| tests | - Les tests fixent qu'une requête anonyme ou authentifiée ne crée ni HttpSession ni cookie JSESSIONID, contrôlé sans tenir compte de la casse. [#7cb3ad7cd9d81378-1] [#6e590d46247af55f-1] [#authorization/d0bd480ea9ec21a9-1] | deducible |
| tests | - Selon la javadoc, les tests d'intégration traversent la vraie chaîne Spring Security avec JwtFilter, la migration V10 et Postgres via Testcontainers. [#integrations/74670f1cc9d63a7c-1] | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java:35` | La méthode fromDomain calcule le champ current en comparant le jti de la session au jti courant de la requête. | [#ccf70a41239e3358-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:55-69` | isSessionActive renvoie true pour un jti null, et sinon false si la session est absente, expirée (expiresAt non nul et antérieur à maintenant) ou révoquée. | [#6a0da51faf97aa4c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:98-102` | revokeOtherSessions révoque toutes les sessions actives de l'utilisateur sauf celle du jti courant et renvoie le nombre révoqué. | [#bd09bd20419dc5c2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:105-109` | revokeAllSessions révoque toutes les sessions actives de l'utilisateur en appelant le repository avec un exceptJti null. | [#38af0486d696291c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Session.java:86-89` | isActive renvoie vrai uniquement si revokedAt est nul, sans tenir compte de expiresAt. | [#3f43cda45ff96445-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/SessionRepository.java:37-42` | Javadoc : Selon la javadoc, exceptJti nul révoque toutes les sessions actives de l'utilisateur et la méthode renvoie le nombre de sessions révoquées. | [#6c1b9cb651ab5112-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:76-79` | Commentaire : Selon le commentaire, un token révoqué laisse le contexte anonyme, ce qui conduit SecurityConfig à répondre 401, et la révocation est vérifiée par jti à chaque requête. | [#authorization/7bf638e03b67c801-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:76-81` | Le JwtFilter n'authentifie une requête que si la signature et l'expiration sont valides et si sessionService.isSessionActive renvoie vrai pour le jti. | [#aea9c4e6ee386f14-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:107` | JwtFilter ignore les requêtes dont le chemin commence par /api/auth. | [#fdd139bf8bd1a5f1-1] |
| `frontend:components/settings/SessionList.tsx:130-147` | Le bouton révoquer n'est rendu que pour les sessions non courantes, et il est désactivé pendant la révocation de cette même session. | [#f82581af56a19982-1] |
| `frontend:components/settings/SessionList.tsx:152-168` | Le bouton révoquer les autres n'est rendu que s'il existe au moins une session non courante, et il est désactivé pendant isRevokingOthers. | [#f82581af56a19982-2] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:62-68` | Une requête sans token ne reçoit aucune authentification et poursuit la chaîne de filtres en mode anonyme, le log étant au niveau debug. | [#authorization/1c9397f1d29ff038-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java:26-37` | Javadoc : Selon la javadoc de classe, la garde de JwtService.extractUsername (jeton vide ou blanc vers MalformedJwtException) est partagée par JwtFilter. | [#authorization/0fa515c1e1e3211d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java:26-29` | Javadoc : Selon la javadoc, la garde de JwtService.extractUsername lève MalformedJwtException pour un jeton vide ou blanc, au lieu d'une IllegalArgumentException brute de jjwt. | [#d8a96296a7b6f46d-1] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:88-95` | revokeSession vérifie que la session appartient à l'utilisateur appelant, sinon lève SessionNotFoundException, ce qui évite de distinguer une session inexistante d'une session d'autrui. | [#b02b89ecab5f6e75-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/SessionService.java:56-60` | Javadoc : Selon la javadoc, revokeSession exige que la session appartienne à userId, sinon SessionNotFoundException est levée (404). | [#039366c18768dd6d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:53-56` | Sans utilisateur résolu par callerResolver, GET /api/sessions répond 401 sans corps. | [#f6041a5ba9631bb4-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:57-60` | Selon le commentaire, un token sans jti n'est pas bloqué car il n'est pas révocable, ce qui laisse passer les tokens legacy sans contrôle de révocation. | [#6e267b0acf8be06d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:75-77` | Selon le commentaire, si le jti courant n'était pas résolu depuis le header Bearer, la révocation dégénérerait en revoke-all et révoquerait la session de l'appel lui-même. | [#58c5913af386a45f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:91` | La javadoc de SessionResponse suggère que l'utilisateur ne peut pas se déconnecter par erreur via DELETE /{id}, mais ce handler révoque la session ciblée sans contrôle sur la session courante. | [#69c02407ebf58772-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:92-100` | Les exceptions JwtException sont journalisées en debug, toute autre exception est journalisée en error puis la chaîne continue en mode anonyme, sans rejet explicite de la requête. | [#authorization/20661afcf565be41-1] |
| `backend:src/main/resources/db/migration/V10__create_sessions.sql:30` | Commentaire périmé : il indique que V11 est réservée à #78, alors que V11__events_conditional_check_constraints.sql existe dans le lot. | [#backend-core/7869dc86186b76fa-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java:27` | La javadoc de la classe de test annonce la couverture de la rotation, alors qu'aucune méthode de test de ce fichier ne couvre une rotation. | [#2731b3f667dbf6bb-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionControllerTest.java:32-35` | Selon la javadoc, en mode Bearer seul l'ancien contrôleur lisait le token du cookie seul, obtenait un jti null et révoquait toutes les sessions, y compris la session de l'appel. Le test couvre ce cas comme correctif. | [#c2df73796873d2b0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:49-53` | Selon le commentaire, le flux POST /register réel contient un bug de persistance lié à @Version et à un id assigné, hors périmètre de la tâche. Les utilisateurs de test sont donc seedés via EntityManager. | [#3806e8fd4aed6364-1] |

## Endpoints {#t-endpoint}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `frontend:services/sessionService.ts:8-11` | Javadoc : Selon le commentaire, DELETE /api/sessions/others renvoie 204 et révoque toutes les sessions sauf la courante. | [#e851a2e3d7ae1e09-1] |

## Méthodes de service {#t-service_method}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:36-51` | createSession crée une Session avec un UUID aléatoire, lastActivity et createdAt à l'instant courant, revokedAt null, puis la persiste. | [#015cc172ae17c133-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:77-80` | Commentaire : Selon le commentaire, le RateLimitingFilter limite le login par IP, et le test donne une remoteAddr unique à chaque POST /login. | [#integrations/8c4feacc4e67ccaa-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:132-134` | La méthode login appelle le vrai endpoint POST /api/auth/login avec une remoteAddr générée par nextIp et attend un 200. | [#integrations/490dc234907bf9ef-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/SessionRepository.java:25-26` | Javadoc : Selon la javadoc, findActiveByUserId renvoie les sessions non révoquées et non expirées de l'utilisateur, triées par activité décroissante. | [#2b24d6cea1122edb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:30-32` | SessionRepositoryJpaImpl étend SimpleJpaRepository de SessionEntity et implémente le port SessionRepository. | [#eec2d1f4aad5dd92-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:56` | findByJti exécute une JPQL qui sélectionne une SessionEntity par jti, limitée à un résultat. | [#6307260e9bd7a1d7-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:76` | findActiveByUserId sélectionne les sessions de l'utilisateur avec revokedAt nul et expiresAt postérieur à maintenant, triées par lastActivity décroissante. | [#7ea75b50e37269a6-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:93` | revokeByJti exécute un UPDATE JPQL qui pose revokedAt à maintenant uniquement sur les sessions du jti donné encore actives. | [#a50852c3ebf29c5f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:117` | Sans exceptJti, revokeAllByUserIdExcept révoque par UPDATE bulk toutes les sessions non révoquées de l'utilisateur. | [#bc24459718a8de0e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:125` | Avec exceptJti, revokeAllByUserIdExcept révoque par UPDATE bulk les sessions non révoquées de l'utilisateur dont le jti diffère de exceptJti. | [#bc24459718a8de0e-2] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:55-57` | Commentaire : Selon le commentaire, le profil test laisse jwt.private-key vide et l'authentification signe en RS256 avec une paire éphémère générée au démarrage du contexte. | [#c864fde175536f6f-1] |

## Changements de base {#t-db_change}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/resources/db/migration/V10__create_sessions.sql:33-44` | La migration V10 crée la table sessions avec id uuid clé primaire, jti varchar(255) non nul, user_id uuid non nul, device_info, ip_address, last_activity, created_at, expires_at non nuls et revoked_at nullable. | [#c597c0ffb41573e3-1] |
| `backend:src/main/resources/db/migration/V10__create_sessions.sql:47` | La migration V10 crée un index unique uq_sessions_jti sur la colonne jti. | [#8dc99572ba28d542-1] |
| `backend:src/main/resources/db/migration/V10__create_sessions.sql:49-53` | La migration V10 ajoute la clé étrangère fk_sessions_user de user_id vers users(id) avec suppression en cascade, et un index idx_sessions_user sur user_id. | [#a5ca305ebf7842fe-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java:11` | Javadoc : Les projections de réponse n'exposent jamais les identifiants internes de sécurité, ici le jti, ni le userId ou revokedAt. | [#backend-core/795dadaac9fca189-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java:20-28` | Les projections de réponse sans logique sont écrites en record Java, avec leur fabrique statique fromDomain. | [#backend-core/795dadaac9fca189-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/SessionMapper.java:9-10` | Javadoc : Selon le commentaire, l'IP stockée est déjà tronquée en amont de la création et le mapper la recopie telle quelle. | [#6ceb0804df4ca5f6-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/SessionMapper.java:15` | Le mapper de session suit la même forme que les autres mappers, toDomain par constructeur complet et toEntity par setters, avec un commentaire Javadoc en français. | [#backend-core/80333dc391dd1611-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/SessionRepository.java:9-13` | Javadoc : Selon la javadoc, le lookup par jti est appelé à chaque requête authentifiée et s'appuie sur un index UNIQUE de la migration V10. | [#e7e6330e369ea1ae-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:100-108` | Le contrôleur résout le jeton courant avec la même priorité que JwtFilter, cookie jwt d'abord puis en-tête Authorization Bearer. | [#integrations/d4deb5455801765f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:13-14` | Javadoc : Selon la javadoc, le mapping doit correspondre exactement à la migration V10 car ddl-auto vaut validate en dev, test et prod. | [#c0895783855b6bae-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:29` | Commentaire : L'identifiant UUID est assigné applicativement, sans @GeneratedValue. | [#af3f484b70febb0e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:24` | JwtFilter étend OncePerRequestFilter et est déclaré @Component, il est donc enregistré comme filtre de servlet une fois par requête. | [#authorization/3a7b6a8b2d3bfde3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:46-60` | Le filtre lit le token d'abord dans le cookie nommé jwt, puis, à défaut, dans l'en-tête Authorization au format Bearer. | [#authorization/fef399d03b004ac4-1] |
| `backend:src/main/resources/db/migration/V10__create_sessions.sql:9-11` | Commentaire : Le schéma d'une table doit refléter exactement son entité JPA, car ddl-auto=validate fait échouer le démarrage à tout écart entre entité et DDL. | [#backend-core/769931702f98c49a-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java:1-3` | Les tests de service utilisent les assertions de org.junit.jupiter.api.Assertions, alors que le test de contrat DTO du même lot utilise AssertJ, les deux styles coexistant. | [#backend-core/d468f061532819b7-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java:29-36` | Les tests de service sont annotés @ExtendWith(MockitoExtension.class), déclarent les dépendances en @Mock et le service testé en @InjectMocks, sans contexte Spring. | [#backend-core/d468f061532819b7-2] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:58-60` | La classe de test étend AbstractPostgresIntegrationTest et utilise @SpringBootTest avec @AutoConfigureMockMvc, ce qui applique la chaîne Spring Security réelle. | [#b0e56d0b364d78e8-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:97-105` | Les méthodes clearSecurityContextBefore et clearSecurityContextAfter vident le SecurityContextHolder avant et après chaque test. | [#3558463a50bbc290-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:113-127` | seedUser crée un UserEntity avec un username aléatoire de 16 caractères et le persiste dans une TransactionTemplate, sans assigner d'id. | [#9030bb5aa5cc6432-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:245-246` | Commentaire : Selon le commentaire, JwtFilter ignore /api/auth/**, donc GET /me doit vérifier lui-même la révocation du jti. | [#integrations/c7f72c46ae6db822-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:21-23` | Javadoc : Selon la javadoc, l'application est STATELESS via SessionCreationPolicy.STATELESS dans SecurityConfig, avec une authentification par cookie JWT HttpOnly et sans HttpSession serveur. | [#authorization/2cc6346d5dc0f499-1] |
| `frontend:components/settings/SessionList.test.tsx:12-16` | Le test mocke next-intl : useTranslations renvoie la clé préfixée par le namespace, et useLocale renvoie fr. | [#353410a367542094-1] |
| `frontend:components/settings/SessionList.tsx:27-36` | Javadoc : Selon la javadoc, lastActivity est lu avec serverDateTime et non new Date, car c'est un LocalDateTime Java sans offset lu dans le référentiel serveur. | [#a683e6d79d36f38d-1] |
| `frontend:components/settings/SessionList.tsx:51-58` | SessionTimestamp rend un élément time dont l'attribut dateTime reprend la valeur machine de serverDateTime, ou reste absent si elle vaut null. | [#a683e6d79d36f38d-2] |
| `frontend:hooks/useSessionManager.test.tsx:16-20` | Le test remplace le module sessionService par des fonctions mockées getActiveSessions, revokeSession et revokeOtherSessions. | [#d2507102eaa8604d-1] |
| `frontend:hooks/useSessionManager.test.tsx:31-39` | makeWrapper crée un QueryClient dont les requêtes et les mutations ont retry à false, et les requêtes ont gcTime à 0. | [#108a1976b07becb2-1] |
| `frontend:hooks/useSessionManager.ts:23-28` | Un hook regroupe une requête et plusieurs mutations, et les mutations partagent une fonction invalidate qui invalide queryKeys.sessions.all en onSuccess. | [#frontend-core/091906fcc66cdfe2-1] |
| `frontend:services/sessionService.ts:14-17` | Les services de liste appellent apiClient.get avec un chemin relatif puis valident la réponse avec un schéma Zod de liste (SessionListSchema.parse). | [#frontend-core/0135de84623de5bb-1] |
| `frontend:services/sessionService.ts:19-25` | Les actions sans retour (DELETE) sont des fonctions async Promise<void> qui font await apiClient.delete sans traiter la réponse. | [#frontend-core/4eba82f1c00195c6-1] |
