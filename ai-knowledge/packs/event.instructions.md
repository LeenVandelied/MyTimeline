---
pack: event
kind: domain
name: Événement
generated_at: 2026-11-19T16:00:00Z
generator: synth/1
base_sha256: 0c95824c43b77c1352ea5bad47a4b4400eb1bf5506318ea40be7668f48c5e9a0
facts_in_base: 1967
facts_in_pool: 2013
facts_cited: 153
sections: event.sections.json
details: [event.details.md, event.details-2.md]
lang: fr
curated_at: 2026-11-19T16:38:00Z
curation: event.curation.json
---
## 1. Quand activer {#activate}

Ce pack s'active quand la demande ou le code touche l'un de ces éléments.

- Mots-clés : event, événement, evenement, recurrence, récurrence, timeline
- Routes : `/api/events`, `events/evt-desktop`, `events/evt-mobile`
- Entités : EventEntity

## 2. Lexique {#lexicon}

| Terme | Sens dans ce projet | Faits |
|---|---|---|
| archived | Booléen non nul, faux par défaut. Le dialogue d'archivage annonce un effet sur le quota, une action réversible et des autres champs en lecture seule. | [#29c24111a7e66143-1] [#6058c3b8f68a53e0-1] [#068d4938b682c81a-1] |
| version | Compteur de verrou optimiste sans setter. L'archivage le renvoie dans le PATCH. | [#ac2feb0c65d695b0-1] [#c412f6b248fdcb83-1] |
| conflict | État de soumission du formulaire, distinct de error et forbidden. | [#ae130655f45f72c0-1] |
| forbidden | Clé de message inline validation.event.forbidden affichée à l'édition. | [#140bbce5acbcd2d6-1] |
| statut temporel | Libellé traduit par la clé dashboard.timeline.status suivie du statut de l'événement. | [#e15a3d9c9d8aee6c-1] [#9d478caca3649be7-1] |
| sampleEvent | Libellé de repli de la barre d'aperçu quand le titre saisi est vide. | [#103aabc12db4ed6b-1] |
| catégorie de sidebar | Nom, couleur nullable, nombre d'événements et indicateur de masquage. | [#23915fed99f6fbbe-1] |

## 3. Règles {#rules}

### Invariants
- Une date de fin égale à la date de début est toujours acceptée, pour endDate comme pour recurrenceEndDate. [#98cf4b5faf0ea7a3-2] [#0bacc6b111c7d53a-1] [#79ffaef42fcd5554-1]
### Concurrence optimiste
- Un conflit détecté au flush recharge l'état serveur, et la réponse 409 porte serverVersion et serverEvent (si l'événement a été supprimé, c'est EventNotFoundException). [#fd4d8848bb37eb45-1] [#c1e0541b0e22e2d8-1]
- Pour les autres entités versionnées, un conflit renvoie un 409 générique sans état serveur. [#643167fc6dd0c710-1]
### Mise à jour partielle
- Avec isRecurring à true et sans recurrenceUnit sur l'état fusionné, RecurrenceUnitRequiredException donne un 400, même si l'unité manquait déjà en base. [#98cf4b5faf0ea7a3-1] [#e627418030325863-1] [#329b80fe6505f374-1]
- Le payload de mise à jour rejette une endDate antérieure à startDate seulement si les deux dates sont présentes. [#7de030c7d71c6cde-1]
### Création
- Pour la création et la modification d'un événement via EventServiceImpl, un type hors duration et single lève InvalidEventTypeException avant save, et la réponse est un 422. La création d'événements imbriqués dans un produit ne passe pas par cette validation [#51c98aa927d31c5a-1] [#0b4bcf2c88504a14-1] [#7f496261450b5282-1]
- Un produit inexistant fait lever ProductNotFoundException. [#3763682fea712bd5-1]
- Une erreur de Bean Validation renvoie un 400 avec le code VALIDATION_FAILED. [#061b85ed3d767f85-1]
- La startDate d'un événement créé vaut la date fournie, sinon la date du jour, et le mapper applique le même repli. [#1426ab5c3f700cf3-1] [#ccf1687748af6a6d-1]
### Calcul de endDate
- Pour duration, la durée s'ajoute à startDate en jours, semaines, mois ou années. [#f4f32f85e851330e-3]
### Conflit d'édition (409) côté interface
- Un 409 sur le PATCH fait passer la soumission de submitting à conflict, et le conflit n'est renseigné avec la version serveur que si le corps respecte eventConflictBodySchema, sinon il reste null. [#fcb267a9466dd2ed-3] [#0a0ecfe25ac9e14b-2] [#691e39a3adb11945-1]
- Le compteur keep-mine n'augmente sur un 409 que si la soumission vient de onKeepMine, sinon il repart à zéro, et keepMineExhausted devient vrai à 3 tentatives (MAX_KEEP_MINE_ATTEMPTS). [#0a0ecfe25ac9e14b-3] [#454f4c677d25a245-1] [#318a7fe1114733e4-1]
- Le dialogue de conflit passe en mode comparatif seulement si serverEvent et localValues sont fournis, et garder mes modifications est bloqué quand keepMineExhausted est vrai. [#39a68ec37dbc80c1-1] [#4c070fcec23cd357-1]
- onReload et onTakeServer invalident la query products withEvents, effacent le conflit et appellent onDone sans valeurs, alors que onConflictDismiss ne rappelle pas onDone. [#98bec3b2d154a3db-1] [#1d7fbdafe66045b3-1] [#7fe96912c145af55-1] [#fe364a473c7417fc-1]
- Sans utilisateur ou sans identifiant d'événement, aucun PATCH n'est envoyé et l'état passe à error. Une autre erreur donne forbidden pour un 403, sinon error. [#0a0ecfe25ac9e14b-1] [#0a0ecfe25ac9e14b-4]
- L'archivage invalide products.all après succès et aussi sur un 409, pour que la nouvelle tentative parte d'une version fraîche. [#b6c6c48ced0c69f2-1] [#9a3e27e9a8dfd4a3-1]
### Récurrence
- L'endpoint de prévisualisation refuse une unité en minuscules par un 400 et ne rappelle pas le service. [#b33cbd89169e2c51-1]
- expand lève IllegalArgumentException si startDate ou l'unité est null, et le contrôleur de prévisualisation convertit cette erreur en RecurrenceEndDateBeforeStartException (422). [#1a1f018e6f7eaffc-1] [#1a1f018e6f7eaffc-2] [#3d3833bc55d18a44-2]
- Côté frise, une série n'existe que si isRecurring vaut true et recurrenceUnit est renseigné, et l'occurrence k part de l'origine avec le jour ramené au dernier jour du mois cible s'il n'existe pas. [#74154ced8af2709c-1] [#74d51a4723a7cae7-1] [#3ae6b4878ef0428a-1]
### Validation des formulaires
- Un événement de type duration exige durationValue strictement positive à la création, et durationUnit à l'édition. [#170ced817b011ce8-1] [#9d8fa0de402686a4-1]
- Une récurrence exige recurrenceUnit quand isRecurring vaut true, à la création comme à l'édition. [#a3d650f9abd11a8c-1] [#9d8fa0de402686a4-2]
- À l'édition, endDate et recurrenceEndDate ne peuvent pas précéder startDate, l'erreur étant posée sur le champ concerné. [#7642eb34f9026e59-1] [#7642eb34f9026e59-2]
- Une soumission sans produit valide affiche l'erreur de produit et n'appelle pas la création. [#9447624168c79209-1] [#38340304a8e5d870-1] [#33f76c08c2a8b71c-1]
### Archivage et suppressions
- Archiver demande une confirmation, désarchiver est immédiat, et le mode création n'affiche ni toggle ni confirmation. [#a9ef844cbcbc4428-1] [#32015561ba0bde6c-1] [#a945c7e3a4aa7257-2]
- Un événement archivé met le formulaire en lecture seule, la liste des champs verrouillés étant dans `frontend:components/EventEditForm.test.tsx:466-476`. [#f88c77b50d4a8079-2] [#78539957e3f690ee-1]
- Supprimer une catégorie exige une cible de réassignation si des produits y sont liés, cible qui exclut la catégorie supprimée. [#c5a3a1b3956edf72-1] [#7b0eba4f474f81bf-1] [#8013392c9c32836a-1]
### Vérifié dans le code
- EventServiceImpl.deleteById dérive le 404 (EventNotFoundException) du nombre de lignes retourné par EventRepository.deleteByIdReturningRowCount, le contrôleur n'a rien à tester [#bec625ceb1fa0d16-1] `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:245-247`.
- Dans RecurrencePreviewController.previewRecurrence, @Valid et @NotNull sur RecurrencePreviewRequest garantissent que l'IllegalArgumentException de expand vient de recurrenceEndDate avant startDate, il faut maintenir ces contraintes si expand gagne une règle [#aeb33821be3d7854-1] `backend:src/main/java/com/matimeline/eventmanager/application/dtos/RecurrencePreviewRequest.java:31-32`.
- Le PATCH /events/{id} doit continuer à renvoyer un EventResponse, car updateEvent et updateEventColor côté frontend échouent si response.data est vide [#15b09c65b34b16dc-1] `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java:79-80`.

## 4. Structure {#structure}

#### frontend:components/EventEditForm.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventEditForm | Le composant EventEditForm est un formulaire de création ou d'édition d'événement, piloté par defaultValues, onSubmit et un submitState à cinq valeurs, avec un mode 'edit' par défaut. | L211-229 | [#188c4993af6556f3-1] |
| EventEditForm.locked | Une note role note explique le verrouillage lorsque l'événement est archivé en mode édition. | L563-573 | [#b25c7c53904697ff-1] |
| EventEditForm.durationValue | Les champs durationValue et durationUnit ne sont rendus que lorsque le type vaut 'duration'. | L628-629 | [#377ba4924985b1ba-1] |
| EventEditForm.onChange | Le désarchivage s'applique immédiatement via field.onChange(false) sans confirmation, alors que l'archivage ouvre d'abord le dialogue de confirmation. (partiel) | L956-959 | [#a9ef844cbcbc4428-1] |
| EventEditForm.submitState | Un message d'erreur générique role alert est affiché lorsque submitState vaut 'error'. | L974-982 | [#8b31a1f94c4931b4-1] |
| EventEditForm.submitState | Un message d'erreur inline role alert est affiché lorsque submitState vaut 'forbidden', avec la clé de validation forbidden. | L987-994 | [#8b31a1f94c4931b4-2] |
| EventEditForm.onConfirm | Le passage à archived true se fait à la confirmation du dialogue d'archivage, qui pose la valeur archived à true avec shouldDirty puis ferme le dialogue. (partiel) | L1017-1020 | [#32015561ba0bde6c-1] |
| EventEditForm.ConflictDialog | Le ConflictDialog est ouvert lorsque submitState vaut 'conflict', et sa fermeture appelle onConflictDismiss. | L1040 | [#6b04c7ba5fdf8048-1] |
#### frontend:components/timeline/zoom.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| zoomReducer | L'action ZOOM_IN passe le niveau au niveau plus fin suivant, si le niveau courant n'est pas déjà day, sinon l'état reste inchangé. (partiel) | L72-75 | [#8e277164a5a8fd3d-1] |
| zoomReducer | L'action ZOOM_OUT passe le niveau au niveau plus large suivant, si le niveau courant n'est pas year, sinon l'état reste inchangé. (partiel) | L76-79 | [#8e277164a5a8fd3d-2] |
#### frontend:components/EventEditForm.test.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventEditForm.archived | Cocher le toggle archivé ouvre une confirmation sans archiver directement, le toggle restant décoché tant que rien n'est confirmé. (partiel) | L412-420 | [#f98d1db3c439ace8-1] |
| EventEditForm.archived | Annuler la confirmation d'archivage laisse l'événement actif, le toggle décoché et le titre éditable. (partiel) | L437-447 | [#f98d1db3c439ace8-2] |
| EventEditForm.archived | Désarchiver un événement archivé se fait sans confirmation, le toggle étant immédiatement décoché. (partiel) | L449-456 | [#f98d1db3c439ace8-3] |
#### frontend:hooks/useEventEditConflict.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useEventEditConflict.runSubmit | La soumission passe de l'état idle ou conflict à submitting au début de runSubmit, avant l'appel updateEvent. (partiel) | L149 | [#fcb267a9466dd2ed-1] |
| useEventEditConflict.runSubmit | Après un PATCH réussi, l'état revient à idle, le conflit est effacé, le compteur est remis à zéro et onDone reçoit les valeurs enregistrées. (partiel) | L154 | [#fcb267a9466dd2ed-2] |
| useEventEditConflict.runSubmit | Un 409 reçu par updateEvent fait passer l'état de submitting à conflict, avec le serverEvent capturé si le corps est enrichi. (partiel) | L161-164 | [#fcb267a9466dd2ed-3] |
#### frontend:components/timeline/TimelineSidebar.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useTimelineSidebarPanel | Le panneau passe de ouvert à fermé quand le palier de 1024 px est franchi vers le haut, car isPermanent devient vrai. | L94-98 | [#8d21ddb09f0dc718-1] |
| useTimelineSidebarPanel.closeAndRestoreFocus | La fonction closeAndRestoreFocus ferme le panneau puis rend le focus au bouton d'ouverture. | L102-105 | [#b7af7479b5a8753d-1] |
| useTimelineSidebarPanel | Le panneau passe de ouvert à fermé lors d'un pointerdown dont la cible est hors du panneau et hors du bouton. | L116-123 | [#8d21ddb09f0dc718-2] |
| TimelineSidebar | TimelineSidebar est un composant React.memo qui affiche la sidebar de la Vue Timeline à partir des props, sans état propre. | L135-142 | [#86bcd33f4b71974f-1] |
| TimelineSidebar | L'élément aside porte l'id, la ref du panneau, l'attribut data-open selon la prop open, et un aria-label traduit sidebar.label. | L146-154 | [#86bcd33f4b71974f-2] |
| TimelineSidebar | Le bloc Accordéons affiche deux boutons segmentés, Tout déplier et Tout plier, qui appellent onCollapseAll avec false ou true. | L156-178 | [#86bcd33f4b71974f-3] |
| TimelineSidebar | Chaque filtre de catégorie est un bouton dont aria-pressed vaut vrai quand la catégorie est affichée, c'est-à-dire non masquée. | L187-194 | [#86bcd33f4b71974f-4] |
| TimelineSidebar | Le nom accessible du filtre est construit par t('sidebar.filterLabel') avec la catégorie et le nombre d'événements, et le clic appelle onToggleCategory avec le nom de la catégorie. | L195-199 | [#86bcd33f4b71974f-5] |
| TimelineSidebar | Le compteur d'événements de chaque filtre est affiché en aria-hidden, donc absent du nom accessible visible par le lecteur d'écran hors aria-label. | L224-226 | [#86bcd33f4b71974f-6] |
| TimelineSidebar | La légende affiche trois éléments, Événement, Occurrence fantôme et Récurrence, dont l'icône ↻ est en aria-hidden. | L237-253 | [#86bcd33f4b71974f-7] |
| TimelineSidebar | Le pied de la sidebar affiche la liste des raccourcis clavier issue de buildTimelineShortcuts, chaque raccourci étant rendu dans un kbd suivi de sa description. | L257-267 | [#86bcd33f4b71974f-8] |
#### frontend:components/timeline/TimelineEditHost.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineEditHost.requestDelete | Le tap sur supprimer de l'action sheet mobile pose la cible deleteTarget sans supprimer l'événement, ce qui ouvre la confirmation. (partiel) | L152 | [#60aba36b0e37d0fc-1] |
| TimelineEditHost.runDelete | Après une suppression confirmée par le serveur, runDelete réinitialise le conflit, ferme l'éditeur et remet deleteTarget à null. | L180-182 | [#993432c24954b7cc-1] |
| TimelineEditHost.handleDeleteOpenChange | Quand le dialog de suppression se ferme, handleDeleteOpenChange remet deleteTarget à null. (partiel) | L204-206 | [#fa6b58e3295a8395-1] |
#### frontend:components/layout/AppShell.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| AppShell.closeCreate | closeCreate pose showCreate à false, ce qui démonte le NewEventDrawer. (partiel) | L174 | [#40d2b9fb7619d84e-1] |
| AppShell.openCreate | openCreate normalise son argument, enregistre le produit présélectionné puis pose showCreate à true, ce qui monte le NewEventDrawer. (partiel) | L180-183 | [#bf8399ee9efce733-1] |
#### frontend:components/timeline/TimelineResponsive.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineResponsive | Le choix de variante est recalculé à chaque changement de media query via useMediaQuery, sans démontage de l'état hissé. (partiel) | L60-62 | [#cc6b346bbc7308fa-1] |
#### frontend:components/timeline/useFocusTrap.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| useFocusTrap | Le piège est installé quand active passe de faux à vrai, et réinstallé seulement si containerRef ou active changent. (partiel) | L44-93 | [#a2389cb001ca9e1c-1] |
| useFocusTrap | À la désactivation, le listener keydown est retiré et le focus revient sur l'élément mémorisé à l'activation. (partiel) | L88-92 | [#a2389cb001ca9e1c-2] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventController.createEvent | POST /api/events reçoit un EventCreationRequest validé par @Valid et renvoie 201 avec un EventResponse. | L46-69 | [#c2d52af73209c0c3-1] |
| EventController.updateEvent | PATCH /api/events/{id} reçoit un EventUpdateRequest validé par @Valid, contrôle la propriété puis renvoie 200 avec un EventResponse. | L71-95 | [#15b09c65b34b16dc-1] |
| EventController.deleteEvent | DELETE /api/events/{id} contrôle la propriété, appelle deleteById puis renvoie 200 sans corps. | L97-105 | [#b47e4a8d8516d040-1] |
#### frontend:services/eventService.ts
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| previewRecurrence | previewRecurrence envoie un POST vers /events/recurrence-preview avec un RecurrencePreviewRequest et renvoie une RecurrencePreviewResponse validée. | L23-36 | [#233f4b0dbeb05d4c-1] |
| createEvent | createEvent envoie un POST vers /events avec un EventCreationPayload et renvoie response.data sans validation. | L51-59 | [#5a914d0f71ef712d-1] |
| getEventsByProductId | getEventsByProductId envoie un GET vers /users/{userId}/products/{productId}/events et renvoie response.data. | L61-69 | [#e1636c6acf0f6a7a-1] |
| updateEventColor | updateEventColor envoie un PATCH vers /events/{eventId} avec le seul champ color. | L72-83 | [#a176e19a8b475347-1] |
| updateEvent | updateEvent envoie un PATCH vers /events/{eventId} avec EventEditFormValues et les options transmises à la configuration axios. | L89-104 | [#7ef6b8b45e3579fc-1] |
| deleteEvent | deleteEvent envoie un DELETE vers /events/{eventId} avec les options transmises à apiClient. | L137-144 | [#ff51a6cc6e6dc9a9-1] |
#### backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewController.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| RecurrencePreviewController.previewRecurrence | Expose POST /api/events/recurrence-preview, qui prend un RecurrencePreviewRequest et renvoie un RecurrencePreviewResponse. | L56-58 | [#2b0d742a9f9403eb-1] |
#### backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewControllerTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| RecurrencePreviewController.previewRecurrence | Le test appelle POST /api/events/recurrence-preview avec un corps JSON startDate, recurrenceUnit et recurrenceEndDate, et attend une réponse JSON contenant count et capped. | L71-73 | [#70a883c6d9064859-1] |
#### backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventControllerOwnershipTest.java
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| EventController.createEvent | Le test appelle POST /api/events avec un corps JSON contenant name, type, durationValue, durationUnit, isRecurring, isAllDay, color et productId, avec le cookie jwt. | L199-202 | [#58394cf4cadb6f4f-1] |
#### frontend:components/timeline/TimelineView.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineView | La frise est rendue dans une section role region, étiquetée par une clé i18n et décrite par un paragraphe sr-only d'aide clavier. | L1776-1784 | [#78de376f9400432b-1] |
| TimelineView | Le bouton Nouvel événement n'est rendu que dans le layout screen et lorsque le contexte d'ouverture de création est disponible. | L1901-1913 | [#78de376f9400432b-3] |
#### frontend:components/timeline/TimelineMobilePortrait.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| TimelineMobilePortrait | La règle sticky affiche un badge aujourd'hui dont le libellé provient de la clé common.buttons.today, positionné via state.todayLeftPx. | L172-176 | [#d7969ee133fa9d1d-1] |
| TimelineMobilePortrait | La bottom sheet de détail reçoit l'événement sélectionné et l'action sheet reçoit la cible d'action, avec onEdit et onDelete transmis. | L445-451 | [#d7969ee133fa9d1d-2] |
#### frontend:components/shared/ConflictDialog.tsx
| Symbole | Énoncé | Lignes | Fait |
|---|---|---|---|
| ConflictDialog.DialogDescription | La description du dialog utilise la clé comparativeDescription en mode comparatif et la clé description en mode legacy. | L173-175 | [#7706738f883d0dc7-1] |

## 5. Endpoints et écrans {#surface}

- Les endpoints d'événement sont dans `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java:46-105` [#c2d52af73209c0c3-1] et l'écran principal est `frontend:components/timeline/TimelineView.tsx:1776-1784` [#78de376f9400432b-1].
- PATCH et DELETE passent par checkEventOwnership, qui renvoie 401 sans appelant, 404 si l'événement ou son produit manque, et lève AccessDeniedException si le produit n'appartient pas à l'appelant [#f682242ac63c57d5-2] [#15b09c65b34b16dc-1] [#b47e4a8d8516d040-1].
- La suppression est une seule instruction qui compte les lignes touchées et lève EventNotFoundException à zéro, puis le contrôleur répond 200 sans corps [#bec625ceb1fa0d16-1] [#b2c8a12ba0d6c2cb-1] [#b47e4a8d8516d040-1].
- Le PATCH contrôle la version optimiste, applique les champs non null puis revalide les règles sur l'état fusionné, et la version courante est lisible pour enrichir le corps 409 [#c82b76bcb3e888be-1] [#b99c3b3921724620-1].
- Le changement de couleur est un PATCH ne portant que color [#a176e19a8b475347-1].
- createEvent côté front renvoie response.data sans validation et invalide le préfixe des produits à la réussite [#5a914d0f71ef712d-1] [#a78d94f3a5693dcc-1].
- Le drawer de création ne ferme et n'affiche le toast que si la mutation réussit, il remplace le formulaire par un message sans produit, et la catégorie est en lecture seule, dérivée du produit choisi [#c6bb952f073a8042-1] [#186528da7771f7f1-1] [#577d97eafff824b6-1].
- Le formulaire d'édition affiche une note de verrouillage pour un événement archivé en édition, ne rend la durée que pour le type duration, et ouvre ConflictDialog quand submitState vaut conflict [#b25c7c53904697ff-1] [#377ba4924985b1ba-1] [#6b04c7ba5fdf8048-1].
- Un 403 sur l'édition s'affiche en erreur inline via submitState forbidden, et la suppression depuis la frise passe aussi HANDLES_FORBIDDEN_INLINE, dans son seul appel à deleteEvent [#8b31a1f94c4931b4-2] [#0dbddfaaa8395090-1].
- ConflictDialog a deux modes, comparatif avec liste de différences ou message noChanges, et legacy avec boutons dismiss et reload désactivés pendant l'envoi [#7706738f883d0dc7-1] [#2486be5924e0efa5-1] [#b1b738c1a09e8993-1].
- Dans la frise, le bouton Nouvel événement n'existe qu'en layout screen avec le contexte de création, et le bouton d'édition du drawer exige la prop onEdit [#78de376f9400432b-3] [#04cb39a93251c310-5].
- Sur mobile, le bouton des trois points ouvre l'action sheet en alternative visible au long-press [#de32410d419094cc-1].

## 6. Fichiers critiques {#files}

Fichiers du pool au poids le plus élevé (12 sur 180), le poids étant la somme des scores de spécificité de leurs faits. Liste complète : annexe.

| Fichier | Faits | Sortes dominantes |
|---|---|---|
| `frontend:types/event.ts` | 39 | convention 15, business_rule 10, suspicious 5 |
| `frontend:components/EventEditForm.tsx` | 34 | business_rule 15, ui_screen 6, other 4 |
| `frontend:components/timeline/zoom.ts` | 43 | convention 10, business_rule 8, service_method 8 |
| `frontend:components/EventEditForm.test.tsx` | 59 | test_case 40, business_rule 5, convention 5 |
| `frontend:components/timeline/TimelineView.tsx` | 31 | business_rule 15, store_action 4, ui_screen 3 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java` | 33 | business_rule 12, test_case 12, validation 6 |
| `frontend:components/timeline/virtualization.ts` | 33 | business_rule 11, convention 7, config 5 |
| `frontend:components/timeline/TimelineMobilePortrait.tsx` | 27 | business_rule 16, convention 4, other 4 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java` | 22 | business_rule 9, validation 9, convention 3 |
| `frontend:components/timeline/lib.ts` | 26 | business_rule 13, service_method 5, other 3 |
| `frontend:hooks/useEventEditConflict.ts` | 20 | business_rule 12, state_transition 3, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java` | 23 | business_rule 6, validation 6, service_method 5 |

## 7. Relations avec d'autres packs {#relations}

Packs liés par des faits repris, des faits équivalents écartés à la déduplication ou le catalogue.

| Pack | Faits repris | Faits équivalents | Catalogue |
|---|---|---|---|
| frontend-core | 41 | 7 |  |
| backend-core | 24 | 12 |  |
| integrations | 20 | 2 |  |

## 8. Tests attendus {#tests}

- Les tests fixent qu'un PATCH périmé lève EventConflictException (409 avec serverVersion et serverEvent), sans écriture. [#e0a72ccdd3f0ae4c-1] [#c681d164260a4424-1] [#177695cbabacacd2-1]
- Les tests fixent qu'une unité de récurrence en minuscules est rejetée en 400. [#integrations/f4ced9b282424cba-1] [#e68b60def4606e27-3]
- Les tests fixent que l'archivage invalide products.all après succès ou 409, pas après 403. [#0fc392350c8079a9-3] [#0fc392350c8079a9-4]
- Les tests fixent que le schéma rejette un titre vide ou trop long, une fin avant le début, et exige duration_unit pour duration. [#179dd5ce90b3e88b-6] [#179dd5ce90b3e88b-7] [#179dd5ce90b3e88b-10] [#179dd5ce90b3e88b-11]
- Le long press ouvre à 600 ms en paysage, mais le test portrait annonce 500 ms : vérifier le seuil. [#709d6fedd5d77bf1-1] [#bd99416a46b11c1f-1]

## 9. Questions ouvertes {#questions}

- Le save du dépôt JPA doit-il recréer un événement dont l'id n'existe pas en base ? Le code passe alors au chemin de création avec l'id fourni [#6417be179676052d-1].
- onKeepMine reste inerte quand conflict est null, alors que submitState peut rester à conflict après un 409 au corps plat [#3411e600f0874e03-1]. La base ne dit pas si l'utilisateur doit alors pouvoir re-soumettre.

## 10. Alertes {#alerts}

- Le commentaire de la zone BR-EVE-012 dit que startDate n'est pas modifiable par la mise à jour, mais le code l'applique dès qu'elle est non null . Un client peut donc déplacer la date de début [#818442b52d5bb0f8-1]
- Selon le commentaire de checkOptimisticVersion, la propriété de l'événement est vérifiée par le contrôleur avant l'appel, et le service ne la contrôle pas . Tout nouvel appelant du service hors de ce contrôleur contourne l'ownership ⇒ il faut appeler checkEventOwnership en amont [#a747ae2c0f36bf1d-1] [#f429173d1849e6cf-1]
- La recherche de dernière occurrence de isPastEvent s'arrête à MAX_OCCURRENCES sans vérifier l'horizon . Une série plus longue peut être jugée passée à tort ⇒ il faut tenir compte du plafond avant de modifier ce calcul [#a2056228eda1987a-1]
- Le setter du champ productId de Event s'appelle setProduct, contrairement aux autres setters . Une recherche par nom de champ le manque ⇒ il faut l'utiliser tel quel ou le renommer partout [#7da0b405589ec288-1]

## 11. Couverture {#coverage}

- Fichiers du pack : 180 ; avec au moins un fait en base : 180 ; sans fait après remise en file : 0.
- Faits en base : 1 967, repris d'autres packs : +106, hors périmètre : -0, doublons écartés à la déduplication : -60, soit 2 013 dans le pool.
- Faits du pool venus d'un autre pack : 85 (par pack : section Relations).
- Destination des 2 013 faits du pool : Lexique 46 ; Règles 406 ; Endpoints et écrans 150 ; Tests attendus 668 ; Alertes / Questions ouvertes 83 ; annexe seule 319 ; écartés (sorte `other` ou inconnue) 341.
- Base : sha256 0c95824c43b7…, générée le 2026-11-19.
