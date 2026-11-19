---
pack: event
kind: domain
name: Évènements et timeline
generated_at: 2026-11-19T10:32:37Z
generator: synth/1
base_sha256: f2fd9403fe45f886c360985bce83b2a808cf2c06e3e3bc5d53cb52b8be00bed8
facts_in_base: 2511
facts_in_pool: 2519
facts_cited: 181
sections: event.sections.json
details: [event.details.md, event.details-2.md, event.details-3.md]
lang: fr
curated_at: 2026-11-19T10:32:37Z
curation: event.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : event, évènement, timeline, frise, recurrence, récurrence
- Routes : `/api/events`
- Entités : EventEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| version | Verrou optimiste de l'entité, non nullable en base, nullable dans le modèle domaine tant que l'événement n'est pas persisté. | [#3dd99ae27e2ec76a-1] [#f9538089e4162db7-1] |
| serverVersion, serverEvent | Corps d'un conflit 409 : version et état de l'événement côté serveur. | [#b2b6b8bd338dde6e-1] |
| archived | Booléen obligatoire (faux par défaut côté entité). Le dialog d'archivage parle d'effet sur le quota, de réversibilité et de lecture seule. | [#bbc36114a5d762eb-1] [#81d06e4fde2e810d-2] [#701645b309f3b67c-1] |
| recurrenceUnit | Unité de récurrence, enum distincte de l'unité de durée et plus restreinte. | [#6691f06430465d63-1] [#6ad25d5acaefd16e-1] |
| durationValue, durationUnit | Durée saisie à la création, entière, accompagnée de son unité. | [#ef1e62514e0e905f-1] |
| capped | Indicateur de la prévisualisation de récurrence, rendu avec le nombre d'occurrences. | [#a406cb20957406b6-1] |
| productId | Rattachement obligatoire d'un événement à un produit. | [#f723e2d2c3be810c-1] [#59eebee91238c5e6-1] |
| status | Statut d'affichage d'un événement, traduit sous dashboard.timeline.status. | [#8b68ca99ff4ec56c-1] [#feec81a3b83370ee-1] |
| lane | Voie de la frise, avec décalages par catégorie dépliée. | [#a4c051ab9d511341-1] |
| groupHead | En-tête de catégorie, libellé construit avec la catégorie et un nombre de ressources ou de produits. | [#f9348c011358b274-1] [#6581f802ed3f1eb1-1] |
| zoom level | Niveau de zoom de la frise, traduit sous dashboard.timeline.zoom. | [#a6f8534b6ece755e-1] [#c51805e4ec657803-1] |

## 3. Règles {#rules}

### Création et type
- À la création, startDate vaut la date fournie ou la date du jour, et le produit est obligatoire (ProductNotFoundException s'il est introuvable). [#cc99956ac9776a16-1] [#c44d2cf5ae429e2e-1] [#0cd6cf3d4f0d4580-1]
- Une durationUnit null ou inconnue sur un type duration avec durée lève InvalidDurationUnitException (422), et la base impose aussi une unité pour ce type. [#28e83dac4ca0130e-1] [#28e83dac4ca0130e-2] [#43d773e4641d68b2-1] [#3c91c9583acd6cac-1]
- isRecurring à true exige recurrenceUnit (BR-EVE-006) dans les schémas de création et d'édition, et la base refuse aussi un événement récurrent sans unité. [#47f757ec081e2411-1] [#a974acefdb009183-1] [#8655972c78b8d2d9-1] [#91c8a9aaf970db4c-1] [#2119308a17a781b4-2]
### Mise à jour partielle
- Un événement récurrent sans recurrenceUnit après fusion lève RecurrenceUnitRequiredException (400), sauf si l'unité existe déjà en base, même absente du payload. [#0a5cb14f76e71bab-2] [#92127196b212658c-1] [#342187a74cfe1bfe-1] [#f167a6ceec164022-1]
- Une recurrenceEndDate antérieure à startDate lève RecurrenceEndDateBeforeStartException (422, BR-EVE-012), l'égalité est tolérée. Le schéma d'édition front la rejette aussi. [#0a5cb14f76e71bab-3] [#e7ae0d6dafb774fe-1] [#fb34ffb204873145-1] [#e6fe1305142c891d-1] [#266280b35925aede-6]
- Une endDate antérieure à startDate sur l'état fusionné lève EndDateBeforeStartException (422), l'égalité est tolérée, et le schéma d'édition front la rejette (BR-EVE-002). La validation du payload ne s'applique que si les deux dates sont fournies. [#0a5cb14f76e71bab-6] [#46b90c53382401be-1] [#5e6882552cc4caa6-1] [#2c21585dda16dcaa-1] [#e9340f02a183e546-1] [#266280b35925aede-5]
- Le contrôle de version lève EventConflictException si la version fournie diffère de celle du serveur, et il n'est pas armé sans version dans le payload. [#178dfb9c204b75fa-1] [#6d214472091acb5c-1] [#7b3775ab52c239bc-1]
- Un conflit détecté au flush recharge l'état serveur pour lever EventConflictException avec sa version, ou une 404 si l'événement a disparu. [#b2e57a627d735276-1] [#b2e57a627d735276-2]
- La suppression filtre sur le seul id, sans condition de version, et ce choix est assumé. [#39c4b0e35ee99ebc-1]
### Conflit d'édition côté front
- Au plafond MAX_KEEP_MINE_ATTEMPTS, onKeepMine ne fait plus rien, il ne reste que le rechargement serveur. [#4076d878d24f382b-1] [#d0cc68f6d0a9b67a-1] [#ad1a5ddd057c61a7-1]
- Le dialog de conflit passe en mode comparatif seulement si l'événement serveur et les valeurs locales sont fournis. [#8b758da55b358b98-1]
- Création, archivage et suppression invalident le préfixe de clé products, et l'archivage l'invalide aussi sur un 409 mais pas sur 403, 404 ou erreur réseau. [#222499dcc290b14f-2] [#8eaaa2bd57099c10-1] [#8eaaa2bd57099c10-2] [#277429589380fe41-1]
### Récurrence et archivage
- Sans borne, la série est développée sur 5 ans, et le plafond d'occurrences générées est de 4000. [#eb364afb5cc08191-2] [#14edcaa0737501d7-2] [#9ac92d731ba6f7a7-2]
- Le texte d'unité WEEK, MONTH ou YEAR est lu sans casse, au singulier ou au pluriel. Une valeur vide donne null et une valeur inconnue lève IllegalArgumentException. [#d1d4f6387f5b88c6-1] [#d1d4f6387f5b88c6-2] [#6e33963852639a23-1]
- La migration V9 convertit les alias d'unité vers WEEK, MONTH ou YEAR et remet à NULL les valeurs non reconnues. La migration V4 s'interrompt si des lignes sont hors énumération. [#39c96a7acb547001-1] [#39c96a7acb547001-2] [#29bc8c07438793b7-1]
- Une série n'existe que si isRecurring vaut true et que recurrenceUnit est renseigné, et une série archivée ne produit ni fantôme ni connecteur. [#6db0dd7e92c7da1e-1] [#cfecbfae6e7150e3-2]
- Un événement archivé n'a jamais de prochaine échéance, contrôle passé avant tout autre calcul (voir `mytimeline:frontend/src/lib/next-occurrence.ts:70`). Il reste affiché mais grisé. [#eb3a7d58c9f4d1af-1] [#0dfa1c793bea97e0-1] [#a01d48e2f038a8b0-6] [#b787dcef7882b437-1]
- L'horizon d'une série est sa recurrenceEndDate, sinon le début plus 60 mois, et une recurrenceEndDate invalide est traitée comme absente. [#46d2c243290b83b9-1] [#eb3a7d58c9f4d1af-4]
- Archiver demande une confirmation, désarchiver non, et en édition un événement archivé verrouille les champs sauf le toggle et le submit. [#3402543907691be2-1] [#3402543907691be2-2] [#36a8609b2ebd5604-1] [#3402543907691be2-4]
### Formulaires et payloads
- Le nom à la création accepte 1 à 100 caractères, mais le message du maximum dit que le nom est requis, ce qui est faux pour un nom trop long. [#219eb91abd142306-1]
- Une soumission sans produit effectif pose l'erreur inline et n'appelle pas la création. Les boutons d'enregistrement et de suppression sont désactivés pendant la soumission et hors ligne. [#f1fb1bc6215a3a7a-1] [#632bc785c7220070-1] [#c5cf522319e4b254-1] [#c5cf522319e4b254-2]
### Accès côté front
- Si l'URL JWKS n'est pas configurée ou si les clés sont inaccessibles, tout cookie présent est accepté, ce qui désactive la vérification de signature, voir `mytimeline:frontend/src/lib/auth-token-verify.ts:196-210`. [#8271b8e904595727-2] [#8271b8e904595727-3]
- Un segment de chemin au percent-encoding malformé est traité comme protégé, et le décodage ne se fait qu'une fois, si bien que /fr/%2564ashboard n'est pas protégé. [#0133683962c6f5b7-1] [#168ef5c0f4675450-1]
### Vérifié dans le code
- swatchGlyphInk choisit l'encre au ratio WCAG maximal entre #FFFFFF et #16181D, ce qui garantit environ 4.21:1 pour tout hex valide, au point d'égalisation [#c7dd90b195c04073-1] [#fc94a0791a97d276-1] `mytimeline:frontend/src/lib/color.ts:324-329`.
- RecurrencePreviewController traduit toute IllegalArgumentException de expand en RecurrenceEndDateBeforeStartException parce que @Valid et @NotNull sur RecurrencePreviewRequest écartent l'unité nulle. Si ces contraintes sautent, distinguer les deux causes [#df54606069087ac4-1] `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/RecurrencePreviewRequest.java:31-32`.

## 4. Structure {#structure}

#### mytimeline:frontend/src/components/EventEditForm.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventEditForm | EventEditForm est le formulaire de création et d'édition d'un événement, rendu dans un drawer ou une bottom sheet. | L211 | [#e1b87112eaccfb57-1] |
| EventEditForm.locked | Une note de verrouillage s'affiche en tête du formulaire lorsque l'événement est archivé en mode édition. | L571 | [#5bd9e5bb55de7de9-1] |
| EventEditForm.archived | Cocher le commutateur d'archivage ouvre le dialog de confirmation sans modifier la valeur archived, alors que le décochage applique false immédiatement. (partiel) | L957-958 | [#0ae8a662439e4c30-1] |
| EventEditForm.archived | Le champ archived passe de false à true lors de la confirmation du dialog d'archivage, et le formulaire est marqué comme modifié. (partiel) | L1018 | [#0ae8a662439e4c30-2] |
| EventEditForm.ConflictDialog | Le ConflictDialog est ouvert lorsque submitState vaut 'conflict'. | L1040 | [#e01c171af7425bf8-1] |
| EventEditForm.ConflictDialog | La fermeture du ConflictDialog appelle onConflictDismiss, ce qui permet au parent de repasser submitState à 'idle'. (partiel) | L1042 | [#8e0a490571ce9cdb-1] |
#### mytimeline:frontend/src/components/shared/DeleteConfirmDialog.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| DeleteConfirmDialog | Le composant DeleteConfirmDialog affiche un dialogue de confirmation de suppression en trois variantes et délègue la suppression réseau à la prop onConfirm. | L107-116 | [#e903eb6c47b992ff-1] |
| DeleteConfirmDialog.deleting | L'état deleting passe à vrai au début de handleConfirm et repasse à faux dans le bloc finally. (partiel) | L119 | [#5d14dffe492911cc-1] |
| DeleteConfirmDialog.prevOpen | Les états deleting, errorMessage, reassignTo et reassignRequiredByServer sont remis à zéro lorsque la prop open passe à vrai. (partiel) | L152-160 | [#1c7e5c9d25d95df2-1] |
#### mytimeline:frontend/src/components/events/NewEventDrawer.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| NewEventDrawer.submitState | L'état de soumission passe à submitting pendant la mutation, à error si la mutation échoue, et reste idle sinon, ces valeurs étant dérivées de createEvent. | L136-140 | [#7e8c66c6fccb86e0-1] |
| NewEventDrawer.loadingState | Pendant le chargement des produits, le drawer affiche un spinner et un texte de statut en live region à la place du formulaire. | L174-188 | [#1a9d225c09c04b49-1] |
| EventCategoryField | La catégorie affichée est dérivée du produit sélectionné en lecture seule et placée avant le sélecteur de produit. | L202-206 | [#26d62a0804d87e8f-1] |
| NewEventDrawer.productSelect | Le sélecteur de produit liste tous les produits chargés, chaque option ayant le data-testid product-option suivi de l'identifiant du produit, et le choix efface l'erreur produit. | L214-240 | [#77fbe4b0d5abc0b0-1] |
| NewEventDrawer.productError | Si productError est vrai, un message role alert affiche la clé shell.createDrawer.productRequired sous le sélecteur. | L241-249 | [#89fb06976f5b3974-1] |
#### mytimeline:frontend/src/lib/canonical-host.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| unusableConfigWarned | Le verrou unusableConfigWarned passe de false à true lors du premier avertissement de configuration non vide mais inexploitable. (partiel) | L96-98 | [#ca52dab3f235379e-1] |
#### mytimeline:frontend/src/components/timeline/useTimelineMobileState.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useTimelineMobileState.setScrollNode | Au détachement, setScrollNode(null) copie scrollRef.current dans detachedScrollRef avec le scrollLeft et le trackWidth courants, puis vide scrollRef.current. (partiel) | L475-482 | [#84fe6202d4b4b738-1] |
| useTimelineMobileState.setScrollNode | À l'attachement d'un nœud après un détachement, scrollLeft est restauré en pixels si trackWidth est inchangé, sinon en fraction recalculée sur le nouveau trackWidth. (partiel) | L488-517 | [#84fe6202d4b4b738-2] |
#### mytimeline:frontend/src/components/timeline/TimelineMobileLandscape.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineMobileLandscape.userHidden | Le clic sur le bouton timeline-minimap-toggle inverse userHidden, donc passe de masquée à affichée ou l'inverse, si minimapForcedHidden est faux. (partiel) | L148-158 | [#aadbfa862013ac8e-1] |
#### mytimeline:frontend/src/components/timeline/TimelineEditHost.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineEditHost.requestDelete | Le tap sur supprimer depuis le mobile arme deleteTarget sans supprimer, ce qui ouvre DeleteConfirmDialog. (partiel) | L152 | [#94d53e112675d1bb-1] |
| TimelineEditHost.runDelete | Après un deleteEvent réussi, runDelete invalide queryKeys.products.all, réinitialise le conflit, ferme l'éditeur et vide deleteTarget. (partiel) | L174-185 | [#277429589380fe41-1] |
| TimelineEditHost.handleDeleteOpenChange | Fermer la confirmation de suppression mobile remet deleteTarget à null. (partiel) | L204-206 | [#2d700556c5e1f140-1] |
#### mytimeline:frontend/src/components/layout/AppShell.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AppShell.NAV_ITEMS | La navigation principale liste trois liens, dashboard, timeline et products, chacun pointant vers la locale courante. | L145 | [#a77d12b6be699f36-1] |
| AppShell.closeCreate | closeCreate pose showCreate à faux, ce qui démonte le NewEventDrawer. (partiel) | L174 | [#abee5819117e7ce6-1] |
| AppShell.aside | La sidebar persistante est masquée sous md et affichée en flex à partir de md, avec une largeur repliée puis de 248px à partir de lg. | L229-232 | [#bbe76f1e6d7fbaf6-1] |
| AppShell.shell-sidebar-new-event-button | Le bouton Nouvel événement de la sidebar appelle openCreateBlank et porte le fond bleu accent avec son libellé masqué sous lg. | L245-256 | [#dc9d9c9c22896e38-1] |
| AppShell.NAV_ITEMS | Le lien actif reçoit la pilule pleine bg-primary avec text-primary-ink et font-medium, les autres liens prennent text-ink-muted. | L277-281 | [#a77d12b6be699f36-2] |
| AppShell.shell-mobile-new-event-button | Le bouton flottant mobile est visible seulement sous md, car il porte md:hidden et appelle openCreateBlank. | L378-387 | [#91948b54d1328b21-1] |
| AppShell.NewEventDrawer | Le NewEventDrawer n'est monté que lorsque showCreate est vrai, ce qui le démonte à la fermeture et purge son état interne. | L398-400 | [#8fb01935ebca35de-1] |
#### mytimeline:frontend/src/hooks/useEventEditConflict.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useEventEditConflict.runSubmit | La soumission passe de idle à submitting au moment où le PATCH est envoyé. (partiel) | L149 | [#72553b1afd7d4b9c-1] |
| useEventEditConflict.runSubmit | Après un PATCH réussi, les événements sont invalidés, le conflit est effacé, l'état repasse à idle et onDone reçoit les valeurs enregistrées. | L152-158 | [#72553b1afd7d4b9c-2] |
| useEventEditConflict.runSubmit | Un 409 fait passer la soumission de submitting à conflict, avec le serveur et les valeurs locales si le corps 409 est enrichi. (partiel) | L161-164 | [#72553b1afd7d4b9c-3] |
| useEventEditConflict.runSubmit | Une erreur non 409 fait passer la soumission à forbidden si le statut est 403, sinon à error. (partiel) | L172 | [#72553b1afd7d4b9c-4] |
#### mytimeline:frontend/src/components/timeline/TimelineSidebar.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useTimelineSidebarPanel | Le panneau passe de ouvert à fermé quand le palier de largeur bascule vers le haut, car setOpen(false) est appelé si isPermanent vaut vrai. (partiel) | L95-98 | [#9728d610979273f7-1] |
| useTimelineSidebarPanel | Le panneau se ferme sur un pointerdown hors du panneau et du bouton, et le focus revient au bouton seulement si le focus est perdu. (partiel) | L116-130 | [#9728d610979273f7-2] |
#### mytimeline:frontend/src/components/landing/HeaderSection.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| HeaderSection.closeMenu | La fonction closeMenu, mémoïsée sans dépendance, passe menuOpen à false et est transmise au panneau LandingMobileMenu comme onClose. (partiel) | L103 | [#80db920ff6b82601-1] |
| HeaderSection.menuOpen | Le menu passe de ouvert à fermé quand isDesktop devient vrai, la mise à jour se faisant pendant le rendu, pour tout visiteur. (partiel) | L120-123 | [#2259379073d312ce-1] |
| HeaderSection.menuOpen | Le clic sur le burger passe menuOpen à true, ce qui ouvre le panneau mobile. (partiel) | L379 | [#2259379073d312ce-2] |
#### mytimeline:frontend/src/components/timeline/useTimelineMobileGestures.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useTimelineMobileGestures.onScrollPointerUp | Le pinch passe de actif à inactif par onScrollPointerUp dès qu'il reste moins de deux pointeurs actifs, la base de distance étant remise à null. (partiel) | L128-131 | [#6813717664a0dde0-1] |
#### mytimeline:frontend/src/components/timeline/useFocusTrap.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useFocusTrap | À la désactivation, le listener keydown est retiré et le focus revient à l'élément mémorisé à l'activation. (partiel) | L87-92 | [#be3e58e2326d9c03-1] |
#### mytimeline:frontend/src/components/timeline/TimelineMobileLandscape.test.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineResponsive | Le test fixe qu'une rotation paysage vers portrait ferme le drawer latéral et réaffiche le bottom sheet avec l'événement sélectionné. (partiel) | L410-434 | [#15d108d8f6ff26c7-1] |
#### mytimeline:frontend/src/components/timeline/TimelineLandscapeDrawer.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineLandscapeDrawer.onKey | Le drawer appelle onClose à l'appui sur Escape, l'écouteur keydown étant posé sur document tant qu'un événement est présent. (partiel) | L42-52 | [#fd296543edf65a27-1] |
#### mytimeline:frontend/src/components/timeline/TimelineResponsive.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineResponsive | La variante rendue passe de mobile paysage à mobile portrait, puis desktop, selon la priorité paysage mobile, portrait mobile, desktop, et l'état partagé reste hissé entre les variantes. (partiel) | L79-93 | [#94f8648382006df3-1] |
#### mytimeline:frontend/src/services/eventService.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| previewRecurrence | Envoie le payload de preview de récurrence en POST sur /events/recurrence-preview via apiClient. | L27 | [#6dc9dd325e257c7e-1] |
| createEvent | Crée un événement par POST sur /events avec le payload fourni et retourne response.data sans validation Zod. | L53-54 | [#f104e6ad4913b97f-1] |
| getEventsByProductId | Lit les événements d'un produit par GET sur /users/{userId}/products/{productId}/events via apiClient. | L63 | [#3c6495fa4dbc9280-1] |
| updateEventColor | Met à jour uniquement le champ color d'un événement par PATCH sur /events/{eventId}. | L74 | [#e1a25f683139e1e8-1] |
| updateEvent | Édite un événement par PATCH sur /events/{eventId} avec les données du formulaire et les options transmises à la configuration axios. | L95 | [#78b42cacae4f0df8-1] |
| setEventArchived | Bascule le flag archived d'un événement par PATCH sur /events/{eventId}, avec un payload minimal. | L124-127 | [#44c75b8ed000eb44-1] |
| deleteEvent | Supprime un événement par DELETE sur /events/{eventId} avec les options transmises à la configuration axios. | L139 | [#6b82279c03effea4-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventController.createEvent | POST /api/events valide le corps EventCreationRequest et renvoie 201 avec un EventResponse. | L46-69 | [#68f91e8b996be46b-1] |
| EventController.deleteEvent | DELETE /api/events/{id} contrôle la propriété puis appelle deleteById et renvoie 200 sans corps. | L97-105 | [#ca056672a7fa0661-1] |
#### mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewControllerTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| RecurrencePreviewController | Le test cible l'endpoint POST /api/events/recurrence-preview, qui reçoit un corps JSON avec startDate, recurrenceUnit et recurrenceEndDate optionnelle. | L71 | [#9c2bdebaf0fe4d87-1] |
#### mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| RecurrencePreviewController.previewRecurrence | Expose POST /api/events/recurrence-preview qui accepte un RecurrencePreviewRequest validé avec @Valid et renvoie RecurrencePreviewResponse sans rien persister. | L56-58 | [#0091f7a72002aac6-1] |
#### mytimeline:frontend/src/components/timeline/TimelineView.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineView | Le composant TimelineView est la frise desktop exportée, qui accepte les events, les resources, la locale, une date du jour optionnelle, un callback d'édition et le layout. | L678-685 | [#e814c6ca101e6bef-1] |
#### mytimeline:frontend/src/components/timeline/TimelineMobilePortrait.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineMobilePortrait | Le composant rend la frise mobile portrait dans un conteneur data-testid timeline-mobile-portrait, avec une barre de zoom (bouton moins, niveau, bouton plus). | L110-112 | [#c0a4073ebeec9e7a-1] |
| TimelineMobilePortrait | Un bouton ⋯ à côté de chaque occurrence ouvre l'action sheet via setActionTarget, offrant l'alternative accessible au long-press. | L402-412 | [#c0a4073ebeec9e7a-2] |

## 5. Endpoints et écrans {#surface}

- Le contrôleur des événements est `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java:46-69` (création) et le front principal vit sous `mytimeline:frontend/src/components/timeline/TimelineView.tsx:678-685` [#68f91e8b996be46b-1] [#e814c6ca101e6bef-1].
- Le PATCH est partiel et contrôle la version optimiste, les règles de récurrence et les dates avant sauvegarde. Le front envoie le même PATCH pour la couleur, l'archivage et l'édition [#7f6914f4b948076c-1] [#e1a25f683139e1e8-1] [#44c75b8ed000eb44-1] [#78b42cacae4f0df8-1].
- La suppression de tous les événements d'un utilisateur passe par un DELETE SQL natif qui inclut les produits archivés en contournant le filtre @SQLRestriction de ProductEntity. Toute requête de masse doit tenir compte de ce filtre [#62385076e791e4c9-1] [#dd6216b8279427ee-1].
- Le formulaire d'édition affiche une note de verrouillage quand l'événement est archivé, et ouvre le ConflictDialog quand l'état de soumission vaut conflict (version périmée) [#5bd9e5bb55de7de9-1] [#e01c171af7425bf8-1].
- AppShell porte la garde d'authentification (useAuthGuard). Le NewEventDrawer n'est monté que lorsque showCreate est vrai, donc son état interne est purgé à chaque fermeture [#024043a3779dbe87-1] [#8fb01935ebca35de-1].
- NewEventDrawer affiche un spinner à la place du formulaire pendant le chargement des produits, et la catégorie est un champ en lecture seule dérivé du produit choisi [#1a9d225c09c04b49-1] [#26d62a0804d87e8f-1].
- EventDrawer ne rend rien sans événement, et son bouton d'édition n'existe que si la prop onEdit est fournie [#1f0906cdc16c8a83-1] [#1f0906cdc16c8a83-5].
- Sur mobile, le bouton ⋯ de chaque occurrence ouvre l'action sheet, alternative accessible au long-press [#c0a4073ebeec9e7a-2].
- Un événement dont la ressource est inconnue n'est compté dans aucune catégorie de la sidebar timeline [#01fd24be81773c4e-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 217), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `mytimeline:frontend/src/types/event.ts` | 41 | entity 10, validation 10, business_rule 9 |
| `mytimeline:frontend/src/components/EventEditForm.tsx` | 45 | business_rule 16, other 9, convention 6 |
| `mytimeline:frontend/src/components/timeline/TimelineView.tsx` | 34 | business_rule 18, convention 4, config 3 |
| `mytimeline:frontend/src/components/timeline/zoom.ts` | 27 | business_rule 19, config 5, suspicious 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java` | 35 | business_rule 12, test_case 12, validation 5 |
| `mytimeline:frontend/src/components/EventEditForm.test.tsx` | 76 | test_case 50, other 11, business_rule 6 |
| `mytimeline:frontend/src/components/timeline/virtualization.ts` | 29 | business_rule 11, config 5, service_method 5 |
| `mytimeline:frontend/src/components/timeline/zoom.test.ts` | 47 | test_case 30, business_rule 13, convention 2 |
| `mytimeline:frontend/src/components/timeline/lib.ts` | 29 | service_method 13, business_rule 11, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java` | 26 | business_rule 10, service_method 7, validation 4 |
| `mytimeline:frontend/src/components/shared/DeleteConfirmDialog.tsx` | 23 | business_rule 6, convention 5, other 3 |
| `mytimeline:frontend/src/components/events/previewTimeline.ts` | 20 | business_rule 14, config 2, convention 2 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| backend-socle | 23 | 11 |  |
| integrations | 10 | 1 |  |

## 8. Tests attendus {#tests}

- Les tests fixent qu'un PATCH n'applique que les champs fournis, et qu'un PATCH couleur seule ne touche ni le titre ni endDate [#022cc389b1547c3c-1] [#50744033c03969c0-1] [#be26573cdc1442bd-1].
- Les tests fixent que endDate est recalculée en base quand startDate ou durationValue change, malgré une endDate explicite [#99cf1bd657c4c5a6-1] [#160160370a7daa2d-1].
- Les tests fixent que les re-soumissions keep-mine sont bornées à 1 plus MAX_KEEP_MINE_ATTEMPTS sous 409 permanents [#1a2afa03c1eb4cf9-1] [#1a2afa03c1eb4cf9-3].
- Les tests fixent l'expansion de récurrence : repli du 31 janvier au 28 février, horizon sans borne avec capped, borne explicite honorée, plafond exact non capped [#2f01006900deea7f-1] [#731985eee10dec33-1] [#dbb5fe0bc577faa6-1] [#9bbb712f45297122-1].

## 9. Questions ouvertes {#questions}

- Une écriture de save avec un id non null mais sans entité trouvée passe-t-elle volontairement par la création avec cet id ? La base montre seulement l'absence de contrôle explicite [#03e076f29b9d03c5-1].
- L'écart de calcul des fins de mois entre l'aperçu frontend et le backend est-il toujours voulu ? La javadoc le dit assumé [#e887b16de793d8ae-1] sans que la base montre un test de parité.
- La dérogation PENDING qui autorise text-accent sur le wordmark attend-elle un arbitrage ? Le fichier de test la porte telle quelle [#90e0691bffc501dd-1].

## 10. Alertes {#alerts}

- buildBody du gestionnaire d'exceptions utilise Map.of, qui rejette les null, alors que plusieurs handlers lui passent ex.getMessage() [#d05da6bfc3f3fb4c-1]. Un message null casse la réponse d'erreur, donc vérifier le message avant d'ajouter un handler.
- La javadoc du repository assume la perte du verrou optimiste à la suppression , et le test d'intégration confirme que la suppression l'emporte sur une édition concurrente ⇒ Ne pas compter sur la version pour protéger un delete [#e814d23768a34935-1] [#ba482184de35c5ee-1]
- Le commentaire de updateEvent dit que startDate n'est pas modifiable via EventUpdateRequest , mais le service l'applique quand il est fourni [#1d80e0ac11cdedaf-1] [#7f6914f4b948076c-1]
- V4 pose ck_events_recurrence_unit avec des valeurs en minuscules , V9 la supprime puis la repose en majuscules ⇒ Lire V9 et non V4 pour connaître les valeurs admises [#83aa7938ccfda029-1] [#32dbf2f82597a592-1]
- Le message Zod recurrenceEndBeforeStart exige une fin postérieure au début , alors que le service ne rejette qu'une fin strictement antérieure ⇒ Aligner le libellé sur la règle sans durcir la garde [#14b8888449f2aad7-1] [#0a5cb14f76e71bab-3]
- Le seuil LANE_VIRTUALIZATION_MIN_ROWS n'est pas lu dans virtualization.ts et windowLanes fenêtre toute liste , le seuil n'étant appliqué que dans TimelineView ⇒ Passer par cette condition plutôt que d'appeler windowLanes seul [#833812ce03fc33ef-1] [#6e39d1f0bfde8419-1]
- Le catch final de verifyAuthCookie renvoie accepted , et un payload JWT valant null lève une TypeError interceptée par ce catch ⇒ Ne pas supposer que ce catch rejette un jeton mal formé [#18c61c074e6452e0-1] [#2e7e0c71acb6e65c-1]
- Sur un 409 dont le corps n'est pas enrichi, conflict reste null alors que submitState passe à conflict [#3c0289aa8446c2ba-1]. L'interface de conflit doit gérer ce cas sans données serveur.

## 11. Couverture {#coverage}

- Fichiers du pack : 217 ; avec au moins un fait en base : 217 ; sans fait après remise en file : 0.
- Faits en base : 2 511, repris d'autres packs : +45, hors périmètre : -0, doublons écartés à la déduplication : -37, soit 2 519 dans le pool.
- Faits du pool venus d'un autre pack : 33 (par pack : section Relations).
- Destination des 2 519 faits du pool : Lexique 60 ; Règles 502 ; Endpoints et écrans 165 ; Tests attendus 945 ; Alertes / Questions ouvertes 92 ; annexe seule 322 ; écartés (sorte `other` ou inconnue) 433.
- Base : sha256 f2fd9403fe45…, générée le 2026-11-19.
