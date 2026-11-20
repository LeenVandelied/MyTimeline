---
pack: user
kind: domain
name: Utilisateur et authentification
generated_at: 2026-11-20T11:40:00Z
generator: synth/1
base_sha256: 0e0d6f8dfda97a3864d5e4f7902790139a32b177162bdafd1ef8294c76ab0746
facts_in_base: 538
facts_in_pool: 657
facts_cited: 73
sections: user.sections.json
details: [user.details.md]
lang: fr
curated_at: 2026-11-20T12:45:00Z
curation: user.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : user, utilisateur, auth, login, register, password, mot de passe, avatar, email, theme, preference
- Routes : `/api/auth`, `/api/me`, `/api/test-support`, `api/me`, `api/me/avatar`, `api/me/export`, `me`, `me/avatar`, `me/export`
- Entités : UserEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| CustomUserDetails | Adaptateur de sécurité qui enveloppe un User du domaine et une liste d'autorités pour Spring Security. | [#0fc2506546087885-1] |
| PasswordResetToken | Modèle de domaine immuable sans dépendance framework, distinct de l'entité PasswordResetTokenEntity mappée sur la table password_reset_tokens. | [#2ed092cfa6c08b1d-1] [#3d8dced783bb55e1-1] |
| themePreference | Préférence de thème de l'utilisateur, colonne nullable de la table users, convertie par un convertisseur dédié. | [#a7e439b586fee252-2] [#4a8f78da327086e4-1] |

## 3. Règles {#rules}

