---
pack: session
kind: domain
name: Session et jetons
generated_at: 2026-11-25T15:00:00
generator: synth/1
base_sha256: fbdd7933f8fbe384f404a90775bd5818a8d6c58e99bcc2d65215647b2c1ff867
facts_in_base: 232
facts_in_pool: 301
facts_cited: 43
sections: session.sections.json
details: [session.details.md]
lang: fr
curated_at: 2026-11-25T15:00:00
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

### Clés de signature
- Si la clé privée configurée est vide, une paire RSA éphémère est générée au démarrage. [#6769c7a7beb96ee0-2]
- Une clé publique précédente mal formée, de moins de 2048 bits ou remplacée par une clé privée fait échouer le démarrage par IllegalStateException, sans reprendre la valeur. [#666c65b5e0f814dd-1] [#70ea429214c7be50-1] [#c8b1405ba801256b-1]
### Sessions et révocation
- L'authentification n'est posée que si validateToken réussit et si isSessionActive est vrai pour le jti. [#aea9c4e6ee386f14-1]
- Une session est active si elle porte le jti, n'est pas expirée et n'est pas révoquée, et un jti null est considéré actif. [#6a0da51faf97aa4c-1]
- Le jti n'est jamais sérialisé dans la réponse de GET /api/sessions. [#1f74ef3f450205c2-1]
### Vérifié dans le code
- SessionRepositoryJpaImpl.save sert uniquement à la création depuis SessionServiceImpl.createSession. Toute mutation d'état doit passer par un UPDATE dédié [#015cc172ae17c133-1] `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:39-50`.
- Si JwksEndpointIntegrationTest renvoie 401, rétablir la règle permitAll de JwksController.JWKS_PATH dans SecurityConfig et ne pas modifier l'assertion [#authorization/6bf025d08b434efd-1] [#ca4e294476944c3f-3] `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:172`.

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwtFilter.doFilterInternal | Le contexte de sécurité passe de anonyme à authentifié lorsque validateToken et isSessionActive(jti) sont vrais, sinon il reste anonyme et la requête poursuit sans authentification. (partiel) | L80-90 | [#authorization/899c7ea5383e6ca6-2] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SecurityConfig.securityFilterChain | La route /actuator/health est accessible sans authentification. | L166 | [#authorization/10ab0800c4c3ca76-1] |
| JwksController.JWKS_PATH | Le chemin JWKS est accessible sans authentification, selon le commentaire voisin pour permettre la découverte de clé par le middleware. | L177 | [#ca4e294476944c3f-3] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SessionController | Le contrôleur de sessions est mappé sur le préfixe /api/sessions. | L34 | [#926ad92ced25b78b-1] |
| SessionController.getActiveSessions | GET /api/sessions renvoie la liste des sessions actives de l'appelant sous forme de SessionResponse. | L50-62 | [#5b71784eb4015ed1-1] |
| SessionController.revokeOtherSessions | DELETE /api/sessions/others révoque toutes les sessions de l'appelant sauf la session courante et répond 204. | L65-80 | [#fe07a72c7029b105-1] |
| SessionController.revokeSession | DELETE /api/sessions/{id} révoque la session ciblée de l'appelant et répond 204. | L83-93 | [#3554be20a6907020-1] |

## 5. Endpoints et écrans {#surface}

- Les entrées sont le contrôleur `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:34` monté sur /api/sessions [#926ad92ced25b78b-1] et `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java:61` pour la clé publique [#ff90bd1f8455cf75-1].
- Sans utilisateur courant fourni par CallerResolver, GET /api/sessions répond 401 sans corps [#f6041a5ba9631bb4-1]. Le test de DELETE /others attend aussi un 401 sans aucun appel au service [#1f9ee4243fea0596-1].
- Le logout d'un jeton ancien sans jti ne fait rien côté service, car il n'y a rien à révoquer (`backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:78-84`) [#2df1b0746c9671ed-1].
- revokeAllSessions passe un jti nul au repository, et dans ce cas toutes les sessions actives sont révoquées sans exception [#38af0486d696291c-1] [#bc24459718a8de0e-1]. Avec un jti, la requête exclut la session portant ce jti [#bc24459718a8de0e-2].
- La liste des sessions ne contient que les sessions non révoquées et non expirées, triées par dernière activité décroissante (`backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:71-85`) [#7ea75b50e37269a6-1].
- Les révocations par jti ou par id sont des UPDATE JPQL qui ne touchent que les sessions encore actives, sans charger l'entité [#a50852c3ebf29c5f-1] [#1c55879186386ba2-1].
- Le endpoint JWKS publie la clé courante puis la précédente si elle est chargée [#0bc08a85f4e60fca-1]. La clé précédente n'est essayée à la vérification que si le jeton ne désigne pas la clé courante par son kid [#authorization/23ecabbb7b430cab-1].
- Sont ouverts sans authentification, entre autres, /api/auth/**, le chemin JWKS, /error et /actuator/health (`backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:166-178`) [#ca4e294476944c3f-4] [#ca4e294476944c3f-3] [#ca4e294476944c3f-2] [#authorization/10ab0800c4c3ca76-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 26), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 48 | convention 16, config 11, role_check 8 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 32 | convention 7, validation 7, business_rule 6 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceKeyRotationTest.java` | 36 | test_case 18, convention 7, business_rule 5 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java` | 16 | business_rule 4, endpoint 4, convention 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java` | 22 | convention 5, test_case 5, other 4 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 17 | other 5, convention 4, business_rule 3 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java` | 9 | service_method 4, business_rule 3, role_check 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java` | 11 | entity 7, convention 3, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java` | 8 | persistence_query 7, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/KeyRotationSessionIntegrationTest.java` | 14 | test_case 7, convention 3, other 3 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java` | 13 | test_case 12, suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| authorization | 57 | 47 |  |
| backend-core | 23 | 5 |  |
| integrations | 12 | 14 |  |
| frontend-core | 2 | 0 |  |

## 8. Tests attendus {#tests}

Aucun fait de la base ne relève de cette section.

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- generateToken(String) émet un jeton sans jti ni role, et isSessionActive renvoie vrai quand le jti est null, donc ce jeton échappe à toute révocation par session [#18ac6a4eeb2d5d37-1] [#6a0da51faf97aa4c-1]. Ne pas l'utiliser là où la révocation compte, ou lui ajouter un jti.
- Si currentJti vaut null, revokeOtherSessions révoque aussi la session du token qui a servi à l'appel [#aadbb406fc45f69a-1]. Un jeton legacy sans jti se déconnecte lui-même, donc traiter le cas null avant l'appel.
- JwtFilter prend la valeur du cookie jwt même vide, sans repli sur le header Bearer, contrairement à SessionController.resolveToken [#9a5d02db20d27ca0-1]. Un cookie vide peut masquer un Bearer valide, donc aligner les deux résolutions avant de toucher à l'une.
- validateToken capture toute Exception et renvoie false sans journaliser la cause [#640569fd00aada47-1]. Une erreur de configuration de clé ressemble à un jeton invalide, donc ajouter un log avant de diagnostiquer à l'aveugle.
- generateToken(Authentication) force le principal en CustomUserDetails sans contrôle de type [#733ba35b6d359059-2]. Un autre type de principal lève une erreur d'exécution, donc ne l'appeler qu'avec le principal du flux de login.
- SessionMapper, dans application, importe l'entité JPA SessionEntity de infrastructure, ce qui s'écarte de la règle de couches ⇒ Ne pas copier ce schéma ailleurs [#ea2aa584a13cae72-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 26 ; avec au moins un fait en base : 26 ; sans fait après remise en file : 0.
- Faits en base : 232, repris d'autres packs : +160, hors périmètre : -0, doublons écartés à la déduplication : -91, soit 301 dans le pool.
- Faits du pool venus d'un autre pack : 94 (par pack : section Relations).
- Destination des 301 faits du pool : Lexique 8 ; Règles 32 ; Endpoints et écrans 32 ; Tests attendus 61 ; Alertes / Questions ouvertes 15 ; annexe seule 101 ; écartés (sorte `other` ou inconnue) 52.
- Base : sha256 fbdd7933f8fb…, générée le 2026-11-25.
