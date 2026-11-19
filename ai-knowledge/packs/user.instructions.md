---
pack: user
kind: domain
name: Utilisateur et authentification
generated_at: 2026-11-19T16:00:00Z
generator: synth/1
base_sha256: 16ba5e6f01b55b18a4d3d220532ed23521ee7dc2be4a82937ab6578523831611
facts_in_base: 1370
facts_in_pool: 1502
facts_cited: 143
sections: user.sections.json
details: [user.details.md, user.details-2.md]
lang: fr
curated_at: 2026-11-19T16:38:00Z
curation: user.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : user, utilisateur, auth, login, register, password, mot de passe, avatar, email, theme, preference
- Routes : `/api/auth`, `/api/me`, `/api/test-support`, `me/avatar`, `me/export`
- Entités : UserEntity, PasswordResetTokenEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| Role | Rôle du compte, aussi utilisé comme autorité Spring dont le nom est celui de la constante. | [#37f7f6970ad6f804-1] |
| themePreference | Préférence de thème, null tant que le compte n'a rien choisi. | [#b70d850cad866490-1] [#ac3f779bf2baa91a-1] |
| Token de réinitialisation | Jeton de mot de passe, unique, dont la date de consommation est nullable. | [#ca1bdcf91a964b81-1] [#0f07b0160a8df5ed-1] |
| StrongPassword | Contrainte de validation des mots de passe, portée par un validateur dédié. | [#ddedbcd7e1084aca-1] |
| Niveau de force | Libellé traduit du mot de passe, avec trois niveaux. | [#9945538f6f31edc2-1] |
| AvatarContent | Octets de l'avatar avec son type MIME. | [#51683061c927814f-1] |
| UserDataExport | Export des données du compte, sans champ de mot de passe. | [#e8be31c1360b78e8-1] |
| jobStatus | Statut du job d'export, PENDING quand il est absent. | [#7bf2cb1a7ee42811-1] |
| version | Compteur de verrou optimiste du compte, sans setter public. | [#b4bfb3a0e8cb6c7f-1] |

## 3. Règles {#rules}

### Invariants de session et de jeton
- Le logout révoque le jti du cookie, sans effet si le token est absent ou malformé. [#authorization/0f5088adcf6210ee-1] [#ad961b363692f995-1]
- Au démarrage, une paire RSA éphémère est générée si la clé privée configurée est vide, et une clé mal formée fait échouer le démarrage sans journaliser sa valeur. [#eaeb1fec0ed5c825-1] [#8d5689df1cb8a729-1]
### Vérification du cookie d'authentification
- Un cookie absent ou vide donne rejected. Il est accepté sans analyse si l'URL JWKS n'est pas configurée ou invalide, ou si les clés ne sont pas joignables. [#510afab3cb27e0b6-1] [#510afab3cb27e0b6-2] [#510afab3cb27e0b6-3]
- Après découpage, un jeton à la forme invalide est rejeté, puis accepté si une clé connue valide la signature. Sinon les clés sont redécouvertes, et le verdict est rejected si le garde-fou anti-tempête renvoie null. [#510afab3cb27e0b6-4] [#510afab3cb27e0b6-5]
- Un rafraîchissement forcé des clés renvoie null sans appel réseau si le précédent date de moins de JWKS_REFRESH_COOLDOWN_MS, sinon la découverte ignore le cache. [#4c085da69e8a3ae5-1]
- Est refusé un jeton dont alg n'est pas exactement RS256 (avant la signature), dont sub est absent, non chaîne ou vide, dont exp est absent, non numérique ou NaN, ou dont nbf (contrôlé s'il est présent) est postérieur à maintenant. [#fef4f558bcb33253-1] [#fef4f558bcb33253-2] [#0ce549b16c384755-1] [#0ce549b16c384755-2]
### Limitation par utilisateur
- Seule PUT /api/me/preferences est limitée, à 30 requêtes par minute et par compte, dans une LRU de 100 000 buckets. Un bucket vide renvoie le 429 du limiteur par IP avec Retry-After (arrondi au supérieur, minimum 1). [#876d03702960b795-1] [#1310596ba9fef422-1] [#2c92a4e81594cd94-2] [#c6f23c1591fac2c8-2] [#c6f23c1591fac2c8-3]
### Inscription et profil
- register répond 409 si le username existe déjà, sans pré-contrôle bloquant sur l'email, et une violation d'unicité en base donne aussi 409. Le mot de passe est haché et le rôle fixé à ROLE_USER. [#6f3d723273af408f-1] [#85963bd8c274bb03-1] [#6f3d723273af408f-2]
- Une confirmation différente lève validation.password.match sur confirmPassword, à l'inscription, à la réinitialisation et au changement de mot de passe. [#64a91db71f56df5a-1] [#54b11dd25fc13a86-1] [#4db1c494b3a92d56-3]
- changePassword vérifie l'ancien mot de passe (InvalidCredentialsException) puis refuse un nouveau identique (SamePasswordException), dans cet ordre. Côté formulaire, la clé validation.password.same est levée sur newPassword. [#6d9644d06bc8f672-1] [#6d9644d06bc8f672-2] [#4db1c494b3a92d56-1] [#4db1c494b3a92d56-2] [#a0a38563f06fc85d-1]
### Réinitialisation du mot de passe
- Un token non UUID, inutilisable, d'un compte supprimé ou en conflit de verrou optimiste lève la même InvalidPasswordResetTokenException. [#f161b00db820f46b-1] [#889d2f96ff3498a0-1] [#889d2f96ff3498a0-2] [#ff14c981b945f4fa-1]
- Sans clé API Brevo, le mail n'est pas envoyé et un warning est journalisé, et une RestClientException n'est pas propagée. [#4db21754de87e441-1] [#4db21754de87e441-2]
### Avatar
- Un contenu vide ou dont les magic bytes ne sont ni JPEG, ni PNG, ni WebP est refusé par InvalidAvatarException, et selon le test la taille maximale est contrôlée avant les magic bytes. [#03ded0c6fbc9b97d-1] [#03ded0c6fbc9b97d-3] [#eabeb42ae4e10cd0-1] [#77e3815cb83d949a-1]
### Préférence de thème
- À la connexion, la préférence du compte est appliquée localement, sinon le choix local est persisté. Un échec du PUT est journalisé sans bloquer la connexion. [#7778743e7e4fb5f0-1] [#746fbc524426587b-1] [#1d342e9d1d1d858c-3] [#65ed3d30b6a09ce0-1]
### Garde d'accès frontend
- Sans utilisateur une fois le chargement terminé, la garde redirige vers la page de login de la locale. [#444f9d665751e3ef-1]

## 4. Structure {#structure}

#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AuthController | Le contrôleur d'authentification est exposé sous le préfixe /api/auth. | L49 | [#468143db288956bb-1] |
| AuthController.login | POST /api/auth/login authentifie via AuthenticationManager, enregistre la session, pose le cookie jwt et renvoie un message de succès. | L111-112 | [#b8df8b0ebcd1dac4-1] |
| AuthController.register | POST /api/auth/register crée un compte avec le rôle ROLE_USER et renvoie 201 en cas de succès. | L209-210 | [#f94eac9e6a1acea9-1] |
| AuthController.logout | POST /api/auth/logout révoque la session du jti courant puis efface le cookie jwt. | L250-251 | [#e1bc96480b3ef4c3-1] |
| AuthController.logout | Le logout appelle revokeSessionSilently sur le token du cookie, ce qui révoque le jti courant en base et reste sans effet si le token est absent ou malformé. (partiel) | L254-257 | [#authorization/0f5088adcf6210ee-1] |
| AuthController.refreshToken | POST /api/auth/refresh lit le cookie jwt, valide le token courant puis émet un nouveau token en cookie. | L269-270 | [#aabb86633e0d2592-1] |
| AuthController.refreshToken | Le refresh révoque le jti de l'ancien token puis enregistre le jti du nouveau token via registerSession, en faisant tourner la session. (partiel) | L319-324 | [#authorization/1b96ea31a014d92e-1] |
| AuthController.refreshToken | Lors du refresh, l'ancien jti est révoqué puis une nouvelle session est enregistrée pour le nouveau token, par rotation de session. (partiel) | L323-324 | [#c62478f0f1a3cf17-1] |
| AuthController.forgotPassword | POST /api/auth/forgot-password répond toujours 200 avec un message neutre, que le compte existe ou non. | L354-360 | [#3b36126a4b26b1fd-1] |
| AuthController.resetPassword | POST /api/auth/reset-password délègue à PasswordResetService.resetPassword et renvoie 200 avec un message de succès. | L368-372 | [#e9191dd75ac71526-1] |
#### frontend:contexts/AuthContext.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AuthProvider.login | Le login passe le user de null à l'utilisateur chargé via loadUser, après loginService réussi, puis adopte le thème local si le compte n'a pas de préférence, sans faire échouer la connexion en cas de PUT en échec. (partiel) | L216-220 | [#65ed3d30b6a09ce0-1] |
| AuthProvider.logout | Le logout appelle logoutService puis, dans le finally, passe le user à null via commitUser, même si l'appel échoue. | L253-260 | [#18a688bb40f9a9be-1] |
#### backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| PasswordResetServiceImpl.resetPassword | Le token passe à l'état consommé via consume, par resetPassword, si il est utilisable et si sa version optimiste n'a pas changé. (partiel) | L183 | [#df6782a5426a1e6d-1] |
#### backend:src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| PasswordResetServiceImplTest.resetPassword_validToken_reHashes_updatesUser_andConsumesToken | Le token passe de non consommé à consommé via markConsumed lors de resetPassword, si le token est utilisable, avec usedAt égal à maintenant. (partiel) | L191-194 | [#c51c490797ade3f9-1] |
#### backend:src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AvatarServiceImpl.deleteAvatar | L'avatar passe d'une référence non vide à null, par deleteAvatar, si la référence de l'appelant est renseignée. | L124-137 | [#522252fba7fe5e36-1] |
#### frontend:components/settings/mobile/BottomSheet.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| BottomSheet.dragY | Le décalage de glissement est remis à zéro à chaque ouverture du sheet, par ajustement d'état pendant le rendu. (partiel) | L88-92 | [#31ecf099b769d80a-1] |
#### frontend:components/settings/useDeleteAccountFlow.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useDeleteAccountFlow.step | L'étape de suppression démarre à warn. (partiel) | L46 | [#79763f022018bd04-1] |
| useDeleteAccountFlow.goConfirm | La méthode goConfirm passe l'étape de warn à confirm. | L74 | [#72b9345ca57e779d-1] |
| useDeleteAccountFlow.goWarn | La méthode goWarn ramène l'étape de confirm à warn. | L75 | [#89c2eaa90e8ec688-1] |
#### frontend:components/settings/DeleteAccountSteps.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| DeleteAccountSteps | Le bouton Continuer de l'étape warn appelle flow.goConfirm pour passer à l'étape de confirmation. (partiel) | L64-72 | [#a374a26413ccdd71-1] |
| DeleteAccountSteps | Le bouton Retour de l'étape de confirmation appelle flow.goWarn pour revenir à l'étape warn. (partiel) | L113-121 | [#a374a26413ccdd71-2] |
#### frontend:components/settings/AccountSection.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AccountSection.closeDeleteDialog | Quand closeDeleteDialog reçoit false, deleteOpen passe de true à false et le flux de suppression est réinitialisé par deleteFlow.reset. (partiel) | L43-46 | [#739e0d75dfe539fb-1] |
| AccountSection.deleteOpen | Le clic sur le bouton delete-account-open passe deleteOpen de false à true. (partiel) | L71 | [#3028dc0858c16440-1] |
#### frontend:components/settings/mobile/MobileSettings.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| MobileSettings.active | L'état actif vaut null pour l'index et un ChapterId pour l'écran détail. (partiel) | L34 | [#18828bb0b5460f44-1] |
| MobileSettings.back | Le bouton retour remet active à null, ce qui ramène à l'index. (partiel) | L56 | [#9c0fe3d5c3da8720-1] |
#### backend:src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| PasswordResetToken.consume | consume crée une nouvelle instance avec usedAt renseigné, l'instance d'origine restant inchangée. (partiel) | L72-74 | [#e422b66cd438a960-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| UserController | Le contrôleur de profil est exposé sous le préfixe /api/me. | L49 | [#dc686d3191cfb9b2-1] |
| UserController.getCurrentUser | GET /api/me renvoie le profil de l'utilisateur courant sous forme de UserResponse, sans le hash du mot de passe. | L81-88 | [#98a5f01006883445-1] |
| UserController.updateCurrentUser | PATCH /api/me met à jour name, username et email de l'utilisateur courant et renvoie UserResponse. | L110 | [#184243d16ccf53c3-1] |
| UserController.updatePreferences | PUT /api/me/preferences pose la préférence de thème du compte courant via un corps themePreference, et renvoie UserResponse. | L160-161 | [#f3a65d295cff5005-1] |
| UserController.changePassword | POST /api/me/change-password délègue le changement de mot de passe au port UserService et renvoie 204. | L178-188 | [#cf512413e3a1ad31-1] |
| UserController.deleteCurrentUser | DELETE /api/me supprime le compte courant après confirmation par le username saisi, puis renvoie 204. | L203-204 | [#4b311aa3577f75bf-1] |
| UserController.uploadAvatar | POST /api/me/avatar accepte un upload multipart dans la part file et renvoie UserResponse après relecture du user. | L233-234 | [#f89dbbadc558a9d9-1] |
| UserController.getAvatar | GET /api/me/avatar streame les octets de l'avatar du caller avec le Content-Type du type stocké. | L264-275 | [#9cb59a02980f65cc-1] |
| UserController.deleteAvatar | DELETE /api/me/avatar appelle avatarService.deleteAvatar pour le caller et renvoie 204, sans erreur si aucun avatar n'existe. | L282-290 | [#3394e708bc740d15-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwksController.JWKS_PATH | Le chemin JWKS est accessible sans authentification, la javadoc du bloc précisant qu'il doit rester public pour la vérification RS256 côté middleware. | L167-172 | [#authorization/6bf025d08b434efd-1] |
#### backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AuthControllerLegacyPasswordLoginTest.login | Le helper login envoie un POST /api/auth/login en JSON avec une IP distante issue du sous-réseau dédié et retourne le MvcResult. | L116-123 | [#d9a850fefe246758-1] |
| AuthControllerLegacyPasswordLoginTest.register_withTheSameSixCharPassword_isRejected | Le test appelle POST /api/auth/register avec un corps JSON contenant name, username, email et password. | L288-292 | [#8a0f60ab0b3d6fc4-1] |
| AuthControllerLegacyPasswordLoginTest.legacyAccount_canChangeToACompliantPassword_thenLogInWithIt | Le test appelle POST /api/me/change-password avec le cookie jwt et un oldPassword et newPassword dans le corps JSON. | L322-323 | [#d27b7af1f4f2781f-1] |
#### backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ThemePreferenceIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ThemePreferenceIntegrationTest.putPreference | La méthode putPreference appelle PUT /api/me/preferences avec un corps themePreference, attend 200, relit themePreference et vérifie l'absence de la clé password. | L128-136 | [#129a149e5857c054-1] |
| ThemePreferenceIntegrationTest.newAccount_hasNullPreference_onBothMeEndpoints | Le test appelle GET /api/me avec le cookie jwt et attend un statut 200 avec la clé themePreference. | L143 | [#345731ffb13fc464-1] |
| ThemePreferenceIntegrationTest.newAccount_hasNullPreference_onBothMeEndpoints | Le test appelle GET /api/auth/me avec le cookie jwt et attend un statut 200 avec la clé themePreference. | L148 | [#345731ffb13fc464-2] |
| ThemePreferenceIntegrationTest.patchProfile_afterPreference_doesNotEraseIt | Le test appelle PATCH /api/me avec le cookie jwt pour renommer le compte. | L189 | [#8a5dedf4de70c3fa-1] |
#### backend:src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ResetPasswordTokenRateLimitIntegrationTest.reset | Le helper reset envoie POST /api/auth/reset-password avec un corps contenant token et newPassword, en fixant l'IP socket par setRemoteAddr. | L80-87 | [#45d794329eb3d9fc-1] |
#### backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/PasswordResetEndpointsIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| PasswordResetEndpointsIntegrationTest.forgotPassword_unknownEmail_noToken_returns200 | Le test appelle POST /api/auth/forgot-password sans cookie ni en-tête d'authentification. | L43 | [#e5ab898a6f87f49c-1] |
| PasswordResetEndpointsIntegrationTest.resetPassword_unknownToken_noAuth_returns400 | Le test appelle POST /api/auth/reset-password sans authentification avec un corps contenant token et newPassword. | L70 | [#d3528d767166474e-1] |

## 5. Endpoints et écrans {#surface}

- Les entrées sont AuthController (`backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java:49`) sous /api/auth, UserController sous /api/me, et le dossier front `frontend:components/settings/SettingsShell.tsx:49-56`. [#468143db288956bb-1] [#dc686d3191cfb9b2-1] [#4ffc169780e92af6-1]
- Toutes les routes /api/auth/** sont ouvertes sans authentification, y compris /me, qui renvoie 401 si le jti est révoqué ou inconnu et accepte un token sans jti. [#authorization/98b2cdbd7d200daa-1] [#badc1ab0e710d816-1]
- forgot-password répond toujours 200 avec un message neutre, et l'adapter Brevo intercepte les erreurs d'envoi sans les propager, donc un échec d'email reste invisible du client. [#3b36126a4b26b1fd-1] [#f0e9994b6c91fdae-1]
- Le JWKS est public sur /.well-known/jwks.json, hors du préfixe /api, avec un cache public de 300 secondes. [#2a7035d417ef3594-1] [#authorization/6bf025d08b434efd-1] [#integrations/321539050fd09532-1]
- Le filtre de limitation par utilisateur répond 401 JSON sans comptage à un principal authentifié sans identifiant de compte. [#e5aa1bfc7a6eeec1-1]
- DELETE /api/me exige le username en confirmation, puis révoque les sessions et supprime events, products, catégories possédées et user, dans cet ordre. [#4b311aa3577f75bf-1] [#c65286231ca612ed-1]
- L'avatar est validé par signature d'octets (JPEG, PNG, WebP), et l'ancien fichier n'est supprimé qu'après l'enregistrement du nouveau. [#8ba1a7110d4eb0a3-1] [#9a081bc3705702c1-1]
- DELETE /api/me/avatar ne produit pas d'erreur sans avatar, alors que la lecture lève AvatarNotFoundException. [#3394e708bc740d15-1] [#4e2814c09ff587bb-1]
- Côté réglages, seul le chapitre actif est monté sur desktop, et le chapitre Compte reçoit deleteContainer sheet sur mobile seulement. [#0eadb6f6204628c6-1] [#0eadb6f6204628c6-2] [#b7cb8655e1dde07c-1]
- Le front enregistre le thème avec l'option qui désactive le toast global de 500, l'erreur étant gérée en ligne. [#46460b1d11deab1a-1]
- L'export de données affiche un écran expiré sans bouton de téléchargement quand le lien async a expiré. [#b964b1edbababf16-1]
- GET /api/test-support/password-reset-token renvoie le token de réinitialisation utilisable pour un email, à l'usage des tests E2E. [#8fb84ca2abcae011-1]

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 154), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 52 | convention 18, business_rule 10, endpoint 7 |
| `frontend:lib/auth-jwks.ts` | 31 | business_rule 11, convention 10, config 5 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java` | 30 | endpoint 9, other 6, business_rule 5 |
| `frontend:contexts/AuthContext.tsx` | 29 | business_rule 9, convention 8, other 7 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtService.java` | 24 | convention 8, suspicious 4, business_rule 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java` | 29 | test_case 16, validation 12, role_check 1 |
| `frontend:lib/schemas/auth.ts` | 19 | validation 9, business_rule 4, convention 3 |
| `frontend:lib/auth-guard-paths.test.ts` | 37 | test_case 26, business_rule 6, config 3 |
| `frontend:lib/auth-token-verify.ts` | 21 | business_rule 10, other 6, config 2 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java` | 20 | business_rule 5, service_method 4, convention 3 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 20 | config 7, convention 6, role_check 4 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 16 | business_rule 7, config 3, other 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| authorization | 88 | 58 |  |
| frontend-core | 48 | 18 |  |
| backend-core | 39 | 16 |  |
| integrations | 17 | 17 |  |
| batch | 11 | 8 |  |

## 8. Tests attendus {#tests}

- Les tests fixent que le login n'applique pas la politique de mot de passe (compte legacy de 6 caractères accepté), contrairement à register, reset-password et change-password. [#1d0c91a5f7948ea6-1] [#137714ce36c35e22-1] [#829273ea1e1f5554-1] [#8ae601ae7ba7c536-1] [#d18d63afea137eb6-1]
- Les tests fixent que forgot-password répond 200 sans token ni email pour un email inconnu, et que le token de réinitialisation est à usage unique sous concurrence. [#c72c07371932fb96-1] [#fe97df0f7d56d492-1] [#58f796c8fce18cc5-1]

## 9. Questions ouvertes {#questions}

- L'unicité du username est-elle désormais garantie en base ? Le commentaire dit la contrainte absente (cf. #42) et le contrôle reste applicatif, avec une course possible. [#97b09f09b018a856-1] [#f1e8c7982ae29cba-1]
- Pourquoi /me lit-il le cookie jwt directement sans passer par CallerResolver, dont la javadoc décrit le remplacement de cette extraction ? [#authorization/36aa78900fe7b738-1]
- Un échec du PUT de thème doit-il rester silencieux ? Le commentaire promet un affichage local sans retour arrière, et le code appelle persist sans attendre ni gérer d'erreur. [#c4d59b1aa2bcb242-1] [#da42081b6d60dfbf-1]
- Quel type User fait foi côté frontend ? useSettings importe user.ts, AuthContext utilise auth.ts, deux définitions coexistent. [#fe5c7b81b7dd9db2-1] [#frontend-core/fcb2319587514c3b-1]

## 10. Alertes {#alerts}

- Sans clé privée JWT configurée, la paire RS256 est éphémère et tous les jetons émis sont invalidés à chaque redémarrage. Configurer JWT_PRIVATE_KEY pour tout environnement durable. [#authorization/6d1d59909a7eca5b-1]
- Dans UserRepositoryJpaImpl.save, un id absent en base crée un nouvel utilisateur sans erreur. Une mise à jour d'un compte supprimé entre-temps le recrée silencieusement, donc vérifier l'existence avant d'appeler save. [#0747b8c3ebe8fd23-1] [#b828c6672c873402-1]
- Selon la javadoc de UserController.changePassword, le nouveau mot de passe est validé à 6 caractères minimum, alors que le validateur StrongPassword exige 8 à 100 caractères avec majuscule et chiffre. Se fier au validateur et corriger la javadoc. [#6cafba87a980c0d0-1] [#e2385a30ad2b3acd-1] [#bd040f4c8fa54886-2]
- authService.registerUser retourne apiClient.post sans await dans le try, donc le catch local ne capte jamais l'erreur d'inscription. Ajouter await avant de compter sur ce catch. [#775e9e7033a036d2-1]
- Le message d'erreur d'avatar annonce 5 Mo en dur, alors que la limite vient de app.storage.avatar-max-bytes. Le message devient faux dès que la propriété change. [#8d758cbb64816069-1]
- Plusieurs tests ont un nom qui contredit leur assertion. Les noms en notFound attendent un 401 générique, et le test forgotPassword d'email inconnu ne vérifie pas l'absence d'envoi. Ne pas s'appuyer sur ces noms comme garantie. [#fa60a46d6dd6e480-1] [#b5b6fed9ee4b11a1-1] [#881306212b0fb628-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 154 ; avec au moins un fait en base : 154 ; sans fait après remise en file : 0.
- Faits en base : 1 370, repris d'autres packs : +320, hors périmètre : -0, doublons écartés à la déduplication : -188, soit 1 502 dans le pool.
- Faits du pool venus d'un autre pack : 203 (par pack : section Relations).
- Destination des 1 502 faits du pool : Lexique 32 ; Règles 250 ; Endpoints et écrans 161 ; Tests attendus 419 ; Alertes / Questions ouvertes 91 ; annexe seule 329 ; écartés (sorte `other` ou inconnue) 220.
- Base : sha256 16ba5e6f01b5…, générée le 2026-11-19.