### Authentification et sessions
- Le login renvoie le même 401 pour un compte inconnu et un mot de passe faux, et le JWT ne passe que par le cookie HttpOnly. [#75b1482fae455a05-1] [#06585e8b4c5db0af-1]
- /api/auth/me renvoie 401 pour un token invalide, un username absent de la base ou un jti révoqué. [#ab8e31d3e5b08ee4-1] [#badc1ab0e710d816-1]
- L'IP de session est anonymisée avant persistance et l'expiration vaut COOKIE_MAX_AGE secondes. [#72fdae6a021c1eda-2] [#72fdae6a021c1eda-3]
### Mots de passe
- StrongPassword impose 8 à 100 caractères avec une majuscule et un chiffre, et laisse null à @NotBlank. [#e2385a30ad2b3acd-1] [#bd040f4c8fa54886-2] [#bd040f4c8fa54886-3]
### Réinitialisation par email
- forgot-password renvoie toujours 200 avec le même message, et sans compte correspondant aucun token ni email n'est créé. [#3b36126a4b26b1fd-1] [#8d2a9c9d767afb41-1]
- La purge des tokens tourne toutes les 24 h par défaut avec un délai initial de 300000 ms, et supprime les tokens consommés ou expirés. [#batch/99a2df300c170ed7-1] [#integrations/a48db1e25ff46d3d-1]
- Sans clé Brevo l'envoi est ignoré avec un warning, et une RestClientException est loggée sans remonter au contrôleur. [#4db21754de87e441-1] [#4db21754de87e441-2]
### Profil et préférences
- themePreference n'accepte que light, dark ou system en minuscules, une valeur comme LIGHT donne 400 validation_failed. [#bf3a08573de2927d-1] [#305052602b3573de-1]
- PUT /api/me/preferences est limité à 30 requêtes par minute et par utilisateur, sans propriété de configuration. [#f4e96f1b78ded9c0-1]
- deleteAccount lève AccountDeletionMismatchException avant toute écriture si le username de confirmation diffère. [#0ec9a144d275a5ac-1]
- L'export du profil recopie les champs un à un sans lire le mot de passe. [#39dc412702d5d599-1]

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AuthController.login | POST /api/auth/login reçoit un AuthRequest validé, authentifie via AuthenticationManager, pose le cookie jwt et renvoie un message de succès. | L111-113 | [#b8df8b0ebcd1dac4-1] |
| AuthController.getUserDetails | GET /api/auth/me lit le cookie jwt, résout l'utilisateur et renvoie son UserResponse si le token est valide. | L145-146 | [#13fb544c823637c3-1] |
| AuthController.register | POST /api/auth/register reçoit un RegisterRequest validé et crée un compte. | L209-210 | [#f94eac9e6a1acea9-1] |
| AuthController.logout | Le logout révoque le jti du cookie courant en base via revokeSessionSilently, sans erreur si le token est absent ou malformé. (partiel) | L250-258 | [#authorization/0f5088adcf6210ee-1] |
| AuthController.logout | POST /api/auth/logout révoque la session du jti courant puis efface le cookie jwt. | L250-251 | [#e1bc96480b3ef4c3-1] |
| AuthController.refreshToken | POST /api/auth/refresh lit le cookie jwt et renvoie un nouveau token si l'ancien est valide et non révoqué. | L269-270 | [#aabb86633e0d2592-1] |
| AuthController.refreshToken | Le refresh fait tourner la session : l'ancien jti est révoqué par revokeSessionSilently, puis le nouveau token est enregistré par registerSession. (partiel) | L316-326 | [#authorization/1b96ea31a014d92e-1] |
| AuthController.refreshToken | Le refresh fait passer la session du jti courant à révoquée et enregistre une nouvelle session pour le nouveau token, pour un utilisateur authentifié par son cookie jwt. (partiel) | L319-324 | [#c62478f0f1a3cf17-1] |
| AuthController.forgotPassword | POST /api/auth/forgot-password délègue la demande de réinitialisation au port PasswordResetService avec l'email et la locale. | L354-356 | [#fc21364fe89b1478-1] |
| AuthController.resetPassword | POST /api/auth/reset-password délègue à PasswordResetService.resetPassword le token et le nouveau mot de passe, puis renvoie 200. | L368-371 | [#561d6d907e4908a6-1] |
#### backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| PasswordResetServiceImpl.resetPassword | Le token passe à l'état consommé via token.consume puis markConsumed, après la mise à jour du mot de passe. (partiel) | L181-186 | [#df6782a5426a1e6d-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| PasswordResetTokenRepositoryJpaImpl.markConsumed | markConsumed charge l'entité gérée du token, pose usedAt puis fait un saveAndFlush synchrone, ce qui consomme le token avec verrou optimiste. (partiel) | L58-67 | [#92a86ab153137728-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| UserRepositoryJpaImpl.updateThemePreference | updateThemePreference est la seule méthode qui pose la préférence de thème d'un utilisateur, sur l'entité gérée, dans une transaction en écriture. (partiel) | L131-137 | [#cf93548fee291e68-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| UserController | Le contrôleur profil est exposé sous le préfixe /api/me. | L48-49 | [#dc686d3191cfb9b2-1] |

## 5. Endpoints et écrans {#surface}

- Les contrôleurs d'entrée sont `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:111-113` (préfixe /api/auth) et `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:48-49` (préfixe /api/me), appelés côté front par `frontend:services/userService.ts:37-41` et `frontend:services/authService.ts:17-24` [#b8df8b0ebcd1dac4-1] [#dc686d3191cfb9b2-1] [#ddebc1e226af208f-1] [#569886aa8c83bc9b-1].
- DELETE /api/me exige un corps avec le nom d'utilisateur de confirmation, supprime le compte puis efface le cookie jwt et renvoie 204 [#4b311aa3577f75bf-1] [#b173896ffc2c5373-1].
- Le changement de mot de passe POST /api/me/change-password (corps oldPassword et newPassword, 204) n'apparaît ici que dans un test et dans le service front, aucun fait de contrôleur ne le décrit [#0ea7f9c25b3e9a7e-1] [#fd23a1f381383690-1]. Côté service, le nouveau mot de passe est ré-encodé puis un User recréé est enregistré [#925ef7191fae0dbc-1].
- L'envoi passe par l'API Brevo, où le champ to.name reçoit le nom brut non échappé, le HTML n'étant échappé que dans htmlContent [integrations/11d4aa8f36e6fb68-1] [#integrations/11d4aa8f36e6fb68-1].
- POST /api/auth/logout révoque la session du jti courant avant d'effacer le cookie, et POST /api/auth/refresh ne renvoie un token que si l'ancien est valide et non révoqué [#e1bc96480b3ef4c3-1] [#aabb86633e0d2592-1].
- PUT /api/me/preferences ne change que la préférence de thème, et le service lève UserNotFoundException si le compte a disparu [#f3a65d295cff5005-1] [#a72b0b794db7ff69-2] [#6d59e8e49740b992-1].
- L'avatar est envoyé en multipart sous la part file, GET /api/me/avatar répond 401 hors authentification et DELETE répond 204 [#f89dbbadc558a9d9-1] [#e843517efb5a96ab-1] [#9cb59a02980f65cc-1] [#3394e708bc740d15-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (10 sur 83), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 43 | business_rule 15, endpoint 7, convention 6 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java` | 24 | business_rule 9, endpoint 7, other 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 39 | test_case 29, business_rule 5, other 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java` | 28 | test_case 18, validation 4, business_rule 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java` | 15 | business_rule 5, convention 3, validation 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 16 | business_rule 5, convention 3, role_check 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java` | 11 | business_rule 4, external_call 3, config 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilterTest.java` | 15 | test_case 4, business_rule 3, config 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RegisterLoginIntegrationTest.java` | 12 | convention 4, business_rule 2, test_case 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java` | 15 | test_case 7, convention 3, business_rule 1 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| authorization | 68 | 43 |  |
| integrations | 25 | 10 |  |
| backend-core | 22 | 11 |  |
| frontend-core | 22 | 5 |  |
| batch | 10 | 6 |  |

## 8. Tests attendus {#tests}

- Les tests fixent qu'un token est à usage unique, avec un seul succès sur deux appels concurrents [#58f796c8fce18cc5-1] [#58f796c8fce18cc5-6].
- Le test asynchrone exige un retour en moins de 4000 ms puis attend jusqu'à 5000 ms l'envoi et la création du token [#1e05bff51f17c048-3] [#1e05bff51f17c048-4].
- Les contraintes CHECK en base se testent par SQL natif qui contourne l'API [#c086a9fa1e02dbe4-1] [#ddc2012d69f3cea7-1].

## 9. Questions ouvertes {#questions}

- Faut-il ajouter une colonne de création pour trier les tokens de réinitialisation, plutôt que expiresAt décroissant comme proxy de récence avec l'id UUID aléatoire en départage ? Le commentaire reconnaît le proxy, la requête applique ce tri `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenFinderJpaAdapter.java:41-58` [#integrations/949ac578b33a4870-1] [#integrations/12e77eb7b9e6d0c0-2].
- Pourquoi le champ role du User est-il une String alors que l'enum Role existe dans le même package ? Le fichier ne montre aucune conversion, et le service de détails utilisateur passe cette chaîne directement comme autorité `backend:src/main/java/com/matimeline/eventmanager/domain/models/User.java:10` [#61c574942f6d4fe2-1] [#backend-core/d835ba7c048e8354-1].

## 10. Alertes {#alerts}

- Les quatre méthodes de statut de compte renvoient true, et le commentaire dit que la logique reste à écrire. Un compte désactivé ou verrouillé n'est donc jamais refusé par Spring Security, donc ne pas compter sur ces méthodes pour bloquer un compte `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/CustomUserDetails.java:40-59` [#b13f9b62a1d0f815-1].
- La javadoc du port de réinitialisation donne un minimum de 6 caractères, alors que la javadoc du test et le message de StrongPassword parlent de 8 ⇒ Se fier à la contrainte StrongPassword du DTO et corriger la javadoc du port `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/PasswordResetService.java:33` [#95c9f387250b23ad-1] [#c9ac9920eadf46a4-1] [#backend-core/5a9de540919d7828-1]
- Le test d'email inconnu annonce noEmailSent et sa javadoc promet aucun envoi, mais il ne vérifie ni emailService ni autre chose que le 200. Une régression qui enverrait un mail passerait, donc ajouter la vérification avant de s'appuyer sur ce test pour l'anti-énumération `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ForgotPasswordAsyncTest.java:116-132` [#80b68d0409b633b8-1] [#batch/9c0729d39059d8b1-2].
- L'enum Role du domaine importe GrantedAuthority de Spring Security, ce qui rompt la règle d'un domaine sans import framework ⇒ Ne pas copier ce motif dans d'autres modèles du domaine `backend:src/main/java/com/matimeline/eventmanager/domain/models/Role.java:3-5` [#backend-core/d4207acb24ab9af6-1]
- Deux tests /me et /refresh portent NotFound dans leur nom alors qu'ils attendent un 401 générique. Se fier à l'assertion, pas au nom `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java:166-176` [#548656e76cebceaa-1] [#76dc0be40ec09810-1].

## 11. Couverture {#coverage}

- Fichiers du pack : 81 ; avec au moins un fait en base : 81 ; sans fait après remise en file : 0.
- Faits en base : 538, repris d'autres packs : +222, hors périmètre : -0, doublons écartés à la déduplication : -103, soit 657 dans le pool.
- Faits du pool venus d'un autre pack : 147 (par pack : section Relations).
- Destination des 657 faits du pool : Lexique 8 ; Règles 115 ; Endpoints et écrans 68 ; Tests attendus 186 ; Alertes / Questions ouvertes 51 ; annexe seule 161 ; écartés (sorte `other` ou inconnue) 68.
- Base : sha256 0e0d6f8dfda9…, générée le 2026-11-20.
