---
pack: session
kind: domain
name: Sessions et jetons JWT
generated_at: 2026-11-19T10:19:38Z
generator: synth/1
base_sha256: 5728e9e145aa3c5f04aad349b5f82ea91bbfa7d167a07d4ad0310165c4fbfa6d
facts_in_base: 243
facts_in_pool: 285
facts_cited: 64
sections: session.sections.json
details: [session.details.md]
lang: fr
curated_at: 2026-11-19T10:32:37Z
curation: session.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : session, jwt, jwks, token, jeton, refresh
- Routes : `/api/sessions`
- Entités : SessionEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| JWK | Clé publique RSA décrite par un record qui porte le type de clé, l'usage, l'algorithme, l'identifiant de clé, le module et l'exposant. | [#53a832c15404f9c5-1] |
| JWKS | Ensemble de JWK exposé sous le champ keys, sous la forme d'une liste de JwkResponse. | [#a67a37398f98b54e-1] |
| Session (domaine) | POJO sans annotation de framework qui porte le jti, l'utilisateur, l'expiration et la date de révocation en plus des infos d'appareil. | [#901a768597e9900f-1] |
| SessionResponse | Vue HTTP d'une session avec un indicateur current, qui n'expose ni jti, ni userId, ni revokedAt. | [#a4caabd9f0894588-1] |
| SessionEntity | Entité JPA de la table sessions, qui ne a pas de relation ManyToOne vers l'utilisateur. | [#15c2f11c08ada6bb-1] |
| Cache négatif JWKS | Entrée de cache côté frontend dont les clés valent null, associée à une URL et à un instant d'expiration. | [#2c291aa227330d27-1] |
| Révocation | Le port de persistance sépare la révocation par jti, par id et celle de toutes les sessions d'un utilisateur sauf une. | [#4b5f68bf9982700f-1] |

## 3. Règles {#rules}

### Jetons JWT
- La durée de vie d'un token est de 2 jours. [#9ae01a28faab2017-1]
### Authentification des requêtes
- Le contexte n'est authentifié que si le token est valide et si la session de son jti est active, sinon il reste anonyme. [#ca71e703aa0a385e-3]
- Les chemins commençant par /api/auth ne passent pas par le filtre JWT. [#aadd66368506008b-1]
### Sessions
- La révocation d'une session pose revokedAt seulement si elle est active, sans effet sinon. [#fce09aae6d230040-1] [#4da4f12b970ca931-1]
- La révocation en masse épargne le jti passé en paramètre, et révoque tout si ce jti est null. [#35edc10dfd9c8467-1] [#773adc4a897671a9-1]
### Clés JWKS côté frontend
- Le cache expire après un TTL d'échec ou de succès selon la découverte, et un rafraîchissement forcé est ignoré pendant le cooldown. [#0504f848f39c668b-1] [#30431f5a0ac10942-1]
### Vérifié dans le code
- sessions.expires_at est not null (V10) : le test s.getExpiresAt() == null dans SessionServiceImpl.isSessionActive est purement défensif [#backend-socle/ad6aac552cf2e512-1] [#55283612def744f6-1] `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql:41`.
- Le chemin JwksController.JWKS_PATH doit rester en permitAll dans SecurityConfig, sinon la découverte de clé du middleware Next échoue en 401 et retombe en mode dégradé [#authorization/8bc3a1ce71fe4ba9-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java:172`.

## 4. Structure {#structure}

#### mytimeline:frontend/src/lib/auth-jwks.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| load | load écrit l'entrée de cache avec expiration JWKS_FAILURE_TTL_MS si la découverte échoue (keys null), ou JWKS_SUCCESS_TTL_MS sinon. (partiel) | L255-263 | [#0504f848f39c668b-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SessionRepositoryJpaImpl.revokeByJti | Pose revokedAt à l'instant courant sur la session de ce jti uniquement si elle est active, sans effet si elle est déjà révoquée ou absente. (partiel) | L87-97 | [#fce09aae6d230040-1] |
| SessionRepositoryJpaImpl.revokeById | Pose revokedAt à l'instant courant sur la session d'id donné si elle est active. (partiel) | L100-108 | [#4da4f12b970ca931-1] |
| SessionRepositoryJpaImpl.revokeAllByUserIdExcept | Révoque en masse les sessions actives du user, en épargnant le jti passé en paramètre lorsqu'il est non null. (partiel) | L111-130 | [#35edc10dfd9c8467-1] |
#### mytimeline:frontend/src/hooks/useSessionManager.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useSessionManager.invalidate | Après succès de revokeOne ou de revokeOthers, le hook invalide la clé queryKeys.sessions.all, ce qui force le rechargement de la liste. (partiel) | L23-33 | [#c6c0535e8c9e326c-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/Session.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| Session.isActive | Une session est active tant que revokedAt est null, et devient inactive dès que revokedAt reçoit une valeur. (partiel) | L86-89 | [#8f8e219df1707204-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SessionController | Contrôleur REST rattaché au préfixe /api/sessions. | L33-35 | [#787b3cf96a6a678b-1] |
| SessionController.getActiveSessions | Expose GET /api/sessions et renvoie la liste des SessionResponse du caller, avec current calculé à partir du jti du token courant. | L49-63 | [#b55df85f283f0d72-1] |
| SessionController.revokeOtherSessions | Expose DELETE /api/sessions/others qui révoque les autres sessions du caller et répond 204. | L65-81 | [#e04e89078218713a-1] |
| SessionController.revokeSession | Expose DELETE /api/sessions/{id} qui délègue la révocation au service avec l'id du caller et répond 204. | L83-93 | [#1c99875ecf0c7e8f-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwksController.jwks | Expose GET /.well-known/jwks.json en JSON, sans authentification côté contrôleur. | L61-66 | [#3f514540e7206e99-1] |
#### mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwksController.JWKS_PATH | Le test appelle GET sur JwksController.JWKS_PATH sans cookie ni Bearer et attend un statut 200. | L70 | [#e701e1dd5cb3683f-1] |

## 5. Endpoints et écrans {#surface}

- Le contrôleur des sessions est exposé sous /api/sessions dans `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:33-35` [#787b3cf96a6a678b-1], et l'écran vit dans `mytimeline:frontend/src/components/settings/SessionList.tsx:60-68` [#34dc29289cbadbd7-1].
- La révocation d'une session par id passe l'id de l'appelant au service, qui ne retient la session que si elle lui appartient. Une session inconnue ou appartenant à un autre utilisateur lève la même SessionNotFoundException [#ac895495275a8319-1] [#bff86dd6859709fe-1] [#1c99875ecf0c7e8f-1].
- Le filtre JWT interroge le service de sessions pour chaque requête hors /api/auth dont le contexte n'est pas déjà authentifié et dont le jeton, au username lisible, passe validateToken. Un jti inconnu y est traité comme une session inactive, et un jeton sans jti est accepté sans lecture en base [#authorization/c77c2fb06ca1c19b-1] [#04cfbb8d1e017a64-1].
- GET /api/sessions répond 401 sans corps si aucun utilisateur n'est résolu, et calcule le champ current à partir du jti du token courant [#7c0dcf45a10ce53a-1] [#b55df85f283f0d72-1]. La liste ne contient que les sessions non révoquées et non expirées, triées par dernière activité décroissante [#243e8a96449fcda1-1].
- La révocation de la session courante par jti ne fait rien si le jti est null [#ca3814ba987c75cc-1]. La révocation de toutes les sessions passe un jti d'exclusion null au repository [#40acec6c72b68b25-1].
- GET /.well-known/jwks.json est public, testé sans cookie ni Bearer avec un statut 200. La réponse porte un Cache-Control public de 5 minutes [#3f514540e7206e99-1] [#e701e1dd5cb3683f-1] [#integrations/f250c5f091bd03d3-1].
- Côté front, SessionList est une présentation pure sans appel réseau, qui reçoit données et callbacks du parent. Elle gère les états chargement, erreur (role alert) et liste vide [#34dc29289cbadbd7-1] [#34dc29289cbadbd7-2] [#34dc29289cbadbd7-3] [#34dc29289cbadbd7-4].
- Le hook useSessionManager porte la requête et les deux mutations, qui invalident la liste au succès. Le bouton de révocation des autres sessions est désactivé pendant l'opération [#a808fd3e0b9f5ed4-1] [#cdb23e0c1cbf685d-1] [#96db0312486bf664-1] [#edbc3b32705e5487-2].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 30), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:frontend/src/lib/auth-jwks.ts` | 28 | business_rule 12, config 6, other 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 24 | convention 9, validation 5, business_rule 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtServiceRs256Test.java` | 28 | test_case 16, convention 5, other 3 |
| `mytimeline:frontend/src/components/settings/SessionList.tsx` | 16 | other 5, business_rule 4, ui_screen 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java` | 10 | endpoint 4, business_rule 2, role_check 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 12 | business_rule 5, other 3, convention 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java` | 10 | service_method 6, business_rule 2, role_check 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java` | 10 | persistence_query 3, state_transition 3, other 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java` | 13 | test_case 8, convention 3, config 1 |
| `mytimeline:backend/src/main/resources/db/migration/V10__create_sessions.sql` | 8 | db_change 4, convention 2, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java` | 13 | test_case 9, convention 3, suspicious 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| authorization | 32 | 20 |  |
| backend-socle | 18 | 9 |  |
| integrations | 9 | 3 |  |

## 8. Tests attendus {#tests}

- Le jti courant se lit du Bearer ou du cookie, le cookie gagne si les deux existent, et sans appelant la réponse est 401 [#0abd752da3c97fc8-3] [#0abd752da3c97fc8-4].
- Un jeton vide fait lever JwtException à extractJti, false à validateToken, et JwtFilter reste anonyme sans charger utilisateur ni session [#d5c8e77e9e846cca-1] [#33fb3dfc5fdebb56-1] [#bfc2aa8dbda3f7f8-2].
- Les tests fixent l'absence de HttpSession et de JSESSIONID, y compris authentifié [#d958e1a23e459a6e-1] [#c424e60a8d11ef36-1].
- Un nouveau test du hook de sessions doit mocker sessionService et créer un QueryClient sans retry [#a17ba81ef806a8ab-1] [#7ccd50f6c1b9dea7-1].

## 9. Questions ouvertes {#questions}

- Le commentaire de V10 dit que V11 est réservée à un autre ticket, alors qu'un fichier V11 existe dans le lot [#backend-socle/db6492a31cfbd9c9-1]. La base ne dit pas si la réservation est caduque.

## 10. Alertes {#alerts}

- La surcharge de generateToken qui prend un String ne pose aucun jti, alors que le commentaire dit que chaque token en porte un et que la surcharge Authentication en pose un [#backend-socle/99cdc3c6ad8d23f3-1] [#fcbf6fede1ba05e2-1] [#backend-socle/4aa88cfacaa0e8d4-2]. Selon le commentaire de isSessionActive, un token sans jti n'est pas contrôlé par la révocation [#62c3a6a444be3d3e-1], donc il faut émettre les tokens par la surcharge Authentication.
- Si le jti courant est illisible, revokeOtherSessions reçoit null et révoque toutes les sessions du user, appelante comprise [#7b304e695db3fff2-1] [#de19703e7dfaa096-1]. Ne pas appeler le service sans jti valide, et traiter ce cas dans le controller.
- revokeSession ne compare pas la session visée au jti courant, malgré la javadoc de SessionResponse . Un DELETE sur sa propre session la révoque ⇒ ajouter la garde côté serveur et ne pas compter sur le client [#60d87394ad68b10d-1]
- Une exception non JwtException dans JwtFilter est journalisée puis la chaîne continue avec un contexte anonyme [#authorization/af86537e34083429-1]. Une panne technique se manifeste donc comme un utilisateur non authentifié, pas comme une erreur 5xx.
- Dans `mytimeline:frontend/src/lib/auth-jwks.ts:86`, inFlight ne déduplique qu'une seule URL à la fois [#ba73f8f402bf89c4-1]. Une découverte pour une autre URL l'écrase, donc ne pas supposer une déduplication multi-URL.
- Sans JWKS configuré, selon le commentaire du log, la garde du middleware retombe sur la seule présence du cookie jwt ⇒ Vérifier que le JWKS est configuré en production [#58bc2c4ad6b8afcc-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 30 ; avec au moins un fait en base : 30 ; sans fait après remise en file : 0.
- Faits en base : 243, repris d'autres packs : +91, hors périmètre : -0, doublons écartés à la déduplication : -49, soit 285 dans le pool.
- Faits du pool venus d'un autre pack : 59 (par pack : section Relations).
- Destination des 285 faits du pool : Lexique 10 ; Règles 41 ; Endpoints et écrans 37 ; Tests attendus 79 ; Alertes / Questions ouvertes 15 ; annexe seule 58 ; écartés (sorte `other` ou inconnue) 45.
- Base : sha256 5728e9e145aa…, générée le 2026-11-19.
