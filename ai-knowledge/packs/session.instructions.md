---
pack: session
kind: domain
name: Session et jetons
generated_at: 2026-11-20T11:40:00Z
generator: synth/1
base_sha256: ea792a5f4e7e5368ef5a8a0e4b90b77e0814580bb95f6ff95ef34f7182bcc41c
facts_in_base: 172
facts_in_pool: 216
facts_cited: 71
sections: session.sections.json
details: [session.details.md]
lang: fr
curated_at: 2026-11-20T12:45:00Z
curation: session.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : session, jwt, jwks, token, jeton
- Routes : `/api/sessions`
- Entités : SessionEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| revokedAt | Date de révocation de la session, une valeur nulle signifie que la session n'est pas révoquée. | [#b51b5b00bbc48ec4-1] |
| lastActivity | Date de dernière activité de la session, colonne non nulle distincte de la date de création. | [#16ee1b21ae4b5ff4-1] [#97667c4e427f282c-1] |
| createdAt | Date de création de la session, non modifiable après insertion. | [#fcc6db9146cf180a-1] |
| expiresAt | Date d'expiration de la session, colonne non nulle, distincte de la révocation. | [#bee8c18cd186f89b-1] [#b51b5b00bbc48ec4-1] |
| user_id | Référence à l'utilisateur sous forme d'UUID simple, sans relation JPA vers une entité utilisateur. | [#7f18ac021244ba2a-1] [#8aa2c92b12bee978-1] |

## 3. Règles {#rules}

### Invariants
- Sans clé privée configurée (absente ou blanche), une paire RSA éphémère est générée avec un avertissement WARN, et les jetons sont invalidés à chaque redémarrage. [#6769c7a7beb96ee0-1] [#63d04ffab6f92b7c-1]
- Une clé configurée qui n'est pas une clé RSA PKCS#8 en Base64 lève une IllegalStateException et fait échouer le démarrage. [#87b7671f67ae8eec-1]
### Authentification par jeton
- Le filtre ne tente l'authentification que si un username est extrait et si le contexte de sécurité n'est pas déjà authentifié. [#aea9c4e6ee386f14-2]
- L'utilisateur est authentifié seulement si la validation du jeton réussit et si la session du jti est active, sinon la requête poursuit en anonyme. [#aea9c4e6ee386f14-1] [#authorization/7592b341eaabca2a-1] [#authorization/899c7ea5383e6ca6-2]
- Un jeton sans jti est accepté par le contrôle de session, donc sans contrôle de révocation. [#6a0da51faf97aa4c-1]
- La validation compare le subject au username et vérifie l'expiration, et un jeton null ou blanc lève une MalformedJwtException avant tout parsing. [#authorization/20744147a64efc6a-1] [#8c65c6d6ba12890e-1]
### Sessions
- Une session est active si elle porte le jti, n'est pas expirée (expiresAt absent ou futur) et n'est pas révoquée. [#6a0da51faf97aa4c-1] [#3f43cda45ff96445-1]
- Une session créée reçoit un UUID aléatoire, lastActivity et createdAt à l'instant courant, et revokedAt à null. [#015cc172ae17c133-1]
- Dans le contrôleur de sessions, un JwtException à l'extraction du jti courant donne un jti absent (null) au lieu d'une erreur. [#integrations/00bc4163b1a4b807-1]
### Vérifié dans le code
- Si le test JWKS renvoie 401, corriger la whitelist de SecurityConfig (requestMatchers(JwksController.JWKS_PATH).permitAll()) et non l'assertion du test [#authorization/6bf025d08b434efd-1] [#ca4e294476944c3f-3] `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:167-172`.

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwtFilter.doFilterInternal | Le contexte de sécurité passe de anonyme à authentifié lorsque validateToken et isSessionActive(jti) sont vrais, sinon il reste anonyme et la requête poursuit sans authentification. (partiel) | L80-90 | [#authorization/899c7ea5383e6ca6-2] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SessionController | Le contrôleur est mappé sur le préfixe /api/sessions. | L34-35 | [#926ad92ced25b78b-1] |
| SessionController.getActiveSessions | GET /api/sessions renvoie les SessionResponse des sessions actives de l'appelant, avec current calculé depuis le jti du token. | L49-63 | [#5b71784eb4015ed1-1] |
| SessionController.revokeOtherSessions | DELETE /api/sessions/others révoque les autres sessions de l'appelant et renvoie 204. | L65-81 | [#fe07a72c7029b105-1] |
#### backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwksEndpointIntegrationTest.jwks_isReachableAnonymously_andExposesOneRs256SigningKey | Le test appelle GET /.well-known/jwks.json sans cookie ni Bearer et attend un 200 JSON avec Cache-Control max-age=300 et une seule clé RSA de signature RS256. | L68-81 | [#integrations/f3b5f265303d01f1-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwksController.jwks | GET /.well-known/jwks.json renvoie le JWK Set courant en JSON avec un Cache-Control public. | L61-66 | [#ff90bd1f8455cf75-1] |

## 5. Endpoints et écrans {#surface}

- Les sessions passent par le contrôleur `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:34-35`, préfixe /api/sessions [#926ad92ced25b78b-1], et par `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:72-109` pour la logique.
- Le contrôle d'appartenance d'une session est porté par le service et non par le contrôleur : revokeSession lève SessionNotFoundException si le userId de la session diffère de l'appelant, donc une session d'autrui renvoie 404 et non 403 [#b02b89ecab5f6e75-1] [#integrations/4c5faca65e6e3a35-1]. Garde ce contrôle dans le service si tu changes l'endpoint.
- GET /api/sessions renvoie les sessions actives de l'appelant avec le champ current calculé depuis le jti du token, et répond 401 sans corps si aucun utilisateur n'est résolu [#5b71784eb4015ed1-1] [#f6041a5ba9631bb4-1]. `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:71-85` écarte les sessions révoquées ou expirées et trie par dernière activité décroissante [#7ea75b50e37269a6-1].
- DELETE /api/sessions/others révoque toutes les sessions de l'appelant sauf la courante et renvoie 204 [#fe07a72c7029b105-1]. Le service renvoie le nombre révoqué [#bd09bd20419dc5c2-1].
- Révoquer toutes les sessions et révoquer les autres passent par la même requête de dépôt : un exceptJti null révoque tout, sinon la session de ce jti est épargnée [#38af0486d696291c-1] [#bc24459718a8de0e-1] [#bc24459718a8de0e-2]. Un jti null par erreur révoque donc aussi la session courante.
- Le logout d'un token legacy sans jti ne révoque rien et ne lève pas d'erreur [#2df1b0746c9671ed-1]. extractJti renvoie null quand le jeton fourni est null [#bf45aacd2052239c-1].
- Les révocations par jti ou par id sont des UPDATE JPQL sans chargement d'entité et ne touchent que les sessions encore actives, un second appel est donc sans effet [#a50852c3ebf29c5f-1] [#1c55879186386ba2-1].
### Routes publiques et filtre JWT
- GET /.well-known/jwks.json est ouvert sans authentification, renvoie un Cache-Control public et expose une seule clé RSA de signature RS256 [#ff90bd1f8455cf75-1] [#ca4e294476944c3f-3] [#authorization/d02ef1da9edc3272-1]. Un test d'intégration vérifie max-age=300 [#integrations/f3b5f265303d01f1-1].
- Sont aussi ouverts sans authentification dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:161-173` : /actuator/health, /error et toutes les routes /api/auth/** [#ca4e294476944c3f-1] [#ca4e294476944c3f-2] [#ca4e294476944c3f-4]. Une nouvelle route sous /api/auth/ est publique d'office.
- Le filtre JWT recharge l'utilisateur pour toute requête hors /api/auth dont le contexte est vide et qui porte un subject, et ne pose l'authentification que si le jeton est valide et sa session active [#authorization/899c7ea5383e6ca6-1] [#authorization/5b34073031bd998e-1] [#63afccc0b7927446-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 23), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 36 | role_check 11, config 10, other 9 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 26 | convention 8, suspicious 4, business_rule 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 17 | other 5, convention 4, business_rule 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java` | 12 | endpoint 3, convention 2, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java` | 9 | service_method 4, business_rule 3, role_check 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java` | 16 | test_case 8, convention 3, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java` | 11 | entity 7, convention 3, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java` | 12 | test_case 5, convention 3, suspicious 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java` | 8 | persistence_query 7, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java` | 13 | test_case 12, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/StatelessSessionGuardTest.java` | 9 | convention 4, test_case 4, other 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| authorization | 36 | 21 |  |
| integrations | 12 | 8 |  |
| backend-core | 15 | 4 |  |
| frontend-core | 2 | 0 |  |

## 8. Tests attendus {#tests}

- Les tests fixent qu'une révocation sur la session d'un autre utilisateur donne 404, ne révoque rien et laisse la session du propriétaire utilisable [#cc657e2c785c1f7b-1] [#a91119d810dc7730-1].
- Les tests fixent que revokeOtherSessions garde le jti courant, que revokeAllSessions passe null et que revokeCurrentSession(null) ne révoque rien [#68d426f4e6c4fb80-1] [#e8ccf591a0152c42-1] [#00d153f91a247d5f-1].
- Les tests fixent qu'un cookie jwt vide ne lève rien dans le filtre JWT et laisse le contexte sans Authentication [#d5bb78fb43ce00de-1] [#d5bb78fb43ce00de-2].
- Les tests fixent qu'aucune HttpSession ni cookie JSESSIONID n'est créé, en anonyme comme authentifié [#7cb3ad7cd9d81378-1] [#6e590d46247af55f-1].
- Les tests fixent que le JWKS est public, en cache 300 s, avec une seule clé RS256 sans paramètre privé, et valide un vrai jeton [#3118c08c3daf1a98-1] [#781ac327fdc9ffe0-1] [#9f7bcab78a9f50a6-1].
- Un test de service utilise MockitoExtension avec @Mock et @InjectMocks [#backend-core/d468f061532819b7-2], et vérifie l'exception par assertThrows et l'absence d'effet par verify never() [#backend-core/d4caeca2588b62df-1].

## 9. Questions ouvertes {#questions}

- La taille de clé RSA est-elle fixée ailleurs que dans ce test ? L'assertion de 256 octets suppose 2048 bits, taille absente du fichier [#d74c4e97b146b890-1].

## 10. Alertes {#alerts}

- La surcharge de génération de jeton à partir d'un nom d'utilisateur n'ajoute pas de claim jti, alors que la javadoc affirme qu'aucun jeton n'est émis sans jti . Un jeton sans jti est traité comme actif par isSessionActive , donc jamais révocable ⇒ se fier au code et ne pas émettre de jeton par cette surcharge [#backend-core/46b3392f051dc8d7-1] [#733ba35b6d359059-1] [#authorization/6e5f12c53197589c-1] [#6a0da51faf97aa4c-1]
- L'endpoint de révocation ne compare pas l'id ciblé au jti courant, alors que la javadoc de SessionResponse dit le contraire . Un client peut donc révoquer sa propre session et obtient ensuite un 401 ⇒ ajouter la garde côté serveur si l'interdiction est voulue [#69c02407ebf58772-1] [#974887b2ab9e5056-1]
- Si currentJti vaut null, revokeOtherSessions révoque toutes les sessions actives, y compris celle de l'appelant . Un appelant sans jti se déconnecte lui-même ⇒ vérifier ou rejeter un jti null avant l'appel [#aadbb406fc45f69a-1]
- SessionController.resolveToken retombe sur le header Bearer quand le cookie jwt est vide, alors que JwtFilter garde la valeur vide du cookie . Les deux composants peuvent donc lire des jetons différents pour une même requête ⇒ aligner les deux règles avant de toucher à l'un [#3e1b4d06bfdf7fb8-1] [#9a5d02db20d27ca0-1]
- validateToken capture toute Exception et renvoie false, sans distinguer signature, format, expiration ou erreur d'exécution . Une panne technique ressemble à un jeton invalide ⇒ ne pas s'appuyer sur ce retour pour diagnostiquer [#640569fd00aada47-1]
- SessionMapper, dans application, importe l'entité JPA SessionEntity de infrastructure, ce qui s'écarte de la règle de couches ⇒ Ne pas copier ce motif dans un nouveau mapper [#ea2aa584a13cae72-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 23 ; avec au moins un fait en base : 23 ; sans fait après remise en file : 0.
- Faits en base : 172, repris d'autres packs : +98, hors périmètre : -0, doublons écartés à la déduplication : -54, soit 216 dans le pool.
- Faits du pool venus d'un autre pack : 65 (par pack : section Relations).
- Destination des 216 faits du pool : Lexique 8 ; Règles 14 ; Endpoints et écrans 27 ; Tests attendus 37 ; Alertes / Questions ouvertes 15 ; annexe seule 69 ; écartés (sorte `other` ou inconnue) 46.
- Base : sha256 ea792a5f4e7e…, générée le 2026-11-20.
