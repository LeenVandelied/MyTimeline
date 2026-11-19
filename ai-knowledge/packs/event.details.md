# Annexe : event (partie 1/2)

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `frontend:components/EventEditForm.test.tsx` | 59 | test_case 40, business_rule 5, convention 5 |
| `frontend:components/timeline/TimelineView.test.tsx` | 43 | test_case 38, business_rule 2, convention 2 |
| `frontend:components/timeline/zoom.ts` | 43 | convention 10, business_rule 8, service_method 8 |
| `frontend:types/event.ts` | 39 | convention 15, business_rule 10, suspicious 5 |
| `frontend:components/events/NewEventDrawer.test.tsx` | 36 | test_case 25, convention 5, business_rule 2 |
| `frontend:components/EventEditForm.tsx` | 34 | business_rule 15, ui_screen 6, other 4 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java` | 33 | business_rule 12, test_case 12, validation 6 |
| `frontend:components/timeline/virtualization.ts` | 33 | business_rule 11, convention 7, config 5 |
| `frontend:components/timeline/zoom.test.ts` | 32 | test_case 22, business_rule 7, convention 1 |
| `frontend:components/timeline/TimelineEditHost.test.tsx` | 31 | test_case 29, other 1, suspicious 1 |
| `frontend:components/timeline/TimelineView.tsx` | 31 | business_rule 15, store_action 4, ui_screen 3 |
| `frontend:components/timeline/TimelineMobileLandscape.test.tsx` | 27 | test_case 18, other 4, convention 3 |
| `frontend:components/timeline/TimelineMobilePortrait.tsx` | 27 | business_rule 16, convention 4, other 4 |
| `frontend:components/timeline/TimelineEditHost.tsx` | 26 | other 13, business_rule 5, state_transition 3 |
| `frontend:components/timeline/lib.ts` | 26 | business_rule 13, service_method 5, other 3 |
| `frontend:components/events/EventPreviewTimeline.tsx` | 25 | other 18, i18n_key 3, business_rule 2 |
| `frontend:components/timeline/TimelineSidebar.tsx` | 25 | other 8, ui_screen 8, business_rule 3 |
| `frontend:types/event.test.ts` | 25 | test_case 24, suspicious 1 |
| `frontend:components/events/NewEventDrawer.tsx` | 24 | other 9, ui_screen 5, business_rule 4 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java` | 23 | business_rule 6, validation 6, service_method 5 |
| `frontend:components/timeline/EventPill.test.tsx` | 23 | test_case 23 |
| `frontend:components/timeline/virtualization.test.ts` | 23 | test_case 21, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java` | 22 | business_rule 9, validation 9, convention 3 |
| `frontend:components/timeline/TimelineMobilePortrait.test.tsx` | 22 | test_case 20, other 1, suspicious 1 |
| `frontend:components/timeline/useTimelineMobileState.ts` | 22 | business_rule 12, service_method 5, config 3 |
| `frontend:components/timeline/TimelineGroupHead.test.tsx` | 20 | test_case 14, convention 4, other 2 |
| `frontend:hooks/useEventEditConflict.ts` | 20 | business_rule 12, state_transition 3, convention 1 |
| `frontend:components/shared/ConflictDialog.tsx` | 19 | business_rule 8, other 4, ui_screen 3 |
| `frontend:components/timeline/TimelineStacking.test.tsx` | 19 | test_case 12, other 6, suspicious 1 |
| `frontend:components/events/previewTimeline.ts` | 18 | business_rule 14, other 4 |
| `frontend:components/layout/AppShell.test.tsx` | 18 | test_case 16, convention 1, suspicious 1 |
| `frontend:components/timeline/TimelineView.fit-shortcut.test.tsx` | 18 | other 9, test_case 9 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java` | 17 | role_check 5, convention 4, endpoint 3 |
| `frontend:components/events/EventFormDrawer.tsx` | 17 | convention 7, business_rule 5, other 4 |
| `frontend:components/events/previewTimeline.test.ts` | 17 | test_case 17 |
| `frontend:components/timeline/lib-a11y.test.ts` | 17 | test_case 17 |
| `frontend:components/layout/AppShell.tsx` | 16 | ui_screen 6, business_rule 3, other 2 |
| `frontend:components/products/isPastEvent.test.ts` | 16 | test_case 16 |
| `frontend:components/shared/DeleteConfirmDialog.tsx` | 16 | business_rule 7, other 5, convention 2 |
| `frontend:components/timeline/TimelineMobileLandscape.tsx` | 16 | business_rule 8, other 6, convention 1 |
| `frontend:components/timeline/lane-layout.test.ts` | 16 | test_case 16 |
| `frontend:components/timeline/lane-layout.ts` | 16 | business_rule 4, service_method 4, other 3 |
| `backend:src/main/java/com/matimeline/eventmanager/utils/Utils.java` | 15 | convention 6, business_rule 4, validation 3 |
| `frontend:components/timeline/TimelineLandscapeDrawer.tsx` | 15 | convention 4, other 4, i18n_key 3 |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImplTest.java` | 14 | test_case 6, business_rule 3, validation 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewControllerTest.java` | 14 | test_case 5, other 3, validation 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventPatchAndRecurrenceIntegrationTest.java` | 14 | test_case 7, validation 2, business_rule 1 |
| `frontend:components/events/EventPreviewTimeline.test.tsx` | 14 | test_case 11, convention 2, other 1 |
| `frontend:components/shared/ConflictDialog.test.tsx` | 14 | test_case 13, convention 1 |
| `frontend:components/timeline/TimelineView.modal-shortcuts.test.tsx` | 14 | test_case 9, convention 4, config 1 |
| `frontend:components/timeline/recurrence-marks.ts` | 14 | business_rule 6, service_method 4, config 2 |
| `frontend:components/timeline/useTimelineViewport.ts` | 14 | business_rule 6, config 2, convention 2 |
| `frontend:hooks/useEventEditConflict.test.tsx` | 14 | test_case 13, convention 1 |
| `backend:src/test/java/com/matimeline/eventmanager/utils/UtilsTest.java` | 13 | convention 5, business_rule 4, other 1 |
| `frontend:components/landing/HeroTimelineAnimation.tsx` | 13 | other 10, i18n_key 2, ui_screen 1 |
| `frontend:components/shared/DeleteConfirmDialog.intl.test.tsx` | 13 | test_case 8, convention 2, business_rule 1 |
| `frontend:components/timeline/EventPill.tsx` | 13 | business_rule 9, other 3, convention 1 |
| `frontend:components/timeline/TimelineEditHost.forbidden.test.tsx` | 12 | test_case 7, other 2, convention 1 |
| `frontend:components/timeline/TimelineResponsive.tsx` | 12 | business_rule 5, config 3, convention 2 |
| `frontend:components/timeline/TimelineSidebar.test.tsx` | 12 | test_case 12 |
| `frontend:components/timeline/TimelineView.perf.stories.tsx` | 12 | other 7, convention 2, config 1 |
| `frontend:components/timeline/label-reserve.ts` | 12 | business_rule 8, config 2, convention 1 |
| `frontend:components/ui/dialog.tsx` | 12 | other 7, convention 4, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java` | 11 | validation 7, business_rule 1, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java` | 11 | entity 9, other 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventDeleteStatisticsIntegrationTest.java` | 11 | test_case 6, convention 2, other 2 |
| `frontend:components/events/ArchiveConfirmDialog.tsx` | 11 | ui_screen 3, convention 2, i18n_key 2 |
| `frontend:components/timeline/EventDrawer.tsx` | 11 | ui_screen 6, convention 2, business_rule 1 |
| `frontend:components/timeline/TimelineBottomSheet.tsx` | 11 | business_rule 4, other 3, i18n_key 2 |
| `frontend:components/timeline/TimelineView.fullscreen-overlays.test.tsx` | 11 | test_case 7, convention 4 |
| `frontend:components/ui/dropdown-menu.tsx` | 11 | other 7, convention 4 |
| `frontend:components/ui/language-selector.tsx` | 11 | other 5, convention 2, suspicious 2 |
| `frontend:services/eventService.ts` | 11 | endpoint 6, service_method 2, suspicious 2 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java` | 10 | business_rule 3, persistence_query 3, service_method 3 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventOptimisticLockConflictIntegrationTest.java` | 10 | test_case 4, other 2, business_rule 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/ProductEventCreationIntegrationTest.java` | 10 | test_case 6, convention 3, other 1 |
| `frontend:components/EventEditForm.debounce.test.tsx` | 10 | other 4, test_case 3, convention 2 |
| `frontend:components/landing/HeroTimelineAnimation.test.tsx` | 10 | test_case 10 |
| `frontend:components/products/isPastEvent.ts` | 10 | business_rule 7, convention 2, suspicious 1 |
| `frontend:components/timeline/recurrence-marks.test.ts` | 10 | test_case 10 |
| `frontend:components/timeline/useFocusTrap.ts` | 10 | business_rule 5, convention 2, state_transition 2 |
| `frontend:components/timeline/zoom-incremental.test.ts` | 10 | test_case 6, other 3, business_rule 1 |
| `frontend:lib/recurrence.ts` | 10 | business_rule 4, convention 4, config 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImpl.java` | 9 | business_rule 3, validation 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewController.java` | 9 | business_rule 2, other 2, endpoint 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventConditionalCheckConstraintIntegrationTest.java` | 9 | test_case 4, db_change 2, other 1 |
| `frontend:components/products/eventSpan.ts` | 9 | business_rule 4, other 3, service_method 2 |
| `frontend:components/timeline/Minimap.tsx` | 9 | other 5, business_rule 2, service_method 1 |
| `frontend:components/timeline/TimelineMobileLandscape.stories.tsx` | 9 | other 7, business_rule 1, config 1 |
| `frontend:components/timeline/TimelineResponsive.rotation.test.tsx` | 9 | test_case 5, other 3, suspicious 1 |
| `frontend:components/ui/button.tsx` | 9 | convention 4, other 4, config 1 |
| `frontend:components/ui/form.tsx` | 9 | convention 4, other 3, suspicious 2 |
| `frontend:components/ui/palette-color-picker.tsx` | 9 | business_rule 2, config 2, convention 2 |
| `frontend:lib/event-palette.test.ts` | 9 | test_case 9 |
| `frontend:lib/recurrence.test.ts` | 9 | test_case 9 |
| `backend:src/main/resources/db/migration/V4__reconcile_events_constraints.sql` | 8 | db_change 4, config 1, convention 1 |
| `frontend:components/events/EventCategoryField.test.tsx` | 8 | test_case 7, convention 1 |
| `frontend:components/products/eventSpan.test.ts` | 8 | test_case 7, other 1 |
| `frontend:components/shared/ConflictDialog.intl.test.tsx` | 8 | test_case 6, convention 1, suspicious 1 |
| `frontend:components/timeline/useTimelineMobileGestures.ts` | 8 | business_rule 5, suspicious 2, service_method 1 |
| `frontend:components/ui/language-selector.a11y.test.tsx` | 8 | test_case 6, other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceExpansion.java` | 7 | other 3, business_rule 2, suspicious 2 |
| `backend:src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql` | 7 | business_rule 2, db_change 2, suspicious 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventControllerOwnershipTest.java` | 7 | test_case 4, convention 2, endpoint 1 |
| `frontend:components/events/EventCategoryField.tsx` | 7 | other 3, business_rule 2, i18n_key 1 |
| `frontend:components/events/EventFormDrawer.test.tsx` | 7 | test_case 5, convention 1, other 1 |
| `frontend:components/timeline/EventPin.tsx` | 7 | other 4, business_rule 2, convention 1 |
| `frontend:components/timeline/TimelineActionSheet.tsx` | 7 | business_rule 3, other 2, i18n_key 1 |
| `frontend:components/timeline/stress-fixtures.ts` | 7 | other 2, business_rule 1, config 1 |
| `frontend:components/timeline/useFocusTrap.test.tsx` | 7 | test_case 7 |
| `frontend:components/timeline/useTimelineViewport.scroll.test.tsx` | 7 | test_case 7 |
| `frontend:components/ui/dialog.test.tsx` | 7 | test_case 7 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/repositories/EventRepository.java` | 6 | persistence_query 3, suspicious 2, other 1 |
| `backend:src/main/resources/db/migration/V11__events_conditional_check_constraints.sql` | 6 | db_change 4, convention 1, other 1 |
| `backend:src/test/java/com/matimeline/eventmanager/application/dtos/EventCreationRequestContractTest.java` | 6 | convention 2, other 2, test_case 2 |
| `frontend:components/layout/CreateEventContext.tsx` | 6 | business_rule 2, convention 2, other 2 |
| `frontend:components/shared/DeleteConfirmDialog.test.tsx` | 6 | test_case 6 |
| `frontend:components/timeline/RecurrenceMarks.tsx` | 6 | other 4, business_rule 2 |
| `frontend:components/timeline/TimelineMobilePortrait.stories.tsx` | 6 | test_case 4, other 2 |
| `frontend:components/timeline/TimelineView.zoom-cache.test.tsx` | 6 | test_case 3, other 2, convention 1 |
| `frontend:components/timeline/label-reserve.test.ts` | 6 | test_case 4, other 1, suspicious 1 |
| `frontend:components/timeline/mobile-zoom-anchor.test.ts` | 6 | test_case 6 |
| `frontend:lib/event-palette.ts` | 6 | convention 5, business_rule 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/EventUpdateRequest.java` | 5 | convention 2, validation 2, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/RecurrencePreviewRequest.java` | 5 | validation 2, business_rule 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Event.java` | 5 | other 2, convention 1, entity 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandlerContractTest.java` | 5 | test_case 4, other 1 |
| `frontend:components/timeline/Ruler.tsx` | 5 | other 3, business_rule 1, ui_screen 1 |
| `frontend:components/timeline/TimelineToolbarActions.test.tsx` | 5 | test_case 3, other 2 |
| `frontend:components/timeline/fixtures.tsx` | 5 | other 3, config 1, convention 1 |
| `frontend:components/timeline/mobile-zoom-anchor.ts` | 5 | business_rule 3, other 2 |
| `frontend:components/ui/palette-color-picker.test.tsx` | 5 | test_case 5 |
| `frontend:hooks/useProductsWithEvents.test.tsx` | 5 | test_case 4, config 1 |
| `frontend:hooks/useSetEventArchived.test.tsx` | 5 | test_case 4, convention 1 |
| `frontend:hooks/useSetEventArchived.ts` | 5 | business_rule 2, entity 1, external_call 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java` | 4 | business_rule 1, entity 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/EventService.java` | 4 | convention 2, service_method 2 |
| `frontend:components/timeline/DateStamp.tsx` | 4 | other 2, business_rule 1, convention 1 |
| `frontend:components/timeline/EventPill.stories.tsx` | 4 | other 4 |
| `frontend:components/timeline/Ruler.stories.tsx` | 4 | other 4 |
| `frontend:components/ui/button.stories.tsx` | 4 | other 3, config 1 |
| `frontend:components/ui/checkbox.tsx` | 4 | other 3, convention 1 |
| `frontend:components/ui/switch.stories.tsx` | 4 | test_case 3, convention 1 |
| `frontend:hooks/useProductsWithEvents.ts` | 4 | business_rule 1, convention 1, entity 1 |
| `frontend:hooks/useRecurrencePreview.ts` | 4 | business_rule 1, entity 1, external_call 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/EventResponse.java` | 3 | convention 2, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/EventMapper.java` | 3 | business_rule 1, convention 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/RecurrenceEndDateBeforeStartException.java` | 3 | other 2, validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/EventCreateCommand.java` | 3 | business_rule 1, convention 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/EventUpdateCommand.java` | 3 | business_rule 2, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/RecurrenceExpansionService.java` | 3 | business_rule 1, service_method 1, validation 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventControllerValidationTest.java` | 3 | validation 2, business_rule 1 |
| `frontend:components/timeline/Cursor.tsx` | 3 | business_rule 2, other 1 |
| `frontend:components/ui/card.tsx` | 3 | other 2, convention 1 |
| `frontend:components/ui/checkbox.stories.tsx` | 3 | other 3 |
| `frontend:components/ui/dialog.stories.tsx` | 3 | other 3 |
| `frontend:components/ui/input.stories.tsx` | 3 | convention 2, other 1 |
| `frontend:components/ui/input.tsx` | 3 | other 2, convention 1 |
| `frontend:components/ui/select.tsx` | 3 | convention 2, other 1 |
| `frontend:hooks/useCreateEvent.ts` | 3 | convention 1, service_method 1, suspicious 1 |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/RecurrencePreviewResponse.java` | 2 | convention 1, other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/EndDateBeforeStartException.java` | 2 | other 2 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/EventConflictException.java` | 2 | other 2 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandlerErrorCodeTest.java` | 2 | suspicious 1, test_case 1 |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandlerOptimisticLockTest.java` | 2 | test_case 2 |
| `frontend:components/timeline/index.ts` | 2 | other 2 |
| `frontend:components/timeline/useTimelineMobileSelection.ts` | 2 | other 1, store_action 1 |
| `frontend:components/ui/card.stories.tsx` | 2 | other 2 |
| `frontend:components/ui/popoverPicker.tsx` | 2 | business_rule 1, convention 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/EventNotFoundException.java` | 1 | other 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/InvalidDurationUnitException.java` | 1 | validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/InvalidEventTypeException.java` | 1 | validation 1 |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/RecurrenceUnitRequiredException.java` | 1 | validation 1 |
| `frontend:components/layout/index.ts` | 1 | other 1 |
| `frontend:components/timeline/Cursor.stories.tsx` | 1 | other 1 |
| `frontend:components/timeline/DateStamp.stories.tsx` | 1 | other 1 |
| `frontend:components/ui/popover.tsx` | 1 | convention 1 |
| `frontend:components/ui/select.stories.tsx` | 1 | other 1 |
| `frontend:components/ui/spinner.tsx` | 1 | convention 1 |
| `frontend:components/ui/switch.tsx` | 1 | convention 1 |

## Structure (suite) {#t-structure_overflow}

| Pointeur | Symbole | Énoncé | Fait |
|---|---|---|---|
| `frontend:components/shared/ConflictDialog.tsx:187-193` | ConflictDialog.noChanges | En mode comparatif sans ligne de diff, un paragraphe affiche la clé noChanges à la place de la liste. | [#2486be5924e0efa5-1] |
| `frontend:components/shared/ConflictDialog.tsx:268-291` | ConflictDialog.legacyFooter | En mode legacy, le pied de dialog contient un bouton dismiss qui ferme le dialog et un bouton reload, tous deux désactivés pendant isSubmitting. | [#b1b738c1a09e8993-1] |
| `frontend:components/timeline/TimelineEditHost.tsx:221-229` | TimelineEditHost.DeleteConfirmDialog | Le DeleteConfirmDialog de variante event n'est monté que lorsqu'une cible deleteTarget est armée, avec isRecurring pris sur l'événement ciblé. | [#5613d1f0535a3c0c-1] |
| `frontend:components/timeline/TimelineEditHost.tsx:235-242` | TimelineEditHost.EventFormDrawer | Le drawer d'édition est ouvert si et seulement si un événement est en édition, avec testId timeline-edit-dialog et le titre products.edit.title. | [#a56fcae5e52ed344-1] |
| `frontend:components/events/NewEventDrawer.tsx:175-181` | shell-new-event-drawer-loading | Pendant le chargement des produits, le drawer affiche un spinner et le texte loadingProducts dans une zone role status. | [#373dcd6a26ce5a31-1] |
| `frontend:components/events/NewEventDrawer.tsx:193-195` | shell-new-event-drawer-empty | Sans produit, le drawer affiche le message emptyProducts à la place du formulaire. | [#186528da7771f7f1-1] |
| `frontend:components/events/NewEventDrawer.tsx:203-206` | EventCategoryField | La catégorie affichée est en lecture seule et dérivée du produit sélectionné, avec null si aucun produit n'est choisi. | [#577d97eafff824b6-1] |
| `frontend:components/events/NewEventDrawer.tsx:214-220` | NewEventDrawer.Select | Le sélecteur de produit est lié à effectiveProductId, et tout changement met à jour productId et remet productError à faux. | [#8c87b209ba1fee6e-1] |
| `frontend:components/events/NewEventDrawer.tsx:241-249` | shell-new-event-drawer-product-error | Une erreur de produit manquant s'affiche dans un bloc role alert avec le texte productRequired. | [#893017185deb62e3-1] |
| `frontend:components/layout/AppShell.tsx:229-232` | AppShell.aside | La sidebar est masquée sous md et rendue en flex à partir de md, large de 64px replié puis de 248px à partir de lg. | [#f8b8f922d51c401a-1] |
| `frontend:components/layout/AppShell.tsx:245-257` | AppShell.shell-sidebar-new-event-button | Le bouton Nouvel événement de la sidebar est bleu accent, pleine largeur, et appelle openCreateBlank. | [#c712a5ddd680f472-1] |
| `frontend:components/layout/AppShell.tsx:262-291` | AppShell.nav | Les liens de navigation pointent vers /{locale}/{id} pour dashboard, timeline et products, avec aria-current page sur le lien actif. | [#9ca13b63b7ebbf88-1] |
| `frontend:components/layout/AppShell.tsx:276-281` | AppShell.nav-link-active | Le lien actif reçoit la pilule primaire bg-primary text-primary-ink et font-medium, les autres liens reçoivent text-ink-muted. | [#3e874bad0cce20ac-1] |
| `frontend:components/layout/AppShell.tsx:378-387` | AppShell.shell-mobile-new-event-button | Le bouton flottant Nouvel événement est visible uniquement sous md, appelle openCreateBlank et porte aria-haspopup dialog. | [#7bec531d1874acfd-1] |
| `frontend:components/layout/AppShell.tsx:398-400` | AppShell.NewEventDrawer | Le NewEventDrawer n'est monté que lorsque showCreate est vrai, avec onClose closeCreate et initialProductId issu de createPrefillProductId. | [#6925cf0e3f61fcc8-1] |
| `frontend:components/shared/DeleteConfirmDialog.tsx:229-282` | DeleteConfirmDialog.reassign | Pour la variante category en réassignation, le dialogue affiche un libellé, une note serveur éventuelle, et soit un select de cibles soit un message noOtherCategory si aucune autre catégorie n'existe. | [#ac1c2cb89ef6a02e-1] |
| `frontend:components/events/EventFormDrawer.tsx:76-86` | EventFormDrawer | EventFormDrawer est la coque de formulaire d'événement qui rend un drawer ou une bottom sheet selon la variante, avec titre, sous-titre, testId et contenu en render prop. | [#baefd232b6127019-1] |
| `frontend:components/timeline/TimelineLandscapeDrawer.tsx:92-99` | timeline-landscape-drawer-overlay | L'overlay du drawer ferme le drawer au clic via onClose et est masqué aux lecteurs d'écran. | [#fb5a266d879a8b93-1] |
| `frontend:components/timeline/TimelineLandscapeDrawer.tsx:110-118` | timeline-landscape-drawer-close | Le bouton fermer est un button type button avec classe mt-drawer__close--touch, aria-label traduit, qui appelle onClose. | [#533d47c2257bd3a8-1] |
| `frontend:components/timeline/TimelineBottomSheet.tsx:125-142` | TimelineBottomSheet | La feuille détail est un dialog modal labellisé par le titre, avec une zone de glissement, un bouton de fermeture et un corps décrit par aria-describedby. | [#f46846563e48da24-1] |
| `frontend:components/timeline/EventDrawer.tsx:40` | EventDrawer | Le composant ne rend rien lorsque la prop event vaut null. | [#04cb39a93251c310-1] |
| `frontend:components/timeline/EventDrawer.tsx:51` | EventDrawer | Un clic sur l'overlay du drawer appelle onClose. | [#04cb39a93251c310-2] |
| `frontend:components/timeline/EventDrawer.tsx:52-59` | EventDrawer | Le panneau est rendu comme dialogue modal avec aria-label égal au titre de l'événement et le testid timeline-drawer. | [#04cb39a93251c310-3] |
| `frontend:components/timeline/EventDrawer.tsx:89-94` | EventDrawer | La date de début est rendue dans un élément time dont l'attribut dateTime provient de toLocalIsoDate appliqué à startDate. | [#04cb39a93251c310-4] |
| `frontend:components/timeline/EventDrawer.tsx:110-122` | EventDrawer | Le pied de drawer avec le bouton d'édition n'est rendu que si la prop onEdit est fournie. | [#04cb39a93251c310-5] |
| `frontend:components/timeline/EventDrawer.tsx:115` | EventDrawer | Le bouton d'édition appelle onEdit avec l'événement courant. | [#04cb39a93251c310-6] |
| `frontend:components/events/ArchiveConfirmDialog.tsx:48-104` | ArchiveConfirmDialog | Le dialog de confirmation d'archivage n'a pas d'état interne, son ouverture et son issue étant pilotées par le parent via open, onOpenChange et onConfirm. | [#3904731cf2247666-1] |
| `frontend:components/events/ArchiveConfirmDialog.tsx:83-91` | ArchiveConfirmDialog | Le bouton Annuler ferme le dialog en appelant onOpenChange avec false, sans appeler onConfirm. | [#3904731cf2247666-2] |
| `frontend:components/events/ArchiveConfirmDialog.tsx:92-99` | ArchiveConfirmDialog | Le bouton de confirmation appelle onConfirm et porte le data-testid event-archive-confirm-button. | [#3904731cf2247666-3] |
| `frontend:components/events/EventPreviewTimeline.tsx:110-122` | EventPreviewTimeline | Le composant EventPreviewTimeline est l'aperçu live de la mini-frise du formulaire d'événement, il reçoit titre, couleur, type, durée, dates, récurrence et une référence now optionnelle. | [#671303833eb59938-1] |
| `frontend:components/timeline/TimelineActionSheet.tsx:81-88` | TimelineActionSheet | La feuille d'actions est un dialog modal labellisé par le titre de l'événement, avec les boutons modifier, supprimer et annuler. | [#d6c5d5c6e69d7feb-1] |
| `frontend:components/events/EventCategoryField.tsx:39-80` | EventCategoryField | Le champ Catégorie est un composant en lecture seule rendu uniquement avec des div et span, donc sans élément focalisable. | [#c290ff15181ecc0f-1] |
| `frontend:components/timeline/Minimap.tsx:24-31` | Minimap | Le composant Minimap rend des barres de densité et une fenêtre de sélection (viewport) positionnée selon viewportStart et viewportRatio. | [#ee8b5acd5f1d27ca-1] |
| `frontend:components/timeline/Ruler.tsx:37-54` | Ruler | Le Ruler rend une barre d'en-tête flex contenant une colonne ressources optionnelle et une grille de jours. | [#cbbb736a269875b4-1] |
| `frontend:components/landing/HeroTimelineAnimation.tsx:186-203` | HeroTimelineAnimation | La frise décorative du hero rend un conteneur aria-hidden, une piste avec deux copies de bloc et un curseur TODAY fixe hors de la piste. | [#f537817c1d5c91a2-1] |
| `frontend:types/event.ts:41-61` | eventSchema | eventSchema décrit le DTO événement avec id, title, type, dates, productId, isAllDay, color, archived (booléen obligatoire) et version optionnelle. | [#2ab37459894a81d3-1] |
| `frontend:components/EventEditForm.tsx:77` | EventSubmitState | Le type EventSubmitState énumère cinq états de soumission : idle, submitting, error, forbidden et conflict. | [#ae130655f45f72c0-1] |
| `frontend:components/timeline/TimelineSidebar.tsx:39-46` | TimelineSidebarCategory | L'interface TimelineSidebarCategory porte le nom, la couleur nullable, le nombre d'événements et l'indicateur de masquage d'une catégorie. | [#23915fed99f6fbbe-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:16-18` | EventEntity | EventEntity est mappée sur la table events et porte un AuditingEntityListener pour l'audit des dates. | [#14dc8524b3c647c3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:21-23` | EventEntity.id | L'identifiant id est un UUID généré par GenerationType.AUTO. | [#3e68e4ea930a64c2-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:25-31` | EventEntity.createdAt | created_at est non nul et non modifiable, updated_at est non nul, les deux sont pilotés par l'audit. | [#01f38881b9caa6c9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:33-35` | EventEntity.version | Le champ version est annoté @Version, non nul, et n'a pas de setter. | [#ac2feb0c65d695b0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:43-45` | EventEntity.recurrenceUnit | recurrenceUnit est persisté en chaîne via @Enumerated(EnumType.STRING) dans la colonne recurrence_unit. | [#b93c87fb9794fe92-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:47-48` | EventEntity.recurrenceEndDate | recurrenceEndDate est persisté dans la colonne recurrence_end_date. | [#ef87757715821aeb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:55-56` | EventEntity.archived | Le champ archived est un boolean non nul, initialisé à false. | [#29c24111a7e66143-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:58-61` | EventEntity.product | Chaque event est rattaché à un ProductEntity non nul via la colonne product_id, avec une annotation JsonBackReference sur la relation. | [#e728103885db3ab0-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:191-197` | EventEntity.equals | equals compare les entités par id non null, et hashCode renvoie un code constant dérivé de la classe. | [#8f73b2f51593d54c-1] |
| `frontend:hooks/useSetEventArchived.ts:30-48` | useSetEventArchived | Le hook useSetEventArchived est une mutation TanStack qui PATCH le flag archived avec la version détenue de l'événement. | [#c412f6b248fdcb83-1] |
| `frontend:hooks/useProductsWithEvents.ts:23-29` | useProductsWithEvents | Le hook useProductsWithEvents est une query TanStack qui sert la liste des produits, cache clé par userId. | [#b3f887927958698c-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java:15-18` | RecurrenceUnit | RecurrenceUnit est une énumération de trois constantes, WEEK, MONTH et YEAR. | [#53c142807d114b66-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/Event.java:6-83` | Event | Event est un modèle domaine sans annotation JPA, portant id, title, type, durée, isRecurring, recurrenceUnit typé RecurrenceUnit, recurrenceEndDate, startDate, endDate, productId, isAllDay, color, archived et version. | [#9f47cf2ed415c352-1] |
| `frontend:hooks/useRecurrencePreview.ts:31-53` | useRecurrencePreview | Le hook useRecurrencePreview est une query TanStack qui interroge l'aperçu de récurrence à partir de startDate, recurrenceUnit et recurrenceEndDate. | [#b804ab7ee7eaacbd-1] |
| `frontend:components/timeline/zoom.ts:88-89` | zoomReducer | L'action PREV_PERIOD retranche au décalage le nombre de jours de la période du niveau courant. | [#a01296ecde08d056-1] |
| `frontend:components/timeline/zoom.ts:92-95` | zoomReducer | L'action FIT pose le niveau et le décalage reçus, en produisant toujours un nouvel objet d'état. | [#a01296ecde08d056-2] |
| `frontend:components/timeline/TimelineView.tsx:716` | TimelineView.toggleCategory | La bascule de repli d'une catégorie inverse son état dans le record collapsed, avec une valeur par défaut à false. | [#1f30fe13893d048d-1] |
| `frontend:components/timeline/TimelineView.tsx:1458` | TimelineView.fitToEvents | La touche F envoie une action FIT calculée à partir de l'étendue des événements affichés. | [#a095e1727c20743d-1] |
| `frontend:components/timeline/TimelineView.tsx:1553-1557` | TimelineView.onWheel | La molette combinée à Cmd ou Ctrl envoie une action ZOOM_IN si deltaY est négatif, sinon ZOOM_OUT, et annule le défilement natif. | [#4a15b87eefc01f49-1] |
| `frontend:components/timeline/TimelineView.tsx:1602` | TimelineView.onKey | Échap sans panneau de sidebar ouvert ferme le drawer en posant la sélection à null. | [#578c4c8c35be0388-1] |
| `frontend:components/timeline/useTimelineMobileSelection.ts:22-26` | useTimelineMobileSelection | Le hook garde en état local deux valeurs, selected et actionTarget, initialisées à null et exposées avec leurs setters. | [#47b8690491df50c3-1] |

## Règles métier {#t-business_rule}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java:50-55` | Javadoc : Selon la javadoc, recurrenceUnit doit être non vide quand isRecurring vaut true. | [#7977434abbbee36a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/RecurrencePreviewRequest.java:35` | Javadoc : Selon la javadoc, une recurrenceEndDate null donne une récurrence indéfinie bornée par l'horizon. | [#5c1c3b2d0011a881-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/mappers/EventMapper.java:46` | Lors de la conversion vers l'entité, startDate prend la date du jour si elle est null. | [#ccf1687748af6a6d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:51` | La startDate d'un événement créé est la date fournie, ou la date du jour si la date est absente. | [#1426ab5c3f700cf3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:60` | Commentaire : Selon le commentaire, un événement ne peut pas naître archivé, et le code passe false comme valeur archived à la création. | [#1426ab5c3f700cf3-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:72` | L'endDate à la création est calculée par Utils.calculateEndDate à partir du type, de la durée, de l'unité et de startDate. | [#1426ab5c3f700cf3-3] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:169-175` | Si un facteur de date change (type, durée, unité ou startDate) et que le type fusionné vaut duration, endDate est recalculée par Utils.calculateEndDate à partir de la durée. | [#469d0ef9c8a70cdc-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:180-183` | Si un facteur de date change, que le type n'est pas duration et que le payload ne contient pas endDate, endDate suit startDate. | [#469d0ef9c8a70cdc-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:226-233` | findDomainEventByProductId lève EventNotFoundException quand aucun événement n'existe pour le produit demandé. | [#ea481078628f80de-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImpl.java:44-51` | Une série sans recurrenceEndDate est bornée par l'horizon MAX_UNBOUNDED_EXPANSION_YEARS à partir de startDate, tandis qu'une borne explicite est utilisée telle quelle. | [#592a138d8cdd8079-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImpl.java:57-64` | La boucle s'arrête dès que le nombre d'occurrences atteint MAX_OCCURRENCES, et capped n'est vrai que si l'occurrence suivante reste dans la fenêtre. | [#592a138d8cdd8079-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImpl.java:68-73` | Commentaire : Selon le commentaire, une série indéfinie est toujours tronquée, et le code force capped à true quand recurrenceEndDate est null. | [#592a138d8cdd8079-3] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/EventCreateCommand.java:20` | Javadoc : Selon la javadoc, une date null est remplacée par LocalDate.now() par le service de création. | [#78203916da9123ae-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/EventUpdateCommand.java:12-13` | Javadoc : Selon la javadoc, un champ null signifie non fourni et n'est pas appliqué lors de la mise à jour. | [#f4012890ec616fdd-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/EventUpdateCommand.java:23-25` | Javadoc : Selon la javadoc, une version null désactive le contrôle optimiste, et une version non nulle déclenche un contrôle déterministe contre la version serveur. | [#c06ba7d3fafdf739-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceExpansion.java:35` | La constante fixe un plafond de 4000 occurrences générées. | [#88be71a4931b03eb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceExpansion.java:57` | La constante fixe à 5 ans l'horizon temporel d'une récurrence sans recurrenceEndDate. | [#fa69178877d2f4c1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java:30-51` | fromString retourne null pour une valeur null ou vide après trim, ignore la casse et accepte les pluriels WEEKS, MONTHS et YEARS. | [#248944a8cbcae2ab-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/RecurrenceExpansionService.java:25-28` | Javadoc : Selon la javadoc, une recurrenceEndDate null rend la récurrence indéfinie, bornée à l'horizon de 5 ans. | [#35373c929ca9c34a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java:81-93` | Sur ObjectOptimisticLockingFailureException, updateEvent recharge l'état serveur et lève EventConflictException avec l'événement et sa version serveur. | [#fd4d8848bb37eb45-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:49-52` | Les exceptions NotFound de event, product, category, user, session et avatar renvoient un 404 avec le message fixe Resource not found. | [#272f8d8d7d9c6abc-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:62` | Un conflit de nom de catégorie renvoie un 409 avec le message category name already used. | [#2ec38dbbb7028c3f-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:73` | La suppression d'une catégorie encore référencée renvoie un 409 dont le corps reprend le message de l'exception. | [#dc9d7f6d51ee0804-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:136-144` | Une cible de réassignation identique à la catégorie supprimée renvoie un 409 avec le message de l'exception. | [#8013392c9c32836a-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:165-175` | Une durationUnit null ou inconnue pour un type duration renvoie un 422 avec le message de l'exception. | [#46a69cbe989ff7c9-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:190-200` | Une recurrenceEndDate antérieure à startDate renvoie un 422. | [#a2b9636c20b33081-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:202-218` | Un conflit de version sur un event renvoie un 409 avec un message neutre, la serverVersion et le serverEvent projeté en EventResponse. | [#c1e0541b0e22e2d8-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:220-242` | Un ObjectOptimisticLockingFailureException renvoie un 409 avec le message générique resource was modified concurrently, please retry. | [#643167fc6dd0c710-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:244-256` | Un état fusionné avec endDate antérieure à startDate renvoie un 422. | [#edd127029e1e54f1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewController.java:49-52` | Javadoc : Selon la javadoc, le flag capped de la réponse provient uniquement de expansion.capped() et n'est jamais recalculé. | [#3d3833bc55d18a44-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewController.java:71-74` | Une IllegalArgumentException levée par expand est convertie en RecurrenceEndDateBeforeStartException, mappée en 422. | [#3d3833bc55d18a44-2] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java:69-76` | Si l'événement a un id et que l'entité existe en base, save recopie les champs mutables sur l'entité gérée puis la sauvegarde. | [#35b6f28399936d6e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java:84-98` | La copie des champs mutables porte title, type, durée, récurrence, dates, isAllDay, color, archived et product, mais pas le champ version. | [#185e3db446432160-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java:132-134` | Commentaire : Selon le commentaire, la suppression ne vérifie plus le verrou optimiste @Version et la suppression gagne toujours. | [#b31eb2a67b375ddb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/utils/Utils.java:12-13` | Javadoc : Selon la javadoc, la liste des types autorisés reprend la contrainte DB ck_events_type de la migration V4, et vaut duration et single. | [#375abee75427d2ba-1] |
| `backend:src/main/java/com/matimeline/eventmanager/utils/Utils.java:34-40` | La surcharge façade calculateEndDate délègue à la version par champs primitifs avec type, durationValue, durationUnit et startDate. | [#f4f32f85e851330e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/utils/Utils.java:55-59` | Si le type n'est pas duration ou si durationValue est null, endDate vaut startDate. | [#f4f32f85e851330e-2] |
| `backend:src/main/java/com/matimeline/eventmanager/utils/Utils.java:63-71` | Le calcul ajoute la durée à startDate selon l'unité days, weeks, months ou years, via plusDays, plusWeeks, plusMonths ou plusYears. | [#f4f32f85e851330e-3] |
| `backend:src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql:37-55` | La migration V9 convertit les alias de recurrence_unit (week, weeks, weekly, hebdo, month, monthly, mensuel, year, yearly, annuel, etc.), insensibles à la casse et au trim, vers WEEK, MONTH ou YEAR. | [#78acee298304ea8b-1] |
| `backend:src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql:60-63` | La migration V9 remet recurrence_unit à NULL pour toute valeur non NULL qui n'appartient pas à WEEK, MONTH ou YEAR, ce qui efface l'unité sans supprimer l'event. | [#78acee298304ea8b-2] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:199-211` | Une version client égale à la version serveur permet l'application du PATCH. | [#e370bdb988537f40-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:215-227` | Un PATCH sans version client ne déclenche pas le contrôle de version et est appliqué même si la version serveur a changé. | [#77dd8c981ff18eea-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:229-246` | Un nouveau durationValue recalcule endDate à partir de la startDate persistée. | [#fc0a78cd931fbfbd-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:248-264` | Un changement de durationUnit vers weeks recalcule endDate à partir de la startDate persistée, avec la durée exprimée en semaines. | [#e027186fb6b37698-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:266-287` | Un PATCH qui passe un événement duration en single sans date fournie ramène endDate sur la startDate persistée. | [#6e414c0dbd38e764-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:289-306` | Un PATCH ne modifiant que la couleur ne recalcule pas endDate. | [#50713e907064d823-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:308-329` | Pour un événement non duration, une endDate explicite fournie au PATCH est persistée telle quelle avec la startDate fournie. | [#749db667a0d97e9e-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:331-355` | Pour un événement duration, déplacer startDate réécrit endDate à la nouvelle startDate plus la durée, et la endDate explicite du PATCH est ignorée. | [#f73dd48a5b56fad3-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:357-376` | Pour un événement single, déplacer startDate sans endDate explicite fait suivre endDate sur la nouvelle startDate. | [#95b4f1d5e7f88265-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:401-418` | Une endDate égale à la startDate est acceptée comme borne inclusive. | [#0bacc6b111c7d53a-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:435-455` | Un PATCH mettant isRecurring à true est accepté si l'événement possède déjà une recurrenceUnit en base. | [#e4ee60f9a1180bbd-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:595-612` | Une recurrenceEndDate égale à la startDate est acceptée. | [#79ffaef42fcd5554-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImplTest.java:65-82` | Une série sans date de fin s'arrête à START plus RecurrenceExpansion.MAX_UNBOUNDED_EXPANSION_YEARS, pour chaque unité, et est marquée capped. | [#cb1e25dda93d2d08-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImplTest.java:108-116` | Une borne explicite au-delà de l'horizon est honorée telle quelle, la série se termine à cette borne et n'est pas marquée capped. | [#9929933438d8d655-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImplTest.java:128-136` | Une borne au-delà du plafond d'occurrences tronque la série à MAX_OCCURRENCES et la marque capped. | [#86b26135cf68086b-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventControllerValidationTest.java:63-75` | Commentaire : Un événement avec isRecurring à true et sans recurrenceUnit est rejeté en 400 par la contrainte @AssertTrue, et le service n'est pas appelé. | [#e8a032c6cf2f93ba-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewControllerTest.java:100-116` | Une recurrenceEndDate antérieure à startDate, signalée par IllegalArgumentException du service, est traduite en réponse 422 avec error=unprocessable_entity. | [#82e1a17509802d6c-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventOptimisticLockConflictIntegrationTest.java:176-194` | Javadoc : Selon le commentaire, depuis #175 la suppression passe par un DELETE bulk JPQL, sans clause de version, et l'emporte sur une édition concurrente. | [#e5ce43cebc3930b0-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventPatchAndRecurrenceIntegrationTest.java:140-144` | Javadoc : Selon la javadoc, pour un event de type duration, un PATCH qui déplace startDate recalcule endDate depuis la durée stockée, et l'endDate explicite fournie est écrasée. | [#6eb5c16f190676b3-1] |
| `backend:src/test/java/com/matimeline/eventmanager/utils/UtilsTest.java:21-26` | Pour le type duration, calculateEndDate ajoute durationValue jours, semaines, mois ou années à la date de début selon durationUnit. | [#9d8ca0954a7123c8-1] |
| `backend:src/test/java/com/matimeline/eventmanager/utils/UtilsTest.java:28-31` | Pour le type single, calculateEndDate renvoie la date de début sans ajout de durée. | [#9d8ca0954a7123c8-2] |
| `backend:src/test/java/com/matimeline/eventmanager/utils/UtilsTest.java:33-36` | Un type inconnu est traité comme single et renvoie la date de début. | [#9d8ca0954a7123c8-3] |
| `backend:src/test/java/com/matimeline/eventmanager/utils/UtilsTest.java:38-41` | Pour le type duration avec durationValue null, calculateEndDate renvoie la date de début. | [#9d8ca0954a7123c8-4] |
| `frontend:components/EventEditForm.debounce.test.tsx:55-56` | Le délai de debounce utilisé par useDebounced dans EventEditForm est fixé à 150 ms. | [#5865c9dee8921aca-1] |
| `frontend:components/EventEditForm.test.tsx:349-357` | Sans modification du champ version, la soumission renvoie la version d'origine lue au chargement. | [#a945c7e3a4aa7257-1] |
| `frontend:components/EventEditForm.test.tsx:458-462` | En mode create, le toggle et la confirmation d'archivage ne sont pas rendus, archived étant réservé au PATCH. | [#a945c7e3a4aa7257-2] |
| `frontend:components/EventEditForm.test.tsx:466-476` | La liste des champs verrouillables d'un événement archivé comprend titre, durée, dates, couleur, récurrence et les pastilles de palette ainsi que le champ couleur personnalisé. | [#78539957e3f690ee-1] |
| `frontend:components/EventEditForm.test.tsx:636-641` | Le hint de plafond est informatif et ne bloque pas la soumission, onSubmit étant appelé même si capped vaut true. | [#d7ae5fa3bf868b9a-1] |
| `frontend:components/EventEditForm.test.tsx:697-709` | Commentaire : En mode compact, les valeurs des champs démontés (couleur, isRecurring) restent dans le payload soumis. | [#3f7a50dda7498580-1] |
| `frontend:components/EventEditForm.tsx:45` | Javadoc : Selon la javadoc, la règle BR-EVE-002 impose endDate supérieure ou égale à startDate, la validation effective étant portée par le schéma Zod importé depuis types/event.ts. | [#7942fe8fafa41166-1] |
| `frontend:components/EventEditForm.tsx:46` | Javadoc : Selon la javadoc, la règle BR-EVE-003 impose un titre requis de 1 à 100 caractères. | [#7942fe8fafa41166-2] |
| `frontend:components/EventEditForm.tsx:47` | Javadoc : Selon la javadoc, la règle BR-EVE-006 rend recurrenceUnit obligatoire lorsque isRecurring vaut true. | [#7942fe8fafa41166-3] |
| `frontend:components/EventEditForm.tsx:48` | Javadoc : Selon la javadoc, la règle BR-EVE-009 exige une couleur hexadécimale valide pour le modèle à une couleur backgroundColor. | [#7942fe8fafa41166-4] |
| `frontend:components/EventEditForm.tsx:199` | La table RECURRENCE_UNIT_KEY fait correspondre les valeurs WEEK, MONTH et YEAR de recurrenceUnit aux clés i18n weeks, months et years. | [#77bff91060b47eb5-1] |
| `frontend:components/EventEditForm.tsx:299-306` | Javadoc : Selon le commentaire, le verrouillage d'un événement archivé passe par l'attribut disabled du nœud DOM et non par l'option disabled de react-hook-form, afin de conserver les valeurs dans l'état du formulaire. | [#f88c77b50d4a8079-1] |
| `frontend:components/EventEditForm.tsx:309` | Le formulaire passe en lecture seule lorsqu'il n'est pas en mode création et que le champ archived vaut true. | [#f88c77b50d4a8079-2] |
| `frontend:components/EventEditForm.tsx:335` | Le type d'aperçu vaut 'duration' si le type saisi est 'duration', sinon 'single', quelle que soit la valeur hors enum. | [#e6ab39e2faa5bb8b-1] |
| `frontend:components/EventEditForm.tsx:370` | La requête de prévisualisation de récurrence n'est active que si la récurrence est activée et que le formulaire n'est pas en mode création. | [#f68415060049f0fb-1] |
| `frontend:components/EventEditForm.tsx:480` | Le bouton de suppression est désactivé lorsque la soumission est en cours ou que l'application est hors ligne. | [#2b1c3e9a0434ba34-1] |
| `frontend:components/EventEditForm.tsx:508` | Le bouton d'enregistrement est désactivé lorsque la soumission est en cours ou que l'application est hors ligne. | [#2b1c3e9a0434ba34-2] |
| `frontend:components/EventEditForm.tsx:687-688` | Commentaire : Selon le commentaire, le champ endDate est masqué à la création car le backend le calcule à partir du type et de la durée, et le code ne rend endDate que si le mode n'est pas create. | [#1ff4415120699399-1] |
| `frontend:components/EventEditForm.tsx:739` | Commentaire : En mode compact, la récurrence et la couleur sont retirées du rendu, leurs valeurs restant dans l'état du formulaire. | [#b84add054129ae5e-1] |
| `frontend:components/EventEditForm.tsx:850-859` | Un indice role status non bloquant est affiché lorsque la prévisualisation de récurrence est plafonnée, sans bloquer la soumission. | [#7b93732e5065a363-1] |
| `frontend:components/EventEditForm.tsx:1001` | L'aperçu est rendu dans le nœud de portail fourni par le parent, et n'est pas rendu lorsque compact vaut true. | [#690f46033da1b4f3-1] |
| `frontend:components/events/ArchiveConfirmDialog.tsx:73-76` | Selon le commentaire, l'archivage est réversible par PATCH (BR-EVE-013) et le dialog l'annonce pour ne pas le lire comme une suppression. | [#0ccb79dec5bf6da6-1] |
| `frontend:components/events/EventCategoryField.tsx:47-56` | Le champ est considéré comme rempli seulement si le nom de catégorie est truthy, sinon il affiche l'état vide et data-empty vaut true. | [#7856a5b774c5ca9d-1] |
| `frontend:components/events/EventCategoryField.tsx:65-66` | Quand la couleur vaut null, la pastille reçoit data-color none et aucun style inline, sinon elle reçoit la couleur en background et en border. | [#fe6d8a6f408f5ce4-1] |
| `frontend:components/events/EventFormDrawer.tsx:91-92` | La variante bottom sheet est choisie quand la largeur de fenêtre est inférieure ou égale à 1023 px. | [#3285ee3ce4586bab-1] |
| `frontend:components/events/EventFormDrawer.tsx:131-135` | Le suivi du clavier virtuel n'est activé que lorsque la coque est ouverte et en variante bottom sheet. | [#3c75426eae5b7741-1] |
| `frontend:components/events/EventFormDrawer.tsx:145` | Le composant ne rend rien quand open vaut false ou quand document n'est pas défini. | [#63d6a59a91a6f85e-1] |
| `frontend:components/events/EventFormDrawer.tsx:147-148` | L'aperçu épinglé n'est rendu qu'en drawer et seulement si un formulaire est présent, tandis que le pied sticky n'est rendu qu'en bottom sheet avec formulaire. | [#fd66673a360e8dc7-1] |
| `frontend:components/events/EventFormDrawer.tsx:202-206` | L'indication clavier Échap n'est rendue que hors bottom sheet. | [#63d6a59a91a6f85e-2] |
| `frontend:components/events/EventPreviewTimeline.tsx:101` | Le contour planché n'est calculé que si outlineTintPercent n'est pas null, sinon la barre pleine n'a pas de contour planché. | [#17be25f0ad3fa03e-1] |
| `frontend:components/events/EventPreviewTimeline.tsx:129-130` | La date de référence « aujourd'hui » est la prop now si elle est fournie, sinon une date figée au premier rendu du composant. | [#737f86c7e788166b-1] |
| `frontend:components/events/NewEventDrawer.test.tsx:251-262` | Un initialProductId absent de la liste de produits chargée laisse le sélecteur vide, déclenche l'erreur produit et n'appelle pas createEvent. | [#33f76c08c2a8b71c-1] |
| `frontend:components/events/NewEventDrawer.test.tsx:569-603` | Commentaire : En compact, une hauteur visible du viewport sous 600 px met le panneau en état data-keyboard open avec data-compact true et une hauteur max de 494 px, et retire le champ couleur. | [#97bc9ff7b009be4a-1] |
| `frontend:components/events/NewEventDrawer.tsx:106` | L'identifiant de produit retenu n'est transmis que s'il correspond à un produit de la liste chargée, sinon la valeur est une chaîne vide. | [#38340304a8e5d870-1] |
| `frontend:components/events/NewEventDrawer.tsx:144` | Le formulaire et le pied ne sont rendus que si le chargement des produits est terminé et qu'au moins un produit existe. | [#3da6de06a330851c-1] |
| `frontend:components/events/NewEventDrawer.tsx:146-161` | Le formulaire démarre avec un type duration, une durée de 1 unité en jours, une récurrence désactivée et une date de début égale à aujourd'hui. | [#2678451a3caa2a68-1] |
| `frontend:components/events/NewEventDrawer.tsx:159` | La date de début par défaut est la date du jour en local, selon la règle BR-EVE-005 citée dans le commentaire voisin. | [#2678451a3caa2a68-2] |
| `frontend:components/events/previewTimeline.ts:36-39` | La frise compte 6 colonnes et une barre a une largeur minimale de 2.5 pourcent. | [#d7bb39e5a614500a-1] |
| `frontend:components/events/previewTimeline.ts:54-65` | addDurationUnits ajoute des jours, des semaines (7 jours), des mois et des années (12 mois) selon l'unité de durée. | [#52737a787c4859c8-1] |
| `frontend:components/events/previewTimeline.ts:72` | La recherche d'occurrence future est plafonnée à 5000 itérations. | [#302bf8844c510f0f-1] |
| `frontend:components/events/previewTimeline.ts:84-87` | Javadoc : Selon le commentaire, l'occurrence fantôme rendue ne bouge pas, alors que le code part de ghostStart pour la légende seulement. | [#ca767a1a40c17d6c-1] |
| `frontend:components/events/previewTimeline.ts:89-97` | resolveNextOccurrence avance la récurrence tant que l'occurrence est antérieure à today, dans la limite de MAX_OCCURRENCE_STEPS. | [#ca767a1a40c17d6c-2] |
| `frontend:components/events/previewTimeline.ts:152-165` | Javadoc : Selon le commentaire, la garde est != null et non > 0 pour suivre Utils.calculateEndDate, et le code applique bien cette garde à durationValue. | [#4f0677af0e6e2958-1] |
| `frontend:components/events/previewTimeline.ts:157-165` | La fin de l'occurrence vaut début plus durée si le type est duration avec une valeur et une unité, sinon l'endDate saisie si elle n'est pas antérieure au début, sinon le début. | [#4f0677af0e6e2958-2] |
| `frontend:components/events/previewTimeline.ts:163` | Une endDate saisie est retenue seulement si elle est présente et ne précède pas la date de début. | [#4f0677af0e6e2958-3] |
| `frontend:components/events/previewTimeline.ts:177-181` | La date de début vaut startDate si elle est valide, sinon aujourd'hui, et la récurrence n'est retenue que si isRecurring est vrai. | [#f3969a5f79c7bc44-1] |
| `frontend:components/events/previewTimeline.ts:180-181` | Sans recurrenceUnit, la récurrence est ignorée et aucun fantôme n'est produit, selon BR-EVE-006. | [#f3969a5f79c7bc44-2] |
| `frontend:components/events/previewTimeline.ts:196-200` | La fenêtre ajoute une marge d'au moins un jour, égale à environ 15 pour cent de l'étendue, et les colonnes ont un pas d'au moins un jour. | [#f3969a5f79c7bc44-3] |
| `frontend:components/events/previewTimeline.ts:224-228` | Un connecteur pointillé n'est produit que si l'écart entre la fin de l'occurrence pleine et le début du fantôme est positif. | [#f3969a5f79c7bc44-4] |
| `frontend:components/events/previewTimeline.ts:231-243` | todayPercent vaut null lorsque today est hors de la fenêtre, sinon sa position en pourcentage. | [#f3969a5f79c7bc44-5] |
| `frontend:components/events/previewTimeline.ts:244-247` | nextOccurrence vaut la première occurrence non passée à partir du fantôme si une récurrence existe, sinon le début de l'occurrence saisie. | [#f3969a5f79c7bc44-6] |
| `frontend:components/layout/AppShell.tsx:186` | Les déclencheurs propres au shell ouvrent le drawer sans produit présélectionné, car l'événement souris n'est pas transmis à openCreate. | [#bb23412659966d0a-1] |
| `frontend:components/layout/AppShell.tsx:198-205` | Les initiales de l'avatar sont formées par la première lettre des deux premiers mots du nom affiché, en majuscules. | [#c259af29e99b16c8-1] |
| `frontend:components/layout/AppShell.tsx:207-224` | Le shell affiche un spinner plein écran tant que la session se restaure ou qu'aucun utilisateur n'est présent, sans rendre la chrome authentifiée. | [#237d0f3d8f51641a-1] |
| `frontend:components/layout/CreateEventContext.tsx:48-54` | toCreateEventPrefill renvoie le productId seulement si l'argument est un objet simple dont productId est une chaîne non vide, sinon undefined. | [#149641dd1c6df457-1] |
| `frontend:components/layout/CreateEventContext.tsx:51` | Un argument dont le prototype n'est ni Object.prototype ni null est rejeté et renvoie undefined. | [#149641dd1c6df457-2] |
| `frontend:components/products/eventSpan.ts:19` | Un événement dont le début est illisible est ignoré dans le calcul de l'étendue. | [#301a11c02cfb1fd9-1] |
| `frontend:components/products/eventSpan.ts:20-23` | Une fin vide ou illisible prend la valeur du début pour calculer la borne de fin. | [#301a11c02cfb1fd9-2] |
| `frontend:components/products/eventSpan.ts:26` | La borne to est au minimum égale à from, par Math.max(min, max). | [#301a11c02cfb1fd9-3] |
| `frontend:components/products/eventSpan.ts:49-50` | L'année est affichée si la borne de début ou la borne de fin tombe hors de l'année de today. | [#84cedd0a2f15409f-1] |
| `frontend:components/products/isPastEvent.ts:47-77` | isPastEvent renvoie vrai si la date de fin, ou la date de début à défaut, est strictement antérieure au jour civil local de today. | [#d078d55ea269fede-1] |
| `frontend:components/products/isPastEvent.ts:49-50` | Une date de fin vide ou illisible est remplacée par la date de début. | [#d078d55ea269fede-2] |
| `frontend:components/products/isPastEvent.ts:55` | Un événement non récurrent est passé si son jour civil de fin est strictement antérieur au jour civil de today. | [#d078d55ea269fede-3] |
| `frontend:components/products/isPastEvent.ts:57` | Une série récurrente sans recurrenceEndDate n'est jamais considérée comme passée. | [#d078d55ea269fede-4] |
| `frontend:components/products/isPastEvent.ts:61` | L'horizon de la série est calculé par seriesHorizon à partir de l'origine, de l'unité et de recurrenceEndDate lue comme horizon inclusif. | [#d078d55ea269fede-5] |
| `frontend:components/products/isPastEvent.ts:70-76` | La fin de la dernière occurrence est calculée en ajoutant à son début la même durée en jours civils que la première occurrence. | [#d078d55ea269fede-6] |
| `frontend:components/products/isPastEvent.ts:76` | Une série bornée est passée si la fin de sa dernière occurrence est strictement antérieure au jour civil de today. | [#d078d55ea269fede-7] |
| `frontend:components/shared/ConflictDialog.tsx:107-110` | La fonction normalize transforme null et undefined en chaîne vide et convertit les autres valeurs avec String. | [#e7b0db33fcaf233d-1] |
| `frontend:components/shared/ConflictDialog.tsx:127` | Le mode comparatif est activé seulement si serverEvent et localValues sont tous deux fournis. | [#39a68ec37dbc80c1-1] |
| `frontend:components/shared/ConflictDialog.tsx:136` | Pour un champ booléen, fmt affiche la clé yes si la valeur est vraie et la clé no sinon. | [#c33e2d330cb4853c-1] |
| `frontend:components/shared/ConflictDialog.tsx:137` | Une valeur null, undefined ou chaîne vide est affichée avec la clé empty. | [#c33e2d330cb4853c-2] |
| `frontend:components/shared/ConflictDialog.tsx:144-153` | Les lignes du diff ne retiennent que les champs dont la valeur locale diffère de la valeur serveur, les booléens étant comparés via Boolean et les textes via normalize. | [#4a475ca27c54a5e6-1] |
| `frontend:components/shared/ConflictDialog.tsx:227-235` | Le message d'alerte keepMineExhausted n'est rendu qu'en mode comparatif lorsque la prop keepMineExhausted est vraie. | [#e012d86db3b7980f-1] |
| `frontend:components/shared/ConflictDialog.tsx:247-248` | Le bouton prendre la version serveur appelle onTakeServer et est désactivé pendant une soumission. | [#983cfd84e5fdc182-1] |
| `frontend:components/shared/ConflictDialog.tsx:260` | Le bouton garder mes modifications est désactivé pendant une soumission ou lorsque keepMineExhausted est vrai. | [#4c070fcec23cd357-1] |
| `frontend:components/shared/DeleteConfirmDialog.intl.test.tsx:97` | Commentaire : Selon le commentaire, le DELETE produit est un soft delete, si bien que le titre et le bouton ne doivent pas employer le mot supprimer. | [#10d8a127b0324000-1] |
| `frontend:components/shared/DeleteConfirmDialog.tsx:132` | La réassignation est requise pour la variante category lorsque le compteur de produits liés est supérieur à 0 ou que le serveur a exigé une réassignation. | [#c5a3a1b3956edf72-1] |
| `frontend:components/shared/DeleteConfirmDialog.tsx:136` | Les catégories ne sont chargées que lorsque le dialogue est ouvert et que la réassignation est requise. | [#851f88f30fabd9b1-1] |
| `frontend:components/shared/DeleteConfirmDialog.tsx:140-143` | Les cibles de réassignation excluent la catégorie en cours de suppression identifiée par categoryId. | [#7b0eba4f474f81bf-1] |
| `frontend:components/shared/DeleteConfirmDialog.tsx:162` | Le bouton de confirmation est désactivé pendant la suppression, ou lorsque la réassignation est requise sans cible choisie ou sans autre catégorie disponible. | [#3ebe7288cc1a3aca-1] |
| `frontend:components/shared/DeleteConfirmDialog.tsx:167-168` | La variante product utilise les clés product.confirm et product.confirming, les autres variantes utilisent confirm et deleting. | [#3c656418e6efd7a8-1] |
| `frontend:components/shared/DeleteConfirmDialog.tsx:173-175` | La confirmation appelle onConfirm avec la cible de réassignation si nécessaire, puis ferme le dialogue en cas de succès. | [#d7b94ba9e51ba110-1] |
| `frontend:components/shared/DeleteConfirmDialog.tsx:186-189` | Les erreurs de confirmation sont traduites en message inline : 403 vers errors.forbidden, 404 vers errors.notFound, 409 vers errors.conflict, les autres vers errors.generic. | [#d7b94ba9e51ba110-3] |
| `frontend:components/timeline/Cursor.tsx:23` | Le composant Cursor ne rend rien lorsque positionPercent vaut null. | [#3312b56c4ca8075a-1] |
| `frontend:components/timeline/Cursor.tsx:30` | La position gauche du curseur est calculée en CSS à partir de gutterPercent et de positionPercent multiplié par la fraction de piste restante. | [#3312b56c4ca8075a-2] |
| `frontend:components/timeline/DateStamp.tsx:97` | Le jour de semaine est masqué visuellement (sr-only) sous un seuil de conteneur de 52 px et reste présent pour les lecteurs d'écran. | [#b8b97715c5c3d0df-1] |
| `frontend:components/timeline/EventDrawer.tsx:43-44` | La date de fin affichée est la date de fin de l'événement, ou la date de début si end est absent. | [#49f8c2d6cf971793-1] |
| `frontend:components/timeline/EventPill.tsx:92` | Un événement est considéré archivé lorsque extendedProps.archived vaut strictement true. | [#26b7fb37f998f5f0-1] |
| `frontend:components/timeline/EventPill.tsx:99` | Le drapeau de série récurrente est calculé par isRecurringSeries appliqué à l'événement. | [#9adbd2b9db87ee5a-1] |
| `frontend:components/timeline/EventPill.tsx:113` | Un événement de kind single est rendu en pin, et les autres événements sont rendus en barre. | [#6f4f04ce6b99d485-1] |
| `frontend:components/timeline/EventPill.tsx:129` | Le pin est décalé à gauche de PIN_HALF_WIDTH_PX pour être centré sur la date. | [#6f4f04ce6b99d485-2] |
| `frontend:components/timeline/EventPill.tsx:148` | La lisibilité du titre dans la barre est calculée par eventLabelReadableInside à partir de la couleur et de l'état archivé. | [#9de643214c2c671b-1] |
| `frontend:components/timeline/EventPill.tsx:172` | La variable --mt-evt-ink reçoit la couleur d'encre calculée par eventInkColor à partir de la couleur et de l'état archivé. | [#6f4f04ce6b99d485-3] |
| `frontend:components/timeline/EventPill.tsx:199` | Le span du titre dans la barre reçoit aria-hidden seulement lorsque la lisibilité dedans échoue. | [#6f4f04ce6b99d485-4] |
| `frontend:components/timeline/EventPill.tsx:203-211` | Un libellé extérieur de secours est rendu quand le titre n'est pas lisible dans la barre, à la position leftPx plus widthPx plus l'écart OUTSIDE_LABEL_GAP_PX. | [#6f4f04ce6b99d485-5] |
| `frontend:components/timeline/EventPill.tsx:214-216` | Lorsque labelTrailPx est défini, le libellé extérieur reçoit --mt-label-max calculé par outsideLabelMaxPx, sinon aucune variable n'est posée. | [#6f4f04ce6b99d485-6] |
| `frontend:components/timeline/EventPin.tsx:47` | La variable --mt-label-max n'est posée que lorsque labelMaxPx est défini. | [#cd629a31e0ec230f-1] |
| `frontend:components/timeline/EventPin.tsx:50-54` | Un pin récurrent affiche un span mt-evt-pin__recur contenant le glyphe ↻ suivi d'un espace, marqué aria-hidden. | [#cd629a31e0ec230f-2] |
| `frontend:components/timeline/Minimap.tsx:34-35` | La largeur de la fenêtre est bornée entre 0,02 et 1, et son début entre 0 et 1 moins cette largeur. | [#f544b80b7e25ba9e-1] |
| `frontend:components/timeline/Minimap.tsx:78-86` | Les flèches gauche et droite déplacent la fenêtre d'un pas égal à la moitié de sa largeur, ou 0,05 si ce pas vaut 0. | [#3772b0df00de11c5-1] |
| `frontend:components/timeline/RecurrenceMarks.tsx:45-46` | La custom property --mt-row-y n'est ajoutée au style que lorsque la rangée est supérieure à 0. | [#85ad9decffc454bc-1] |
| `frontend:components/timeline/RecurrenceMarks.tsx:55` | Le composant ne rend rien quand la lane n'a ni connecteur ni fantôme. | [#82867e63132ace11-1] |
| `frontend:components/timeline/Ruler.tsx:34-41` | La colonne ressources n'est rendue que si gutterPercent est supérieur à 0, avec une largeur en pourcentage égale à gutterPercent, valeur par défaut 15. | [#ba67e2811e693b18-1] |
| `frontend:components/timeline/TimelineActionSheet.tsx:48-58` | La touche Escape stoppe la propagation et ferme la feuille tant qu'un événement est affiché. | [#fe4515fc49cfeb03-1] |
| `frontend:components/timeline/TimelineActionSheet.tsx:60-63` | Le bouton modifier appelle onEdit avec l'événement si le callback est fourni, puis ferme la feuille. | [#4b528026a7f68d99-1] |
| `frontend:components/timeline/TimelineActionSheet.tsx:66-69` | Le bouton supprimer appelle onDelete pour demander la suppression, puis ferme la feuille sans supprimer lui-même. | [#8145b2dd8889d4e8-1] |
| `frontend:components/timeline/TimelineBottomSheet.tsx:31` | Le seuil de fermeture par glissement vers le bas est fixé à 80 px. | [#90a632e3c27f3ffc-1] |
| `frontend:components/timeline/TimelineBottomSheet.tsx:46-56` | La touche Escape ferme la feuille tant qu'un événement est affiché, en alternative au glissement. | [#2da5475e4177141d-1] |
| `frontend:components/timeline/TimelineBottomSheet.tsx:74-75` | Le glissement n'est suivi que vers le bas, le décalage vertical étant borné à zéro minimum. | [#d4ccbb5a4be859d0-1] |
| `frontend:components/timeline/TimelineBottomSheet.tsx:94` | La date de fin affichée reprend la date de début quand event.end est vide. | [#2da5475e4177141d-2] |
| `frontend:components/timeline/TimelineEditHost.tsx:76` | L'état archivé de l'événement en édition est lu depuis extendedProps.archived, avec false par défaut. | [#90966738f8f4a8c5-1] |
| `frontend:components/timeline/TimelineEditHost.tsx:80-85` | Le message de confirmation après un enregistrement vaut eventArchived si l'événement passe à archivé, eventUnarchived s'il sort de l'archivage, et eventUpdated sinon. | [#bb8347e18c7f16fa-1] |
| `frontend:components/timeline/TimelineEditHost.tsx:115-116` | La durée (valeur et unité) est pré-remplie depuis le view-model, et undefined si elle est absente. | [#d1a4f9d8a8d84a36-1] |
| `frontend:components/timeline/TimelineEditHost.tsx:125-127` | La borne de fin de série est pré-remplie depuis extendedProps.recurrenceEndDate, tronquée aux dix premiers caractères, et vaut null si elle est absente. | [#d1a4f9d8a8d84a36-2] |
| `frontend:components/timeline/TimelineEditHost.tsx:142-146` | La couleur de la catégorie de l'événement est lue depuis les ressources via categoryColorsOf, et vaut null si la catégorie est absente ou non colorée. | [#027b10a4034fe420-1] |
| `frontend:components/timeline/TimelineLandscapeDrawer.tsx:42-52` | La touche Escape appelle onClose et arrête la propagation, uniquement lorsqu'un event est présent. | [#683719816db83f9e-1] |
| `frontend:components/timeline/TimelineLandscapeDrawer.tsx:54` | Le drawer ne rend rien lorsque event est null. | [#683719816db83f9e-2] |
| `frontend:components/timeline/TimelineMobileLandscape.stories.tsx:20-21` | Javadoc : Selon la javadoc, TimelineResponsive force la minimap masquée lorsque la hauteur est inférieure ou égale au seuil max-height 400px. | [#f8d9e129ad13ec6e-1] |
| `frontend:components/timeline/TimelineMobileLandscape.test.tsx:108-117` | La réévaluation ne notifie les listeners que pour les MediaQueryList dont le résultat a changé. | [#967dbb5b08214c6e-1] |
| `frontend:components/timeline/TimelineMobileLandscape.tsx:105-106` | La minimap est masquée si la prop minimapForcedHidden est vraie ou si l'utilisateur a masqué la minimap via userHidden. | [#f6285756033ac104-1] |
| `frontend:components/timeline/TimelineMobileLandscape.tsx:121-128` | Le bouton de zoom arrière est désactivé quand le niveau de zoom courant est le dernier de ZOOM_LEVELS. | [#a9531a583fe868c4-1] |
| `frontend:components/timeline/TimelineMobileLandscape.tsx:134-143` | Le bouton de zoom avant est désactivé quand le niveau de zoom courant est le premier de ZOOM_LEVELS. | [#28c31e9f06221932-1] |
| `frontend:components/timeline/TimelineMobileLandscape.tsx:148-158` | Le bouton de bascule de la minimap est désactivé lorsque le masquage est forcé par la hauteur, et son état aria-pressed reflète la visibilité effective. | [#f06048b79739bd39-1] |
| `frontend:components/timeline/TimelineMobileLandscape.tsx:297-301` | Les lanes sont zébrées selon le rang stable dans leur catégorie : celles dont l'index de début plus i est impair reçoivent la classe mt-tlm__lane--alt. | [#ef5de67ad6df8e6c-1] |
| `frontend:components/timeline/TimelineMobileLandscape.tsx:331-338` | Un événement sans couleur reçoit la couleur d'accent par défaut, et l'encre du texte est calculée sur la couleur rendue, désaturée si l'événement est archivé. | [#ef5de67ad6df8e6c-2] |
| `frontend:components/timeline/TimelineMobileLandscape.tsx:333` | Un événement est considéré archivé quand extendedProps.archived vaut true, et il reçoit alors la classe mt-tlm__evt--archived sans être retiré de la frise. | [#ef5de67ad6df8e6c-3] |
| `frontend:components/timeline/TimelineMobileLandscape.tsx:341` | Un événement de type single est rendu en pin avec libellé, les autres en barre de durée, selon eventKind. | [#ef5de67ad6df8e6c-4] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:108` | Les couleurs de catégorie sont calculées par categoryColorsOf à partir des ressources, mémoïsées sur resources. | [#ce765c15adfa6fd7-1] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:133` | Le bouton zoom avant est désactivé lorsque le niveau de zoom courant égale ZOOM_LEVELS[0]. | [#2652e29fce556433-1] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:154` | La largeur du rail est fixée en pixels à partir de state.railWidth. | [#bf91482621e19377-1] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:203-210` | Chaque catégorie lit son modèle de lanes portrait et fenêtre ses lanes verticales avec windowLanes selon verticalBand. | [#ce765c15adfa6fd7-2] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:255` | Chaque catégorie est rendue comme une liste ARIA nommée par la catégorie. | [#ce765c15adfa6fd7-3] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:264` | Les lanes d'une catégorie sont découpées par la fenêtre verticale laneWindow entre startIndex et endIndex. | [#ce765c15adfa6fd7-4] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:270-274` | Le pas de rangée portrait vient de LANE_ROW_PITCH_PX.portrait et les événements d'une lane sont filtrés par la bande horizontale avec windowEvents. | [#ce765c15adfa6fd7-5] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:285-287` | Une lane reçoit la classe alternée mt-tlm__lane--alt lorsque son rang stable dans la catégorie est impair. | [#ce765c15adfa6fd7-6] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:289-290` | Chaque lane expose aria-posinset et aria-setsize pour annoncer son rang réel dans la catégorie. | [#ce765c15adfa6fd7-7] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:319-320` | Commentaire : Selon le commentaire, un événement archivé est grisé et non masqué, comme sur la frise desktop. | [#ce765c15adfa6fd7-8] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:321` | Un événement est considéré archivé lorsque extendedProps.archived vaut true. | [#ce765c15adfa6fd7-9] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:326-328` | La couleur d'encre du texte d'une barre vaut eventInkColor(event.color, archived) si l'événement a une couleur, sinon var(--color-accent-ink). | [#ce765c15adfa6fd7-10] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:333` | Un événement est rendu en pastille ponctuelle lorsque eventKind(event) vaut 'single', sinon en barre de durée. | [#ce765c15adfa6fd7-11] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:339` | Pour une pastille, le wrap est décalé de PIN_HALF_WIDTH_PX à gauche, sinon il est posé à event.leftPx. | [#ce765c15adfa6fd7-12] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:376` | Une pastille affiche l'icône de série récurrente lorsque isRecurringSeries(event) est vrai. | [#ce765c15adfa6fd7-13] |
| `frontend:components/timeline/TimelineMobilePortrait.tsx:393-397` | Une barre de durée affiche le glyphe ↻ décoratif lorsque l'événement est une série récurrente. | [#ce765c15adfa6fd7-14] |
| `frontend:components/timeline/TimelineResponsive.tsx:54-57` | Commentaire : Selon le commentaire, la prop layout ne concerne que la frise desktop et n'est jamais transmise aux variantes mobiles. | [#1607546b4501845e-1] |
| `frontend:components/timeline/TimelineResponsive.tsx:79` | La variante paysage mobile est rendue en priorité lorsque isMobileLandscape est vrai. | [#1607546b4501845e-2] |
| `frontend:components/timeline/TimelineResponsive.tsx:88` | La variante paysage reçoit minimapForcedHidden à partir de isMinimapForcedHidden. | [#1607546b4501845e-3] |
| `frontend:components/timeline/TimelineResponsive.tsx:93-94` | La variante portrait mobile est rendue lorsque isMobilePortrait est vrai et que la variante paysage ne l'est pas. | [#1607546b4501845e-4] |
| `frontend:components/timeline/TimelineResponsive.tsx:108` | Le rendu par défaut délègue à TimelineView avec layout et onEditEvent, la variante desktop étant la seule à recevoir layout. | [#1607546b4501845e-5] |
| `frontend:components/timeline/TimelineSidebar.tsx:36-37` | La sidebar devient permanente à partir de la largeur de 1024 px, selon la requête média définie par la constante. | [#b95678e39fadafea-1] |
| `frontend:components/timeline/TimelineSidebar.tsx:39-44` | Javadoc : Selon la javadoc, le compteur d'événements de la catégorie inclut les événements masqués. | [#b3ef301c4fc85831-1] |
| `frontend:components/timeline/TimelineSidebar.tsx:204-220` | La pastille reçoit une bordure de la couleur de catégorie, et un fond plein seulement si la catégorie est affichée, sans aucun style inline si la couleur est nulle. | [#5f4ea277ca465230-1] |
| `frontend:components/timeline/TimelineView.test.tsx:124` | Pour une série mensuelle bornée au 10 septembre, seul un fantôme au 10 août est attendu, la date du 10 septembre étant hors de l'étendue affichée. | [#498f041b94d0b869-1] |
| `frontend:components/timeline/TimelineView.test.tsx:582-584` | Un événement de type single est rendu comme un pin avec un seul libellé et sans libellé de secours, même si sa couleur est faible en contraste. | [#69ec3ff35dcbfa15-1] |
| `frontend:components/timeline/TimelineView.tsx:567` | Les lanes dont l'ordinal dans la catégorie est impair reçoivent la classe de zébrure mt-tlv__lane--alt. | [#6fe695819d917b68-1] |
| `frontend:components/timeline/TimelineView.tsx:740` | L'étendue temporelle de la frise est calculée par computeRange à partir de tous les événements et de la date du jour. | [#4da456724022c929-1] |
| `frontend:components/timeline/TimelineView.tsx:812-816` | Les ressources dont la catégorie est masquée par les filtres sont exclues de la liste des identifiants masqués. | [#8bf5e3fb302b4ecb-1] |
| `frontend:components/timeline/TimelineView.tsx:920-923` | La virtualisation verticale n'est active que lorsque le nombre de lanes visibles atteint LANE_VIRTUALIZATION_MIN_ROWS, sinon la bande est non bornée et toutes les lanes sont rendues. | [#e6cb1e8b67663162-1] |
| `frontend:components/timeline/TimelineView.tsx:955-958` | Les lanes repliées, individuellement ou par catégorie, sont exclues de la navigation clavier. | [#707bd5597adfee4b-1] |
| `frontend:components/timeline/TimelineView.tsx:1016-1019` | Une cible de focus en attente plus ancienne que PENDING_FOCUS_TTL_MS est abandonnée sans être focalisée. | [#a8a2466dd863f1f2-1] |
| `frontend:components/timeline/TimelineView.tsx:1094-1099` | La flèche droite passe à la pastille suivante de la rangée, puis à la première pastille non vide de la lane suivante en fin de rangée. | [#96a7b8d477417695-1] |
| `frontend:components/timeline/TimelineView.tsx:1147-1151` | La minimap ne reçoit que les événements dont la ressource n'est pas masquée, alors que l'étendue de la frise reste calculée sur tous les événements. | [#f82736c492c8ad14-1] |
| `frontend:components/timeline/TimelineView.tsx:1252` | L'ancre de défilement en jours n'est pas relevée tant que la largeur d'un jour n'a pas été réappliquée au rendu suivant (garde d'échelle). | [#bc6b24fad8bd0048-1] |
| `frontend:components/timeline/TimelineView.tsx:1421-1424` | L'action Aujourd'hui dispatche GO_TO_TODAY puis recentre le défilement sur la date du jour, et est partagée par la touche T et le bouton de la barre. | [#3e0a9016fed6ebcf-1] |
| `frontend:components/timeline/TimelineView.tsx:1442-1446` | Pour le recadrage F, une lane est incluse si sa catégorie est repliée ou si le produit n'est pas replié individuellement. | [#f0a2b80296d4b5de-1] |
| `frontend:components/timeline/TimelineView.tsx:1564-1568` | Les raccourcis clavier globaux sont ignorés quand un élément role dialog ou alertdialog est présent hors de la frise. | [#d419456d4573c675-1] |
| `frontend:components/timeline/TimelineView.tsx:1595-1597` | Les raccourcis clavier de la frise sont ignorés quand la cible est un champ INPUT, TEXTAREA ou contenteditable. | [#c63075c72430b54b-1] |
| `frontend:components/timeline/TimelineView.tsx:1598-1605` | La touche Échap ferme d'abord le panneau de sidebar ouvert, puis le drawer sélectionné, puis quitte le plein écran. | [#c63075c72430b54b-2] |
| `frontend:components/timeline/TimelineView.tsx:1609` | Les raccourcis clavier de la frise ne s'exécutent pas quand Meta, Ctrl ou Alt est enfoncé. | [#c63075c72430b54b-3] |
| `frontend:components/timeline/label-reserve.ts:71-75` | La largeur estimée d'un libellé est le nombre de points de code du titre, plus 3 caractères si la série est récurrente, multiplié par la chasse de la vue, arrondi au pixel supérieur. | [#77db9a74e111ec4e-1] |
| `frontend:components/timeline/label-reserve.ts:78-81` | L'emprise d'un ponctuel est bornée entre le plancher PIN_FOOTPRINT_PX de la vue et un plafond de décalage plus 240 px. | [#e6ec708a8f543b8e-1] |
| `frontend:components/timeline/label-reserve.ts:84-86` | La largeur maximale du libellé d'un pin vaut l'emprise moins le décalage de départ, avec un minimum de 0. | [#563eca318c6738ba-1] |
| `frontend:components/timeline/label-reserve.ts:89-95` | L'emprise après une barre pour son libellé extérieur vaut l'écart de 6 px plus la boîte, dont la largeur est plafonnée à 240 px. | [#66d44e3973dc688a-1] |
| `frontend:components/timeline/label-reserve.ts:109-131` | Un ponctuel reçoit en widthPx son emprise estimée, et une barre reçoit labelTrailPx seulement en vue desktop lorsque sa couleur n'est pas lisible à l'intérieur. | [#900e4075c905787f-1] |
| `frontend:components/timeline/label-reserve.ts:123` | En vue mobile, les barres sont renvoyées sans réserve de libellé extérieur. | [#900e4075c905787f-2] |
| `frontend:components/timeline/label-reserve.ts:148-170` | La réserve de queue prend le maximum des emprises des événements dont la fin tombe sur endDay, et vaut 0 si aucun ne finit ce jour-là. | [#cc335ec2589bb425-1] |
| `frontend:components/timeline/label-reserve.ts:177-180` | La marge droite de recadrage vaut le maximum entre la marge par défaut et la réserve de queue plus FIT_EDGE_AIR_PX. | [#682e68b9cbfe345c-1] |
| `frontend:components/timeline/lane-layout.ts:11-13` | Javadoc : Selon la javadoc, chaque événement prend la première rangée dont la fin précédente plus le gap est inférieure ou égale à son début, et le gap vaut 8 px desktop et 10 px mobile. | [#51c3a05525f4c32d-1] |
| `frontend:components/timeline/lane-layout.ts:101` | Une lane sans événement renvoie l'instance partagée SINGLE_ROW_LAYOUT, c'est-à-dire une seule rangée. | [#51c3a05525f4c32d-2] |
| `frontend:components/timeline/lane-layout.ts:104` | Les occurrences sont triées par leftPx croissant, et à début égal l'ordre d'entrée départage. | [#51c3a05525f4c32d-3] |
| `frontend:components/timeline/lane-layout.ts:112-113` | La fin d'une occurrence vaut son début plus sa largeur, plus labelTrailPx, plus trailingPx, et elle prend la première rangée dont la fin plus gapPx est inférieure ou égale à son début. | [#51c3a05525f4c32d-4] |
| `frontend:components/timeline/lib.ts:46` | L'annonce d'archivage est ajoutée juste après le statut temporel uniquement si extendedProps.archived est vrai. | [#8d814955749ec9aa-1] |
| `frontend:components/timeline/lib.ts:51-54` | La récurrence n'est annoncée que si isRecurring est vrai et que recurrenceUnit est renseigné. | [#8d814955749ec9aa-2] |
| `frontend:components/timeline/lib.ts:74-84` | Retourne vrai si l'encre choisie par contrastInk atteint le seuil WCAG AA de 4.5 sur la couleur rendue, sinon faux. | [#131a89e124a008b6-1] |
| `frontend:components/timeline/lib.ts:99-105` | La couleur rendue est la couleur d'origine, sauf si l'événement est archivé et qu'une couleur est présente, auquel cas elle est passée en gris. | [#0df87d666e5307d8-1] |
| `frontend:components/timeline/lib.ts:122-124` | L'encre du libellé est calculée sur la couleur rendue, donc après grisage pour un événement archivé. | [#6771dd4e0b190315-1] |
| `frontend:components/timeline/lib.ts:231-241` | Les événements sans resourceId sont ignorés, et ceux qui sont hors de la fenêtre de la vue sont exclus. | [#db3d05a97211c1f9-1] |
| `frontend:components/timeline/lib.ts:244-246` | La position et la largeur en pourcentage sont calculées sur la fenêtre clampée, et une largeur nulle reçoit un jour de la fenêtre. | [#db3d05a97211c1f9-2] |
| `frontend:components/timeline/lib.ts:248-253` | Le statut vaut expired si la fin est antérieure à now, ongoing si now est compris entre début et fin, sinon upcoming. | [#db3d05a97211c1f9-3] |
| `frontend:components/timeline/lib.ts:296-297` | Pour chaque catégorie, la première couleur non nulle rencontrée est retenue, et null si aucune n'existe. | [#120826635f79ef4e-1] |
| `frontend:components/timeline/lib.ts:322` | Un événement est compté dans sa catégorie seulement si sa ressource est connue, sinon il n'est compté nulle part. | [#821dec88258c3c34-1] |
| `frontend:components/timeline/lib.ts:381` | Un événement dont le jour de début tombe hors de la fenêtre de densité est ignoré. | [#55f6b3f117c7c192-1] |
| `frontend:components/timeline/lib.ts:384` | Pour chaque jour, la première couleur rencontrée est retenue, alors que le commentaire du type DensityBucket parle de la couleur de l'événement le plus chargé du jour. | [#55f6b3f117c7c192-2] |
| `frontend:components/timeline/lib.ts:416-427` | Ne retient que les événements dont la date de début est valide et comprise entre start et end, triés par début croissant. | [#a0274821b14c490c-1] |
| `frontend:components/timeline/mobile-zoom-anchor.ts:28-30` | Renvoie la demi-largeur de la zone de piste en retirant la gouttière constante du clientWidth, avec un minimum de zéro. | [#0d623e3513aafc90-1] |
| `frontend:components/timeline/mobile-zoom-anchor.ts:37-45` | Calcule le jour fractionnaire au centre de la zone de piste en ajoutant la demi-zone de piste à scrollLeft, puis en divisant par la largeur d'un jour, et renvoie null si la largeur d'un jour n'est pas strictement positive. | [#a9122aa4dfdadb37-1] |
| `frontend:components/timeline/mobile-zoom-anchor.ts:53-60` | Calcule le scrollLeft qui replace un jour donné au centre de la zone de piste à une échelle donnée, borné à 0 par le bas, la borne haute étant laissée au navigateur. | [#8da1d7c2288c3084-1] |
| `frontend:components/timeline/recurrence-marks.ts:58-60` | Un événement est une série seulement si isRecurring vaut true et si recurrenceUnit est renseigné. | [#74154ced8af2709c-1] |
| `frontend:components/timeline/recurrence-marks.ts:102` | La borne de fin des fantômes est le dernier jour de l'étendue existante, calculée comme rangeStart plus totalDays moins un, sans étirer l'étendue. | [#086a42fe16b70fad-1] |
| `frontend:components/timeline/recurrence-marks.ts:106` | Une série archivée ne produit aucun fantôme ni connecteur. | [#086a42fe16b70fad-2] |
| `frontend:components/timeline/recurrence-marks.ts:126-127` | Le style d'un fantôme reçoit un fond à 0 % pour un ponctuel et à 8 % pour une barre de durée, via GHOST_BAR_TINT_PERCENT. | [#086a42fe16b70fad-3] |
| `frontend:components/timeline/recurrence-marks.ts:189-194` | La boucle des fantômes s'arrête au premier fantôme dont la peinture dépasserait la largeur de piste, et tous les suivants sont retirés. | [#cdbaa0cda6ada569-1] |
| `frontend:components/timeline/recurrence-marks.ts:210` | Le connecteur d'un ponctuel se termine à la date de la dernière occurrence fantôme, et celui d'une barre à son bord droit. | [#cdbaa0cda6ada569-2] |
| `frontend:components/timeline/stress-fixtures.ts:88` | Un événement généré est de type duration si sa durée est supérieure à 1 jour, sinon de type single. | [#ddf1d9831d598a20-1] |
| `frontend:components/timeline/useFocusTrap.ts:49-51` | À l'activation, le focus initial est posé sur le premier élément focusable du conteneur. | [#5a159808af9963ff-1] |
| `frontend:components/timeline/useFocusTrap.ts:58` | Une touche Escape déjà annulée par une couche superposée est ignorée et ne déclenche pas onEscape. | [#5e8fe6e09dd9a027-1] |
| `frontend:components/timeline/useFocusTrap.ts:59-64` | Escape appelle la dernière fonction onEscape lue dans la ref, puis stoppe la propagation de l'événement. | [#5e8fe6e09dd9a027-2] |
| `frontend:components/timeline/useFocusTrap.ts:73-77` | Un Tab émis hors du conteneur, par exemple depuis body, est ramené sur le premier élément, ou sur le dernier avec Shift. | [#5e8fe6e09dd9a027-3] |
| `frontend:components/timeline/useFocusTrap.ts:78-84` | Tab depuis le dernier élément reboucle sur le premier, et Shift+Tab depuis le premier reboucle sur le dernier. | [#5e8fe6e09dd9a027-4] |
| `frontend:components/timeline/useTimelineMobileGestures.ts:21-26` | Les seuils de gestes sont fixés à 500 ms pour le long-press, 10 px de tolérance de mouvement, et des ratios de pinch de 1,22 en zoom avant et 0,82 en zoom arrière. | [#c4938ec7c4aa1aa0-1] |
| `frontend:components/timeline/useTimelineMobileGestures.ts:75-76` | Un déplacement supérieur à 10 px annule le long-press, le geste étant alors traité comme un scroll. | [#4d3207325ae76d2c-1] |
| `frontend:components/timeline/useTimelineMobileGestures.ts:85-88` | Un clic qui suit un long-push déclenché est ignoré, et l'ouverture du détail n'a pas lieu. | [#3b117ebba5ec165c-1] |
| `frontend:components/timeline/useTimelineMobileGestures.ts:117-123` | Le pinch déclenche onPinchZoom in ou out selon le ratio de distance entre les deux pointeurs, puis remet la distance de base à la valeur courante. | [#3a37bca099d86063-1] |
| `frontend:components/timeline/useTimelineMobileGestures.ts:128-131` | Au relâchement, un pointeur est retiré et la distance de base du pinch est effacée dès qu'il reste moins de deux pointeurs. | [#9ab01ce94c81f6b0-1] |
| `frontend:components/timeline/useTimelineMobileState.ts:210` | La largeur temporelle de la piste (trackWidth) est le nombre de jours totaux multiplié par la largeur d'un jour selon le zoom. | [#569048003ec764ce-1] |
| `frontend:components/timeline/useTimelineMobileState.ts:211` | La largeur défilable du rail (railWidth) est égale à la largeur de piste plus la gouttière de 120 px. | [#569048003ec764ce-2] |
| `frontend:components/timeline/useTimelineMobileState.ts:261` | L'effet de re-projection du zoom ne s'exécute que si la largeur d'un jour a changé depuis le dernier rendu. | [#569048003ec764ce-3] |
| `frontend:components/timeline/useTimelineMobileState.ts:280-285` | Lors d'un changement de zoom, le scrollLeft est recalculé pour recentrer le jour ancré au centre de la zone de piste visible. | [#569048003ec764ce-4] |
| `frontend:components/timeline/useTimelineMobileState.ts:362-363` | La hauteur de chaque lane dans le modèle vertical est la hauteur de base mesurée plus l'extra de rangées calculé pour cette lane selon le pas de la variante. | [#2aff78f12b96cc8d-1] |
| `frontend:components/timeline/useTimelineMobileState.ts:368-370` | La virtualisation verticale n'est active que si le modèle portrait compte au moins LANE_VIRTUALIZATION_MIN_ROWS lanes visibles, sinon la bande verticale est non bornée. | [#569048003ec764ce-5] |
| `frontend:components/timeline/useTimelineMobileState.ts:377-381` | La bande horizontale publiée par le viewport, exprimée en repère rail, est recalée en retirant la gouttière de 120 px pour être exprimée en repère piste. | [#5e3b5090d8c5b4fd-1] |
| `frontend:components/timeline/useTimelineMobileState.ts:391-392` | La fenêtre minimap est calculée en retirant la gouttière de 120 px du scrollLeft puis en divisant par la largeur de piste, et la largeur visible est bornée à 1. | [#ba4ad350c0bfc02d-1] |
| `frontend:components/timeline/useTimelineMobileState.ts:425-426` | Un clic sur la minimap place scrollLeft à la gouttière plus la fraction demandée multipliée par la largeur de piste. | [#6eb3089d713a5bf1-1] |
| `frontend:components/timeline/useTimelineMobileState.ts:435-436` | scrollToToday centre la date du jour dans le conteneur visible sans descendre sous 0 px de scrollLeft. | [#166ed51e3f2cf78e-1] |
| `frontend:components/timeline/useTimelineMobileState.ts:514-517` | Au rattachement après rotation, la position de défilement est reportée en pixels à l'identique, sauf si la largeur de piste a changé, auquel cas elle est reportée en fraction. | [#7da50c3fa8377467-1] |
| `frontend:components/timeline/useTimelineMobileState.ts:518-525` | Le centrage initial sur aujourd'hui n'a lieu qu'au tout premier rattachement de la ref, lorsqu'aucune position n'a été sauvegardée. | [#7da50c3fa8377467-2] |
| `frontend:components/timeline/useTimelineViewport.ts:98-99` | La hauteur de base d'une lane est la hauteur mesurée moins la valeur de l'attribut data-lane-extra de l'élément. | [#48150112655af3b8-1] |
| `frontend:components/timeline/useTimelineViewport.ts:108-114` | Une métrique non mesurable conserve la dernière valeur connue au lieu de revenir aux valeurs par défaut. | [#3a894c7ded1568aa-1] |
| `frontend:components/timeline/useTimelineViewport.ts:191-192` | L'identité de metrics est conservée lorsque les trois hauteurs mesurées sont inchangées. | [#71386bb79a694ed9-1] |
| `frontend:components/timeline/useTimelineViewport.ts:194-201` | Une bande n'est recalculée avec l'overscan que si elle ne couvre plus la fenêtre visible, ou si force ou wasUnmeasurable est vrai, ce qui sert d'hystérésis. | [#71386bb79a694ed9-2] |
| `frontend:components/timeline/useTimelineViewport.ts:203-210` | sync ne publie un nouvel état que si les bandes ou les métriques ont changé, ou si la mesure était impossible auparavant. | [#71386bb79a694ed9-3] |
| `frontend:components/timeline/useTimelineViewport.ts:218-224` | schedule coalesce les demandes de mesure en une seule sync par frame via requestAnimationFrame. | [#1450f5b8d8d79c7b-1] |
| `frontend:components/timeline/virtualization.ts:86-88` | Une bande est non bornée seulement si son start vaut -Infinity et son end vaut Infinity. | [#512a9f897f3f751c-1] |
| `frontend:components/timeline/virtualization.ts:90-93` | expandBand ne élargit pas une bande non bornée et ajoute la marge aux deux bornes des autres bandes. | [#39a6aa5f46f47d34-1] |
| `frontend:components/timeline/virtualization.ts:96-98` | bandCovers renvoie vrai si la bande outer contient entièrement la bande inner, bornes incluses. | [#6996061fe986dc13-1] |
| `frontend:components/timeline/virtualization.ts:105-107` | segmentIntersectsBand renvoie vrai si le segment [start, start + size] touche la bande, bornes incluses. | [#63442e03e8971f0e-1] |
| `frontend:components/timeline/virtualization.ts:126-129` | Le test de fenêtrage horizontal utilise l'intervalle réel fourni par eventTrackExtent, et non la seule position de la date. | [#67dacff8a0f33cef-1] |
| `frontend:components/timeline/virtualization.ts:187-189` | windowLanes renvoie toutes les lanes sans cale si la bande est non bornée, si la liste est vide ou si la hauteur totale est nulle ou négative. | [#500d8a697099a684-1] |
| `frontend:components/timeline/virtualization.ts:194` | La première lane montée est la première dont le bas dépasse le début de la bande, une lane finissant pile au début étant exclue. | [#500d8a697099a684-2] |
| `frontend:components/timeline/virtualization.ts:196-199` | L'indice de fin exclu est la première lane dont le haut atteint la fin de la bande, avec un minimum égal à startIndex. | [#500d8a697099a684-3] |
| `frontend:components/timeline/virtualization.ts:203-204` | La cale haute vaut offsets[startIndex] et la cale basse vaut la hauteur totale moins offsets[endIndex]. | [#500d8a697099a684-4] |
| `frontend:components/timeline/virtualization.ts:254` | Une catégorie repliée ne produit aucune lane, son top de liste reste enregistré et elle n'a pas d'entrée de sommes préfixées. | [#feb3c2451a96d1a3-1] |
| `frontend:components/timeline/virtualization.ts:259` | La hauteur de chaque lane vient de laneHeightOf si fourni, sinon de metrics.laneHeight. | [#feb3c2451a96d1a3-2] |
| `frontend:components/timeline/zoom-incremental.test.ts:95-96` | Commentaire : Selon le commentaire du test, la largeur minimale d'une pastille est ramenée à 6 px quand l'échelle calculée est plus petite. | [#196d4938401d150d-1] |
| `frontend:components/timeline/zoom.test.ts:154-165` | La largeur d'un événement d'un jour est plafonnée au minimum minWidth, ici 6 px, quand l'échelle calculée donne moins. | [#8deb05f7c504eac4-1] |
| `frontend:components/timeline/zoom.test.ts:167-171` | Un événement dont le resourceId est vide est ignoré et n'apparaît pas dans la map résultat. | [#8deb05f7c504eac4-2] |
| `frontend:components/timeline/zoom.test.ts:190-196` | Seule la valeur type égale à single produit un pin, toute autre valeur donne une barre de durée. | [#39514ea16905d27e-1] |
| `frontend:components/timeline/zoom.test.ts:346-357` | Sans ressource affichée, l'étendue est nulle et computeFit renvoie null, et un viewport de largeur 0 donne aussi null. | [#c4f724624c4bba75-1] |
| `frontend:components/timeline/zoom.test.ts:461-474` | Les marges de cadrage sont dérivées de l'emprise du pin : leadPx vaut demi-pin plus air de bord, trailPx vaut emprise du pin plus air de bord. | [#f540a588e4a899e9-1] |
| `frontend:components/timeline/zoom.test.ts:472` | Les marges de cadrage desktop valent 40 px avant l'étendue et 135 px après, selon le test. | [#f540a588e4a899e9-2] |
| `frontend:components/timeline/zoom.test.ts:550-551` | Pour un libellé plus long que le plancher, l'appelant élargit trailPx à la plus grande valeur entre la marge desktop et la réserve du libellé plus l'air de bord. | [#c4f724624c4bba75-2] |
| `frontend:components/timeline/zoom.ts:108-124` | L'étendue affichée va du jour de début le plus tôt au jour de fin le plus tard des événements des ressources affichées, un ponctuel s'arrête à sa date et une durée à dayOffset plus spanDays, et renvoie null si rien n'est affiché. | [#e2f0ff6d3c431f13-1] |
| `frontend:components/timeline/zoom.ts:168-171` | Sans événement valide, la fenêtre est centrée sur today avec la marge padDays de chaque côté, padDays valant 30 par défaut. | [#4bd867c9557ac782-1] |
| `frontend:components/timeline/zoom.ts:214-216` | Un événement est de type single (pin) si extendedProps.type vaut 'single', sinon il est de type duration (barre). | [#84591f761b99a111-1] |
| `frontend:components/timeline/zoom.ts:293` | Le recadrage est sans effet si l'étendue est nulle ou si la largeur de la piste n'est pas strictement positive. | [#1f38898a36bdb1e5-1] |
| `frontend:components/timeline/zoom.ts:358-360` | Le statut vaut expired si la fin est antérieure à now, ongoing si now est compris entre début et fin, sinon upcoming. | [#304a771066565ef6-1] |
| `frontend:components/timeline/zoom.ts:394-397` | La largeur d'un pin reste constante avec le zoom, tandis qu'une barre vaut au minimum minWidth et sinon sa durée multipliée par dayWidth. | [#3d2723e9c090e9e7-1] |
| `frontend:components/timeline/zoom.ts:556` | Les segments week-end ne sont calculés qu'aux niveaux day et week, sinon la fonction renvoie une liste vide. | [#fd53e226e46dbc64-1] |
| `frontend:components/timeline/zoom.ts:574-583` | La pastille de statut utilise la variable ongoing pour le statut ongoing, expired pour expired, et upcoming pour tout autre statut. | [#3519507074ef402e-1] |
| `frontend:components/ui/palette-color-picker.tsx:21-25` | Javadoc : Selon le commentaire, le composant n'appelle onChange que sur action utilisateur, jamais au montage ni pour ramener une valeur hors palette vers la palette. | [#1d71dddd41922601-1] |
| `frontend:components/ui/palette-color-picker.tsx:120-125` | Le composant calcule isCustom comme vrai lorsque la valeur est non vide et ne correspond à aucune entrée de la palette, et tabStop vaut l'index de la pastille cochée, sinon 0. | [#1d71dddd41922601-2] |
| `frontend:components/ui/popoverPicker.tsx:46-47` | Le popover est forcé fermé quand disabled est vrai, et onOpenChange est neutralisé dans ce cas. | [#972fc061ec929fbe-1] |
| `frontend:hooks/useEventEditConflict.ts:41` | La constante fixe à 3 le plafond de re-soumissions « garder mes modifications » consécutives soldées par un 409. | [#454f4c677d25a245-1] |
| `frontend:hooks/useEventEditConflict.ts:106` | Le drapeau keepMineExhausted vaut vrai dès que le compteur de re-soumissions atteint MAX_KEEP_MINE_ATTEMPTS. | [#318a7fe1114733e4-1] |
| `frontend:hooks/useEventEditConflict.ts:122-126` | L'invalidation cible la query products withEvents de l'utilisateur courant, sans rechargement de page, et ne fait rien sans userId. | [#fe364a473c7417fc-1] |
| `frontend:hooks/useEventEditConflict.ts:141-148` | Sans utilisateur authentifié ou sans identifiant d'événement, aucun PATCH n'est envoyé, l'état passe à error, le compteur est remis à zéro et il n'y a ni invalidation ni onDone. | [#0a0ecfe25ac9e14b-1] |
| `frontend:hooks/useEventEditConflict.ts:162-163` | Le conflit n'est renseigné avec la version serveur que si le corps 409 respecte le schéma eventConflictBodySchema, sinon conflict vaut null. | [#0a0ecfe25ac9e14b-2] |
| `frontend:hooks/useEventEditConflict.ts:168` | Un 409 incrémente le compteur keepMineAttempts seulement si la soumission vient de onKeepMine, sinon il repart à zéro. | [#0a0ecfe25ac9e14b-3] |
| `frontend:hooks/useEventEditConflict.ts:172-174` | Une erreur autre que 409 place l'état à forbidden si le statut est 403, sinon à error, et remet le compteur à zéro. | [#0a0ecfe25ac9e14b-4] |
| `frontend:hooks/useEventEditConflict.ts:182` | onSubmit lance runSubmit en mode soumission initiale, ce qui ne consomme pas le budget keep-mine. | [#b5cfb828b42a84bf-1] |
| `frontend:hooks/useEventEditConflict.ts:184-191` | onReload invalide la query products, efface le conflit, repasse en idle, remet le compteur à zéro et appelle onDone sans valeurs. | [#98bec3b2d154a3db-1] |
| `frontend:hooks/useEventEditConflict.ts:194` | onTakeServer est un alias de onReload et a donc le même effet d'abandon du local et d'invalidation. | [#1d7fbdafe66045b3-1] |
| `frontend:hooks/useEventEditConflict.ts:205` | La re-soumission keep-mine envoie les données locales avec la version portée par le serveur dans le corps 409. | [#890f80ac02c55950-2] |
| `frontend:hooks/useEventEditConflict.ts:208-212` | onConflictDismiss efface le conflit, repasse en idle et remet le compteur à zéro sans appeler onDone. | [#7fe96912c145af55-1] |
| `frontend:hooks/useProductsWithEvents.ts:27` | La query n'est exécutée que si userId est renseigné. | [#7d537caaa1c3a13e-1] |
| `frontend:hooks/useRecurrencePreview.ts:37` | La requête de prévisualisation n'est active que si isRecurring, startDate et recurrenceUnit sont tous renseignés. | [#fa1f99656e73a9f5-1] |
| `frontend:hooks/useSetEventArchived.ts:35-37` | Après un succès, la query products.all est invalidée. | [#b6c6c48ced0c69f2-1] |
| `frontend:hooks/useSetEventArchived.ts:43-45` | Sur erreur 409, la query products.all est invalidée pour que la nouvelle tentative parte d'une version fraîche. | [#9a3e27e9a8dfd4a3-1] |
| `frontend:lib/event-palette.ts:87-91` | findPaletteEntry renvoie l'entrée dont le hex égale la valeur en majuscules, ou undefined si la valeur est absente ou hors palette. | [#bf0dd71202b36e24-1] |
| `frontend:lib/recurrence.ts:27-33` | addMonths ramène le jour au dernier jour du mois cible lorsque le jour d'origine n'existe pas dans ce mois. | [#3ae6b4878ef0428a-1] |
| `frontend:lib/recurrence.ts:46-55` | occurrenceStart calcule l'occurrence k depuis l'origine : +7 jours fois k pour WEEK, +k mois pour MONTH, +12 k mois pour YEAR. | [#74d51a4723a7cae7-1] |
| `frontend:lib/recurrence.ts:86-88` | seriesHorizon renvoie la date de fin de série si elle existe, sinon le début de la série plus 60 mois. | [#2c3ba5ba91a986aa-1] |
| `frontend:lib/recurrence.ts:98-107` | ghostOccurrenceStarts génère les occurrences k à partir de 1 jusqu'à la plus petite valeur entre l'horizon de la série et la date until, bornes incluses. | [#25ba17a272d6daff-1] |
| `frontend:types/event.ts:108-114` | Le schéma de création exige recurrenceUnit lorsque isRecurring vaut true. | [#a3d650f9abd11a8c-1] |
| `frontend:types/event.ts:205` | mapToFullCalendarEvent force allDay à false lorsque isAllDay est absent. | [#6f896c67780e2ab1-1] |
| `frontend:types/event.ts:207` | mapToFullCalendarEvent utilise DEFAULT_COLOR lorsque l'event n'a pas de couleur. | [#6f896c67780e2ab1-2] |
| `frontend:types/event.ts:246` | HEX_COLOR_REGEX accepte une couleur au format #RGB ou #RRGGBB, hexadécimal sans casse imposée. | [#2e71ba1ffdad13a4-1] |
| `frontend:types/event.ts:301-307` | Le schéma d'édition exige durationUnit lorsque type vaut duration. | [#9d8fa0de402686a4-1] |
| `frontend:types/event.ts:309-315` | Le schéma d'édition exige recurrenceUnit lorsque isRecurring vaut true. | [#9d8fa0de402686a4-2] |
| `frontend:types/event.ts:432-434` | Javadoc : Selon le commentaire, endDate, archived, recurrenceEndDate et version du formulaire sont volontairement écartés lors de la conversion en payload de création. | [#2001a331e55a477c-1] |
| `frontend:types/event.ts:443-444` | Pour un event de type single, toEventCreationPayload envoie durationValue à 0 et durationUnit à days, valeurs neutres. | [#2001a331e55a477c-2] |
| `frontend:types/event.ts:447` | toEventCreationPayload n'envoie recurrenceUnit que lorsque isRecurring est vrai. | [#2001a331e55a477c-3] |
| `frontend:types/event.ts:450` | toEventCreationPayload omet la couleur lorsque la valeur saisie est vide. | [#2001a331e55a477c-4] |

## Validations {#t-validation}

| Pointeur | Énoncé | Fait |
|---|---|---|
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java:14-15` | Le champ name est obligatoire (NotBlank) et doit faire entre 1 et 100 caractères. | [#6c4fca1f385dfa79-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java:18` | Le champ type est obligatoire et non vide à la désérialisation. | [#bada438377600243-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java:21` | Le champ durationValue est obligatoire. | [#7355b2e6a6cfd762-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java:24` | Le champ durationUnit est obligatoire et non vide. | [#fff484872e52b90e-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java:27` | Le champ isRecurring est obligatoire. | [#73c4cd14ca227129-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java:46` | Le champ productId est obligatoire. | [#1aefc45bbad27d29-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java:57-64` | Le getter dérivé isRecurrenceUnitConsistent renvoie false quand isRecurring vaut true et recurrenceUnit est null ou blanc, ce qui déclenche une erreur de validation. | [#6a6a2db764ed3efc-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/EventUpdateRequest.java:36` | Si title est fourni, sa longueur doit être comprise entre 1 et 100 caractères, null étant accepté. | [#ea067c00fc2c3511-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/EventUpdateRequest.java:78-85` | La validation renvoie false quand endDate est antérieure à startDate, à condition que les deux dates soient présentes dans le payload. | [#7de030c7d71c6cde-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/RecurrencePreviewRequest.java:27` | Le champ startDate est obligatoire pour la prévisualisation. | [#4b5df5d3a2b86beb-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/dtos/RecurrencePreviewRequest.java:31` | Le champ recurrenceUnit est obligatoire et doit être une valeur de l'enum RecurrenceUnit. | [#aeb33821be3d7854-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:44-45` | Si le produit demandé n'existe pas, createEvent lève ProductNotFoundException. | [#3763682fea712bd5-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:47-49` | Commentaire : createEvent appelle Utils.validateEventType sur le type, et selon le commentaire la règle est type dans duration ou single, avec un 422. | [#3763682fea712bd5-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:141-143` | Après application du PATCH, si isRecurring vaut true et recurrenceUnit est null sur l'état fusionné, updateEvent lève RecurrenceUnitRequiredException. | [#98cf4b5faf0ea7a3-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:150-154` | Après fusion, si recurrenceEndDate est antérieure à startDate, updateEvent lève RecurrenceEndDateBeforeStartException. Une date égale est tolérée. | [#98cf4b5faf0ea7a3-2] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:193-197` | Après recalcul, si endDate fusionnée est antérieure à startDate, updateEvent lève EndDateBeforeStartException. Une date égale est tolérée. | [#98cf4b5faf0ea7a3-3] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java:217-223` | checkOptimisticVersion lève EventConflictException quand la version envoyée par le client est non null et diffère de la version courante de l'événement. | [#f429173d1849e6cf-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImpl.java:33-34` | expand lève IllegalArgumentException si startDate est null. | [#1a1f018e6f7eaffc-1] |
| `backend:src/main/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImpl.java:36-37` | expand lève IllegalArgumentException si unit est null. | [#1a1f018e6f7eaffc-2] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/InvalidDurationUnitException.java:4-5` | Javadoc : Selon la javadoc, cette exception est levée quand durationUnit est null ou invalide pour un événement de type duration, avec un HTTP 422. | [#f2a30f58eb40dfca-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/InvalidEventTypeException.java:4-5` | Javadoc : Selon la javadoc, cette exception est levée quand le type d'un événement n'est ni duration ni single, avec un HTTP 422. | [#faa6296652e21e9d-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/RecurrenceEndDateBeforeStartException.java:21-25` | L'exception signale qu'une recurrenceEndDate antérieure à startDate viole BR-EVE-012, le message incluant l'id de l'événement dans le constructeur avec id. | [#d43756d4fcdd3a27-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/exceptions/RecurrenceUnitRequiredException.java:16-20` | L'exception est levée quand isRecurring vaut true et que recurrenceUnit est null, avec le message BR-EVE-006 et l'id de l'événement. | [#bb7a84fd7adfc111-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java:48-49` | fromString lève IllegalArgumentException quand la valeur non vide ne correspond à aucune unité reconnue. | [#d7ffd89a5f60b2e5-1] |
| `backend:src/main/java/com/matimeline/eventmanager/domain/ports/services/RecurrenceExpansionService.java:30-32` | Javadoc : Selon la javadoc, expand lève IllegalArgumentException si startDate ou unit est null, ou si recurrenceEndDate est strictement avant startDate. | [#7b62f048f0feb5ed-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:86-92` | Un ancien mot de passe incorrect renvoie un 400 avec le message invalid current password. | [#59ff1a825290e365-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:95-104` | Un avatar invalide renvoie un 400 avec le message de l'exception. | [#1b143a6c66680d11-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:106-113` | Un nouveau mot de passe identique à l'ancien renvoie un 400. | [#042e2db4825ce646-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:115-123` | Un username de confirmation différent de celui de l'appelant renvoie un 400 avec un message neutre. | [#208654f2038f5dca-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:125-133` | Un token de réinitialisation invalide, expiré ou déjà consommé renvoie un 400 au message générique. | [#d851e469e72023ae-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:154-163` | Un type d'événement hors duration et single renvoie un 422 avec le message de l'exception. | [#7f496261450b5282-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:177-188` | Un état fusionné avec isRecurring à true et recurrenceUnit null renvoie un 400. | [#e627418030325863-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:258-267` | Un fichier dépassant la limite multipart renvoie un 400 avec le message fichier trop volumineux (max 5 Mo). | [#7dc79bd3083a1dc5-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java:269-274` | Une erreur de Bean Validation renvoie un 400 avec le code VALIDATION_FAILED et le message Validation failed. | [#061b85ed3d767f85-1] |
| `backend:src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewController.java:58` | Le corps de requête est validé par @Valid avant l'exécution de la méthode. | [#9f9cf7495bcc59e1-1] |
| `backend:src/main/java/com/matimeline/eventmanager/utils/Utils.java:24-28` | validateEventType lève une InvalidEventTypeException si le type est null ou absent de la liste autorisée. | [#0b4bcf2c88504a14-1] |
| `backend:src/main/java/com/matimeline/eventmanager/utils/Utils.java:60-62` | Pour type duration, une durationUnit null lève une InvalidDurationUnitException avec une valeur null. | [#fad4672e22cf0d46-1] |
| `backend:src/main/java/com/matimeline/eventmanager/utils/Utils.java:72-73` | Une durationUnit inconnue pour type duration lève une InvalidDurationUnitException avec la valeur reçue. | [#fad4672e22cf0d46-2] |
| `backend:src/main/resources/db/migration/V4__reconcile_events_constraints.sql:40-64` | Le bloc DO de pré-vol lève une exception et interrompt la migration si des lignes events ont type NULL, un type de plus de 20 caractères, un type hors enum, ou une unité hors enum. | [#fcd64bc28ed46183-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:178-196` | Une version client différente de la version serveur courante lève EventConflictException portant la version et l'entité serveur, avant toute sauvegarde. | [#25210f74daaeb07e-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:378-399` | Un PATCH ne fournissant qu'une endDate antérieure à la startDate persistée lève EventDateBeforeStartException et rien n'est sauvegardé. | [#061ab4698209d3d2-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:420-433` | Un PATCH mettant isRecurring à true sur un événement sans recurrenceUnit en base lève RecurrenceUnitRequiredException et rien n'est sauvegardé. | [#329b80fe6505f374-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:547-560` | Une création avec un type hors duration et single lève InvalidEventTypeException avant tout appel à save. | [#51c98aa927d31c5a-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:562-571` | Un PATCH avec un type hors duration et single lève InvalidEventTypeException et rien n'est sauvegardé. | [#1ff8cdbacd220c48-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java:575-593` | Un PATCH fournissant une recurrenceEndDate antérieure à la startDate persistée lève RecurrenceEndDateBeforeStartException et rien n'est sauvegardé. | [#cdf193e708f21187-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImplTest.java:138-142` | Un expand avec startDate null lève IllegalArgumentException. | [#dffe7b0da1db4f30-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImplTest.java:144-148` | Un expand avec unité null lève IllegalArgumentException. | [#1869272d1d706c3b-1] |
| `backend:src/test/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImplTest.java:150-154` | Un expand dont la recurrenceEndDate est antérieure à la startDate lève IllegalArgumentException. | [#e8ccf4230be3c56f-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventControllerValidationTest.java:22-23` | Javadoc : Selon la javadoc, la classe vérifie que @Valid rejette un événement dont un champ requis est vide avec un statut 400 avant l'appel à EventService. | [#58156181a1add56f-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventControllerValidationTest.java:49-60` | Le test fixe qu'un nom vide sur POST /api/events renvoie 400 et que EventService.createEvent n'est pas appelé. | [#a7b41cb016b1d143-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewControllerTest.java:118-128` | Une requête sans startDate renvoie 400 et le service RecurrenceExpansionService.expand n'est pas appelé. | [#68836e1845d29a69-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewControllerTest.java:130-140` | Une requête sans recurrenceUnit renvoie 400 et le service n'est pas appelé. | [#efa9192e615bbe30-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewControllerTest.java:142-156` | Une valeur de recurrenceUnit en minuscules (weeks) échoue à la désérialisation et renvoie 400 sans appel au service. | [#b33cbd89169e2c51-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventPatchAndRecurrenceIntegrationTest.java:205-208` | Le test attend que l'update lève EndDateBeforeStartException lorsque seule endDate est envoyée et qu'elle précède la startDate déjà en base. | [#87275881e94e34de-1] |
| `backend:src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventPatchAndRecurrenceIntegrationTest.java:244` | Le test attend RecurrenceUnitRequiredException lorsque isRecurring passe à true sans recurrence unit en base. | [#69148eba8dd8493d-1] |
| `backend:src/test/java/com/matimeline/eventmanager/utils/UtilsTest.java:43-47` | Une unité de durée inconnue lève InvalidDurationUnitException. | [#ca0371dfa31cd9f5-1] |
| `frontend:components/EventEditForm.test.tsx:286-294` | Un titre vidé puis quitté affiche une erreur inline titleRequired sans soumission du formulaire. | [#4f8ce8d571603c46-1] |
| `frontend:components/EventEditForm.test.tsx:296-310` | Une date de fin antérieure à la date de début affiche l'erreur endBeforeStart et bloque l'appel à onSubmit. | [#4f8ce8d571603c46-2] |
| `frontend:components/EventEditForm.test.tsx:312-321` | Une valeur de couleur hexadécimale invalide affiche l'erreur colorInvalid après la perte de focus. | [#4f8ce8d571603c46-3] |
| `frontend:components/EventEditForm.test.tsx:323-339` | Une récurrence activée sans unité de récurrence affiche l'erreur recurrenceUnitRequired à la soumission et bloque onSubmit. | [#4f8ce8d571603c46-4] |
| `frontend:components/events/NewEventDrawer.test.tsx:200-209` | Une soumission sans produit affiche l'erreur inline de produit et n'appelle pas createEvent. | [#4bcbc68e170d0a0e-1] |
| `frontend:components/events/NewEventDrawer.test.tsx:490-497` | Un titre vide bloque la soumission côté client et affiche l'erreur de titre, sans appel à createEvent. | [#4bcbc68e170d0a0e-2] |
| `frontend:components/events/NewEventDrawer.tsx:115-118` | Un envoi sans produit positionne productError à vrai et n'appelle pas la mutation de création. | [#9447624168c79209-1] |
| `frontend:hooks/useEventEditConflict.ts:53-60` | Le corps 409 est validé par eventConflictBodySchema.safeParse, et le serverEvent n'est retenu qu'en cas de succès. | [#691e39a3adb11945-1] |
| `frontend:types/event.ts:100-106` | Le schéma de création refuse un type duration dont durationValue est absent ou inférieur ou égal à 0. | [#170ced817b011ce8-1] |
| `frontend:types/event.ts:275` | Le titre du formulaire d'édition doit contenir entre 1 et 100 caractères, avec les messages titleRequired et titleMax. | [#4001a8036f881685-1] |
| `frontend:types/event.ts:292-295` | Le champ couleur du formulaire d'édition est accepté vide ou absent, sinon doit respecter HEX_COLOR_REGEX. | [#6fbf58642825bbaa-1] |
| `frontend:types/event.ts:317-322` | Le schéma d'édition refuse une endDate strictement antérieure à startDate, sur le champ endDate. | [#7642eb34f9026e59-1] |
| `frontend:types/event.ts:325-330` | Le schéma d'édition refuse une recurrenceEndDate strictement antérieure à startDate, sur le champ recurrenceEndDate. | [#7642eb34f9026e59-2] |
