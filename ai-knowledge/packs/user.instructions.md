---
pack: user
kind: domain
name: Utilisateur et mot de passe
generated_at: 2026-11-19T10:32:37Z
generator: synth/1
base_sha256: dc8f2b63041bb2889fb0705f1a464354444ed4aee4094af287bdf3e4c392379d
facts_in_base: 943
facts_in_pool: 1037
facts_cited: 104
sections: user.sections.json
details: [user.details.md, user.details-2.md]
lang: fr
curated_at: 2026-11-19T10:32:37Z
curation: user.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : user, utilisateur, password, mot de passe, reset, avatar, register, inscription, profile, profil, auth
- Routes : `/api/auth`, `/api/me`, `/api/test-support`
- Entités : UserEntity, PasswordResetTokenEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| themePreference | Préférence de thème de l'utilisateur, à trois valeurs côté domaine avec une valeur externe en minuscules. Côté frontend elle est toujours présente mais peut être nulle. | [#91ad61b21554d634-1] [#722e39414f050e84-1] |
| theme_preference | Colonne de 16 caractères de la table users, convertie depuis la préférence de thème, sans contrainte nullable explicite. | [#3f1031a6800df02c-1] |
| AvatarContent | Octets de l'avatar et type MIME, côté domaine. Le frontend ne voit qu'avatarUrl, une chaîne nullable toujours présente. | [#b4af9c54c76c838a-1] [#faf07dbd8221ea3f-1] |
| PasswordResetToken | Jeton de réinitialisation de mot de passe, avec une date d'expiration et une date d'usage. | [#c342fa8964981090-1] |
| password_reset_tokens | Table des jetons de réinitialisation. Le token y est unique et non nul, et une colonne version est présente. | [#28a8fc931f196d75-1] [#ae440359e09d13c4-1] |
| Validité du lien | Le lien de l'email de réinitialisation est valable 15 minutes, en français comme en anglais. | [#aab6bd536448849d-1] [#20b6db88ba7b9b89-1] |
| CustomUserDetails | Adaptateur de sécurité qui encapsule un User avec une liste d'autorités fournie à la construction. | [#56bae8d1952df702-1] |
| strength | Niveau de robustesse du mot de passe affiché, weak, medium ou strong, résolu par la clé settings.security.strength. | [#5ca9d4e6a77a659d-1] |
| createdAt et updatedAt | Dates d'audit de l'utilisateur. La première n'est jamais modifiable après création. | [#2d40482f1e19ff86-1] |

## 3. Règles {#rules}

### Politique de mot de passe
- Un mot de passe valide fait de 8 à 100 caractères avec au moins une majuscule et un chiffre, et une valeur nulle passe ce validateur car @NotBlank la traite. [#436c92fe7ec45d1f-2] [#436c92fe7ec45d1f-4] [#436c92fe7ec45d1f-1]
- L'inscription, le reset et le changement de mot de passe appliquent cette politique au nouveau mot de passe. [#4fd656ac52faacf2-1] [#45f5fded0dd2736f-1] [#2ac526e658044675-1]
### Réinitialisation du mot de passe
- Un token nul, non UUID, absent, expiré, déjà consommé ou dont le compte a disparu lève la même InvalidPasswordResetTokenException, sans révéler la cause. [#8f292fce24271a96-1] [#73a8b35d1023d45e-1] [#73a8b35d1023d45e-2] [#73a8b35d1023d45e-3]
- Un token est expiré dès que expiresAt n'est plus strictement postérieur à l'instant, et consommé dès que usedAt est renseigné. [#a849b2b5eaa23ad1-1] [#b22d13082ea4efc9-1] [#2ea382d05bae8c72-1]
- Un conflit de verrou optimiste à la consommation devient aussi InvalidPasswordResetTokenException, le flush étant immédiat. [#73a8b35d1023d45e-4] [#38e6158d5b55a273-1]
- Sans clé API Brevo, l'envoi est sauté avec un warning, et une RestClientException est journalisée sans être propagée. [#775621251ad13b2f-1] [#775621251ad13b2f-2]
- Le nom et le lien sont échappés HTML dans le corps de l'email, et une locale nulle, vide ou inconnue retombe sur le gabarit FR. [#5b0443ae67966f97-1] [#91583347a8781dfd-1]
### Connexion et session
- Un échec d'authentification renvoie un 401 UNAUTHORIZED générique, sans distinguer username inconnu et mot de passe faux. [#b2cfb8b742831c99-1]
- GET /api/auth/me vérifie lui-même que le jti est une session active, car /api/auth/** échappe à JwtFilter. [#575186050ab1cb42-1]
- L'inscription renvoie 409 CONFLICT si le username existe ou si une contrainte unique saute, et crée toujours le compte avec le rôle ROLE_USER. [#2a37f60098851612-1] [#2a37f60098851612-3] [#2a37f60098851612-2]
- La session enregistre une IP anonymisée (dernier octet IPv4 à 0, trois hextets IPv6 conservés, IPv6 compressée non stockée). [#4be1f8cb5e6cb3ff-2] [#c8e16bfb4284d0e4-1] [#c8e16bfb4284d0e4-2] [#c8e16bfb4284d0e4-3]
### Profil, avatar et thème
- PATCH /api/me renvoie 409 si le nouveau username appartient à un autre compte, et ne modifie que name, username et email. [#c655c234892a675c-1] [#c655c234892a675c-3]
- La suppression de compte exige que la confirmation égale le username du caller, sinon AccountDeletionMismatchException avant toute écriture. [#943127ba120eccec-1]
- Un avatar vide, trop gros ou qui n'est ni JPEG, ni PNG, ni WebP (détecté par magic bytes) lève InvalidAvatarException, et le front refuse déjà au-delà de 5 Mo. [#609349e75b77f88c-1] [#609349e75b77f88c-2] [#609349e75b77f88c-3] [#5a34f17fcd039d02-1]
- themePreference n'accepte que light, dark ou system en minuscules sans espace, et reste null tant qu'aucun choix n'a été fait. [#91aff7dce9ed0a4f-2] [#69c568fbca4799a7-1] [#2e01cbedfbb7918a-2]
- PUT /api/me/preferences est limité à 30 requêtes par minute et par compte et par route, les requêtes anonymes n'étant pas comptées. [#ce64361fcde0a725-1] [#6ecf7cddb53990f8-3] [#6ecf7cddb53990f8-2]
- L'export de données exclut les catégories système et n'expose aucun champ password. [#f881252ad777c509-1] [#fc21f644a3de7d83-1]
### Vérifié dans le code
- PUT /api/me/preferences est plafonné à 30 par minute et par utilisateur par UserRateLimitingFilter, monté avant AuthorizationFilter dans SecurityConfig [#authorization/589eeb31cac50d43-1] [#ce64361fcde0a725-1] [#authorization/e752f9ef4f24e41f-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java:88-91`.
- users.username est unique en base par uq_users_username (V2). Le contrôle de UserController.updateCurrentUser n'est qu'un pré-contrôle, et la course est arrêtée par la contrainte [#backend-socle/f1934b5a2a3e854b-1] `mytimeline:backend/src/main/resources/db/migration/V2__unique_constraints.sql:14`.
- UserRepositoryJpaImpl.copyMutableFields ne recopie pas themePreference : seul updateThemePreference l'écrit, donc reconstruire un User sans thème avant save est sans effet sur la préférence [#126abc370019e426-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java:113-124`.

## 4. Structure {#structure}

#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AuthController.login | POST /api/auth/login reçoit un AuthRequest validé, authentifie via AuthenticationManager et répond 200 avec un message de succès. (partiel) | L111-112 | [#16e5d2460834bf93-1] |
| AuthController.login | Un utilisateur anonyme passe à authentifié après authenticationManager.authenticate, puis un jti est enregistré en session et le cookie jwt est posé. (partiel) | L115-127 | [#authorization/bfe467a84207cfa3-1] |
| AuthController.getUserDetails | GET /api/auth/me lit le cookie jwt et renvoie le UserResponse de l'utilisateur, ou 401 si le cookie est absent. | L146 | [#503bec9c13e1fb8b-1] |
| AuthController.logout | Le logout révoque le jti du cookie courant en base puis pose un cookie jwt vide avec maxAge 0. (partiel) | L257-260 | [#authorization/ed68a63fc2b66b67-1] |
| AuthController.refreshToken | POST /api/auth/refresh refuse avec 401 un token dont la signature ou l'expiration est invalide, ou dont le jti est révoqué. | L300-314 | [#f9f3a5b3da17235e-1] |
| AuthController.refreshToken | Le refresh révoque l'ancien jti puis enregistre le jti du nouveau token, et pose un nouveau cookie jwt. (partiel) | L316-326 | [#authorization/10efe7ec9942ce01-1] |
| AuthController.refreshToken | Le refresh génère un nouveau token, révoque l'ancienne session puis enregistre la nouvelle, pour un token encore actif. (partiel) | L319-324 | [#3ec9a1f9167849a7-1] |
| AuthController.forgotPassword | POST /api/auth/forgot-password délègue à PasswordResetService.requestReset et répond toujours 200 avec un message neutre. | L354-360 | [#edf4a1d6b06c7d54-1] |
| AuthController.resetPassword | POST /api/auth/reset-password délègue à PasswordResetService.resetPassword avec le token et le nouveau mot de passe, puis répond 200. | L368-372 | [#cbde0c2e7948278f-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| UserController.getCurrentUser | GET /api/me renvoie le profil de l'utilisateur courant via UserResponse.fromDomain, sans hash, ou 401 si aucun caller n'est résolu. | L82-87 | [#592f826951fba179-1] |
| UserController.updateCurrentUser | PATCH /api/me valide un UserUpdateRequest et met à jour name, username et email de l'utilisateur courant. | L109-110 | [#7bcf048f941d320f-1] |
| UserController.updatePreferences | PUT /api/me/preferences pose la préférence de thème du caller après conversion par ThemePreference.fromValue et renvoie le UserResponse mis à jour. | L160-169 | [#2c91bf6991df9da3-1] |
| UserController.changePassword | POST /api/me/change-password délègue à UserService.changePassword avec le caller, l'ancien et le nouveau mot de passe, puis répond 204. | L178-187 | [#e7b23c8b45ef374e-1] |
| UserController.deleteCurrentUser | La suppression de compte appelle UserService.deleteAccount puis pose un cookie jwt expiré, la suppression du compte se faisant avant toute écriture de la réponse. (partiel) | L214-218 | [#1e0136f1cce43bd1-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| PasswordResetServiceImpl.resetPassword | Le token passe à l'état consommé via token.consume puis markConsumed, lors d'un reset de mot de passe réussi. (partiel) | L183 | [#261bada364382191-1] |
#### mytimeline:frontend/src/components/ui/toaster.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AppToaster | La pause du compte à rebours est démarrée par startPause quand le survol ou le focus est actif, et levée par endPause quand les deux cessent. (partiel) | L255-257 | [#765dffc2ac572ce4-1] |
#### mytimeline:frontend/src/components/settings/AvatarUpload.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AvatarUpload.confirmCrop | Le recadrage passe du mode sourceUrl défini au mode sourceUrl null par confirmCrop, si canvas.toBlob renvoie un blob, après envoi du fichier PNG au parent. | L126-137 | [#58e39df082f01931-1] |
| AvatarUpload.cancelCrop | L'annulation du recadrage remet sourceUrl à null et révoque l'URL d'objet, sans appel au parent. | L139-143 | [#964716d693e4a39a-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| PasswordResetToken.consume | La consommation produit une nouvelle instance avec usedAt renseigné, le modèle restant immuable. (partiel) | L72-74 | [#fb0bcb272c564e7f-1] |
#### mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImplTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| PasswordResetServiceImplTest.resetPassword_validToken_reHashes_updatesUser_andConsumesToken | Un token valide passe à l'état consommé via markConsumed avec used_at posé à now, et le mot de passe est ré-encodé par BCrypt avant save. (partiel) | L169-195 | [#72fb626cb2c7c8b5-1] |

## 5. Endpoints et écrans {#surface}

- Les routes /api/me sont dans `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java:82-290` [#592f826951fba179-1], les routes /api/auth dans AuthController, et l'écran de réglages avatar dans `mytimeline:frontend/src/components/settings/AvatarUpload.tsx:146-221` [#7b1d4ef2370cf8b0-1].
- Le contrôleur de test `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:44-45` n'est actif que sous le profil e2e, ne porte aucune annotation de sécurité dans son fichier et expose le token de reset le plus récent d'un email [#1ed742974441f8cd-1] [#c7abb657718092cb-1]. Ne jamais activer ce profil hors e2e.
- POST /api/auth/forgot-password répond toujours 200 avec un message neutre [#edf4a1d6b06c7d54-1], et requestReset avale toute RuntimeException en la journalisant [#c69d437a32e90da2-1]. Un échec d'envoi Brevo reste donc invisible pour l'appelant, il faut lire les logs.
- POST /api/auth/refresh répond 401 si la signature ou l'expiration est invalide, ou si le jti est révoqué [#f9f3a5b3da17235e-1]. GET /api/auth/me répond 401 si le cookie jwt est absent [#503bec9c13e1fb8b-1].
- DELETE /api/me exige le username saisi dans le corps, supprime dans l'ordre sessions, events, products, catégories possédées puis user, efface le cookie jwt et répond 204 [#6dc99624ee4f5fdd-1] [#2c29c1b4eee4abdc-1]. Garder cet ordre si une nouvelle table dépend de l'utilisateur.
- Le téléversement d'avatar (multipart, part file) sauvegarde le User avec la nouvelle référence puis supprime l'ancien fichier si la référence change [#6a491107ed3002b8-1] [#2b36e62dc08c222c-1]. GET /api/me/avatar lève AvatarNotFoundException si la référence est absente ou introuvable dans le stockage [#6ade347418a09a23-1].
- findDomainUserByEmail prend le premier résultat de la liste sans getSingleResult [#771c1e9c3e1907b8-1], donc un doublon d'email ne lève pas d'erreur. Ne pas supposer l'unicité côté code.
- Côté front, useCurrentUser ne fait aucun appel HTTP, il renvoie l'utilisateur d'AuthContext [#961a913b384b8222-2]. Pour rafraîchir le profil il faut mettre à jour AuthContext, pas invalider la requête.

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (11 sur 146), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 41 | convention 13, business_rule 10, endpoint 5 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java` | 26 | endpoint 8, business_rule 5, convention 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AvatarServiceImpl.java` | 17 | business_rule 5, service_method 3, validation 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/UserRateLimitingFilter.java` | 19 | business_rule 5, convention 5, config 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java` | 15 | validation 5, business_rule 2, service_method 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerSecurityTest.java` | 28 | test_case 20, business_rule 5, convention 2 |
| `mytimeline:frontend/src/components/ui/toaster.tsx` | 14 | business_rule 6, config 5, other 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthControllerLegacyPasswordLoginTest.java` | 20 | other 5, test_case 4, suspicious 3 |
| `mytimeline:frontend/src/components/ui/palette-color-picker.tsx` | 13 | business_rule 7, config 2, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserControllerTest.java` | 29 | test_case 24, business_rule 2, convention 1 |
| `mytimeline:frontend/src/components/ui/theme-toggle.tsx` | 14 | business_rule 6, other 5, convention 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| authorization | 58 | 43 |  |
| integrations | 28 | 20 |  |
| backend-socle | 30 | 10 |  |

## 8. Tests attendus {#tests}

- Le HTML serveur de ThemeToggle porte le libellé générique theme.toggle sans aria-pressed, puis après montage le nom accessible est la destination [#eda8e9fd8608d0bb-1] [#eda8e9fd8608d0bb-3] [#dc08544a82d797cb-1] [#dc08544a82d797cb-2].

## 9. Questions ouvertes {#questions}

Aucun fait de la base ne relève de cette section.

## 10. Alertes {#alerts}

- UserMapper.toDomain ne transmet pas la préférence de thème [#128e6d740428545a-1], seul le repository la rajoute après coup [#76453319e4ee83e9-1]. Un appel direct au mapper perd donc le thème, donc passer par le repository ou ajouter le thème explicitement.
- Les routes /api/auth/** sont exclues de JwtFilter, donc /me contrôle la session à la main [#575186050ab1cb42-1]. Un nouvel endpoint sous ce préfixe ne vérifie pas la révocation, donc appeler isSessionActive explicitement.
- Une IPv6 compressée (avec deux-points doubles) donne null et aucune IP n'est stockée dans la session [#c8e16bfb4284d0e4-2]. Les clients concernés n'ont pas d'IP de session, donc ne pas exiger cette valeur.
- Le commentaire de resetPassword fixe 15 minutes, or la durée est configurable [#ca0b32858809cbcd-1]. Le code teste seulement l'usage possible à l'instant courant [#73a8b35d1023d45e-2], donc se fier au code et à la configuration.
- Le message d'erreur d'avatar annonce 5 Mo en dur alors que la limite est configurable [#e7a18c51ee2b051d-1]. Il peut mentir à l'utilisateur, donc le construire depuis maxBytes.
- Le log d'erreur du login écrit le username saisi [#46538dfcc6254d7f-1]. Un identifiant personnel atterrit dans les logs, donc le retirer ou le masquer.
- Le test d'email inconnu annonce qu'aucun email n'est envoyé mais ne vérifie rien sur emailService [#a9c23fe46c902026-1]. Une régression passerait inaperçue, donc ajouter la vérification.
- Les tests de contrainte acceptent toute Exception [#9552c12d646d8a0b-1] [#3bbd81a9f4e12a54-1]. Ils passent même si une autre contrainte échoue, donc cibler la contrainte attendue.
- La javadoc du test de limitation annonce un 400 pour les cinq premières tentatives, le test vérifie seulement l'absence de 429 [#1ced9020fce38c3b-1]. Le 400 n'est pas couvert, donc l'asserter ou corriger la javadoc.

## 11. Couverture {#coverage}

- Fichiers du pack : 146 ; avec au moins un fait en base : 146 ; sans fait après remise en file : 0.
- Faits en base : 943, repris d'autres packs : +189, hors périmètre : -0, doublons écartés à la déduplication : -95, soit 1 037 dans le pool.
- Faits du pool venus d'un autre pack : 116 (par pack : section Relations).
- Destination des 1 037 faits du pool : Lexique 22 ; Règles 162 ; Endpoints et écrans 69 ; Tests attendus 256 ; Alertes / Questions ouvertes 53 ; annexe seule 243 ; écartés (sorte `other` ou inconnue) 232.
- Base : sha256 dc8f2b63041b…, générée le 2026-11-19.
