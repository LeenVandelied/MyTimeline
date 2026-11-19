---
pack: session
kind: domain
name: Session et jetons
generated_at: 2026-11-19T16:00:00Z
generator: synth/1
base_sha256: bc53cf0de2c4e0a31dce003cd7db1546b8a1d5538b39a1c82ec5715cc40ae5ca
facts_in_base: 126
facts_in_pool: 155
facts_cited: 39
sections: session.sections.json
details: [session.details.md]
lang: fr
curated_at: 2026-11-19T16:38:00Z
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
| jti | Identifiant porté par chaque session, mappé non nul et unique dans la table sessions (pointeur `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:33-34`). | [#5f9266f4536bd3d7-1] [#97667c4e427f282c-1] |
| user_id (session) | Simple UUID dans l'entité de session, sans relation ManyToOne vers l'utilisateur (pointeur `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java:24-26`). | [#8aa2c92b12bee978-1] |

## 3. Règles {#rules}

### Authentification des requêtes
- Le filtre JWT ignore les chemins qui commencent par /api/auth, sans contrôle de session. `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java:107` [#fdd139bf8bd1a5f1-1]
### Activité d'une session
- Une session est active si son jti est null, ou si elle existe, n'est pas révoquée et n'est pas expirée (expiresAt nul compte comme non expirée). `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:55-69` [#6a0da51faf97aa4c-1]
### Révocation
- Révoquer la session courante ne fait rien si le jti est null, sinon le repository pose revokedAt sur la session. `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:77-84` [#2df1b0746c9671ed-1]
- Révoquer une session ciblée pose revokedAt par identifiant après un contrôle d'appartenance. `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:88-95` [#125aae1dafe1a7f4-1]
- La révocation par jti est un UPDATE bulk sans effet sur une session déjà révoquée. `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:88-97` [#ec85f981148cd5c5-1]
### Affichage des sessions
- Le champ current de la réponse vaut vrai quand le jti de la session égale le jti de la requête. `backend:src/main/java/com/matimeline/eventmanager/application/dtos/SessionResponse.java:35` [#ccf70a41239e3358-1]
### Vérifié dans le code
- SessionServiceImpl.revokeSession vérifie l'ownership (404 sinon) mais pas que la session ciblée soit la courante, donc DELETE /api/sessions/{id} peut révoquer la session de l'appelant [#125aae1dafe1a7f4-1] [#b02b89ecab5f6e75-1] `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java:88-95`.

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SessionServiceImpl.revokeCurrentSession | revokeCurrentSession ne fait rien si le jti est null, sinon délègue la révocation du jti au repository, qui pose revokedAt sur la session active. (partiel) | L77-84 | [#2df1b0746c9671ed-1] |
| SessionServiceImpl.revokeSession | revokeSession pose revokedAt sur la session ciblée via revokeById après contrôle d'appartenance, en passant de active à revoked. (partiel) | L88-95 | [#125aae1dafe1a7f4-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SessionRepositoryJpaImpl.revokeByJti | revokeByJti pose revokedAt par UPDATE bulk, de active à revoked, pour la session du jti donné, sans effet si elle est déjà révoquée. (partiel) | L88-97 | [#ec85f981148cd5c5-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SessionController | SessionController est un RestController mappé sur /api/sessions. | L33-35 | [#926ad92ced25b78b-1] |
| SessionController.getActiveSessions | GET /api/sessions renvoie la liste des SessionResponse actives de l'utilisateur courant, avec le jti courant résolu depuis le cookie jwt ou le header Bearer. | L49-63 | [#5b71784eb4015ed1-1] |
| SessionController.revokeOtherSessions | DELETE /api/sessions/others révoque toutes les sessions de l'utilisateur sauf la session courante et répond 204. | L66-81 | [#fe07a72c7029b105-1] |
| SessionController.revokeSession | DELETE /api/sessions/{id} révoque la session ciblée via SessionService et répond 204, sans comparer l'id au jti courant. | L83-93 | [#3554be20a6907020-1] |

## 5. Endpoints et écrans {#surface}

- Les endpoints de session sont dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:33-35` sous /api/sessions, et l'écran côté front est `frontend:components/settings/SessionList.tsx:72-90` [#926ad92ced25b78b-1] [#7b3376a7aed854a4-1].
- DELETE /api/sessions/{id} révoque la session ciblée et répond 204 sans comparer l'id au jti courant, donc l'utilisateur peut révoquer sa propre session active, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:83-93` [#3554be20a6907020-1].
- GET /api/sessions répond 401 sans corps quand aucun utilisateur n'est résolu, et résout le jti courant depuis le cookie jwt ou le header Bearer, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java:49-63` [#5b71784eb4015ed1-1] [#f6041a5ba9631bb4-1].
- DELETE /api/sessions/others révoque les sessions de l'utilisateur sauf celle du jti courant et répond 204. Si le token n'a pas de jti lisible, il révoque toutes les sessions, y compris la courante [#fe07a72c7029b105-1].
- La liste ne contient que les sessions non révoquées et non expirées, triées par dernière activité décroissante, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:76` [#7ea75b50e37269a6-1].
- La révocation en masse est un UPDATE bulk qui ne touche que les sessions non révoquées, avec ou sans exclusion du jti courant, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:117-125` [#bc24459718a8de0e-1] [#bc24459718a8de0e-2].
- La révocation par jti ne touche que les sessions encore actives, donc une session déjà révoquée garde sa date de révocation d'origine, voir `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:93` [#a50852c3ebf29c5f-1].
- Le hook front invalide la requête des sessions après chaque révocation réussie, d'une session ou des autres, voir `frontend:hooks/useSessionManager.ts:15-42` [#1448d857bc591a84-1] [#ed56bc4fa6580877-1] [#9e02d8f81987ba08-1].
- L'écran affiche un spinner au chargement, une alerte en erreur et un message vide, puis par ligne l'appareil (ou une clé unknownDevice s'il est absent) et le libellé current sur la session courante, voir `frontend:components/settings/SessionList.tsx:97-129` [#7b3376a7aed854a4-1] [#7b3376a7aed854a4-2].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 22), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java` | 22 | test_case 13, convention 4, external_call 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/SessionServiceImpl.java` | 9 | business_rule 3, state_transition 2, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java` | 10 | endpoint 4, other 2, suspicious 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java` | 8 | business_rule 3, convention 2, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java` | 8 | persistence_query 6, other 1, state_transition 1 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java` | 16 | test_case 11, convention 2, other 2 |
| `frontend:components/settings/SessionList.tsx` | 7 | business_rule 2, convention 2, ui_screen 2 |
| `backend:src/main/resources/db/migration/V10__create_sessions.sql` | 5 | db_change 3, convention 1, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/SessionEntity.java` | 6 | entity 3, convention 2, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionControllerTest.java` | 9 | test_case 8, suspicious 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/JwtFilterTest.java` | 8 | test_case 4, other 2, validation 2 |
| `frontend:hooks/useSessionManager.ts` | 4 | store_action 3, convention 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| authorization | 14 | 4 |  |
| integrations | 13 | 0 |  |
| backend-core | 10 | 1 |  |
| frontend-core | 4 | 0 |  |

## 8. Tests attendus {#tests}

- Les tests fixent qu'un jti révoqué ou inconnu rend la session inactive, et qu'un jti null (jeton ancien) la rend active sans appeler findByJti. [#596a893d76664618-1] [#0e8d9b8b5f7cd86a-1] [#6f80d87a0206c9ad-1]
- Les tests fixent que revokeOtherSessions garde le jti courant, que revokeAllSessions passe un exceptJti null et que revokeCurrentSession sans jti ne fait rien. [#68d426f4e6c4fb80-1] [#e8ccf591a0152c42-1] [#00d153f91a247d5f-1]
- Les tests fixent que DELETE /api/sessions/others sans authentification renvoie 401 sans appeler SessionService. [#1f9ee4243fea0596-1]
- Les tests fixent que GET /api/sessions ne liste que les sessions du caller et n'expose jamais la clé jti. [#96a2da2db2368e08-1]
- Les tests fixent que SessionList cache le bouton révoquer sur la session courante et masque « révoquer les autres » quand elle est seule. [#46bb114d3881feee-3] [#46bb114d3881feee-8]

## 9. Questions ouvertes {#questions}

- Un token sans jti est-il voulu comme non révocable ? Selon le commentaire de `isSessionActive`, les tokens legacy sans jti passent sans contrôle de révocation [#6e267b0acf8be06d-1], et le filtre n'authentifie que si cette méthode renvoie vrai [#aea9c4e6ee386f14-1].
- Le bug de persistance du flux register (`@Version` et id assigné) existe-t-il encore ? Selon le commentaire du test d'intégration, il justifie le seed des utilisateurs par `EntityManager`, aucun fait de code ne le confirme [#3806e8fd4aed6364-1].

## 10. Alertes {#alerts}

- La javadoc de la classe de test annonce la couverture de la rotation, alors qu'aucune méthode de `backend:src/test/java/com/matimeline/eventmanager/application/services/SessionServiceImplTest.java:27` ne la couvre [#2731b3f667dbf6bb-1]. Un lecteur croit la rotation testée alors qu'elle ne l'est pas. Ajouter un test de rotation avant de la modifier, ou corriger la javadoc.
- Le commentaire de `backend:src/main/resources/db/migration/V10__create_sessions.sql:30` dit que V11 est réservée à #78, alors que V11 existe déjà dans le lot . Le commentaire est périmé et peut faire croire qu'un numéro est libre ⇒ Se fier à la liste réelle des migrations et ne pas reprendre cette réserve [#backend-core/7869dc86186b76fa-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 22 ; avec au moins un fait en base : 22 ; sans fait après remise en file : 0.
- Faits en base : 126, repris d'autres packs : +46, hors périmètre : -0, doublons écartés à la déduplication : -17, soit 155 dans le pool.
- Faits du pool venus d'un autre pack : 41 (par pack : section Relations).
- Destination des 155 faits du pool : Lexique 4 ; Règles 13 ; Endpoints et écrans 19 ; Tests attendus 53 ; Alertes / Questions ouvertes 11 ; annexe seule 35 ; écartés (sorte `other` ou inconnue) 20.
- Base : sha256 bc53cf0de2c4…, générée le 2026-11-19.
