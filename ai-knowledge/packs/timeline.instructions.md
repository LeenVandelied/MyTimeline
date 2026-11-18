---
pack: timeline
kind: domain
name: Chronologie, comptes et exports
generated_at: 2026-11-17T10:36:11Z
generator: synth/1
base_sha256: b34b44aece11fa7158147f9364a0ee24a25166ca6893a552261df3cde8576db3
facts_in_base: 3432
facts_in_pool: 3811
facts_cited: 272
sections: timeline.sections.json
details: [timeline.details.md, timeline.details-2.md, timeline.details-3.md, timeline.details-4.md, timeline.details-5.md]
lang: fr
curated_at: 2026-11-18T14:30:00Z
curation: timeline.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : user, utilisateur, event, événement, evenement, category, catégorie, categorie, product, produit, session, export, password reset, mot de passe, timeline, chronologie, recurrence, récurrence, avatar
- Routes : `/api/auth`, `/api/categories`, `/api/events`, `/api/export`, `/api/me`, `/api/sessions`, `/api/test-support`
- Entités : UserEntity, CategoryEntity, EventEntity, ExportJobEntity, PasswordResetTokenEntity, ProductEntity, SessionEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| Plafond d'occurrences | Seuil au-delà duquel la série déclenche un hint non bloquant. | [#283e0810fafd8d67-1] |
| Statut d'export | Chaîne de 16 caractères au plus, sans énumération JPA. L'interface retient PENDING quand le statut est absent. | [#85b1d006e979a352-1] [#06a05b879421e6bc-1] |
| JWKS | Liste de clés publiques RSA au format JWK, publiée selon la javadoc sur le chemin well-known. | [#042056a3f37230ce-1] [#bd483e8a6418f21f-1] |

## 3. Règles {#rules}

### Événements et récurrence
- Au PATCH, les contrôles portent sur l'état fusionné. Un récurrent sans recurrenceUnit est refusé (400, sauf unité déjà en base) et une recurrenceEndDate avant startDate donne 422, l'égalité étant tolérée [#aacec85a42631428-1] [#b6235b8320b518a9-1] [#0b3cf5d7d914c2f1-1] [#d01e46587544f0ca-1] [#a7e9024c920debf4-7] [#a607aeea0e1b1902-3] [#a7e9024c920debf4-8].
- Une endDate fusionnée avant startDate lève EndDateBeforeStartException (422) après dérivation de endDate, sans écriture [#b6235b8320b518a9-2] [#db68aae9040aa635-1] [#a607aeea0e1b1902-1] [#912e0bd0543bc058-1].
- Pour duration, un durationUnit nul ou hors days, weeks, months, years lève InvalidDurationUnitException [#8cd20c75d6215999-1] [#8cd20c75d6215999-2] [#c879b210d34f3958-1].
- Une date de début absente vaut aujourd'hui (création d'événement, mapper, création de produit) [#cfa788ce2a539c7c-1] [#7c67ebb440f30dce-1] [#f2de85ebfc81aa4b-2].
- Une série sans recurrenceEndDate est développée jusqu'à un horizon fixe, et MAX_OCCURRENCES tronque et marque capped sans bloquer la soumission côté front [#41062bd03b16beee-1] [#41062bd03b16beee-2] [#e3b3229ba3d5f32d-1] [#f8ee0906616caa32-2].
- expand lève IllegalArgumentException si début ou unité nul ou fin avant début. Le preview renvoie 422 pour fin avant début, 400 si startDate ou recurrenceUnit manque [#0cef617a5b3df27d-3] [#0ece7cd5a68913f4-2] [#9ca46c37957a94d9-1] [#9ca46c37957a94d9-2] [#9ca46c37957a94d9-3] [#0b8263bb9b6f5091-1] [#2b19edc8b1db9a8c-1] [#cf8e84542238dc51-1].
- La migration V4 s'interrompt sur un type nul, trop long ou hors énumération. V9 réécrit les alias de recurrence_unit puis met NULL le reste [#7280a5ee3a5128bd-1] [#c53bd5a742d3c763-1] [#c53bd5a742d3c763-2].
### Comptes et mots de passe
- StrongPassword impose 8 à 100 caractères, une majuscule et un chiffre, null accepté. Elle s'applique à l'inscription et au nouveau mot de passe (changement, reset), pas à oldPassword ni au login [#7ad92ccf1be8253c-1] [#35a76cbef6d96d4d-1] [#e723430070a8a989-3] [#e723430070a8a989-1] [#c93a584635359762-1] [#7a229a904081eb5b-1] [#aef117845e4cb334-1] [#8a0b4636eca3fe14-1] [#fdd11ccacbd697fd-1] [#f02759cf558b524d-1] [#9a8b62738cb2437a-1].
- Un token de reset non UUID (refusé sans accès base), expiré, consommé, d'un compte disparu ou en conflit optimiste lève la même InvalidPasswordResetTokenException, 400 générique [#a6fac6d9ffbda813-1] [#5754f049d8a57cbb-1] [#ff29dec7a1ac5a76-1] [#5754f049d8a57cbb-2] [#e3a38c640b4e23ac-1] [#a68b3c10ac841c62-1].
- La demande de reset est asynchrone, sans signal pour un email inconnu, toute RuntimeException étant avalée et journalisée par nom de classe [#a0a4c1649f1ff5c1-1] [#a0a4c1649f1ff5c1-2] [#a0a4c1649f1ff5c1-3].
- Sans clé API Brevo l'envoi est sauté avec un warning, et une erreur HTTP n'est pas propagée. Une locale inconnue donne le template FR [#a2e5716b0136e600-1] [#a2e5716b0136e600-2] [#802bc13c62eddc54-1] [#7383058e6a3d254d-2].
- Un username déjà pris donne 409 à l'inscription et au PATCH /api/me, l'inchangé restant permis. Le login renvoie un 401 générique [#4f75632d5a5d2a55-1] [#17e3bf9f223b2e13-1] [#f2687ee00902e873-1] [#936b70beb75a6b4e-1] [#47c33f906b9a4454-1].
- La préférence de thème n'accepte que light, dark ou system en minuscules (400 validation_failed). PUT /api/me/preferences est limité à 30 par minute, 429 au-delà, 401 sans principal [#092b51caa7587310-1] [#fdd2b53a6f98dc15-1] [#c2b6dada4b60b4e4-1] [#9e28bcaa631902f1-1] [#e79a9bf179544d41-1] [#8877a1ae55915227-1] [#fe0f5fd74a265fe4-1] [#6b9213683e3c927f-1] [authorization/90d187d27a2f51aa-1].
### Exports
- Un format synchrone en asynchrone, ou l'inverse, ou un format inconnu, lève ExportFormatNotSupportedException (400) [#a9ab1ef6682c3f62-1] [#ea414ed4631f90d5-1] [#e9d2b09a65a4cd09-1] [integrations/4804c85a3711897e-1] [integrations/9eae9bf0b2626984-1] [integrations/14ae53180e3f4bf4-1].
- Côté front, JSON et MARKDOWN sont synchrones (téléchargement direct), les autres passent par un job pollé toutes les 4000 ms jusqu'à COMPLETED ou FAILED. Toute erreur de requête donne network [#772dc94bf8ca6667-1] [state-machine/b41ecf1b43916e73-1] [#27212c52d14b6e76-1] [#4bbcb9082b51e911-1] [#4025e56523b42a45-1] [#ef050ccbf09a1f86-1] [#bc9aacfb871ca055-1] [#885c1f26f101ef0f-1] [#885c1f26f101ef0f-2] [#4025e56523b42a45-2] [#ef050ccbf09a1f86-2] [#885c1f26f101ef0f-3].
- Le téléchargement exige une downloadUrl, et un lien est expiré quand expiresAt est lisible et atteint (recalcul toutes les 60 s) [#86636ae7e17b6f77-1] [#55bc983a210b02d6-1] [#e8c03ac292500a24-1].
### Catégories et produits
- Un nom de catégorie est unique par propriétaire, conflit 409 (CategoryNameConflictException, inline côté front), un renommage au même nom passe [#ba31f6a5db61ec28-1] [#d123364ba318b9da-1] [#19c33a17e3cf9919-1] [#9f799e2d9d2d861f-1] [#fba96d460f2450be-1] [#5304bb991a666436-1].
- Supprimer une catégorie avec produits actifs ou archivés sans cible lève CategoryInUseException (409). Une cible égale à elle-même donne 409 [#1638778c4a46dea3-1] [#b7d1911e28ca76b4-1] [#c402da788964f3bc-1] [#cbf5b74a7e242967-2] [#f0513e2d42b16d79-1] [#5e04d2cfcb66f7e0-1] [#cd16ad1c9e9fa785-1] [#76f94b32e0200775-1].
- Avec cible, la réassignation précède la suppression dans la même transaction. Une catégorie sans ownerId est système, sans édition de nom ni suppression en interface [#efea43ee0f941cb7-1] [#314b5fde9e395a92-1] [#b7d1911e28ca76b4-2] [#86db74ab152ae17f-1] [#2463d1e77e28b1c9-1] [#33da7df0027e0494-3].
- Sur un produit, clearColor prime et une couleur null laisse inchangé. La couleur suit produit, catégorie, repli [#a3eb16026b46748b-1] [#899f1de20e93ed30-1] [#a302776ec2389479-1] [#cceb6584ad89abec-1].
- Front : nom de catégorie 1 à 255, nom de produit 1 à 100 avec catégorie UUID, mise à jour exigeant au moins un champ, clearColor seulement true [#afddec28fb0c6ae0-1] [#979d6aa61abcbf9d-1] [#9be1ff27da67daed-1] [#3365823e14a410eb-1] [#85d4d2f1bc91cd90-1].
### Sessions et sécurité
- Avatar vide, au-delà de 5 Mo ou non JPEG, PNG, WebP (magic bytes) lève InvalidAvatarException (400). L'ancien fichier n'est supprimé qu'après sauvegarde si la référence change [#b07280d7f022e8c8-1] [#b07280d7f022e8c8-2] [#b07280d7f022e8c8-3] [#5dbfe014d6dfd839-1] [#a310b28e04e37268-1] [#bc1da3233312d2b0-1].
- Le stockage local génère une référence UUID, rejette slash, antislash et deux points, extension de 1 à 5 caractères [a-z0-9] [#3de2a9f6b683e136-1] [#9efe1fa6a41d42f9-1] [#9efe1fa6a41d42f9-2] [#b2873e4d4f5e3f4d-1].
### Vérifié dans le code
- PasswordResetTokenPurgeScheduler.purgeConsumedAndExpired supprime via deleteConsumedOrExpiredBefore tout token consommé immédiatement, et les expirés seulement après la rétention (24h par défaut) [#integrations/757e913cb9162988-1] [#85c2925ef276badb-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java:93-94`.
- Le restore d'un produit renvoie 404 uniforme (ProductNotFoundException) pour inconnu, non archivé ou d'autrui, et 403 seulement si le userId du path diffère du caller [#7ffbb5f0b0666075-1] [#23aead80049aa52e-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java:108-132`.
- durationUnit null donne un 422 uniquement pour type='duration' avec durationValue non nul (InvalidDurationUnitException, handleInvalidDurationUnit) [#35513b08008b2dce-1] [#backend-socle/2faddb776ec7b9ad-2] [#8cd20c75d6215999-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/utils/Utils.java:57-62`.
- Après un 409 au désarchivage, useSetEventArchived invalide products.all dans son onError. handleUnarchive n'a pas à le faire [#cc800a010618b0e6-1] [#9160ee03da7f807b-1] `mytimeline:frontend/src/hooks/useSetEventArchived.ts:38-46`.
- CategoryController.deleteCategory requires isOwnedBy for the target and the reassign target, and ProductServiceImpl.resolveAssignableCategory blocks cross-user assignment, so the unscoped productRepository.updateCategoryForProducts only touches the owner's products [#fee4a3fe030b8963-1] [#7066eb160400bf67-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java:135-137`.
- Le contrôleur E2eResetTokenController (GET /api/test-support/password-reset-token) est protégé par @Profile("e2e") et ne doit jamais être activé hors test [#integrations/4c61ca6e2f106b0b-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/testsupport/E2eResetTokenController.java:43-45`.

## 4. Structure {#structure}

#### mytimeline:frontend/src/components/timeline/TimelineView.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineView.toggleCategory | Le clic sur l'en-tête de catégorie inverse son état de repli dans la table collapsed. (partiel) | L641 | [#b3e983f718d425b1-1] |
| TimelineView.toggleHiddenCategory | Le filtre de la sidebar inverse l'état masqué d'une catégorie, distinct du repli. (partiel) | L654 | [#cce8185974a8e6b9-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AuthController | Le contrôleur AuthController est exposé sous le préfixe /api/auth. | L49 | [#1112a80d33a97a53-1] |
| AuthController.login | POST /api/auth/login authentifie le couple username et mot de passe, pose le cookie jwt, enregistre la session et répond un message sans le token dans le corps. | L111-143 | [#a95aa345e1f0eeae-1] |
| AuthController.register | POST /api/auth/register crée un utilisateur avec le rôle ROLE_USER et un mot de passe haché, et répond 201. | L209-210 | [#f81f483188ff32d4-1] |
| AuthController.logout | Le logout révoque le jti du token courant via sessionService.revokeCurrentSession, puis efface le cookie jwt. (partiel) | L250-260 | [#authorization/ed68a63fc2b66b67-1] |
| AuthController.refreshToken | POST /api/auth/refresh ré-émet un token pour un utilisateur existant uniquement si le token est valide et sa session active. | L269-270 | [#08a39f689d7f03a2-1] |
| AuthController.refreshToken | Le refresh génère un nouveau token à partir de token, révoque le jti de l'ancien token avec revokeSessionSilently, puis enregistre le jti du nouveau token avec registerSession. | L319-324 | [#authorization/10efe7ec9942ce01-1] |
| AuthController.forgotPassword | La route forgot-password renvoie toujours un 200 avec le même message, après appel de passwordResetService.requestReset, quel que soit le résultat de la recherche. | L354-360 | [#authorization/ebe5ee4325e1c2af-1] |
| AuthController.forgotPassword | POST /api/auth/forgot-password délègue au service la demande de réinitialisation et renvoie toujours le même message neutre. | L354-360 | [#84a2033cf7918249-1] |
| AuthController.resetPassword | POST /api/auth/reset-password délègue au service la réinitialisation du mot de passe à partir du token et du nouveau mot de passe. | L368-372 | [#aab1134b89038e1e-1] |
#### mytimeline:frontend/src/components/EventEditForm.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventEditForm.onChange | Cocher le switch archived ouvre la confirmation d'archivage sans changer la valeur, et le décocher repasse archived à false immédiatement. | L918-921 | [#b7c1a395c17883e4-1] |
| EventEditForm.onConfirm | Confirmer l'archivage pose archived à true avec shouldDirty et ferme le dialog d'archivage, passant de false à true. | L961-964 | [#2af828f18863dd55-1] |
| EventEditForm.ConflictDialog | Le ConflictDialog est ouvert quand submitState vaut conflict, et sa fermeture appelle onConflictDismiss. (partiel) | L983-986 | [#5fac1a9bd07ae3d6-1] |
#### mytimeline:frontend/src/components/events/NewEventDrawer.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| NewEventDrawer.productId | L'identifiant de produit est initialisé à partir de la prop initialProductId, ou à une chaîne vide si elle est absente. (partiel) | L94 | [#bf172ae034f932b9-1] |
| NewEventDrawer.submitState | submitState vaut submitting pendant la mutation, error si la mutation est en erreur, sinon idle. | L136-140 | [#01254420649f333c-1] |
#### mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| DELETE /api/sessions/{id} | La suppression d'une session par DELETE /api/sessions/{id} révoque son jti, et la requête suivante avec le même token renvoie 401. (partiel) | L172-177 | [#ee1214a05da3d26c-1] |
| DELETE /api/sessions/others | La suppression des autres sessions révoque toutes les sessions du caller sauf la courante, et la session courante ne liste plus qu'elle-même. (partiel) | L202-213 | [#dfd58c73787be539-1] |
| POST /api/auth/logout | Le logout révoque le token courant, et une requête suivante avec ce token renvoie 401. (partiel) | L217-226 | [#f7eb84d1ac9a459e-1] |
#### mytimeline:frontend/src/components/timeline/TimelineEditHost.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineEditHost.closeEditor | closeEditor remet editing à null, ce qui ferme l'éditeur, sans condition de rôle. (partiel) | L66 | [#c710d917f4138318-1] |
| TimelineEditHost.requestDelete | Sur le chemin mobile, requestDelete arme deleteTarget avec l'événement ciblé sans le supprimer, pour l'utilisateur mobile. (partiel) | L148 | [#ec6df84414022355-1] |
| TimelineEditHost.runDelete | Après une suppression confirmée par le serveur, runDelete remet deleteTarget à null et ferme l'éditeur. (partiel) | L175-176 | [#0c7d658378b5b928-1] |
| TimelineEditHost.handleDeleteOpenChange | Quand le dialog de confirmation se ferme, deleteTarget revient à null. (partiel) | L198-200 | [#723d8cceb4d00bf7-1] |
| TimelineEditHost.setEditing | Le callback onEditEvent passe editing de null à l'événement choisi via setEditing. (partiel) | L211 | [#1eff0f6d5a21a8ed-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportController.exportInline | GET /api/export lit le paramètre format, convertit via ExportFormat.fromParam, puis renvoie le fichier rendu en synchrone pour le seul utilisateur appelant. | L65-74 | [#0aa6060fb83fdf19-1] |
| ExportController.submitAsync | Le POST /api/export soumet un job asynchrone via exportService.submitAsync et répond 202 ACCEPTED avec un ExportJobResponse. (partiel) | L77-88 | [#integrations/2b18bf12bda7aa89-1] |
| ExportController.submitAsync | POST /api/export soumet un job asynchrone via exportService.submitAsync et renvoie 202 avec le jobId et l'URL de téléchargement éventuelle. | L77-88 | [#53de777e6e7fe836-1] |
| ExportController.download | GET /api/export/download/{jobId} exige un token signé en paramètre, puis renvoie le fichier si le token correspond au job et à l'appelant, sinon 404. | L109-129 | [#49bb154a99436e4a-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ProductServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductServiceImpl.archiveById | Le produit passe à l'état archivé par archiveById, sans contrôle de rôle visible dans ce fichier. (partiel) | L174-179 | [#8c425e7918db9e34-1] |
| ProductServiceImpl.restoreProduct | Un produit archivé est désarchivé par l'UPDATE natif restoreArchivedByIdAndUserId, pour l'utilisateur appelant, selon la javadoc l'ownership étant porté par la requête SQL. (partiel) | L193-200 | [#0ba293f8c1399fed-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| PasswordResetServiceImpl.resetPassword | Le token passe à l'état consommé via token.consume puis markConsumed, après la mise à jour du mot de passe, pour une requête de reset valide. (partiel) | L181-183 | [#aad7d72cf42e1372-1] |
#### mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductRestoreIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| GET /api/users/{userId}/products/archived | Le test appelle GET /api/users/{userId}/products/archived avec le caller authentifié et attend 200 avec un tableau. | L140 | [#2d9a3ff216421e91-1] |
| POST /api/users/{userId}/products/{productId}/restore | Le test appelle POST restore sur un produit archivé du caller, attend 204, puis vérifie en base que archived vaut false. (partiel) | L184-186 | [#acfee7b18b09e0f8-1] |
#### mytimeline:frontend/src/hooks/useExportFlow.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useExportFlow.inlineMutation | Passe de confirm à ready par inlineMutation après téléchargement direct du fichier pour un format sync (JSON ou MARKDOWN selon la javadoc). (partiel) | L68-71 | [#4025e56523b42a45-1] |
| useExportFlow.inlineMutation | Passe à error avec la clé network quand l'export sync échoue. (partiel) | L72-75 | [#4025e56523b42a45-2] |
| useExportFlow.submitMutation | Passe de confirm à preparing par submitMutation une fois la requête async POST acceptée, pour un format non synchrone. (partiel) | L81-85 | [#ef050ccbf09a1f86-1] |
| useExportFlow.submitMutation | Passe à error avec la clé network quand la requête async POST échoue. (partiel) | L86-89 | [#ef050ccbf09a1f86-2] |
| useExportFlow.useEffect | Passe de preparing à ready lorsque le polling reçoit le statut COMPLETED, en stockant le job terminé. (partiel) | L104-109 | [#885c1f26f101ef0f-1] |
| useExportFlow.useEffect | Passe de preparing à error avec la clé jobFailed lorsque le polling reçoit le statut FAILED. (partiel) | L110-112 | [#885c1f26f101ef0f-2] |
| useExportFlow.useEffect | Passe de preparing à error avec la clé network lorsque la requête de polling du job est en erreur. (partiel) | L117-122 | [#885c1f26f101ef0f-3] |
| useExportFlow.reset | reset remet la phase à confirm et vide jobId, completedJob et errorKey, sans condition de phase. (partiel) | L153-158 | [#04fd6f4781e163ca-1] |
#### mytimeline:frontend/src/hooks/useEventEditConflict.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useEventEditConflict.runSubmit | runSubmit pose submitState à submitting avant l'appel updateEvent. (partiel) | L138 | [#adeed4e0056e686c-1] |
| useEventEditConflict.runSubmit | submitState passe de submitting à idle par runSubmit, si updateEvent se résout sans erreur. (partiel) | L143 | [#adeed4e0056e686c-2] |
| useEventEditConflict.runSubmit | submitState passe de submitting à conflict par runSubmit, si la réponse est un 409. (partiel) | L153 | [#adeed4e0056e686c-3] |
| useEventEditConflict.runSubmit | submitState passe de submitting à error par runSubmit, si l'erreur n'est pas un 409. (partiel) | L159 | [#adeed4e0056e686c-4] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportServiceImpl.submitAsync | Un job d'export est créé à l'état PENDING via ExportJob.pending puis persisté par save avant le déclenchement du worker. (partiel) | L84 | [#769c2078292e160d-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AsyncExportRunner.run | Le job lu par findDomainById passe de PENDING à RUNNING via markRunning avant d'être sauvegardé. (partiel) | L62-68 | [#batch/12b6799eaf5bd99b-1] |
| AsyncExportRunner.run | Le job passe de RUNNING à COMPLETED via markCompleted, avec la référence de stockage et l'expiration, après assemblage, rendu et stockage sans exception. (partiel) | L71-78 | [#batch/12b6799eaf5bd99b-2] |
| AsyncExportRunner.run | Le job passe de RUNNING à FAILED avec le code borné GENERATION_ERROR lorsqu'une RuntimeException est capturée. (partiel) | L80-83 | [#batch/12b6799eaf5bd99b-3] |
#### mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventOptimisticLockConflictIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventService.updateEvent | Le premier update via eventService.updateEvent fait passer la version de l'event de 0 à 1 en base. (partiel) | L96-97 | [#78b5e3ccd15a2eb5-1] |
#### mytimeline:frontend/src/components/timeline/useTimelineMobileGestures.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useTimelineMobileGestures.onEvtPointerDown | Un appui sur un bloc d'événement lance un minuteur de 500 ms, qui à son échéance marque le long-press comme déclenché et ouvre la cible d'action. (partiel) | L63-66 | [#1d253650283a96b3-1] |
#### mytimeline:frontend/src/components/timeline/TimelineSidebar.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useTimelineSidebarPanel | Le panneau passe de ouvert à fermé lorsque le palier de largeur permanent est atteint, sans action utilisateur. (partiel) | L92-94 | [#549b4223f54beab3-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportJob.pending | La fabrique ExportJob.pending crée un job dont le statut initial est PENDING, sans storageRef, errorCode, completedAt ni expiresAt. (partiel) | L43-46 | [#state-machine/7766b9e71e04f41e-1] |
#### mytimeline:frontend/src/components/products/RestoreProductDialog.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| RestoreProductDialog.handleConfirm | Le désarchivage passe l'erreur à notFound si le rejet porte le statut 404, à generic pour tout autre rejet, et le dialog reste ouvert dans les deux cas. | L73-84 | [#8d417e8f1206a66f-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SessionRepositoryJpaImpl.revokeByJti | La révocation par jti met revokedAt à l'instant courant, uniquement pour les sessions dont revokedAt est encore nul, par un UPDATE JPQL idempotent. (partiel) | L88-97 | [#integrations/20d82e6d0c58db82-1] |
| SessionRepositoryJpaImpl.revokeById | La révocation par id met revokedAt à l'instant courant, uniquement pour une session encore active, par un UPDATE JPQL. (partiel) | L99-108 | [#integrations/495912b73d8f6736-1] |
#### mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/security/ResetPasswordTokenRateLimitIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ResetPasswordTokenRateLimitIntegrationTest.sameToken_afterWindowAdvance_allowedAgain | Après épuisement du quota d'un token, un avancement de 61 secondes du TimeMeter rétablit l'acceptation de ce même token, qui repasse de bloqué à accepté. (partiel) | L142-155 | [#63722541b1787773-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| UserController.getCurrentUser | GET /api/me renvoie UserResponse du caller construit par UserResponse.fromDomain, et 401 si le caller est vide. | L81-88 | [#39abf49228940ff7-1] |
| UserController.updateCurrentUser | PATCH /api/me valide UserUpdateRequest avec @Valid, met à jour name, username et email du caller via userService.updateUser et renvoie UserResponse. | L109-144 | [#44a6633627a639b2-1] |
| UserController.updatePreferences | PUT /api/me/preferences pose la préférence de thème du caller via userService.updateThemePreference et renvoie UserResponse, 401 si le caller est vide. | L160-170 | [#6246da44d5470c02-1] |
| UserController.changePassword | POST /api/me/change-password délègue à userService.changePassword avec le caller, l'ancien et le nouveau mot de passe, puis répond 204. | L178-188 | [#6336f7992455e033-1] |
| UserController.deleteCurrentUser | DELETE /api/me valide DeleteAccountRequest avec @Valid, appelle userService.deleteAccount puis efface le cookie jwt et répond 204. | L203-220 | [#0da8dd6f6a0ebd79-1] |
| UserController.uploadAvatar | POST /api/me/avatar accepte un multipart dont la part file est transmise à avatarService.uploadAvatar, puis relit le caller et renvoie UserResponse. | L233-256 | [#a90f85d9f81b63b2-1] |
| UserController.getAvatar | GET /api/me/avatar renvoie les octets de l'avatar du caller avec le Content-Type issu de avatarService.getAvatar. | L264-275 | [#621744931ed57366-1] |
| UserController.deleteAvatar | DELETE /api/me/avatar appelle avatarService.deleteAvatar sur le caller et répond 204. | L282-290 | [#2c3d083359b4c1ec-1] |
#### mytimeline:frontend/src/components/products/ProductsListView.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductsListView.goToDetail | Un clic sur une ligne navigue vers la fiche produit de la locale courante par router.push. | L367 | [#2c540fa4ff145e61-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductController.createProduct | POST /api/users/{userId}/products reçoit un ProductCreationRequest validé par @Valid, appelle productService.createProduct et renvoie 201 avec ProductResponse. | L50-66 | [#fab511f8078ce706-1] |
| ProductController.getProducts | GET /api/users/{userId}/products renvoie la liste des ProductResponse issue de productService.getProductsWithEvents pour le caller. | L68-85 | [#3ce901cb2b85d119-1] |
| ProductController.getArchivedProducts | GET /api/users/{userId}/products/archived renvoie la liste des ArchivedProductResponse du caller, avec les mêmes contrôles 401 et 403 que les autres routes. | L92-106 | [#f778175892d0fa70-1] |
| ProductController.restoreProduct | POST /api/users/{userId}/products/{productId}/restore appelle productService.restoreProduct(productId, userId) puis répond 204 sans lecture préalable du produit. | L118-132 | [#23aead80049aa52e-1] |
| ProductController.getProductById | GET /api/users/{userId}/products/{productId} renvoie 404 si le produit est absent et 403 s'il n'appartient pas au userId du path, sinon 200 avec ProductResponse. | L134-154 | [#3ed6a3b197a70d6e-1] |
| ProductController.updateProduct | PATCH /api/users/{userId}/products/{productId} valide le corps ProductUpdateRequest avec @Valid, délègue la mise à jour à productService.updateProduct et renvoie 200 avec ProductResponse. | L156-181 | [#586f24cc5cefccfd-1] |
| ProductController.deleteProduct | DELETE /api/users/{userId}/products/{productId} appelle productService.archiveById et répond 204. | L183-206 | [#9ee1b92aced8cd1b-1] |
| ProductController.getEventsByProductId | GET /api/users/{userId}/products/{productId}/events renvoie la liste des EventResponse du produit après contrôle d'existence et d'appartenance. | L208-236 | [#36151ba5fa137869-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| CategoryController.createCategory | POST /api/categories crée une catégorie rattachée à l'appelant identifié par JWT et répond 201, ou 401 sans appelant. | L47-57 | [#f485695163211d8d-1] |
| CategoryController.getAllCategories | GET /api/categories liste les catégories de l'appelant avec leurs compteurs de produits, obtenus en une requête groupée. | L59-80 | [#770aaa4a74ea7da7-1] |
| CategoryController.updateCategory | PATCH /api/categories/{id} renvoie 404 si la catégorie est absente, puis met à jour nom, couleur et description pour le propriétaire. | L98-118 | [#b0c63e5ab9d313aa-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventController.createEvent | POST /api/events reçoit un EventCreationRequest validé par @Valid et renvoie un EventResponse avec le statut 201. | L46-47 | [#25dce09a9944db71-1] |
| EventController.updateEvent | PATCH /api/events/{id} accepte un EventUpdateRequest partiel validé par @Valid et renvoie un EventResponse. | L71-72 | [#20c89602e30a4bd4-1] |
| EventController.deleteEvent | DELETE /api/events/{id} vérifie l'ownership, supprime l'événement via eventService.deleteById et renvoie 200 sans corps. | L97-105 | [#5e212c16f85d65a1-1] |
#### mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventControllerOwnershipTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventControllerOwnershipTest.deleteEvent_crossUser_returns403ForbiddenJson_andDoesNotDelete | La route DELETE /api/events/{id} est appelée avec un cookie jwt, et la réponse attendue est 403 de type JSON avec error forbidden. | L120-123 | [#8a2205415eeb9644-1] |
| EventControllerOwnershipTest.createEvent_owner_returns201_withEventResponseBody | Un POST /api/events par le propriétaire du produit renvoie 201 avec un corps contenant id, title, type, isAllDay, color, archived et productId. | L178-212 | [#7a448ff848abf02b-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SecurityConfig.securityFilterChain | Les chemins /error et JwksController.JWKS_PATH sont accessibles sans authentification, la javadoc de la section JWKS indiquant que la clé publique n'est pas un secret. | L164-170 | [#authorization/8bc3a1ce71fe4ba9-2] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SessionController.getActiveSessions | GET /api/sessions renvoie la liste des SessionResponse actives du caller, avec le jti courant résolu depuis le cookie jwt ou l'en-tête Bearer. | L49-63 | [#d277e59bd6e4a2bb-1] |
| SessionController.revokeOtherSessions | DELETE /api/sessions/others appelle sessionService.revokeOtherSessions avec l'id du caller et le jti courant, puis répond 204. | L65-81 | [#410b76a3663a6bdb-1] |
| SessionController.revokeSession | DELETE /api/sessions/{id} appelle sessionService.revokeSession avec l'id de la session et l'id du caller, puis répond 204. | L83-93 | [#37b24b68237ae598-1] |
#### mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewControllerTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| POST /api/events/recurrence-preview | Le test appelle POST /api/events/recurrence-preview avec un corps JSON, en content type application/json. | L71-73 | [#d8d929e3a50a23ed-1] |
#### mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksEndpointIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwksEndpointIntegrationTest.jwks_isReachableAnonymously_andExposesOneRs256SigningKey | Le test asserte qu'un GET anonyme sur le chemin JWKS répond 200 en JSON, avec une seule clé RSA de signature RS256. | L68-70 | [#integrations/b1cbd278e4a1e919-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| RecurrencePreviewController.previewRecurrence | POST /api/events/recurrence-preview reçoit un RecurrencePreviewRequest validé par @Valid, appelle recurrenceExpansionService.expand et renvoie 200 avec RecurrencePreviewResponse. | L56-76 | [#f75694096a2946cf-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/JwksController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwksController.jwks | GET /.well-known/jwks.json renvoie le JWK Set JSON du service JwtService avec un en-tête Cache-Control public, max-age de 300 secondes. | L61-66 | [#a7f30b129e6af9f9-1] |

## 5. Endpoints et écrans {#surface}

### Refus et accès
- Les routes produit portent le userId dans le chemin et renvoient 403 si le produit n'appartient pas à ce userId, 404 s'il est absent [#3ed6a3b197a70d6e-1][#8aad666de4a63c22-1].
- Une catégorie d'autrui ou inexistante donne 404 en lecture, mais le PATCH renvoie 403 pour une catégorie système ou d'autrui [#dc3c3b0c63eeafe8-1][#841220fccd00d9ee-1].
- Révoquer la session d'un autre utilisateur lève SessionNotFoundException, sans révéler son existence [#d1735de25cd0161d-1][#de509e2411ca1e4d-1].
- /me renvoie 401 si le jti de la session est révoqué ou inconnu, et le refresh exige un token valide et une session active [#11cece36cefdf4b1-1][#08a39f689d7f03a2-1].
- Le JWKS est public, avec un cache de 300 secondes [#a7f30b129e6af9f9-1][authorization/8bc3a1ce71fe4ba9-2].
### Export et produits
- downloadAsyncExport retire le préfixe /api de l'URL du job, alors que les autres services appellent apiClient par chemin relatif sans préfixe [#frontend-socle/c8e7542069dbe36c-1][#136df6d9fe823927-1].
- deleteProduct envoie un DELETE mais archive le produit (soft delete). La restauration passe par POST sur /restore et les archivés par GET sur /products/archived [#fecb9d17e61afceb-1][#ad598a2371cf6d94-1][#1c6a2baf2a5fb067-1].
- Un événement archivé se désarchive avec sa version, ajoutée au corps seulement si c'est un nombre [#623da4d8d722ca9c-1][#9d00cfec1fb46818-1].
### Écrans
- Dans le drawer produit, la date du premier événement n'existe qu'en création et le bouton Archiver qu'en édition [#3736e3a2725416ec-1][#c46479f96c8316f7-1].
- La fiche produit lit le cache de useProductsWithEvents sans requête dédiée et affiche une alerte notFound si l'id y manque [#f1600dfbba1bba53-1][#e5ef256423509da4-3].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 388), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:frontend/src/components/EventEditForm.test.tsx` | 50 | business_rule 19, test_case 18, convention 3 |
| `mytimeline:frontend/src/components/timeline/TimelineView.tsx` | 39 | business_rule 16, other 8, convention 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 34 | convention 7, endpoint 7, business_rule 5 |
| `mytimeline:frontend/src/components/products/ProductDrawer.tsx` | 34 | business_rule 14, ui_screen 6, other 5 |
| `mytimeline:frontend/src/components/EventEditForm.tsx` | 28 | business_rule 8, convention 4, config 3 |
| `mytimeline:frontend/src/components/categories/CategoryDrawer.tsx` | 26 | business_rule 11, ui_screen 5, role_check 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java` | 26 | endpoint 8, business_rule 6, validation 4 |
| `mytimeline:frontend/src/components/timeline/TimelineView.test.tsx` | 66 | test_case 51, business_rule 7, other 5 |
| `mytimeline:frontend/src/lib/auth-token-verify.ts` | 24 | business_rule 14, other 4, convention 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java` | 24 | validation 13, other 4, business_rule 3 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductControllerOwnershipTest.java` | 24 | business_rule 6, role_check 6, test_case 6 |
| `mytimeline:frontend/src/components/products/ProductDetailView.tsx` | 29 | ui_screen 12, business_rule 6, i18n_key 3 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| integrations | 216 | 113 |  |
| authorization | 115 | 41 |  |
| backend-socle | 116 | 39 |  |
| batch | 23 | 20 |  |
| state-machine | 21 | 9 |  |
| migrations | 13 | 15 |  |
| frontend-socle | 13 | 2 |  |

## 8. Tests attendus {#tests}

- Les tests fixent qu'une session révoquée reçoit 401 et qu'une session d'un autre utilisateur donne 404 [#e6d1632a53f68b9b-1] [#2e3501dea5107043-1] [#integrations/9eb6cde81f1c0949-1].
- Les tests fixent que register, reset et change rejettent les mêmes mots de passe hors politique [#f773aa0d731af8bc-1] [#4d0aa47965aec484-1] [#29edea2b4b988201-1] [#a63d1c82957aa567-1].
- Une nouvelle route doit être déclarée dans PROTECTED_APP_SEGMENTS, car les tests la comparent aux dossiers sous (app) [#8649558ca2452cb8-2] [#df054f9afe4233dc-1].
- Un nouveau test de frise doit stubber requestFullscreen et exitFullscreen [#082a96a4ff8c99e7-1] [#0fc55cdd9363d09d-2].

## 9. Questions ouvertes {#questions}

- Le 404 pour un produit existant sans événement est-il voulu ? Le code le traite comme un produit inconnu [#e7bf3b5c8af92396-1].
- Le commentaire de createProduct dit productId null et sans effet, mais le code passe product.getId() à Event [#7e3bc5890148b684-1].
- L'écart de calcul des récurrences entre frontend et backend (dérive au 28 après février côté backend) est-il voulu ? [#4379776f0ee85c7b-1] [#fc88597e84160f54-1].

## 10. Alertes {#alerts}

- AsyncExportRunner ne capture que RuntimeException et ExportJob ne contrôle pas son statut avant ses transitions. Une Error laisse le job RUNNING, gérez FAILED vous-même [#batch/e9b8732b8a56d766-1] [#state-machine/8096253e175ca857-1].
- PasswordResetToken.consume ne vérifie pas isUsable (garde dans resetPassword) et le catch du conflit optimiste suppose un saveAndFlush dans markConsumed ⇒ Garder la garde et le flush [#state-machine/c37611432b5807a9-1] [#5754f049d8a57cbb-1] [#e703cb1fc1f6d1d6-1] [#5754f049d8a57cbb-2]
- Pour un type duration, changer le facteur de date recalcule endDate et écrase celle du payload ⇒ Ne pas compter sur une endDate explicite dans un PATCH [#aacec85a42631428-2]
- UserMapper.toDomain et changePassword construisent un User sans themePreference, que UserResponse.fromDomain lit ⇒ Écrire la préférence par updateThemePreference [#backend-socle/d86713c491180960-1] [#dbcd8a010490bc1d-1] [#17f190f13ed535c6-1]
- previewRecurrence traduit toute IllegalArgumentException de expand en RecurrenceEndDateBeforeStartException. Distinguer les causes avant d'en ajouter [#94d0aece4bf5a1de-1].
- Dans TimelineBottomSheet, onClose est appelé dans l'updater de setDragY et pointercancel réutilise le relâchement : un geste annulé au-delà de 80 px ferme le sheet [#1145fb020b8bd40e-1] [#1145fb020b8bd40e-2].
- isEdit dans EventEditForm ne dépend que de onDelete ⇒ ne pas le passer en création [#871ea3a89de2f9c5-1]
- Plusieurs tests de rejet n'assertent que la classe Exception, donc toute erreur SQL passe ⇒ Préciser le type avant de s'y fier [#87f01d1728f1c9ca-1] [#9ec9f44160c5574d-1] [#27ffb31a2a203822-1]
- Le port ProductService importe des DTO applicatifs et ProductRepository porte l'annotation Spring, contre la règle hexagonale ⇒ Ne pas reproduire [#c9e29f7126480ec4-1] [#d2afa60d54aa4907-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 388 ; cités par au moins un fait : 388 ; non cités définitifs : 0.
- Faits en base : 3 432 ; dans le pool après déduplication : 3 811 (dont 517 repris d'autres packs) ; cités dans ce pack : 350 ; en annexe : 2 142 ; ni cités ni en annexe : 1 065 ; écartés (sorte `other`) : 493.
- Fichiers dont au moins un fait est cité ici : 127 sur 388.
- Base : sha256 b34b44aece11…, générée le 2026-11-17.
