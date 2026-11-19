# Annexe : session

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java` | 28 | test_case 16, convention 5, other 3 |
| `mytimeline:frontend/src/lib/auth-jwks.ts` | 28 | business_rule 12, config 6, other 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 24 | convention 9, validation 5, business_rule 3 |
| `mytimeline:frontend/src/components/settings/SessionList.tsx` | 16 | other 5, business_rule 4, ui_screen 4 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java` | 13 | test_case 9, convention 3, suspicious 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java` | 13 | test_case 10, endpoint 1, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java` | 13 | test_case 8, convention 3, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 12 | business_rule 5, other 3, convention 2 |
| `mytimeline:frontend/src/lib/auth-jwks.test.ts` | 12 | test_case 11, config 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java` | 10 | service_method 6, business_rule 2, role_check 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java` | 10 | endpoint 4, business_rule 2, role_check 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java` | 10 | persistence_query 3, state_transition 3, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java` | 10 | other 6, convention 2, db_change 1 |
| `mytimeline:frontend/src/components/settings/SessionList.test.tsx` | 10 | test_case 9, convention 1 |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql` | 8 | db_change 4, convention 2, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionControllerTest.java` | 7 | test_case 4, endpoint 1, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java` | 7 | convention 3, test_case 3, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java` | 7 | test_case 4, other 2, convention 1 |
| `mytimeline:frontend/src/hooks/useSessionManager.ts` | 7 | store_action 2, convention 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java` | 6 | convention 3, config 1, endpoint 1 |
| `mytimeline:frontend/src/hooks/useSessionManager.test.tsx` | 6 | test_case 5, entity 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/SessionMapper.java` | 4 | convention 2, service_method 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/Session.java` | 4 | other 2, entity 1, state_transition 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/SessionRepository.java` | 4 | business_rule 1, db_change 1, entity 1 |
| `mytimeline:frontend/src/services/sessionService.ts` | 4 | external_call 2, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java` | 3 | convention 1, entity 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/SessionService.java` | 3 | other 2, entity 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/JwkResponse.java` | 2 | entity 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/JwksResponse.java` | 2 | entity 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/SessionNotFoundException.java` | 2 | other 2 |

## Structure (suite) {#t-structure_overflow}

| Pointeur | Symbole | Énoncé | Fait |
|---|---|---|---|
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionControllerTest.java:71-73` | SessionController.revokeOtherSessions | Le test appelle DELETE /api/sessions/others avec un header Authorization Bearer et attend un statut 204. | [#e9cfefebf67da428-1] |
| `mytimeline:frontend/src/components/settings/SessionList.tsx:60-68` | SessionList | Le composant SessionList est une présentation pure qui reçoit sessions, isLoading, isError et les callbacks de révocation du parent, sans appel réseau. | [#34dc29289cbadbd7-1] |
| `mytimeline:frontend/src/components/settings/SessionList.tsx:72-78` | SessionList | Pendant le chargement, SessionList affiche un Spinner libellé par la clé security.sessions.loading. | [#34dc29289cbadbd7-2] |
| `mytimeline:frontend/src/components/settings/SessionList.tsx:80-86` | SessionList | En cas d'erreur de chargement, SessionList affiche un paragraphe d'alerte (role alert) avec la clé security.sessions.error. | [#34dc29289cbadbd7-3] |
| `mytimeline:frontend/src/components/settings/SessionList.tsx:88-90` | SessionList | Quand la liste de sessions est vide, SessionList affiche le message de la clé security.sessions.empty. | [#34dc29289cbadbd7-4] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:73-78` | JwksCacheEntry | JwksCacheEntry porte l'URL, les clés importées ou null (cache négatif) et l'instant d'expiration. | [#2c291aa227330d27-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:30-32` | SessionRepositoryJpaImpl | Implémentation JPA du port SessionRepository, qui étend SimpleJpaRepository sur SessionEntity. | [#f3c2113c9ae69cac-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/SessionRepository.java:14` | SessionRepository | Port de persistance des sessions exposant save, findByJti, findDomainSessionById, findActiveByUserId, revokeByJti, revokeById et revokeAllByUserIdExcept. | [#4b5f68bf9982700f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:25-26` | SessionEntity | Entité JPA mappant la table sessions, sans relation ManyToOne vers l'utilisateur. | [#15c2f11c08ada6bb-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/Session.java:18` | Session | Modèle domaine POJO de session, sans annotation de framework, portant id, jti, userId, deviceInfo, ipAddress, lastActivity, createdAt, expiresAt et revokedAt. | [#901a768597e9900f-1] |
| `mytimeline:frontend/src/hooks/useSessionManager.test.tsx:22-29` | SESSION | La fixture SESSION décrit une session au modèle Session avec id, deviceInfo, ipAddress, lastActivity, createdAt et current à true. | [#548ebc17579c19be-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java:20-26` | SessionResponse | Record HTTP exposant id, deviceInfo, ipAddress, lastActivity, createdAt et current, sans jti, userId ni revokedAt. | [#a4caabd9f0894588-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/JwkResponse.java:26` | JwkResponse | Record JWK portant kty, use, alg, kid, n et e, décrivant une clé publique RSA. | [#53a832c15404f9c5-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/JwksResponse.java:16` | JwksResponse | Record JWK Set qui porte une liste de JwkResponse sous le champ keys. | [#a67a37398f98b54e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/SessionService.java:26` | SessionService | Port métier de gestion des sessions, implémenté par SessionServiceImpl. | [#a1def5661e05993e-1] |
| `mytimeline:frontend/src/components/settings/SessionList.tsx:137` | SessionList | Le clic sur le bouton de révocation d'une session appelle onRevoke avec l'identifiant de cette session. | [#edbc3b32705e5487-1] |
| `mytimeline:frontend/src/components/settings/SessionList.tsx:158-159` | SessionList | Le bouton de révocation des autres sessions appelle onRevokeOthers et est désactivé pendant isRevokingOthers. | [#edbc3b32705e5487-2] |
| `mytimeline:frontend/src/hooks/useSessionManager.ts:25-28` | useSessionManager.revokeOne | La mutation revokeOne appelle revokeSession avec l'identifiant de la session et invalide la liste au succès. | [#cdb23e0c1cbf685d-1] |
| `mytimeline:frontend/src/hooks/useSessionManager.ts:30-33` | useSessionManager.revokeOthers | La mutation revokeOthers appelle revokeOtherSessions et invalide la liste au succès. | [#96db0312486bf664-1] |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - Un token dont l'algorithme d'en-tête n'est pas RS256 est refusé par une UnsupportedJwtException, et un token null ou blanc lève une MalformedJwtException avant tout parsing. [#4100c1be84241db9-2] [#4100c1be84241db9-1] | deducible |
| rules | - Au démarrage, une clé privée configurée mal formée ou de moins de 2048 bits lève une IllegalStateException, sans la valeur de la clé dans le message. [#ef87c246cf80ad36-1] [#b2f6ed5d12ae0f1f-1] | deducible |
| rules | - Si jwt.private-key est null ou blanche, la paire de clés est éphémère. [#bd33526e70f8564d-1] | deducible |
| rules | - Un token est valide si son subject égale le username et s'il n'est pas expiré, et toute exception de lecture renvoie false. [#3b854a5a8240ae8e-1] | deducible |
| rules | - Le token est lu dans le cookie jwt, puis dans le header Bearer seulement si le cookie est absent. [#ca71e703aa0a385e-1] [#ca71e703aa0a385e-2] | deducible |
| rules | - Une session est active si elle n'est pas révoquée et si expiresAt est null ou futur. [#62c3a6a444be3d3e-2] | deducible |
| rules | - L'écran n'affiche pas de bouton de révocation sur la session courante, et celui des autres sessions n'apparaît que s'il en existe au moins une. [#ccfe86716191198d-3] [#ccfe86716191198d-4] | deducible |
| rules | - Un JWKS sans aucune clé RSA exploitable est un échec (null), et une URL qui n'est pas http ou https est rejetée. [#273b92d28c9d6009-2] [#3ef5e05b4af29b6d-1] | deducible |
| surface | - DELETE /api/sessions/others révoque toutes les sessions sauf celle du jti courant. Le service renvoie le nombre révoqué mais le contrôleur répond 204 sans le transmettre [#e04e89078218713a-1] [#de19703e7dfaa096-1]. | deducible |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:56-60` | Commentaire : Un jti null renvoie true, donc un token sans jti n'est pas contrôlé par la révocation. | [#62c3a6a444be3d3e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:66-67` | Une session est considérée comme active si son expiresAt est null ou postérieur à maintenant, et si elle n'est pas révoquée. | [#62c3a6a444be3d3e-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/SessionRepository.java:39` | Javadoc : Selon la javadoc, un exceptJti null révoque toutes les sessions actives du user. | [#d8f4a50cabd05d4b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:101-107` | Le token est lu dans le cookie jwt en priorité, sinon dans le header Authorization Bearer, sinon vaut null. | [#4eafc354b9e48bac-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:111-117` | Extrait le jti du token, et renvoie null si jwtService.extractJti lève une JwtException. | [#b1f9de3bed3242ce-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:113-121` | Si exceptJti est null, toutes les sessions actives du user sont révoquées sans clause sur le jti. | [#773adc4a897671a9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:23-24` | Filtre OncePerRequestFilter qui lit le token JWT et établit le contexte d'authentification. | [#646a937c7e9e9f25-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:48-49` | Le token est d'abord lu dans le cookie nommé jwt. | [#ca71e703aa0a385e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:56-58` | Le header Authorization Bearer n'est lu que si aucun token n'a été trouvé dans le cookie. | [#ca71e703aa0a385e-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:80-90` | Le contexte est authentifié seulement si la signature et l'expiration sont valides et si la session du jti est active, sinon le contexte reste anonyme. | [#ca71e703aa0a385e-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:106-108` | Les requêtes dont le chemin commence par /api/auth ne passent pas par ce filtre. | [#aadd66368506008b-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:30-32` | La durée de vie d'un token est fixée à TOKEN_VALIDITY_MS, soit 2 jours en millisecondes. | [#9ae01a28faab2017-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:58-64` | Au démarrage, la paire de clés est éphémère si jwt.private-key est null ou blanc, sinon elle est chargée depuis la clé configurée. | [#bd33526e70f8564d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:238-245` | Un token est valide si son subject est égal au username de l'utilisateur et s'il n'est pas expiré, toute exception levée pendant la lecture renvoyant false. | [#3b854a5a8240ae8e-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:192-202` | Une clé RSA de moins de 2048 bits lève IllegalStateException au démarrage, le message devant mentionner 2048. | [#b2f6ed5d12ae0f1f-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:258-268` | Commentaire : Une clé vide ou blanche fait générer au service une paire RSA éphémère, donc deux instances produisent des SPKI différents. | [#66066bb0b8e11ea1-1] |
| `mytimeline:frontend/src/components/settings/SessionList.tsx:92` | Le compteur otherSessionsCount compte les sessions dont le drapeau current est faux. | [#ccfe86716191198d-1] |
| `mytimeline:frontend/src/components/settings/SessionList.tsx:114-118` | Le libellé de la session courante (clé security.sessions.current) est affiché à côté du nom de l'appareil quand la session est current. | [#ccfe86716191198d-2] |
| `mytimeline:frontend/src/components/settings/SessionList.tsx:130-147` | Le bouton de révocation d'une session n'est rendu que pour les sessions qui ne sont pas la session courante. | [#ccfe86716191198d-3] |
| `mytimeline:frontend/src/components/settings/SessionList.tsx:152-168` | Le bouton de révocation de toutes les autres sessions n'est affiché que s'il existe au moins une session autre que la courante. | [#ccfe86716191198d-4] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:108-109` | L'avertissement de configuration absente n'est émis qu'une fois, et uniquement quand NODE_ENV vaut production. | [#d15123bfc86634e6-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:134-137` | L'avertissement de JWKS inexploitable n'est émis qu'une fois, et uniquement en production. | [#03afec5ec3476487-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:159-171` | normalizeJwksUrl renvoie null pour une valeur absente, vide ou blanche, et pour tout protocole autre que http ou https. | [#3ef5e05b4af29b6d-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:181-184` | importJwk n'accepte que les entrées JWK de type RSA, avec alg RS256 et use sig si ces champs sont présents, et des champs n et e en chaîne. | [#deacb5259b243963-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:189` | La clé RSA est importée en CryptoKey de vérification avec l'algorithme RS256, sans extraction possible. | [#deacb5259b243963-2] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:203` | importJwks renvoie null si le champ keys n'est pas un tableau. | [#273b92d28c9d6009-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:206-212` | Un JWKS dont aucune entrée n'est exploitable est traité comme un échec et renvoie null, et non comme un succès sans clé. | [#273b92d28c9d6009-2] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:231` | Un minuteur annule la requête JWKS après JWKS_FETCH_TIMEOUT_MS, et le minuteur est nettoyé dans finally. | [#4596a606700eeba3-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:239` | Une réponse HTTP non 2xx fait renvoyer null à fetchJwks. | [#4596a606700eeba3-2] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:251-253` | Une découverte déjà en vol pour la même URL est rejointe au lieu de lancer un second fetch. | [#6cf029c12cda83fb-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:285-287` | getVerificationKeys renvoie les clés en cache si elles sont pour la même URL et si leur expiration est postérieure à nowMs, sinon déclenche une découverte. | [#9229b76e0bed391a-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:306-307` | refreshVerificationKeys renvoie null si le dernier rafraîchissement forcé date de moins de JWKS_REFRESH_COOLDOWN_MS, sinon mémorise l'instant et relance une découverte. | [#30431f5a0ac10942-1] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:79-93` | Une clé privée configurée mal formée lève une IllegalStateException au démarrage, avec un message qui ne contient ni la valeur ni le détail de l'exception, seulement son type. | [#ef87c246cf80ad36-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:220-236` | Le parsing vérifie la signature avec la clé publique et refuse tout jeton dont l'en-tête alg n'est pas RS256 en levant UnsupportedJwtException. | [#authorization/c9ffe973525260e3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:220-223` | Un token null ou blanc lève une MalformedJwtException avant tout parsing. | [#4100c1be84241db9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:221-223` | Un jeton null ou blanc lève MalformedJwtException, sous-type de JwtException, pour rester dans la hiérarchie attendue par les appelants. | [#authorization/c9ffe973525260e3-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:229-235` | Après vérification de la signature, un token dont l'algorithme d'en-tête n'est pas RS256 est refusé par UnsupportedJwtException. | [#4100c1be84241db9-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:215-221` | Un jeton vide lève une exception de la hiérarchie JwtException et non une IllegalArgumentException. | [#da505b5cd91b833b-1] |

## Contrôles de rôle {#t-role_check}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:91-93` | Charge la session par id et ne la retient que si son userId égale l'utilisateur appelant, sinon lève SessionNotFoundException. | [#bff86dd6859709fe-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:53-56` | Si aucun utilisateur n'est résolu pour l'appel, la réponse est 401 sans corps. | [#7c0dcf45a10ce53a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:91-92` | La révocation est transmise avec l'id du caller, l'ownership étant contrôlé par le service. | [#ac895495275a8319-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionControllerTest.java:106-116` | Javadoc : Selon le commentaire BR-AUT-005, un appelant non authentifié reçoit 401 et SessionService n'est jamais appelé. | [#ea141c1f968fa058-1] |

## Faits suspects {#t-suspicious}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:88-95` | revokeSession ne compare pas la session au jti courant, alors que la javadoc de SessionResponse indique que l'utilisateur ne peut pas se déconnecter par erreur via DELETE /{id}. | [#60d87394ad68b10d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:78-79` | Si le jti courant est illisible, currentJti vaut null et le service révoque toutes les sessions du user, y compris la session appelante, malgré le commentaire qui décrit ce cas comme évité. | [#7b304e695db3fff2-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:97-100` | Les exceptions non JwtException sont journalisées en erreur puis la chaîne continue sans authentification, le contexte restant anonyme. | [#authorization/af86537e34083429-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:145-156` | Cette surcharge qui prend un String ne pose pas de claim jti, alors que la javadoc de l'autre surcharge affirme que chaque jeton émis en porte un. | [#backend-socle/99cdc3c6ad8d23f3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:158-163` | Selon le commentaire, chaque token émis embarque un claim jti. Le code de generateToken(String) à la ligne 145 n'ajoute pourtant aucun jti, ce qui contredit ce commentaire pour cette surcharge. | [#fcbf6fede1ba05e2-1] |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:30` | Le commentaire indique que V11 est réservée à un autre ticket, alors que V11__events_conditional_check_constraints.sql existe dans le lot. | [#backend-socle/db6492a31cfbd9c9-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java:3` | Ce test importe les assertions JUnit, alors que EventCreationRequestContractTest importe AssertJ assertThat, ce qui crée deux styles d'assertion dans le même lot. | [#backend-socle/f3ae5e057a4af1e3-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java:61-67` | Selon la javadoc, si ce test renvoie 401, le test ne doit pas être réparé dans son assertion, car la whitelist de SecurityConfig aurait sauté et le middleware Next boucle sur la découverte de clé. | [#integrations/4c7add49c7251530-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:49-52` | Selon le commentaire, le flux POST /register réel présente un bug de persistance (@Version et id assigné) hors périmètre du test, et les utilisateurs de test sont seedés via EntityManager à la place. | [#9d1fc0fa65838096-1] |
| `mytimeline:frontend/src/components/settings/SessionList.tsx:46-49` | Selon le commentaire, le style mt-date--long impose 13px alors que le paragraphe parent porte text-xs (15px), écart assumé et non vérifié en navigateur. | [#cd348f8f015db5aa-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:86` | La déduplication par inFlight ne couvre qu'une seule URL à la fois : une découverte lancée pour une autre URL écrase inFlight, et le finally de la première ne le remet pas à null tant que la référence diffère. | [#ba73f8f402bf89c4-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:111-120` | Selon le commentaire, sans JWKS la vérification du cookie jwt est inactive et la garde retombe sur la seule présence du cookie, ce que le message de log décrit comme acceptant un cookie forgé. | [#58bc2c4ad6b8afcc-1] |

## Méthodes de service {#t-service_method}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/SessionMapper.java:15-27` | Convertit une SessionEntity en Session en recopiant les neuf champs. | [#100ad1baabddfc2d-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/SessionMapper.java:29-41` | Crée une SessionEntity neuve et recopie les champs du modèle domaine Session. | [#6f6b2838104aa520-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:36-51` | Crée une session avec un UUID aléatoire, lastActivity et createdAt à l'instant courant, revokedAt à null, puis la sauvegarde via le port. | [#9bf68d5fc4930b35-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:55-69` | Indique si une session porte ce jti, n'est ni expirée ni révoquée, et renvoie false si le jti est inconnu. | [#04cfbb8d1e017a64-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:73-75` | Délègue au repository la liste des sessions actives d'un utilisateur. | [#8c16eb9a95b90411-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:79-84` | Révoque la session portant le jti donné, sans rien faire si le jti est null. | [#ca3814ba987c75cc-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:99-102` | Révoque toutes les sessions du user sauf celle du jti courant et renvoie le nombre de sessions révoquées. | [#de19703e7dfaa096-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:106-109` | Révoque toutes les sessions actives du user en passant un exceptJti null au repository. | [#40acec6c72b68b25-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:111-113` | Renvoie la clé publique de vérification encodée en SPKI Base64. | [#b389dd7673c3915d-1] |
| `mytimeline:frontend/src/hooks/useSessionManager.ts:15-42` | Le hook useSessionManager expose sessions, isLoading, isError, revokeOne et revokeOthers, à partir d'une requête TanStack Query sur la clé queryKeys.sessions.all. | [#a808fd3e0b9f5ed4-1] |

## Appels externes {#t-external_call}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:63-65` | La réponse contient le corps renvoyé par JwtService.getPublicJwks et un en-tête Cache-Control public avec max-age de 5 minutes. | [#integrations/f250c5f091bd03d3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:28-30` | Le filtre interroge le port SessionService à chaque requête pour vérifier que le jti n'est pas révoqué. | [#authorization/c77c2fb06ca1c19b-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:234-238` | fetchJwks appelle l'URL du JWKS avec fetch, un AbortSignal, cache 'no-store' et l'en-tête accept application/json. | [#c33b7c36cb6166e6-1] |
| `mytimeline:frontend/src/services/sessionService.ts:19-21` | revokeSession appelle DELETE /sessions/{id} via apiClient et ne renvoie rien. | [#7c4f0ca3f8553f0f-1] |
| `mytimeline:frontend/src/services/sessionService.ts:23-25` | revokeOtherSessions appelle DELETE /sessions/others via apiClient. | [#126888d660a4ef8d-1] |

## Requêtes de persistance {#t-persistence_query}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/SessionRepository.java:19-20` | Javadoc : Lookup par jti, documenté comme appelé à chaque requête par JwtFilter. | [#221b0486d671bd4a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:55-59` | Exécute une JPQL de lecture par jti limitée à un résultat et renvoie un Optional de Session. | [#46e94609c4a2d890-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:66-67` | Recherche la session par id via findById puis la convertit en Session domaine. | [#44644e4a931942e8-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:74-84` | JPQL qui ramène les sessions du user non révoquées et non expirées, triées par lastActivity décroissant. | [#243e8a96449fcda1-1] |
| `mytimeline:frontend/src/hooks/useSessionManager.ts:18-21` | La requête de sessions utilise la clé queryKeys.sessions.all et la fonction getActiveSessions. | [#04d59447ec79e431-1] |

## Configuration {#t-config}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:43` | Durée de cache annoncée valant 5 minutes. | [#97014f73a14b2d33-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:35-40` | La clé privée RS256 est lue depuis la propriété jwt.private-key avec une valeur par défaut vide, qui déclenche la génération d'une paire éphémère. | [#backend-socle/be183b621d286328-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:55-58` | Commentaire : Selon le commentaire, l'authentification signe en RS256 sur une paire éphémère générée au démarrage du contexte, sans propriété de signature dans le test. | [#2ef4abcad452d6cf-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:185` | Le message d'erreur de démarrage cite la variable JWT_PRIVATE_KEY lorsque la clé privée est invalide. | [#authorization/10f31de83256cea2-1] |
| `mytimeline:frontend/src/lib/auth-jwks.test.ts:224-230` | Le test de contrat affirme que le nom de la variable d'environnement de l'URL JWKS est AUTH_JWKS_URL. | [#c56028cc41cfac1a-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:39-40` | La constante AUTH_JWKS_URL_ENV_VAR vaut 'AUTH_JWKS_URL', nom de la variable d'environnement portant l'URL du JWKS. | [#86dcb61bd8d6370a-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:43` | RS256_PARAMS vaut l'algorithme RSASSA-PKCS1-v1_5 avec le hachage SHA-256. | [#e0b77f5bcf4c7218-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:50` | La durée de fraîcheur d'un JWKS récupéré avec succès vaut 10 minutes, soit 600000 ms. | [#79900a6777f9148f-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:57` | La durée de fraîcheur d'un échec de découverte JWKS vaut 30 secondes. | [#e9f9e266f729a9a0-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:68` | Le délai minimal entre deux rafraîchissements forcés du JWKS vaut 60 secondes. | [#2988424d0a16b096-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:71` | Le délai maximal de la requête de récupération du JWKS vaut 2000 ms. | [#4114aacb2eaa2919-1] |

## Changements de base {#t-db_change}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/SessionRepository.java:11-12` | Javadoc : Selon la javadoc, un index UNIQUE sur jti est créé par la migration V10. | [#cb4f2d1d5fbc5d47-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:13` | Javadoc : Selon la javadoc, le mapping doit correspondre exactement à la migration V10 avec ddl-auto=validate. | [#7c89395c1957a5dc-1] |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:33-44` | Crée la table sessions avec une clé primaire uuid id, les colonnes jti, user_id, device_info, ip_address, last_activity, created_at, expires_at et revoked_at, toutes les colonnes temporelles sauf revoked_at étant non nulles. | [#55283612def744f6-1] |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:47` | Crée un index unique uq_sessions_jti sur la colonne jti de la table sessions. | [#00d4297f549c0de6-1] |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:49-51` | Ajoute la clé étrangère fk_sessions_user de user_id vers users(id) avec suppression en cascade. | [#6a04b48c652a2b3a-1] |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:53` | Crée un index idx_sessions_user sur user_id de la table sessions. | [#b2316d1d3e947a98-1] |

## Conventions {#t-convention}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java:35` | La projection SessionResponse calcule le booléen current par comparaison du jti de la session au jti du token courant, sans exposer le jti lui-même. | [#backend-socle/99dd5417309772e6-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/SessionMapper.java:10` | Javadoc : Le mapper de session recopie les champs tels quels, sans transformation, l'IP étant déjà tronquée en amont de la persistance. | [#backend-socle/8100fd9d242bfaeb-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/SessionMapper.java:13` | Composant Spring de mapping entre SessionEntity et Session. | [#24e85294ccc3be9f-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:25` | Javadoc : Selon la javadoc, SecurityConfig whiteliste ce chemin en permitAll. | [#integrations/e3363486bc1c138a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:31` | Javadoc : Selon la javadoc, le chemin /.well-known est l'emplacement conventionnel attendu par les clients OIDC ou JOSE. | [#integrations/d0b960cdac31bfa8-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:40` | Constante du chemin canonique /.well-known/jwks.json. | [#3f712b6363d82e23-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:129-140` | L'égalité se fait sur l'id non null, et hashCode renvoie le hashCode de la classe, identique pour toutes les instances. | [#a6aae873eca61ea3-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:137-140` | hashCode renvoie le hashCode de la classe, valeur constante pour toutes les instances. | [#d74298a902d79d15-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:73` | Le filtre ne recharge pas l'authentification si le contexte de sécurité en contient déjà une. | [#authorization/f6e75e0a5e5133b6-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:86-90` | Lorsque la validation échoue, le contexte reste anonyme et le message est journalisé au niveau debug, la réponse 401 étant laissée à SecurityConfig. | [#authorization/f6e75e0a5e5133b6-3] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:25-26` | JwtService est un service Spring qui assure la génération, la lecture et la validation des jetons JWT signés en RS256. | [#authorization/06331b678c00eed1-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:25-28` | Les services d'infrastructure déclarent un logger SLF4J statique nommé log, obtenu par LoggerFactory.getLogger(NomDeClasse.class). | [#backend-socle/26f0356164d6f3fd-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:58-59` | Le matériel de signature est chargé dans une méthode annotée @PostConstruct, qui s'exécute une seule fois au démarrage. | [#backend-socle/d56dbbde62261227-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:79-93` | Une clé mal formée lève IllegalStateException avec un message qui ne reprend ni la valeur configurée ni le message de l'exception source, seulement son type. | [#backend-socle/fac6a46f66104090-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:130` | La clé publique est exposée sous forme de JwksResponse, DTO défini dans le package application.dtos et importé par l'infrastructure. | [#backend-socle/9acc6ec513b2063e-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:154` | Les jetons sont signés en RS256 avec Jwts.SIG.RS256, et la vérification refuse tout autre algorithme. | [#backend-socle/4aa88cfacaa0e8d4-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:168` | La surcharge qui prend un Authentication pose un identifiant jti UUID aléatoire via .id(...). | [#backend-socle/4aa88cfacaa0e8d4-2] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:182-187` | L'extraction du jti renvoie null pour un jeton sans claim jti, sans lever d'erreur. | [#authorization/a6456c890ea2fa34-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java:238-245` | validateToken renvoie false sur toute exception levée pendant la vérification, sans la propager. | [#backend-socle/e7e48dce92f507bc-1] |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:29` | Commentaire : Chaque migration porte un en-tête qui interdit d'éditer les migrations déjà appliquées et annonce la migration courante comme seule à créer ou modifier. | [#backend-socle/7793e6ac844572f9-1] |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:56-61` | Commentaire : Le rollback est documenté en commentaire manuel en fin de fichier, sous forme de drop index, drop constraint et drop table if exists, car Flyway Community ne rejoue pas les undo. | [#backend-socle/26484af2da385018-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java:29-36` | Un test unitaire de service utilise MockitoExtension, avec le port repository en @Mock et l'implémentation testée en @InjectMocks. | [#backend-socle/9c97f3702eab0cc9-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java:44` | Les méthodes de test sont nommées méthode_contexte_résultat, avec des assertions JUnit simples sur le résultat. | [#backend-socle/99f03f708791aed2-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java:69` | Pour vérifier qu'un cas n'accède pas au repository, le test utilise verify avec never() sur le mock. | [#backend-socle/7bb81592aeeb1911-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:77-89` | Le test attribue une adresse distante unique à chaque POST /api/auth/login via un compteur atomique, dans le sous-réseau 10.73.x.y, pour éviter les collisions de buckets du rate limiting par IP. | [#b74ee2ee01fb8859-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:97-105` | Le test vide le SecurityContext avant et après chaque méthode de test via des méthodes annotées BeforeEach et AfterEach. | [#84e447af729512d0-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java:107-127` | La méthode seedUser crée un utilisateur avec un mot de passe BCrypt encodé, persisté via EntityManager dans une transaction TransactionTemplate distincte. | [#5e164a9530acf0b3-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java:26-28` | Javadoc : Selon la javadoc, la garde de jeton vide posée dans JwtService.extractUsername est partagée par JwtFilter. | [#authorization/e3759e750180d203-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java:34-35` | Javadoc : Selon la javadoc, JwtService est mocké dans ce test et son comportement réel est vérifié dans un autre test. | [#authorization/0c410f5b572fc2c3-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java:65` | Le test transporte le jeton dans un cookie nommé jwt. | [#authorization/5c8f355cd8d08140-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:24-25` | Javadoc : Selon la javadoc, la signature d'authentification passe de HS256 à RS256 pour permettre la vérification côté Edge sans publier de clé de frappe. | [#authorization/35d96af5bdd28ae5-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:29-30` | Javadoc : Selon la javadoc, aucune clé n'est committée et la paire de test est générée au lancement des tests. | [#authorization/47a0c46dc9a43831-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:40-46` | La paire RSA de test est générée en mémoire dans une méthode annotée BeforeAll, avec une taille de 2048 bits. | [#authorization/47a0c46dc9a43831-2] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:49-52` | Le helper de test injecte le matériel de clé dans le champ privateKeyMaterial par réflexion, puis appelle initKeyMaterial. | [#authorization/63af88fd0b84c16c-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java:211` | Javadoc : Selon la javadoc, parseClaims doit lever une MalformedJwtException pour un jeton vide plutôt que laisser fuiter une IllegalArgumentException. | [#authorization/aef99abf1bede29a-1] |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java:21-23` | Javadoc : Selon la javadoc, l'application est stateless grâce à SessionCreationPolicy.STATELESS dans SecurityConfig, avec authentification par cookie JWT HttpOnly. | [#authorization/dfdf8e57a3c9a03c-1] |
| `mytimeline:frontend/src/components/settings/SessionList.test.tsx:12-16` | Le test mocke next-intl, avec useTranslations qui renvoie la clé préfixée par le namespace et useLocale qui renvoie fr. | [#46fe1d10023d83f4-1] |
| `mytimeline:frontend/src/hooks/useSessionManager.ts:12-13` | Javadoc : Selon le commentaire, le hook utilise TanStack Query v5 en forme objet et invalide queryKeys.sessions.all après chaque révocation. | [#8b73e849a3abdcdb-1] |
| `mytimeline:frontend/src/lib/auth-jwks.ts:218-221` | Javadoc : Selon le commentaire, fetchJwks utilise cache 'no-store' pour ne pas doubler le cache applicatif ni laisser une politique de cache externe décider de la fraîcheur des clés. | [#e652c2b81bf3e74c-1] |
