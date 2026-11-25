---
pack: user
kind: domain
name: Utilisateur et authentification
generated_at: 2026-11-24T17:40:00
generator: synth/1
base_sha256: 2ccc4347ee33e649c419cc42811d7fe6e6dfdd63b11ee353516b5c8ee41252d7
facts_in_base: 672
facts_in_pool: 812
facts_cited: 93
sections: user.sections.json
details: [user.details.md, user.details-2.md]
lang: fr
curated_at: 2026-11-25T15:00:00
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
| tier | Palier de l'utilisateur, stocké en chaîne non nulle de 16 caractères, FREE par défaut à la création. | [#692f303e5cf75a7d-1] |
| themePreference | Préférence de thème de l'utilisateur, convertie par un convertisseur dédié vers la colonne theme_preference de 16 caractères. | [#a7e439b586fee252-1] [#b70d850cad866490-1] |
| jeton de réinitialisation | Modèle de domaine immuable avec une date d'expiration et une date d'usage optionnelle, stocké dans la table password_reset_tokens avec un token unique. | [#2ed092cfa6c08b1d-1] [#3d8dced783bb55e1-1] |
| created_at et updated_at | Colonnes d'audit non nulles renseignées par l'audit, created_at n'est jamais modifiable. | [#66bda78aee592300-1] [#4a8f78da327086e4-1] |
| User et UserEntity | User est le modèle de domaine sans annotation JPA, UserEntity est l'entité de la table users, avec username unique et role non nul. | [#b70d850cad866490-1] [#4a8f78da327086e4-1] [#bb8013412e23335f-1] [#fbf2c3cfa03fb3ab-1] |

## 3. Règles {#rules}

### Réinitialisation du mot de passe
- Le token est consommé après la mise à jour du mot de passe, et un conflit de verrou optimiste lève la même exception, ce qui annule le changement. [#df6782a5426a1e6d-1] [#ff14c981b945f4fa-1]
- Un email inconnu ne crée aucun token et n'envoie rien, et forgot-password répond toujours 200 avec le même message neutre. [#8d2a9c9d767afb41-1] [#3b36126a4b26b1fd-1]
- Sans clé Brevo l'envoi est ignoré avec un warning, et une RestClientException est loggée sans remonter au contrôleur. [#4db21754de87e441-1] [#4db21754de87e441-2]
### Mot de passe et compte
- StrongPassword impose 8 à 100 caractères avec une majuscule et un chiffre, et accepte null en laissant @NotBlank le refuser. [#e2385a30ad2b3acd-1] [#bd040f4c8fa54886-2] [#bd040f4c8fa54886-3]
- Le login n'applique pas StrongPassword, contrairement à l'inscription, au reset et au changement de mot de passe. [#aebf5f8226e56be2-1] [#b73146529462ac20-1] [#8fc6b2aa851360e4-1] [#3f255ce5de6bd69b-1]
- deleteAccount refuse un username de confirmation absent ou différent avant toute écriture, puis supprime sessions, events, products, catégories et user dans cet ordre. [#0ec9a144d275a5ac-2] [#c65286231ca612ed-1]
### Sessions et login
- /me et le refresh renvoient 401 si le jti est révoqué ou inconnu, et le refresh révoque l'ancien jti avant d'enregistrer le nouveau. [#badc1ab0e710d816-1] [#502d18fb990a7103-2] [#authorization/1b96ea31a014d92e-1]
### Limitation de débit par utilisateur
- PUT /api/me/preferences est plafonné à 30 requêtes par minute et par utilisateur, sans propriété de configuration, avec un 429 et Retry-After au-delà. [#f4e96f1b78ded9c0-1] [#1310596ba9fef422-2]
### Export et préférences
- L'export du profil ne lit jamais le mot de passe et ne garde que les catégories de l'utilisateur, les catégories système étant exclues. [#39dc412702d5d599-1] [#d7aa5eb9502d15f1-3]
- themePreference n'accepte que light, dark ou system en minuscules, sinon 400 validation_failed. [#bf3a08573de2927d-1] [#723a0620e947d336-2]
### Vérifié dans le code
- users.username est unique en base (uq_users_username, V2) ; le commentaire du contrôleur sur la course possible est périmé [#migrations/51d3cbc0f484b438-1] `backend:src/main/resources/db/migration/V2__unique_constraints.sql:14`.
- UserDataExportAssembler.assemble n'exporte que les produits non archivés car ProductEntity porte @SQLRestriction("archived = false") et findByUserId est un finder dérivé [#backend-core/1cde148ce35ea68c-1] [#product/565fd98915167fd7-1] `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/ProductEntity.java:25`.
- Avant de modifier PasswordResetServiceImpl.requestReset, conserver requestReset_unknownEmail_doesNothing_noLeak (verifyNoInteractions(emailService)), seul test qui couvre l'absence d'envoi pour un email inconnu [#c72c07371932fb96-1] [#batch/eda0213cb31236d8-1] [#8d2a9c9d767afb41-1] [#b59178da3cfacc61-1] `backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java:73-81`.

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AuthController.login | Expose POST /api/auth/login, qui authentifie un AuthRequest via AuthenticationManager. | L111-113 | [#b8df8b0ebcd1dac4-1] |
| AuthController.getUserDetails | Expose GET /api/auth/me, qui lit le cookie jwt et renvoie un UserResponse si le token est valide. | L145-146 | [#13fb544c823637c3-1] |
| AuthController.register | POST /api/auth/register reçoit un RegisterRequest validé et crée un compte. | L209-210 | [#f94eac9e6a1acea9-1] |
| AuthController.logout | Le logout révoque le jti du cookie courant en base via revokeSessionSilently, sans erreur si le token est absent ou malformé. (partiel) | L250-258 | [#authorization/0f5088adcf6210ee-1] |
| AuthController.logout | Expose POST /api/auth/logout, qui révoque la session du cookie jwt puis efface le cookie. | L250-251 | [#e1bc96480b3ef4c3-1] |
| AuthController.refreshToken | Expose POST /api/auth/refresh, qui renouvelle le token du cookie jwt. | L269-270 | [#aabb86633e0d2592-1] |
| AuthController.refreshToken | Le refresh fait tourner la session : l'ancien jti est révoqué par revokeSessionSilently, puis le nouveau token est enregistré par registerSession. (partiel) | L316-326 | [#authorization/1b96ea31a014d92e-1] |
| AuthController.refreshToken | Le refresh fait tourner la session : l'ancien jti est révoqué puis le nouveau token est enregistré via registerSession. (partiel) | L323-324 | [#c62478f0f1a3cf17-1] |
| AuthController.forgotPassword | Expose POST /api/auth/forgot-password, qui délègue à passwordResetService.requestReset. | L354-360 | [#fc21364fe89b1478-1] |
| AuthController.resetPassword | Expose POST /api/auth/reset-password, qui délègue à passwordResetService.resetPassword avec le token et le nouveau mot de passe. | L368-372 | [#561d6d907e4908a6-1] |
#### backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| PasswordResetServiceImpl.resetPassword | Le token passe à l'état consommé via token.consume puis tokenRepository.markConsumed, après la mise à jour du mot de passe, lorsque isUsable était vrai. (partiel) | L183 | [#df6782a5426a1e6d-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| PasswordResetTokenRepositoryJpaImpl.markConsumed | markConsumed charge l'entité gérée du token, pose usedAt puis fait un saveAndFlush synchrone, ce qui consomme le token avec verrou optimiste. (partiel) | L58-67 | [#92a86ab153137728-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| UserController | Le contrôleur est exposé sous le préfixe /api/me et toutes ses routes agissent sur le compte courant. | L49 | [#dc686d3191cfb9b2-1] |
| UserController.getCurrentUser | Expose GET /api/me, qui renvoie le UserResponse du compte courant sans hash. | L81-88 | [#98a5f01006883445-1] |
| UserController.updateCurrentUser | Expose PATCH /api/me, qui met à jour name, username et email du compte courant avec un UserUpdateRequest validé. | L109-110 | [#184243d16ccf53c3-1] |
| UserController.updatePreferences | Expose PUT /api/me/preferences, qui pose la préférence de thème du compte courant. | L160-161 | [#f3a65d295cff5005-1] |
| UserController.changePassword | Expose POST /api/me/change-password, qui délègue à userService.changePassword et renvoie 204. | L178-188 | [#cf512413e3a1ad31-1] |
| UserController.deleteCurrentUser | Expose DELETE /api/me, qui supprime le compte courant après validation d'un DeleteAccountRequest. | L203-205 | [#4b311aa3577f75bf-1] |
| UserController.uploadAvatar | Expose POST /api/me/avatar en multipart, avec le fichier dans la part file. | L233-234 | [#f89dbbadc558a9d9-1] |
| UserController.getAvatar | Expose GET /api/me/avatar, qui streame les octets de l'avatar du caller. | L264-275 | [#9cb59a02980f65cc-1] |

## 5. Endpoints et écrans {#surface}

- Deux routes de profil coexistent : GET /api/auth/me lit le cookie jwt et GET /api/me passe par CallerResolver, les deux répondent 401 sans identité [#13fb544c823637c3-1] [#7c8c7de2f02bb858-1]. Le front appelle /auth/me pour charger le profil et /me pour le modifier [#569886aa8c83bc9b-1] [#ddebc1e226af208f-1].
- POST /api/auth/forgot-password ne fait rien si l'email est inconnu et ne retourne aucune valeur, le token brut part uniquement par email. Une réponse identique dans les deux cas est à conserver [#b59178da3cfacc61-1] [#a29e5180102aef05-2] [#726fc97ea7d3c5a5-1].
- Le reset valide le token, stocke un hash BCrypt puis marque le token consommé, et un purge planifié supprime les tokens consommés ou expirés avant un seuil [#889d2f96ff3498a0-1] [#80685ae3287ab06e-1].
- POST /api/me/change-password refuse un nouveau mot de passe identique à l'ancien et répond 204 sans corps [#6d9644d06bc8f672-1] [#cf512413e3a1ad31-1].
- DELETE /api/me exige le username en confirmation dans le corps, le front l'envoie dans data, et le service purge les données liées [#4b311aa3577f75bf-1] [#b173896ffc2c5373-1] [#0ec9a144d275a5ac-1]. La suppression finale est un DELETE natif sur users, sans select préalable [#0ed658fa89582551-2].
- PATCH /api/me modifie name, username et email, et updateUser enregistre le User fourni sans contrôle supplémentaire [#184243d16ccf53c3-1] [#f418a453b957b645-1]. Tout contrôle d'unicité ou de droit est à ajouter côté appelant ou dans ce service.
- PUT /api/me/preferences ne change que la préférence de thème, et l'appel front accepte des options transmises à apiClient [#f3a65d295cff5005-1] [#6d59e8e49740b992-1] [#ffeef000fb9f2e81-1].
- L'avatar passe par POST /api/me/avatar en multipart (part file), GET en streaming et DELETE en 204 [#f89dbbadc558a9d9-1] [#9cb59a02980f65cc-1] [#3394e708bc740d15-1].
- L'email de réinitialisation part via l'API Brevo, to.name reçoit le nom brut non échappé et seul htmlContent est échappé [#integrations/6e099f05854af74d-1] [#integrations/11d4aa8f36e6fb68-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (10 sur 86), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 50 | business_rule 16, convention 7, endpoint 7 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java` | 55 | test_case 40, validation 5, business_rule 4 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java` | 31 | endpoint 9, other 9, business_rule 6 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java` | 25 | validation 6, convention 5, business_rule 4 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 38 | test_case 28, business_rule 4, convention 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 16 | business_rule 5, convention 3, role_check 3 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/UserServiceImpl.java` | 19 | service_method 7, validation 5, other 4 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java` | 11 | business_rule 4, external_call 3, config 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java` | 17 | convention 6, other 5, persistence_query 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java` | 16 | test_case 7, convention 2, role_check 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| authorization | 69 | 52 |  |
| backend-core | 43 | 20 |  |
| integrations | 35 | 13 |  |
| frontend-core | 22 | 5 |  |
| batch | 9 | 7 |  |

## 8. Tests attendus {#tests}

- Forgot-password ne révèle pas l'existence d'un compte : email inconnu donne 200 sans token ni email [#c72c07371932fb96-1] [#80b68d0409b633b8-1].
- Les erreurs d'authentification restent génériques : 401 pour jeton invalide ou compte inconnu, 409 identique pour username et email [#a37e4fe03f2dcd7d-1] [#fa60a46d6dd6e480-1] [#e52c9576ec1a9035-1].
- Un test d'intégration étend AbstractPostgresIntegrationTest [#dd88ee03db7dc240-1].

## 9. Questions ouvertes {#questions}

- Le palier est-il perdu à la reconstruction d'un User ? Les constructeurs n'acceptent pas tier et repartent à FREE sauf via withTier, l'effet sur la persistance n'est pas vérifié [#37fe0db85ae068d5-1].

## 10. Alertes {#alerts}

- Le point d'accès de test GET /api/test-support/password-reset-token renvoie un token de réinitialisation sans aucune annotation de sécurité dans son fichier, et son test l'appelle sans authentification . Il n'existe que sous le profil e2e , donc quiconque active ce profil hors test expose un token valable pour prendre un compte ⇒ ne jamais activer e2e en dehors des tests [#8fb84ca2abcae011-1] [#18cf65255fb56fe7-1] [#77bf3a7824fcfabc-1]
- Les quatre méthodes de statut de CustomUserDetails renvoient toujours true, et le commentaire dit que la logique reste à écrire . Aucun compte n'est donc jamais bloqué, expiré ou désactivé par Spring Security ⇒ ne pas compter sur ces méthodes pour un blocage et ajouter la logique avant de s'appuyer dessus [#b13f9b62a1d0f815-1]
- La javadoc du port de réinitialisation exige 6 caractères minimum , alors que le message de StrongPassword annonce 8 caractères et qu'un test de javadoc rejette moins de 8 en 400 ⇒ Se fier à 8 et corriger la javadoc du port [#95c9f387250b23ad-1] [#backend-core/5a9de540919d7828-1] [#c9ac9920eadf46a4-1]
- Le commentaire de resetPassword et une javadoc de test fixent l'expiration du token à 15 minutes , mais le code calcule l'expiration avec la durée de validité configurée . Changer cette configuration change la durée réelle ⇒ se fier à la configuration et corriger les commentaires [#4605b058155a4625-1] [#e668466da5672492-2] [#8d2a9c9d767afb41-2]
- registerUser retourne la promesse sans await, donc son catch ne capte jamais un rejet de la requête . Un traitement d'erreur ajouté dans ce catch ne s'exécute pas [#775e9e7033a036d2-2]
- Le test de refresh avec utilisateur inconnu s'appelle returns401NotFound alors qu'il vérifie un 401 générique, et le test de /me a le même écart . Le nom trompe sur le contrat ⇒ se fier à l'assertion, pas au nom [#authorization/0e8ae95723dbd1f0-1]
- Le rejet d'un rôle nul est vérifié par une exception quelconque, sans contrôler qu'il s'agit de la contrainte NOT NULL [#01f06d8665db8791-1]. Ce test passe sur n'importe quelle erreur : le préciser avant de s'y fier.

## 11. Couverture {#coverage}

- Fichiers du pack : 84 ; avec au moins un fait en base : 84 ; sans fait après remise en file : 0.
- Faits en base : 672, repris d'autres packs : +275, hors périmètre : -0, doublons écartés à la déduplication : -135, soit 812 dans le pool.
- Faits du pool venus d'un autre pack : 178 (par pack : section Relations).
- Destination des 812 faits du pool : Lexique 12 ; Règles 121 ; Endpoints et écrans 82 ; Tests attendus 245 ; Alertes / Questions ouvertes 58 ; annexe seule 196 ; écartés (sorte `other` ou inconnue) 98.
- Base : sha256 2ccc4347ee33…, générée le 2026-11-24.
