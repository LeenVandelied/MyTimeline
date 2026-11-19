---
pack: timeline
kind: domain
name: Chronologie, comptes et exports
generated_at: 2026-11-18T16:25:37Z
generator: synth/1
base_sha256: d03884d4f76b40a7e8e14bd9288f41d1a7a0e2decb4ba91ac960d09fec65757b
facts_in_base: 3489
facts_in_pool: 3835
facts_cited: 251
sections: timeline.sections.json
details: [timeline.details.md, timeline.details-2.md, timeline.details-3.md, timeline.details-4.md, timeline.details-5.md]
lang: fr
curated_at: 2026-11-18T16:25:37Z
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
| jti | Identifiant unique du jeton JWT, clé d'une session révocable. | [#418d4adc7fee0dac-1] [#93dc60b640f0fdc8-1] |
| Archivé | Drapeau non nul, faux par défaut, sur les événements et les produits. | [#98649e0e86a3b1c6-1] [#72fa54403d11c95f-1] |
| Désarchivage | Restauration d'un produit archivé, avec dialogue et toast de succès dédiés. | [#8dccc4820b488289-1] [#157c943f6ce33a30-1] |
| version | Champ de verrou optimiste, non nul, sur catégorie, utilisateur et token de réinitialisation. | [#1ee271544739b97e-1] [#e27a6a1000df3dab-1] [#f79315c1c6117474-1] |
| Conflit | Dialogue qui propose de recharger, garder sa version ou prendre celle du serveur. | [#2f0bb1925d1e0492-1] |
| Export utilisateur | Record du profil, des catégories, des produits et de la date de génération. | [#f91b00ba5d4ed35f-2] |
| Touche F | Raccourci associé à help.fit, qui recadre la vue et ne passe pas en plein écran. | [#7e9ec971e6653cd6-1] |
| Niveau de zoom | Libellé lu sous dashboard.timeline.zoom suivi du niveau courant. | [#a14c0b842e0c6136-1] [#602ce428d238c18c-1] |
| En-tête de groupe | Nom accessible d'une catégorie repliable, avec la catégorie et son nombre de produits. | [#0f7a9bbcfdc2c652-1] [#14bc87b8d153285c-2] |
| Drawer | Panneau de détail d'un événement, dont les libellés sont partagés entre bottom sheet, paysage et desktop. | [#de2d0cf1f72e0ef3-1] [#25a9ff75a339ec18-2] |

## 3. Règles {#rules}

### Invariants
- Un secret d'export Base64 de moins de 32 octets ou une clé JWT non décodable fait échouer le démarrage, une clé JWT vide génère une paire éphémère. [#0dd681c74a1aa052-1] [#3e283637c7d910ad-1] [#ea75b1cbb9a129b7-1]
### Événements et récurrence
- Une série sans fin est bornée à 5 ans, toute génération s'arrête à 4000 occurrences et capped passe à true si la borne est tronquée. [#41062bd03b16beee-1] [#41062bd03b16beee-2] [#5ef94ec404d76429-1] [#61a1588b02a3d2db-1] [#e3b3229ba3d5f32d-1] [#17dc4dce7f212d84-1]
- Un événement récurrent sans recurrenceUnit après fusion lève RecurrenceUnitRequiredException (400), une unité déjà en base suffit. [#aacec85a42631428-1] [#0b3cf5d7d914c2f1-1] [#a7e9024c920debf4-7] [#f3828eaddaed4001-1]
- recurrenceEndDate antérieure au début lève RecurrenceEndDateBeforeStartException (422), l'égalité passe. [#b6235b8320b518a9-1] [#d01e46587544f0ca-1] [#0ece7cd5a68913f4-2] [#a607aeea0e1b1902-3]
- endDate fusionnée antérieure au début lève EndDateBeforeStartException (422), l'égalité passe. [#b6235b8320b518a9-2] [#db68aae9040aa635-1] [#a607aeea0e1b1902-1] [#4c017405e960c003-1]
- Un événement duration voit sa endDate recalculée depuis la durée, ce qui écrase une endDate explicite. [#aacec85a42631428-2] [#bb35c8c70ef8823a-1] [#a7e9024c920debf4-3] [#54c3c82083d7ffe6-1]
- Un événement single garde une endDate explicite, sinon elle suit la startDate, et un PATCH de couleur seule ne la touche pas. [#aacec85a42631428-3] [#195f4bf96e561e6d-1] [#ce573472cbd9b4ce-1] [#35513b08008b2dce-1]
- À la création, startDate vaut aujourd'hui si absente et archived vaut false. [#cfa788ce2a539c7c-1] [#a48c06237f45d2de-1] [#7c67ebb440f30dce-1]
- Un PATCH dont la version diffère du serveur est refusé en 409 avec l'événement serveur, une version nulle désactive le contrôle, et la suppression ne contrôle pas la version. [#f69d0a1d79ba1dcc-1] [#4241dce0d6a889f3-1] [#f799ce846f488c08-1] [#3dcdc86e498ae065-1]
### Catégories et produits
- Le nom de catégorie est unique par utilisateur (409), un renommage vers le nom courant passe. [#d123364ba318b9da-1] [#d123364ba318b9da-2] [#19c33a17e3cf9919-1] [#9f799e2d9d2d861f-1] [#fba96d460f2450be-1]
- Quand des produits référencent la catégorie supprimée, la cible de réassignation doit exister et différer d'elle (409), contrôlée avant la réassignation ; sans produit référençant, la cible n'est pas contrôlée [#cbf5b74a7e242967-3] [#cbf5b74a7e242967-2] [#f0513e2d42b16d79-1] [#0be3eea186591f81-1]
- Un produit ne vise qu'une catégorie de l'appelant ou une catégorie système (ownerId nul). [#86db74ab152ae17f-1] [#f2de85ebfc81aa4b-3]
- Supprimer un produit l'archive, et restaurer un produit non archivé de l'utilisateur lève ProductNotFoundException. [#669f21c5b918f82d-1] [#546c68b6aa3b3d38-1] [#f738c3ddc6ee4f34-1] [#4491bcc4a7396b95-2]
- clearColor prime sur la couleur fournie et rétablit celle de la catégorie. [#a3eb16026b46748b-1] [#2ba88ad590a623f5-1]
### Comptes, mots de passe et sessions
- Un token de reset nul, non UUID, expiré, consommé ou orphelin donne la même InvalidPasswordResetTokenException (400), et un conflit de verrou à la consommation aussi. [#a6fac6d9ffbda813-1] [#5754f049d8a57cbb-1] [#ff29dec7a1ac5a76-1] [#e3a38c640b4e23ac-1] [#5754f049d8a57cbb-3]
- Un email inconnu au reset ne crée rien et ne signale rien (anti-énumération). [#a0a4c1649f1ff5c1-4] [#7eb1d255b2e8e536-1]
- Sans clé Brevo l'envoi est ignoré avec un avertissement, et une erreur Brevo n'est pas propagée. [#a2e5716b0136e600-1] [#a2e5716b0136e600-2]
- Un avatar vide, trop gros ou hors JPEG, PNG, WebP (magic bytes) est refusé, la taille d'abord. [#b07280d7f022e8c8-1] [#b07280d7f022e8c8-2] [#b07280d7f022e8c8-3] [#177ef047a8f1e617-1]
- Une session est active si non révoquée et non expirée, et un jti révoqué ou inconnu est refusé en 401. [#a9bd168d26f2c8f7-1] [#e98d53ccea1b37d6-2] [#11cece36cefdf4b1-1] [#371ba7258b8b964f-1]
- PUT /api/me/preferences est limité à 30 requêtes par minute et par utilisateur (429 avec Retry-After). [#9e28bcaa631902f1-1] [#11277b4419cd6d3a-4]
### Interface
- À la connexion, une préférence de thème du compte s'applique localement sans réécriture, sinon un choix local valide est envoyé par PUT, et un échec n'interrompt pas la connexion. [#92ea89296c8f1f33-1] [#578e3e00aa9045bb-1] [#427016883bfd7f92-1] [#fc95119617c03935-2]
- Un 409 fait passer submitState à conflict, keep-mine est limité à 3 re-soumissions consécutives et renvoie la version du serveur. [#adeed4e0056e686c-3] [#abcc706ce023caf5-1] [#e7828afd4550c2fa-1] [#d2651cfda6ee0b00-2]
- Un segment de chemin au percent-encoding malformé est protégé par défaut (fail-closed). [#900602e68ea9cda2-2] [#917b03990260e2f7-1]
- Archiver un événement demande confirmation, désarchiver est immédiat et envoie la version détenue. [#777b17f14ee5c8a0-1] [#b7c1a395c17883e4-1] [#1705d88184858dca-1]
- Créer un produit ou un événement invalide products.all, supprimer une catégorie invalide categories.all et products.all. [#96a94e972017e2ed-1] [#9141be543d56ebb5-2] [#e2fe7ab7808baf35-1]
### Vérifié dans le code
- revokeAllByUserIdExcept(userId, null) révoque toutes les sessions de l'utilisateur, y compris celle de l'appel ; SessionController résout le jti (cookie puis Bearer) pour l'éviter [#integrations/43a257f98e513c20-1] [#0ccfd21bcf72c4f1-1] [#0ccfd21bcf72c4f1-2] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java:111-119`.
- UserMapper.toDomain n'hydrate pas themePreference volontairement (ArchitectureTest) : elle est posée par UserRepositoryJpaImpl.toDomain via withThemePreference, et seul updateThemePreference l'écrit [#integrations/cce726721f5e944c-1] [#b6d61bb2ddbdb333-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/UserRepositoryJpaImpl.java:102-111`.
- CategoryServiceImpl.deleteCategory réassigne puis supprime dans une seule transaction @Transactional : un échec de categoryRepository.deleteById annule la réassignation [#cbf5b74a7e242967-1] [#b7d1911e28ca76b4-1] [#cbf5b74a7e242967-2] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/CategoryServiceImpl.java:115-148`.
- Le contrôle de PasswordResetToken.isUsable vit dans PasswordResetServiceImpl.resetPassword, pas dans consume, donc tout nouvel appelant de consume doit le refaire [#5754f049d8a57cbb-1] [#a901c5e0a601a742-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/PasswordResetServiceImpl.java:143`.
- Ne passer à GlobalExceptionHandler.buildBody (Map.of) que des messages non null : toute nouvelle exception dont ex.getMessage() est transmis doit fixer un message non null à la construction [#5a4d4415109852aa-1] [#b07280d7f022e8c8-1] [#2cf9b80cc241b9c3-1] [#b07280d7f022e8c8-2] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/CategoryReassignTargetInvalidException.java:11-12`.

## 4. Structure {#structure}

#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AuthController | Le contrôleur d'authentification est exposé sous le préfixe /api/auth. | L49-50 | [#1112a80d33a97a53-1] |
| AuthController.login | POST /api/auth/login authentifie via AuthenticationManager, enregistre la session, pose le cookie jwt et renvoie un message sans le token dans le corps. | L111-131 | [#a95aa345e1f0eeae-1] |
| AuthController.getUserDetails | GET /api/auth/me lit le cookie jwt, valide le token et renvoie le profil si le jti est actif, sinon 401 avec le code unauthorized. | L145-146 | [#590297f36ef2a89b-1] |
| AuthController.register | POST /api/auth/register crée un utilisateur après vérification d'unicité du username et renvoie 201 avec un message. | L209-210 | [#f81f483188ff32d4-1] |
| AuthController.logout | POST /api/auth/logout révoque le jti du cookie courant, puis renvoie un cookie jwt vide de maxAge 0. | L250-267 | [#2beec02afff39c89-1] |
| AuthController.logout | Le logout appelle revokeSessionSilently sur le jti du cookie, ce qui révoque la session en base, puis efface le cookie jwt avec maxAge à zéro. (partiel) | L256-260 | [#authorization/ed68a63fc2b66b67-1] |
| AuthController.refreshToken | POST /api/auth/refresh renouvelle le token après validation de signature, expiration et jti actif, puis fait pivoter la session. | L269-270 | [#08a39f689d7f03a2-1] |
| AuthController.refreshToken | Le refresh valide la signature et l'expiration du token avant toute réémission, et renvoie 401 si validateToken renvoie false. (partiel) | L300-303 | [#authorization/71768ef1221dd0c4-1] |
| AuthController.refreshToken | Le refresh génère un nouveau token, révoque l'ancien jti via revokeSessionSilently puis enregistre le nouveau jti via registerSession. (partiel) | L319-326 | [#authorization/10efe7ec9942ce01-1] |
| AuthController.forgotPassword | POST /api/auth/forgot-password délègue la demande de réinitialisation puis renvoie toujours 200 avec le même message neutre. | L354-360 | [#84a2033cf7918249-1] |
| AuthController.resetPassword | POST /api/auth/reset-password délègue la réinitialisation au service puis renvoie 200 avec un message de succès. | L368-372 | [#aab1134b89038e1e-1] |
#### mytimeline:frontend/src/components/timeline/TimelineView.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineView.toggleCategory | Chaque appel de toggleCategory bascule l'état replié de la catégorie donnée. (partiel) | L716-718 | [#b3e983f718d425b1-1] |
| TimelineView.focusNav | La navigation clavier mémorise la pastille active par resourceId et eventId via setActiveNav. (partiel) | L1049 | [#75ba464eb4907242-1] |
| TimelineView.onKey | La touche Échap ferme en priorité le panneau de sidebar ouvert, puis le drawer sélectionné, puis quitte le plein écran. (partiel) | L1599-1605 | [#95804e978f39c002-3] |
#### mytimeline:frontend/src/components/EventEditForm.test.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventEditForm | Le passage de conflict à submitting ferme le dialogue de conflit et replie le focus sur le formulaire event-form, jamais sur body. | L264-274 | [#b8527ad2d2e16965-1] |
| EventEditForm.archived | Cocher le toggle archived n'archive pas directement : une confirmation s'ouvre et la case reste décochée tant que rien n'est confirmé. (partiel) | L413-420 | [#b2d162176e935275-2] |
| EventEditForm.archived | Désarchiver un événement archivé ne demande aucune confirmation et sort immédiatement du verrou. (partiel) | L449-456 | [#dd5f5f0be4add9fb-1] |
#### mytimeline:frontend/src/components/EventEditForm.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventEditForm | Cocher le toggle d'archivage n'modifie pas la valeur, il ouvre le ArchiveConfirmDialog. Décocher le toggle passe archived à false immédiatement. (partiel) | L956-959 | [#777b17f14ee5c8a0-1] |
| EventEditForm | L'archivage passe de archived false à archived true via onConfirm du ArchiveConfirmDialog, sans soumission immédiate, avec shouldDirty activé. | L1017-1020 | [#2af828f18863dd55-1] |
| EventEditForm | Le ConflictDialog est ouvert lorsque submitState vaut conflict. (partiel) | L1040 | [#5fac1a9bd07ae3d6-1] |
#### mytimeline:frontend/src/components/timeline/TimelineMobileLandscape.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineMobileLandscape.userHidden | Le clic sur le bouton de bascule inverse userHidden via setUserHidden, sauf quand minimapForcedHidden est vrai et que le bouton est désactivé. (partiel) | L148-158 | [#f131221c2e86dbed-3] |
#### mytimeline:frontend/src/components/products/ProductsListView.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductsListView.handleArchiveConfirm | La confirmation d'archivage appelle la mutation, affiche le toast de succès puis referme le dialogue d'archivage en vidant le produit ciblé. (partiel) | L214-219 | [#3a95d25f1a1bcb63-1] |
#### mytimeline:frontend/src/components/products/ProductDetailView.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductDetailView.handleUnarchive | Le désarchivage d'un événement appelle setEventArchived avec archived à false et la version détenue, ce qui le fait passer de archivé à actif. (partiel) | L213-217 | [#623da4d8d722ca9c-1] |
#### mytimeline:frontend/src/hooks/useEventEditConflict.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useEventEditConflict.runSubmit | submitState passe à submitting au début de runSubmit, avant l'appel updateEvent. (partiel) | L149 | [#adeed4e0056e686c-1] |
| useEventEditConflict.runSubmit | submitState passe de submitting à idle quand updateEvent réussit, puis onDone reçoit les valeurs enregistrées. (partiel) | L154 | [#adeed4e0056e686c-2] |
| useEventEditConflict.runSubmit | submitState passe de submitting à conflict quand updateEvent échoue avec un statut HTTP 409. (partiel) | L164 | [#adeed4e0056e686c-3] |
| useEventEditConflict.runSubmit | submitState passe de submitting à forbidden pour un 403, et à error pour tout autre statut hors 409. (partiel) | L172 | [#adeed4e0056e686c-5] |
| useEventEditConflict.onKeepMine | onKeepMine relance runSubmit en mode keep-mine avec les valeurs locales et la version serveur, passant de conflict à submitting. (partiel) | L204 | [#d2651cfda6ee0b00-1] |
#### mytimeline:frontend/src/contexts/AuthContext.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AuthProvider.login | login passe loading à true, appelle loginService puis loadUser avec applyAccountThemeAtLogin, puis adoptLocalThemeAtLogin si le compte est non null, et relance toute erreur après journalisation. (partiel) | L212-232 | [#6cdde4fa63d83939-1] |
| AuthProvider.logout | logout appelle logoutService, puis publie user à null dans le finally, même si l'appel échoue, sans toucher au thème local. (partiel) | L251-262 | [#ea9033dcdc97b664-1] |
#### mytimeline:frontend/src/components/products/ProductSparkline.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductSparkline.now | La valeur de référence now est capturée une seule fois au montage du composant et ne change plus ensuite. (partiel) | L60 | [#9c644bfe891abd5e-1] |
#### mytimeline:frontend/src/components/timeline/TimelineSidebar.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useTimelineSidebarPanel | Le panneau passe de ouvert à fermé quand le palier 1024 px est franchi vers le haut, si isPermanent devient vrai, sans action utilisateur. (partiel) | L95-98 | [#549b4223f54beab3-1] |
| useTimelineSidebarPanel.toggle | La fonction toggle inverse l'état open du panneau. (partiel) | L100 | [#5e1a2695d68c5d78-1] |
| useTimelineSidebarPanel | Un pointerdown hors du panneau et hors du bouton ferme le panneau, et le focus revient au bouton seulement si le focus a été perdu. (partiel) | L116-130 | [#a0548f48b34db289-1] |
#### mytimeline:frontend/src/components/events/NewEventDrawer.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| NewEventDrawer.submitState | Le submitState passe à submitting quand la mutation est en cours, à error quand elle est en erreur, et reste idle sinon. | L136-140 | [#01254420649f333c-1] |
#### mytimeline:frontend/src/components/timeline/TimelineEditHost.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineEditHost.closeEditor | closeEditor remet editing à null, ce qui ferme le drawer d'édition. (partiel) | L67 | [#c710d917f4138318-1] |
| TimelineEditHost.requestDelete | requestDelete arme deleteTarget avec l'événement ciblé sans appeler deleteEvent, ce qui ouvre DeleteConfirmDialog. (partiel) | L152 | [#ec6df84414022355-1] |
| TimelineEditHost.handleDeleteOpenChange | Quand le dialog de suppression se ferme, deleteTarget est remis à null. (partiel) | L204-206 | [#723d8cceb4d00bf7-1] |
#### mytimeline:frontend/src/hooks/useExportFlow.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useExportFlow.inlineMutation | Après un export sync réussi, le fichier est téléchargé dans le navigateur et la phase passe à ready. (partiel) | L68-71 | [#4025e56523b42a45-1] |
| useExportFlow | Pendant la phase preparing, un job COMPLETED fait passer la phase à ready et enregistre le job terminé. (partiel) | L109-111 | [#885c1f26f101ef0f-1] |
| useExportFlow | Pendant la phase preparing, un job FAILED fait passer la phase à error avec la clé jobFailed. (partiel) | L112-114 | [#885c1f26f101ef0f-2] |
| useExportFlow | Pendant la phase preparing, une erreur de polling fait passer la phase à error avec la clé network. (partiel) | L115-119 | [#3ac447f58eb4efa6-1] |
| useExportFlow.downloadMutation | Un échec du téléchargement du fichier async fait passer la phase à error avec la clé network. (partiel) | L123-131 | [#ef050ccbf09a1f86-2] |
| useExportFlow.start | start lance l'export synchrone (inlineMutation) si le format est sync, sinon l'export asynchrone (submitMutation). (partiel) | L138-142 | [#4bbcb9082b51e911-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/JwtFilter.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| JwtFilter.doFilterInternal | Le contexte de sécurité passe d'un état sans authentification à un UsernamePasswordAuthenticationToken lorsque la signature, l'expiration et le jti valides sont confirmés. (partiel) | L73-85 | [#authorization/197122bdd1e5948a-1] |
#### mytimeline:frontend/src/lib/schemas/export.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| exportJobStatusSchema | Le cycle de vie d'un job d'export est PENDING, puis RUNNING, puis COMPLETED ou FAILED, et isTerminalStatus considère COMPLETED et FAILED comme terminaux. | L29-35 | [#27212c52d14b6e76-1] |
#### mytimeline:frontend/src/components/products/CategoriesView.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| CategoriesView.handleDeleteConfirm | Après une suppression réussie, la catégorie ciblée est remise à null et le dialog de suppression se ferme, la mutation étant appelée avec l'identifiant et la cible de réassignation. (partiel) | L106-112 | [#99fa514fcf0f6ee9-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/AsyncExportRunner.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AsyncExportRunner.run | Le job passe à l'état en cours par markRunning puis est sauvegardé, avant la génération du fichier. (partiel) | L62-68 | [#c3a528471fd7ac8b-1] |
| AsyncExportRunner.run | Après génération et stockage sans exception, le job passe à COMPLETED avec la référence de stockage et une expiration. (partiel) | L77 | [#batch/12b6799eaf5bd99b-2] |
| AsyncExportRunner.run | Toute RuntimeException pendant la génération fait passer le job à FAILED avec le code fixe GENERATION_ERROR, sans journaliser le message ni la stack. (partiel) | L80-85 | [#batch/12b6799eaf5bd99b-3] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/SessionRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SessionRepositoryJpaImpl.revokeByJti | revokeByJti pose revokedAt à l'instant courant uniquement sur la session ciblée par jti qui n'est pas encore révoquée. | L88-97 | [#integrations/20d82e6d0c58db82-2] |
| SessionRepositoryJpaImpl.revokeById | revokeById pose revokedAt à l'instant courant uniquement sur la session ciblée par id qui n'est pas encore révoquée. | L100-108 | [#integrations/495912b73d8f6736-1] |
| SessionRepositoryJpaImpl.revokeAllByUserIdExcept | revokeAllByUserIdExcept révoque les sessions actives de l'utilisateur, en épargnant celle dont le jti vaut exceptJti, et toutes ses sessions actives si exceptJti est null. | L111-130 | [#integrations/43a257f98e513c20-1] |
#### mytimeline:frontend/src/hooks/useArchiveProduct.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useArchiveProduct.onSuccess | Au succès de la suppression, le produit est retiré du cache withEvents de l'utilisateur, puis products.all et categories.all sont invalidés. (partiel) | L67-75 | [#d335e6c90a373b1c-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/ExportServiceImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportServiceImpl.submitAsync | Un job créé par submitAsync entre dans l'état PENDING par ExportJob.pending, puis le worker asynchrone est déclenché sur son identifiant. (partiel) | L84-85 | [#batch/27110603918edb71-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/ProductRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductRepositoryJpaImpl.restoreArchivedByIdAndUserId | restoreArchivedByIdAndUserId désarchive un produit par UPDATE natif, incrémente version et pose updated_at, seulement si id et user_id correspondent et que archived vaut true. | L250-258 | [#546c68b6aa3b3d38-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/PasswordResetTokenRepositoryJpaImpl.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| PasswordResetTokenRepositoryJpaImpl.markConsumed | Le token passe à l'état consommé en posant usedAt par markConsumed, avec un UPDATE gardé par la version lue lors du contrôle. (partiel) | L61-66 | [#7d2ff9885a18cd26-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/PasswordResetToken.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| PasswordResetToken.consume | La méthode PasswordResetToken.consume renvoie une nouvelle instance dont usedAt est renseigné, l'instance courante restant inchangée, et ne vérifie pas isUsable. (partiel) | L72-74 | [#state-machine/40e5b14c857cea95-1] |
#### mytimeline:frontend/src/components/timeline/TimelineMobileLandscape.test.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineResponsive | Selon le test, la rotation de portrait vers paysage passe de la variante portrait à la variante paysage sans remontage, en conservant le zoom et l'événement sélectionné, pour l'utilisateur qui tourne l'appareil. (partiel) | L395-403 | [#d783ec5ae3b5b006-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/export/ExportJob.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportJob.pending | La fabrique ExportJob.pending crée un job dont l'état initial est PENDING, sans storageRef, errorCode, completedAt ni expiresAt. (partiel) | L43-46 | [#state-machine/7766b9e71e04f41e-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SecurityConfig.securityFilterChain | La route /actuator/health est accessible sans authentification (permitAll). | L161 | [#authorization/8bc3a1ce71fe4ba9-1] |
| SecurityConfig.securityFilterChain | La route /error est accessible sans authentification (permitAll). | L166 | [#authorization/8bc3a1ce71fe4ba9-2] |
| SecurityConfig.securityFilterChain | Toutes les routes /api/auth/** sont publiques (permitAll). | L173 | [#authorization/8bc3a1ce71fe4ba9-3] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| GlobalExceptionHandler.handleNotFound | Traduit EventNotFound, ProductNotFound, CategoryNotFound, UserNotFound, SessionNotFound et AvatarNotFound en 404 avec le code NOT_FOUND et le message générique Resource not found. | L41-53 | [#161ab1263e9740cc-1] |
#### mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductRestoreIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductRestoreIntegrationTest.getArchived_returnsOnlyCallersArchivedProducts_includingWithoutEvents | Le test appelle GET /api/users/{userId}/products/archived avec le caller authentifié. | L140 | [#2d9a3ff216421e91-1] |
| ProductRestoreIntegrationTest.restore_ownArchivedProduct_returns204_andProductWithEventsIsVisibleAgain | Le test appelle POST /api/users/{userId}/products/{productId}/restore avec le caller authentifié et attend 204. | L184-186 | [#acfee7b18b09e0f8-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/UserController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| UserController.getCurrentUser | GET /api/me renvoie le profil du caller via UserResponse.fromDomain, sans hash, ou 401 si aucun caller. | L81-88 | [#39abf49228940ff7-1] |
| UserController.updateCurrentUser | PATCH /api/me met à jour name, username et email du caller, validés par @Valid UserUpdateRequest, et renvoie UserResponse. | L109-144 | [#44a6633627a639b2-1] |
| UserController.updatePreferences | PUT /api/me/preferences pose la préférence de thème du caller via userService.updateThemePreference et renvoie UserResponse. | L160-170 | [#6246da44d5470c02-1] |
| UserController.changePassword | POST /api/me/change-password délègue à userService.changePassword avec l'ancien et le nouveau mot de passe, puis renvoie 204. | L178-188 | [#6336f7992455e033-1] |
| UserController.deleteCurrentUser | DELETE /api/me supprime le compte du caller via userService.deleteAccount, efface le cookie jwt et renvoie 204. | L203-220 | [#0da8dd6f6a0ebd79-1] |
| UserController.uploadAvatar | POST /api/me/avatar accepte un fichier multipart nommé file, délègue à avatarService.uploadAvatar et renvoie le UserResponse relu. | L233-256 | [#a90f85d9f81b63b2-1] |
| UserController.getAvatar | GET /api/me/avatar renvoie les octets de l'avatar du caller avec le Content-Type stocké. | L264-275 | [#621744931ed57366-1] |
| UserController.deleteAvatar | DELETE /api/me/avatar supprime l'avatar du caller via avatarService.deleteAvatar et renvoie 204. | L282-290 | [#2c3d083359b4c1ec-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/CategoryController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| CategoryController.createCategory | POST /api/categories crée une catégorie appartenant à l'appelant et renvoie 201 avec le DTO de réponse, ou 401 sans appelant identifié. | L35-48 | [#f485695163211d8d-1] |
| CategoryController.getAllCategories | GET /api/categories renvoie les catégories de l'appelant et les catégories système, avec leurs compteurs de produits de l'appelant. | L59-79 | [#770aaa4a74ea7da7-1] |
| CategoryController.getCategoryById | GET /api/categories/{id} renvoie la catégorie si elle appartient à l'appelant ou est système, sinon 404. | L82-96 | [#dc3c3b0c63eeafe8-1] |
| CategoryController.updateCategory | PATCH /api/categories/{id} met à jour nom, couleur et description après contrôle de propriété, avec 404 si absente et 403 si non possédée. | L98-119 | [#b0c63e5ab9d313aa-1] |
| CategoryController.deleteCategory | DELETE /api/categories/{id} vérifie la propriété de la cible et de la catégorie de réassignation éventuelle, puis délègue la suppression et renvoie 204. | L121-154 | [#fee4a3fe030b8963-1] |
#### mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/SessionRevocationIntegrationTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| SessionRevocationIntegrationTest.login | Le helper login appelle POST /api/auth/login avec un corps JSON et récupère le cookie jwt, qui doit être présent. | L130-142 | [#63ef6ad8a2f74a2d-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/email/BrevoEmailService.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| BrevoEmailService.sendPasswordResetEmail | sendPasswordResetEmail envoie l'email de réinitialisation via Brevo, ou ne fait rien si la clé API est absente ou vide. | L76-78 | [#ca78343fc343a97c-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ExportController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ExportController | Déclare le préfixe de routes /api/export pour le contrôleur d'export. | L46 | [#cb378d37bc460857-1] |
| ExportController.exportInline | Expose GET /api/export avec le paramètre format, renvoie le fichier inline en 200 et 401 sans appelant. | L65-74 | [#0aa6060fb83fdf19-1] |
| ExportController.submitAsync | Expose POST /api/export qui soumet un job d'export asynchrone pour l'appelant et renvoie 202 avec ExportJobResponse. | L77-88 | [#53de777e6e7fe836-1] |
| ExportController.jobStatus | Expose GET /api/export/job/{jobId} qui renvoie le statut du job scopé à l'appelant, avec 404 si le job est inconnu ou appartient à un autre utilisateur. | L91-102 | [#63c2ecc98ef26923-1] |
| ExportController.download | Expose GET /api/export/download/{jobId} qui exige un token signé valide, lié au jobId et à l'appelant, sinon répond 404. | L109-129 | [#49bb154a99436e4a-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ProductController.createProduct | POST /api/users/{userId}/products crée un produit pour le caller, renvoie 201, 401 si aucun caller et 403 si userId diffère du caller. | L50-66 | [#fab511f8078ce706-1] |
| ProductController.getProducts | GET /api/users/{userId}/products renvoie les produits du caller via getProductsWithEvents, mappés en ProductResponse. | L68-85 | [#3ce901cb2b85d119-1] |
| ProductController.getArchivedProducts | GET /api/users/{userId}/products/archived renvoie les produits archivés du caller en ArchivedProductResponse. | L92-106 | [#f778175892d0fa70-1] |
| ProductController.restoreProduct | POST restore contrôle le caller puis appelle productService.restoreProduct avec productId et userId, et renvoie 204. | L118-132 | [#23aead80049aa52e-1] |
| ProductController.getProductById | GET d'un produit renvoie 404 si le produit est absent, 403 s'il n'appartient pas au userId, sinon le produit. | L134-154 | [#3ed6a3b197a70d6e-1] |
| ProductController.updateProduct | PATCH d'un produit contrôle le caller, l'existence (404) et l'ownership (403), puis délègue la mise à jour à productService.updateProduct. | L156-181 | [#586f24cc5cefccfd-1] |
| ProductController.deleteProduct | DELETE d'un produit contrôle le caller, l'existence et l'ownership, puis archive le produit et renvoie 204. | L183-206 | [#9ee1b92aced8cd1b-1] |

## 5. Endpoints et écrans {#surface}

### Accès et propriété
- DELETE d'un produit l'archive au lieu de le supprimer, et la restauration passe par une mise à jour native filtrée sur archived = true [#9ee1b92aced8cd1b-1] [#0ba293f8c1399fed-1].
- GET /api/export/download/{jobId} exige un token signé dont jobId et ownerId correspondent à la route et à l'appelant, sinon 404 [#49bb154a99436e4a-1] [#7f33002b8ba30692-1]. Le statut d'un job d'un autre utilisateur donne aussi 404 [#63c2ecc98ef26923-1].
### Auth et support
- Une fois le contrôleur atteint, POST /api/auth/forgot-password renvoie un 200 au message neutre, que le compte existe ou non, mais la limitation de débit (5 par minute et par IP) et la validation du corps peuvent le refuser avant, et l'envoi Brevo est un no-op sans clé API [#84a2033cf7918249-1] [#ca78343fc343a97c-1].
### Écrans et services front
- La vue `mytimeline:frontend/src/components/products/ProductDetailView.tsx:99-108` lit le produit dans le cache useProductsWithEvents. Un produit absent affiche « introuvable ou archivé », sans distinguer inexistant et archivé [#e5ef256423509da4-1] [#e5ef256423509da4-3].
- Les statuts 403, 404 et 409 des catégories sont attendus et non journalisés `mytimeline:frontend/src/services/categoryService.ts:15` [#f05111165c180b0b-1].
- La suppression d'un événement n'invalide le cache products, ne ferme l'éditeur et ne vide la cible qu'en cas de succès [#0c7d658378b5b928-1].
- POST /api/events/recurrence-preview calcule count et capped sans rien persister, et le formulaire `mytimeline:frontend/src/components/EventEditForm.tsx:211-229` affiche un hint non bloquant au-delà du plafond [#f75694096a2946cf-1] [#2f6523b0e23d6041-1] [#2f6523b0e23d6041-3].
- Un lien d'export async expiré remplace le téléchargement par un message et une relance, et le téléchargement retire le préfixe /api de l'URL [#ce85c05afb36b414-3] [#136df6d9fe823927-1].
- Le thème n'est écrit sur le compte que si l'utilisateur est authentifié et que le compte ne porte pas déjà ce choix [#7f91461060c8adbb-1] [#5b0acaa2f1dbcb70-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 390), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/AuthController.java` | 40 | business_rule 8, endpoint 8, convention 6 |
| `mytimeline:frontend/src/components/timeline/TimelineView.tsx` | 39 | business_rule 18, convention 5, state_transition 3 |
| `mytimeline:frontend/src/components/products/ProductDrawer.tsx` | 36 | business_rule 11, ui_screen 7, validation 7 |
| `mytimeline:frontend/src/components/EventEditForm.test.tsx` | 66 | test_case 47, convention 5, validation 4 |
| `mytimeline:frontend/src/components/EventEditForm.tsx` | 29 | business_rule 11, ui_screen 5, convention 4 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java` | 30 | test_case 11, business_rule 10, validation 6 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/security/SecurityConfig.java` | 28 | convention 16, role_check 4, config 3 |
| `mytimeline:frontend/src/components/timeline/TimelineMobileLandscape.tsx` | 29 | business_rule 11, convention 6, i18n_key 5 |
| `mytimeline:frontend/src/components/products/ProductsListView.tsx` | 31 | business_rule 10, other 10, ui_screen 3 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java` | 23 | validation 14, other 4, convention 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/ProductControllerOwnershipTest.java` | 32 | test_case 16, business_rule 6, role_check 5 |
| `mytimeline:frontend/src/components/products/ProductDetailView.tsx` | 24 | ui_screen 9, business_rule 6, convention 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| integrations | 209 | 117 |  |
| authorization | 93 | 95 |  |
| backend-socle | 103 | 41 |  |
| batch | 23 | 20 |  |
| frontend-socle | 26 | 10 |  |
| state-machine | 21 | 13 |  |
| migrations | 15 | 14 |  |

## 8. Tests attendus {#tests}

- Un PATCH d'événement avec une version périmée lève EventConflictException sans save et rend un 409 au corps plat, une version nulle saute le contrôle [#4b5d2af8bee1f637-1] [#389538cba31288b5-1] [#a7e9024c920debf4-2] [#7b0c17246e7a9d53-1] [#c7dc54d30122d1a9-1]
- Les contraintes CHECK sont prouvées par du SQL natif qui doit échouer [#cabb10c4513fcbd5-1] [#87f01d1728f1c9ca-1] [#406b679dba71f5f9-1]
- Un test d'intégration étend AbstractPostgresIntegrationTest et se connecte pour obtenir le cookie jwt [#84f234916728eaac-1] [#e606b84631db196b-1]

## 9. Questions ouvertes {#questions}

- Pourquoi GET d'une catégorie d'un autre utilisateur donne-t-il 404 alors que PATCH et DELETE donnent 403 ? La base ne dit pas quel choix est voulu [#5ffa90402c2ed5d3-1].
- Le DELETE groupé de ExportPurgeScheduler.purgeExpired peut-il laisser la transaction en rollback seul pour les jobs suivants ? Aucun savepoint n'est visible [#3d07a90220ba90ff-2].
- L'unicité du username peut-elle être violée en course ? [#28df165ba39642e4-1]
- La mini-frise doit-elle inclure les événements archivés ? [#e7ae87f69a75289c-1]

## 10. Alertes {#alerts}

- La surcharge generateToken(String) ne pose pas de jti, alors que JwtFilter n'authentifie que si le jti correspond à une session active ⇒ Utiliser la surcharge Authentication pour tout token de session [#cb51750c3a8dc0ff-1] [#815b663297c90786-2]
- CustomUserDetails renvoie true pour les quatre états de compte, donc un compte verrouillé ou désactivé n'est pas refusé [#54107dc05fbc7803-1].
- Les transitions markRunning, markCompleted et markFailed de ExportJob n'imposent aucun enchaînement, un job FAILED peut passer à COMPLETED ⇒ Poser la garde soi-même [#state-machine/8096253e175ca857-1]
- La suppression d'un événement n'a pas de clause de version, une édition concurrente committée est supprimée sans conflit [#68124f11363668ae-1] [#integrations/6439e02e65f081e7-1] [#154d12374c0caa77-1]
- V9 met à NULL toute unité de récurrence hors WEEK, MONTH, YEAR, et le CHECK de V4 est en minuscules ⇒ Écrire les unités en majuscules [#886d2ad64e13f7fd-1] [#c53bd5a742d3c763-2] [#310442fce9aaa115-1] [#migrations/29933d39a46bb560-1]
- V12 remplace par ROLE_USER tout rôle NULL ou inconnu, et ne doit pas tourner en production sans décision humaine [#67db88ee69eb92d5-1] [#7665b5f08587801a-1].
- getCategoryByName cherche par nom seul alors que l'unicité est par utilisateur, donc préférer findByOwnerAndName [#bbf7c3a8544cae1f-1] [#0ef270b4957f4985-1] [#integrations/fbacb4352f182c9b-1].
- PATCH d'une catégorie renvoie 404 si absente et 403 si d'un autre utilisateur, alors que GET renvoie 404 dans les deux cas [#07832a8955e28a7c-1].
- LocalStorageAdapter.load lève IllegalArgumentException pour une référence vide, nulle ou avec séparateur, malgré la javadoc qui promet un Optional vide [#2f5c382628b2ed24-1] [#21441e6ea68952b9-1].

## 11. Couverture {#coverage}

- Fichiers du pack : 390 ; avec au moins un fait en base : 390 ; sans fait après remise en file : 0.
- Faits en base : 3 489, repris d'autres packs : +800, hors périmètre : -0, doublons écartés à la déduplication : -454, soit 3 835 dans le pool.
- Faits du pool venus d'un autre pack : 490 (par pack : section Relations).
- Destination des 3 835 faits du pool : Lexique 81 ; Règles 780 ; Endpoints et écrans 389 ; Tests attendus 1 144 ; Alertes / Questions ouvertes 261 ; annexe seule 741 ; écartés (sorte `other` ou inconnue) 439.
- Base : sha256 d03884d4f76b…, générée le 2026-11-18.
