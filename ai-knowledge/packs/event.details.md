# Annexe : event (partie 1/3)

## Index des fichiers {#files-index}

| Fichier | Faits | Sortes |
|---|---|---|
| `mytimeline:frontend/src/components/EventEditForm.test.tsx` | 76 | test_case 50, other 11, business_rule 6 |
| `mytimeline:frontend/src/components/timeline/TimelineView.test.tsx` | 71 | test_case 60, other 8, business_rule 1 |
| `mytimeline:frontend/src/components/timeline/zoom.test.ts` | 47 | test_case 30, business_rule 13, convention 2 |
| `mytimeline:frontend/src/components/EventEditForm.tsx` | 45 | business_rule 16, other 9, convention 6 |
| `mytimeline:frontend/src/types/event.ts` | 41 | entity 10, validation 10, business_rule 9 |
| `mytimeline:frontend/src/components/events/NewEventDrawer.test.tsx` | 39 | test_case 34, convention 3, config 1 |
| `mytimeline:frontend/src/components/timeline/TimelineMobileLandscape.tsx` | 37 | other 18, business_rule 9, i18n_key 4 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/EventServiceImplTest.java` | 35 | business_rule 12, test_case 12, validation 5 |
| `mytimeline:frontend/src/components/timeline/TimelineView.tsx` | 34 | business_rule 18, convention 4, config 3 |
| `mytimeline:frontend/src/lib/color.test.ts` | 33 | test_case 31, other 1, suspicious 1 |
| `mytimeline:frontend/src/components/layout/AppShell.test.tsx` | 32 | test_case 30, convention 2 |
| `mytimeline:frontend/src/components/timeline/TimelineEditHost.test.tsx` | 31 | test_case 25, other 4, convention 2 |
| `mytimeline:frontend/src/components/timeline/lib.ts` | 29 | service_method 13, business_rule 11, other 2 |
| `mytimeline:frontend/src/components/timeline/virtualization.ts` | 29 | business_rule 11, config 5, service_method 5 |
| `mytimeline:frontend/src/types/event.test.ts` | 28 | test_case 27, suspicious 1 |
| `mytimeline:frontend/src/components/events/NewEventDrawer.tsx` | 27 | other 7, business_rule 6, ui_screen 5 |
| `mytimeline:frontend/src/components/timeline/zoom.ts` | 27 | business_rule 19, config 5, suspicious 2 |
| `mytimeline:frontend/src/lib/auth-guard-paths.test.ts` | 27 | test_case 12, business_rule 5, convention 3 |
| `mytimeline:frontend/src/lib/color.ts` | 27 | config 8, other 8, business_rule 6 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/EventServiceImpl.java` | 26 | business_rule 10, service_method 7, validation 4 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandler.java` | 24 | validation 13, other 8, convention 2 |
| `mytimeline:frontend/src/components/timeline/TimelineMobilePortrait.test.tsx` | 24 | test_case 23, other 1 |
| `mytimeline:frontend/src/components/shared/DeleteConfirmDialog.tsx` | 23 | business_rule 6, convention 5, other 3 |
| `mytimeline:frontend/src/components/timeline/useTimelineViewport.ts` | 23 | business_rule 15, other 5, service_method 2 |
| `mytimeline:frontend/src/lib/auth-token-verify.test.ts` | 23 | test_case 23 |
| `mytimeline:frontend/src/components/timeline/EventPill.test.tsx` | 22 | test_case 20, business_rule 2 |
| `mytimeline:frontend/src/components/timeline/TimelineEditHost.tsx` | 22 | other 9, business_rule 8, state_transition 3 |
| `mytimeline:frontend/src/components/timeline/TimelineMobileLandscape.test.tsx` | 22 | test_case 16, other 3, business_rule 1 |
| `mytimeline:frontend/src/components/timeline/TimelineGroupHead.test.tsx` | 21 | test_case 13, other 4, business_rule 2 |
| `mytimeline:frontend/src/components/timeline/virtualization.test.ts` | 21 | test_case 20, other 1 |
| `mytimeline:frontend/src/lib/canonical-host.ts` | 21 | business_rule 9, config 2, convention 2 |
| `mytimeline:frontend/src/components/events/previewTimeline.ts` | 20 | business_rule 14, config 2, convention 2 |
| `mytimeline:frontend/src/components/layout/AppShell.tsx` | 20 | ui_screen 6, business_rule 5, other 3 |
| `mytimeline:frontend/src/components/timeline/useTimelineMobileState.ts` | 20 | business_rule 9, store_action 4, service_method 2 |
| `mytimeline:frontend/src/lib/date-iso.local-date.test.tsx` | 20 | test_case 16, config 2, convention 2 |
| `mytimeline:frontend/src/components/landing/landing.hover-pairing.test.ts` | 19 | test_case 6, other 5, suspicious 4 |
| `mytimeline:frontend/src/components/shared/ConflictDialog.tsx` | 19 | other 9, business_rule 5, ui_screen 2 |
| `mytimeline:frontend/src/components/shared/DeleteConfirmDialog.test.tsx` | 19 | test_case 19 |
| `mytimeline:frontend/src/lib/auth-token-verify.ts` | 19 | business_rule 10, other 3, service_method 3 |
| `mytimeline:frontend/src/components/timeline/TimelineMobilePortrait.tsx` | 18 | business_rule 8, other 4, convention 3 |
| `mytimeline:frontend/src/hooks/useEventEditConflict.ts` | 18 | business_rule 5, other 4, state_transition 4 |
| `mytimeline:frontend/src/lib/canonical-host.test.ts` | 18 | test_case 18 |
| `mytimeline:frontend/src/components/__tests__/date-time-semantics.test.tsx` | 17 | test_case 14, other 2, suspicious 1 |
| `mytimeline:frontend/src/components/timeline/TimelineSidebar.tsx` | 17 | ui_screen 4, business_rule 2, i18n_key 2 |
| `mytimeline:frontend/src/components/timeline/lane-layout.test.ts` | 17 | test_case 17 |
| `mytimeline:frontend/src/components/timeline/recurrence-marks.ts` | 17 | business_rule 12, config 3, convention 1 |
| `mytimeline:frontend/src/components/timeline/lib-a11y.test.ts` | 16 | test_case 15, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImplTest.java` | 15 | test_case 8, validation 3, other 2 |
| `mytimeline:frontend/src/components/products/isPastEvent.test.ts` | 15 | test_case 15 |
| `mytimeline:frontend/src/components/timeline/lane-layout.ts` | 15 | other 4, business_rule 3, config 3 |
| `mytimeline:frontend/src/services/eventService.ts` | 15 | endpoint 7, convention 2, other 2 |
| `mytimeline:frontend/src/components/landing/HeaderSection.test.tsx` | 14 | test_case 13, other 1 |
| `mytimeline:frontend/src/components/landing/HeaderSection.tsx` | 14 | business_rule 3, convention 3, state_transition 3 |
| `mytimeline:frontend/src/components/products/isPastEvent.ts` | 14 | business_rule 7, other 6, convention 1 |
| `mytimeline:frontend/src/components/timeline/EventPill.tsx` | 14 | business_rule 6, other 5, convention 2 |
| `mytimeline:frontend/src/lib/auth-guard-paths.ts` | 14 | business_rule 5, config 5, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventPatchAndRecurrenceIntegrationTest.java` | 13 | test_case 4, business_rule 3, other 2 |
| `mytimeline:frontend/src/components/timeline/TimelineBottomSheet.tsx` | 13 | business_rule 4, i18n_key 3, other 3 |
| `mytimeline:frontend/src/components/timeline/label-reserve.ts` | 13 | business_rule 8, config 2, suspicious 2 |
| `mytimeline:frontend/src/components/timeline/useFocusTrap.ts` | 13 | business_rule 4, other 3, service_method 3 |
| `mytimeline:frontend/src/hooks/useEventEditConflict.test.tsx` | 13 | test_case 11, convention 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/utils/Utils.java` | 12 | business_rule 3, convention 3, validation 3 |
| `mytimeline:frontend/src/components/landing/HeroSection.tsx` | 12 | ui_screen 6, other 3, convention 1 |
| `mytimeline:frontend/src/components/shared/ConflictDialog.test.tsx` | 12 | test_case 12 |
| `mytimeline:frontend/src/components/timeline/EventDrawer.tsx` | 12 | ui_screen 5, business_rule 2, convention 2 |
| `mytimeline:frontend/src/components/timeline/TimelineView.modal-shortcuts.test.tsx` | 12 | test_case 7, other 3, convention 1 |
| `mytimeline:frontend/src/components/timeline/recurrence-marks.test.ts` | 12 | test_case 11, other 1 |
| `mytimeline:frontend/src/components/timeline/useTimelineMobileGestures.ts` | 12 | business_rule 4, config 4, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java` | 11 | entity 7, convention 3, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/utils/UtilsTest.java` | 11 | business_rule 3, convention 3, test_case 2 |
| `mytimeline:frontend/src/components/landing/HeroTimelineAnimation.tsx` | 11 | other 6, business_rule 3, config 1 |
| `mytimeline:frontend/src/components/timeline/TimelineSidebar.test.tsx` | 11 | test_case 10, other 1 |
| `mytimeline:frontend/src/components/timeline/TimelineStacking.test.tsx` | 11 | test_case 9, convention 1, other 1 |
| `mytimeline:frontend/src/components/timeline/TimelineView.fit-shortcut.test.tsx` | 11 | test_case 10, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventController.java` | 10 | role_check 4, business_rule 2, convention 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/jpa/EventRepositoryJpaImpl.java` | 10 | other 3, persistence_query 3, convention 2 |
| `mytimeline:backend/src/main/resources/db/migration/V4__reconcile_events_constraints.sql` | 10 | db_change 3, other 3, config 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventConditionalCheckConstraintIntegrationTest.java` | 10 | test_case 4, suspicious 2, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventOptimisticLockConflictIntegrationTest.java` | 10 | test_case 4, other 3, business_rule 1 |
| `mytimeline:frontend/src/components/events/EventFormDrawer.tsx` | 10 | convention 4, business_rule 2, other 2 |
| `mytimeline:frontend/src/components/events/previewTimeline.test.ts` | 10 | test_case 10 |
| `mytimeline:frontend/src/components/landing/LandingMobileMenu.tsx` | 10 | ui_screen 5, other 3, entity 1 |
| `mytimeline:frontend/src/components/timeline/TimelineLandscapeDrawer.tsx` | 10 | other 3, business_rule 2, convention 2 |
| `mytimeline:frontend/src/components/timeline/TimelineView.fullscreen-overlays.test.tsx` | 10 | test_case 6, other 3, convention 1 |
| `mytimeline:frontend/src/components/timeline/stress-fixtures.ts` | 10 | other 5, business_rule 2, convention 1 |
| `mytimeline:frontend/src/components/timeline/useFocusTrap.test.tsx` | 10 | test_case 9, other 1 |
| `mytimeline:frontend/src/lib/date-iso.ts` | 10 | business_rule 5, service_method 4, suspicious 1 |
| `mytimeline:frontend/src/lib/ephemeris.ts` | 10 | other 5, service_method 2, business_rule 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/repositories/EventRepository.java` | 9 | persistence_query 4, other 3, suspicious 2 |
| `mytimeline:backend/src/main/resources/db/migration/V11__events_conditional_check_constraints.sql` | 9 | business_rule 2, convention 2, db_change 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewControllerTest.java` | 9 | test_case 6, business_rule 1, endpoint 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/EventDeleteStatisticsIntegrationTest.java` | 9 | test_case 4, other 3, business_rule 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/repositories/ProductEventCreationIntegrationTest.java` | 9 | test_case 6, convention 3 |
| `mytimeline:frontend/src/components/EventEditForm.debounce.test.tsx` | 9 | test_case 6, business_rule 1, other 1 |
| `mytimeline:frontend/src/components/events/EventPreviewTimeline.test.tsx` | 9 | test_case 8, suspicious 1 |
| `mytimeline:frontend/src/components/events/EventPreviewTimeline.tsx` | 9 | business_rule 7, other 2 |
| `mytimeline:frontend/src/components/landing/HeroSection.test.tsx` | 9 | test_case 9 |
| `mytimeline:frontend/src/components/landing/HowItWorksSection.test.tsx` | 9 | test_case 8, other 1 |
| `mytimeline:frontend/src/components/landing/HowItWorksSection.tsx` | 9 | ui_screen 4, other 3, i18n_key 1 |
| `mytimeline:frontend/src/components/shared/ConflictDialog.intl.test.tsx` | 9 | test_case 6, other 2, suspicious 1 |
| `mytimeline:frontend/src/components/shared/DeleteConfirmDialog.forbidden.test.tsx` | 9 | test_case 8, other 1 |
| `mytimeline:frontend/src/components/shared/EmptyState.tsx` | 9 | convention 3, other 3, config 2 |
| `mytimeline:frontend/src/components/shared/StateScreen.tsx` | 9 | other 5, business_rule 2, convention 2 |
| `mytimeline:frontend/src/components/timeline/TimelineMobileLandscape.stories.tsx` | 9 | other 4, test_case 3, config 2 |
| `mytimeline:frontend/src/components/timeline/TimelineMobilePortrait.stories.tsx` | 9 | other 9 |
| `mytimeline:frontend/src/components/timeline/useTimelineViewport.scroll.test.tsx` | 9 | test_case 5, other 3, convention 1 |
| `mytimeline:frontend/src/lib/density.ts` | 9 | config 4, business_rule 2, convention 1 |
| `mytimeline:frontend/src/lib/event-palette.test.ts` | 9 | test_case 8, other 1 |
| `mytimeline:frontend/src/lib/legal-pages.test.ts` | 9 | test_case 9 |
| `mytimeline:frontend/src/lib/next-occurrence.test.ts` | 9 | test_case 9 |
| `mytimeline:frontend/src/lib/recurrence.test.ts` | 9 | test_case 9 |
| `mytimeline:frontend/src/lib/recurrence.ts` | 9 | business_rule 4, config 2, other 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/Event.java` | 8 | other 3, convention 2, entity 2 |
| `mytimeline:frontend/src/components/events/ArchiveConfirmDialog.tsx` | 8 | other 4, ui_screen 2, i18n_key 1 |
| `mytimeline:frontend/src/components/landing/HeroTimelineAnimation.test.tsx` | 8 | test_case 8 |
| `mytimeline:frontend/src/components/pages/HomePage.tsx` | 8 | other 5, business_rule 1, convention 1 |
| `mytimeline:frontend/src/components/products/eventSpan.test.ts` | 8 | test_case 8 |
| `mytimeline:frontend/src/components/products/eventSpan.ts` | 8 | business_rule 5, suspicious 2, other 1 |
| `mytimeline:frontend/src/components/shared/DeleteConfirmDialog.intl.test.tsx` | 8 | test_case 7, convention 1 |
| `mytimeline:frontend/src/components/shared/EmptyState.test.tsx` | 8 | test_case 8 |
| `mytimeline:frontend/src/components/shared/OfflineBanner.test.tsx` | 8 | test_case 7, suspicious 1 |
| `mytimeline:frontend/src/components/shared/OfflineBanner.tsx` | 8 | other 4, i18n_key 2, business_rule 1 |
| `mytimeline:frontend/src/components/timeline/DateStamp.tsx` | 8 | other 4, business_rule 3, suspicious 1 |
| `mytimeline:frontend/src/components/timeline/RecurrenceMarks.tsx` | 8 | other 4, business_rule 2, convention 2 |
| `mytimeline:frontend/src/components/timeline/TimelineActionSheet.tsx` | 8 | other 3, convention 2, business_rule 1 |
| `mytimeline:frontend/src/components/timeline/TimelineEditHost.forbidden.test.tsx` | 8 | test_case 5, convention 2, other 1 |
| `mytimeline:frontend/src/components/timeline/TimelineView.perf.stories.tsx` | 8 | other 3, config 2, test_case 2 |
| `mytimeline:frontend/src/lib/density.test.ts` | 8 | test_case 6, convention 1, other 1 |
| `mytimeline:frontend/src/lib/legal-pages.ts` | 8 | business_rule 3, convention 2, config 1 |
| `mytimeline:frontend/src/lib/next-occurrence.ts` | 8 | business_rule 7, other 1 |
| `mytimeline:frontend/src/types/auth.ts` | 8 | other 3, convention 2, entity 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/services/RecurrenceExpansionServiceImpl.java` | 7 | business_rule 3, validation 3, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceExpansion.java` | 7 | business_rule 4, other 2, suspicious 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/RecurrenceUnit.java` | 7 | business_rule 2, convention 2, other 2 |
| `mytimeline:backend/src/main/resources/db/migration/V9__neutralize_invalid_recurrence_unit.sql` | 7 | business_rule 2, db_change 2, other 2 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventControllerOwnershipTest.java` | 7 | test_case 4, convention 1, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandlerContractTest.java` | 7 | test_case 5, convention 1, other 1 |
| `mytimeline:frontend/src/components/landing/FooterSection.tsx` | 7 | other 5, business_rule 1, ui_screen 1 |
| `mytimeline:frontend/src/components/landing/HeroSection.flex-min-size.test.tsx` | 7 | test_case 3, business_rule 2, convention 1 |
| `mytimeline:frontend/src/components/pages/HomePage.test.tsx` | 7 | test_case 7 |
| `mytimeline:frontend/src/components/shared/EphemerisLeaf.test.tsx` | 7 | test_case 7 |
| `mytimeline:frontend/src/components/shared/EphemerisLeaf.tsx` | 7 | other 5, business_rule 1, ui_screen 1 |
| `mytimeline:frontend/src/components/timeline/TimelineResponsive.rotation.test.tsx` | 7 | test_case 4, other 2, suspicious 1 |
| `mytimeline:frontend/src/components/timeline/label-reserve.test.ts` | 7 | test_case 7 |
| `mytimeline:frontend/src/components/timeline/mobile-zoom-anchor.test.ts` | 7 | test_case 7 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/EventCreationRequest.java` | 6 | validation 3, business_rule 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/EventService.java` | 6 | service_method 3, convention 2, suspicious 1 |
| `mytimeline:frontend/src/__tests__/support/visualViewport.ts` | 6 | service_method 3, convention 1, entity 1 |
| `mytimeline:frontend/src/components/events/EventCategoryField.test.tsx` | 6 | test_case 5, convention 1 |
| `mytimeline:frontend/src/components/events/EventCategoryField.tsx` | 6 | business_rule 4, convention 1, ui_screen 1 |
| `mytimeline:frontend/src/components/events/EventFormDrawer.test.tsx` | 6 | test_case 4, convention 1, suspicious 1 |
| `mytimeline:frontend/src/components/layout/CreateEventContext.tsx` | 6 | convention 3, business_rule 2, other 1 |
| `mytimeline:frontend/src/components/pages/HomePage.accent-roles.test.tsx` | 6 | test_case 4, convention 1, suspicious 1 |
| `mytimeline:frontend/src/components/shared/LoadingSkeleton.test.tsx` | 6 | test_case 5, suspicious 1 |
| `mytimeline:frontend/src/components/shared/LoadingSkeleton.tsx` | 6 | other 4, config 1, ui_screen 1 |
| `mytimeline:frontend/src/components/shared/StateScreen.test.tsx` | 6 | test_case 6 |
| `mytimeline:frontend/src/components/timeline/Minimap.tsx` | 6 | other 2, business_rule 1, service_method 1 |
| `mytimeline:frontend/src/components/timeline/TimelineView.zoom-cache.test.tsx` | 6 | test_case 3, convention 2, other 1 |
| `mytimeline:frontend/src/components/timeline/fixtures.tsx` | 6 | other 5, convention 1 |
| `mytimeline:frontend/src/components/timeline/mobile-zoom-anchor.ts` | 6 | other 4, service_method 2 |
| `mytimeline:frontend/src/components/timeline/zoom-incremental.test.ts` | 6 | test_case 4, other 2 |
| `mytimeline:frontend/src/hooks/useSetEventArchived.test.tsx` | 6 | test_case 4, convention 1, other 1 |
| `mytimeline:frontend/src/lib/ephemeris.test.ts` | 6 | test_case 6 |
| `mytimeline:frontend/src/types/settings.ts` | 6 | other 3, convention 2, entity 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/EventUpdateCommand.java` | 5 | business_rule 3, convention 1, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/application/dtos/EventCreationRequestContractTest.java` | 5 | test_case 2, convention 1, other 1 |
| `mytimeline:frontend/src/components/landing/CtaSection.tsx` | 5 | convention 2, other 2, ui_screen 1 |
| `mytimeline:frontend/src/components/landing/FooterSection.test.tsx` | 5 | test_case 5 |
| `mytimeline:frontend/src/components/legal/legal-table-of-contents.tsx` | 5 | convention 2, other 2, i18n_key 1 |
| `mytimeline:frontend/src/components/shared/empty-states.i18n.test.ts` | 5 | other 3, test_case 2 |
| `mytimeline:frontend/src/components/timeline/Cursor.tsx` | 5 | business_rule 3, other 2 |
| `mytimeline:frontend/src/components/timeline/EventPill.stories.tsx` | 5 | other 4, convention 1 |
| `mytimeline:frontend/src/components/timeline/EventPin.tsx` | 5 | other 3, business_rule 2 |
| `mytimeline:frontend/src/components/timeline/TimelineResponsive.tsx` | 5 | business_rule 2, other 1, state_transition 1 |
| `mytimeline:frontend/src/components/timeline/TimelineToolbarActions.test.tsx` | 5 | test_case 3, convention 1, other 1 |
| `mytimeline:frontend/src/hooks/useSetEventArchived.ts` | 5 | business_rule 2, convention 1, external_call 1 |
| `mytimeline:frontend/src/lib/event-palette.ts` | 5 | other 3, business_rule 1, convention 1 |
| `mytimeline:frontend/src/lib/query-keys.ts` | 5 | convention 4, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/EventUpdateRequest.java` | 4 | validation 2, business_rule 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/RecurrenceEndDateBeforeStartException.java` | 4 | other 2, business_rule 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/RecurrencePreviewController.java` | 4 | endpoint 1, other 1, service_method 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/EventControllerValidationTest.java` | 4 | test_case 2, business_rule 1, convention 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandlerOptimisticLockTest.java` | 4 | test_case 3, other 1 |
| `mytimeline:frontend/src/components/landing/CtaSection.test.tsx` | 4 | test_case 4 |
| `mytimeline:frontend/src/components/landing/landing-nav.ts` | 4 | config 1, convention 1, i18n_key 1 |
| `mytimeline:frontend/src/components/theme-provider.tsx` | 4 | convention 3, config 1 |
| `mytimeline:frontend/src/components/timeline/Ruler.tsx` | 4 | business_rule 1, config 1, other 1 |
| `mytimeline:frontend/src/hooks/useRecurrencePreview.ts` | 4 | other 2, business_rule 1, external_call 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/RecurrencePreviewRequest.java` | 3 | business_rule 1, other 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/mappers/EventMapper.java` | 3 | business_rule 1, convention 1, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/RecurrenceUnitRequiredException.java` | 3 | business_rule 1, other 1, validation 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/EventCreateCommand.java` | 3 | other 2, business_rule 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/ports/services/RecurrenceExpansionService.java` | 3 | business_rule 1, other 1, service_method 1 |
| `mytimeline:frontend/src/components/legal/legal-disclaimer.tsx` | 3 | convention 1, other 1, ui_screen 1 |
| `mytimeline:frontend/src/components/timeline/DateStamp.stories.tsx` | 3 | other 3 |
| `mytimeline:frontend/src/components/timeline/index.ts` | 3 | other 2, suspicious 1 |
| `mytimeline:frontend/src/components/timeline/useTimelineMobileSelection.ts` | 3 | store_action 2, convention 1 |
| `mytimeline:frontend/src/hooks/useCreateEvent.ts` | 3 | business_rule 2, convention 1 |
| `mytimeline:frontend/src/hooks/useProductsWithEvents.ts` | 3 | business_rule 1, external_call 1, other 1 |
| `mytimeline:frontend/src/lib/safe-error.ts` | 3 | business_rule 1, convention 1, other 1 |
| `mytimeline:frontend/src/lib/touchTarget.test.ts` | 3 | test_case 3 |
| `mytimeline:frontend/src/lib/touchTarget.ts` | 3 | convention 2, other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/RecurrencePreviewResponse.java` | 2 | convention 1, other 1 |
| `mytimeline:backend/src/test/java/com/matimeline/eventmanager/infrastructure/adapters/controllers/GlobalExceptionHandlerErrorCodeTest.java` | 2 | other 1, test_case 1 |
| `mytimeline:frontend/src/components/timeline/Cursor.stories.tsx` | 2 | other 2 |
| `mytimeline:frontend/src/components/timeline/Ruler.stories.tsx` | 2 | other 2 |
| `mytimeline:frontend/src/hooks/useProductsWithEvents.test.tsx` | 2 | test_case 2 |
| `mytimeline:frontend/src/lib/state-errors.test.ts` | 2 | test_case 2 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/application/dtos/EventResponse.java` | 1 | convention 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/EndDateBeforeStartException.java` | 1 | other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/EventConflictException.java` | 1 | other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/EventNotFoundException.java` | 1 | other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/InvalidDurationUnitException.java` | 1 | other 1 |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/exceptions/InvalidEventTypeException.java` | 1 | other 1 |
| `mytimeline:frontend/src/components/layout/index.ts` | 1 | convention 1 |
| `mytimeline:frontend/src/lib/state-errors.ts` | 1 | business_rule 1 |
| `mytimeline:frontend/src/lib/utils.ts` | 1 | convention 1 |

## Structure (suite) {#t-structure_overflow}

| Pointeur | Symbole | Énoncé | Fait |
|---|---|---|---|
| `mytimeline:frontend/src/components/timeline/TimelineSidebar.tsx:156-178` | TimelineSidebar | Le bloc Accordéons affiche deux boutons segmentés, Tout déplier qui appelle onCollapseAll(false) et Tout plier qui appelle onCollapseAll(true). | [#ebd4d3e906d6d0da-1] |
| `mytimeline:frontend/src/components/timeline/TimelineSidebar.tsx:180-231` | TimelineSidebar | Le bloc Catégories affiche une liste de boutons filtres, chacun appelant onToggleCategory avec le nom de la catégorie. | [#ebd4d3e906d6d0da-2] |
| `mytimeline:frontend/src/components/timeline/TimelineSidebar.tsx:233-253` | TimelineSidebar | Le bloc Légende affiche trois entrées fixes, Événement, Occurrence à venir et Récurrence avec le glyphe ↻. | [#ebd4d3e906d6d0da-3] |
| `mytimeline:frontend/src/components/timeline/TimelineSidebar.tsx:257-267` | TimelineSidebar | Le pied de la sidebar liste les raccourcis issus de buildTimelineShortcuts, chaque touche étant rendue dans un élément kbd. | [#ebd4d3e906d6d0da-4] |
| `mytimeline:frontend/src/components/landing/HeaderSection.tsx:184-209` | HeaderSection.nav | La barre collante pleine largeur contient le header et la nav desktop, dont les ancres sont masquées sous lg et affichées à partir de lg. | [#e83c440a6ffa22b3-1] |
| `mytimeline:frontend/src/components/shared/ConflictDialog.tsx:112-124` | ConflictDialog | ConflictDialog est un composant présentationnel qui reçoit open, onOpenChange, onReload et des props optionnelles du mode comparatif. | [#ede08315b87679d0-1] |
| `mytimeline:frontend/src/components/shared/ConflictDialog.tsx:227-235` | ConflictDialog | En mode comparatif, un message role alert s'affiche quand keepMineExhausted est vrai. | [#ede08315b87679d0-2] |
| `mytimeline:frontend/src/components/timeline/EventDrawer.tsx:40` | EventDrawer | Le composant ne rend rien lorsque event est null. | [#1f0906cdc16c8a83-1] |
| `mytimeline:frontend/src/components/timeline/EventDrawer.tsx:51` | EventDrawer | Un clic sur l'overlay du drawer appelle onClose. | [#1f0906cdc16c8a83-2] |
| `mytimeline:frontend/src/components/timeline/EventDrawer.tsx:52-59` | EventDrawer | Le panneau est rendu comme un dialogue modal, dont le libellé d'accessibilité est le titre de l'événement. | [#1f0906cdc16c8a83-3] |
| `mytimeline:frontend/src/components/timeline/EventDrawer.tsx:89-94` | EventDrawer | La date de début est affichée dans une balise time dont l'attribut dateTime est dérivé de la date locale ISO. | [#1f0906cdc16c8a83-4] |
| `mytimeline:frontend/src/components/timeline/EventDrawer.tsx:110-122` | EventDrawer | Le pied du drawer et son bouton d'édition ne sont rendus que si la prop onEdit est fournie. | [#1f0906cdc16c8a83-5] |
| `mytimeline:frontend/src/components/landing/HeroSection.tsx:121-125` | HeroSection | Le composant HeroSection rend une section de hero dont le titre, le sous-titre et les deux CTA viennent du namespace common.landing.hero. | [#e6b3f936ae85512b-1] |
| `mytimeline:frontend/src/components/landing/HeroSection.tsx:127` | HeroSection | La colonne texte est bornée en rangée lg à une largeur minimale de 300px et maximale de 420px, et son min-w-0 la laisse se réduire. | [#e6b3f936ae85512b-2] |
| `mytimeline:frontend/src/components/landing/HeroSection.tsx:135-142` | HeroSection | Le CTA primaire est un Link asChild vers /{locale}/register, avec le testid landing-hero-cta-primary, et affiche une flèche ArrowRight. | [#e6b3f936ae85512b-3] |
| `mytimeline:frontend/src/components/landing/HeroSection.tsx:143-151` | HeroSection | Le CTA secondaire est une ancre vers #how-it-works, avec le testid landing-hero-cta-secondary, stylée en variant outline avec la bordure border-rule-emphasis. | [#e6b3f936ae85512b-4] |
| `mytimeline:frontend/src/components/landing/HeroSection.tsx:155` | HeroSection | Le panneau de la frise a une hauteur h-80, passe à md:h-[420px], porte une bordure border-rule-strong et n'a pas d'ombre. | [#e6b3f936ae85512b-5] |
| `mytimeline:frontend/src/components/landing/HeroSection.tsx:171-173` | HeroSection | La frise HeroTimelineAnimation est rendue dans une zone relative min-h-0 flex-1 à l'intérieur du panneau, sans image statique. | [#e6b3f936ae85512b-6] |
| `mytimeline:frontend/src/components/events/EventCategoryField.tsx:50-56` | EventCategoryField | Le champ Catégorie est un bloc en lecture seule rendu comme un groupe étiqueté par son libellé, sans élément focalisable. | [#c02d90efa9e0cbdf-1] |
| `mytimeline:frontend/src/components/landing/LandingMobileMenu.tsx:74-86` | LandingMobileMenu | Le composant LandingMobileMenu ne rend rien quand open vaut faux, et active le focus-trap sur le panneau via useFocusTrap avec onClose comme fermeture Escape. | [#8c7051e54f3d72c7-1] |
| `mytimeline:frontend/src/components/landing/LandingMobileMenu.tsx:91-99` | LandingMobileMenu | L'overlay est fixe, couvre la page, appelle onClose au clic et disparaît à partir de lg, tandis que le panneau est un dialog aria-modal ancré à droite de largeur min(320px,85vw). | [#8c7051e54f3d72c7-2] |
| `mytimeline:frontend/src/components/landing/LandingMobileMenu.tsx:117` | LandingMobileMenu | Le bouton de fermeture est un bouton de 44 par 44 pixels, avec aria-label issu de common.landing.navigation.menuClose et appelle onClose au clic. | [#8c7051e54f3d72c7-3] |
| `mytimeline:frontend/src/components/landing/LandingMobileMenu.tsx:141-148` | LandingMobileMenu | Le lien de connexion pointe vers /{locale}/login, ferme le panneau au clic et porte le testid landing-menu-cta-login. | [#8c7051e54f3d72c7-4] |
| `mytimeline:frontend/src/components/landing/LandingMobileMenu.tsx:161-164` | LandingMobileMenu | Le pied du panneau affiche le sélecteur de langue et la bascule de thème sur une même rangée, la bascule portant le testid landing-mobile-menu-theme-toggle. | [#8c7051e54f3d72c7-5] |
| `mytimeline:frontend/src/components/landing/HowItWorksSection.tsx:60-67` | MILESTONES | La constante MILESTONES associe les quatre jalons reminder, recurrence, coverage et deadline aux rôles de palette sky, periwinkle, grass et amber, dans cet ordre. | [#833a7658e4f64473-1] |
| `mytimeline:frontend/src/components/landing/HowItWorksSection.tsx:69-70` | HowItWorksSection | Le composant HowItWorksSection lit ses textes dans le namespace common.landing.howItWorks. | [#201f8aedcc1673ce-1] |
| `mytimeline:frontend/src/components/landing/HowItWorksSection.tsx:81-84` | HowItWorksSection | La liste de la frise est un ol en grille, une colonne sous sm, deux colonnes de sm à lg et quatre colonnes à partir de lg. | [#201f8aedcc1673ce-2] |
| `mytimeline:frontend/src/components/landing/HowItWorksSection.tsx:85-93` | HowItWorksSection | Chaque jalon est un li avec data-role égal au rôle de palette du jalon, et le filet de liaison est un segment par jalon. | [#201f8aedcc1673ce-3] |
| `mytimeline:frontend/src/components/timeline/Minimap.tsx:24-30` | Minimap | Le composant Minimap affiche une barre de densité par bucket et une fenêtre de sélection déplaçable à la souris et au clavier. | [#bc4271b621bb2c51-1] |
| `mytimeline:frontend/src/components/events/ArchiveConfirmDialog.tsx:48-53` | ArchiveConfirmDialog | ArchiveConfirmDialog est un dialog de confirmation d'archivage sans état interne, ouvert et fermé par le parent via open et onOpenChange. | [#0244d6195f47fec7-1] |
| `mytimeline:frontend/src/components/events/ArchiveConfirmDialog.tsx:58-59` | ArchiveConfirmDialog | Le dialog est ancré en bas avec coins haut arrondis sous le breakpoint sm, puis centré à partir de sm. | [#0244d6195f47fec7-2] |
| `mytimeline:frontend/src/components/timeline/Ruler.tsx:29-56` | Ruler | Le composant Ruler affiche l'en-tête de la timeline, une colonne ressources optionnelle et une grille d'un DateStamp par jour. | [#bf56a2b2b9bbaa2c-1] |
| `mytimeline:frontend/src/components/landing/CtaSection.tsx:45-46` | CtaSection | CtaSection est le bandeau d'appel à l'action final de la landing, avec un titre h2, un sous-titre p et un lien vers l'inscription. | [#da5c3d94e3cc0acf-1] |
| `mytimeline:frontend/src/components/landing/FooterSection.tsx:50-54` | FooterSection | FooterSection est le pied de page de la landing, avec une prop locale optionnelle et une locale de repli issue de useLocale. | [#dc4eebb02e56beac-1] |
| `mytimeline:frontend/src/components/shared/EphemerisLeaf.tsx:74-76` | EphemerisLeaf | Le composant EphemerisLeaf affiche un feuillet d'éphéméride (jour de semaine, jour, mois et année, semaine ISO) à partir de la date du jour. | [#2a78c79a7f68e4d7-1] |
| `mytimeline:frontend/src/components/legal/legal-disclaimer.tsx:10-20` | LegalDisclaimer | Le composant LegalDisclaimer rend son texte children dans un paragraphe porteur du data-testid legal-disclaimer, sans logique d'affichage conditionnelle. | [#0ecf20dea16b06b5-1] |
| `mytimeline:frontend/src/components/shared/LoadingSkeleton.tsx:113` | LoadingSkeleton | La racine rend un div role=status avec le testId fourni, sans attribut aria-busy. | [#c470fdd6be79182c-1] |
| `mytimeline:frontend/src/types/event.ts:14` | recurrenceUnitEnum | L'enum recurrenceUnitEnum n'accepte que WEEK, MONTH et YEAR. | [#6691f06430465d63-1] |
| `mytimeline:frontend/src/types/event.ts:17` | durationUnitEnum | L'enum durationUnitEnum accepte days, weeks, months et years. | [#6ad25d5acaefd16e-1] |
| `mytimeline:frontend/src/types/event.ts:28-32` | RecurrencePreviewRequest | Le type RecurrencePreviewRequest porte startDate, recurrenceUnit (enum WEEK, MONTH, YEAR) et recurrenceEndDate optionnel ou null. | [#b48fb742343c5b4f-1] |
| `mytimeline:frontend/src/types/event.ts:34-37` | recurrencePreviewResponseSchema | Le schéma de réponse de la preview contient count numérique et capped booléen. | [#a406cb20957406b6-1] |
| `mytimeline:frontend/src/types/event.ts:41-61` | eventSchema | eventSchema décrit le contrat EventResponse avec id, title, type, startDate, endDate et productId obligatoires, et plusieurs champs nullable ou optional. | [#81d06e4fde2e810d-1] |
| `mytimeline:frontend/src/types/event.ts:55` | eventSchema | Le champ archived est un booléen obligatoire dans eventSchema. | [#81d06e4fde2e810d-2] |
| `mytimeline:frontend/src/types/event.ts:60` | eventSchema | Le champ version est un nombre nullable et optionnel dans eventSchema. | [#81d06e4fde2e810d-3] |
| `mytimeline:frontend/src/types/event.ts:73-77` | eventConflictBodySchema | eventConflictBodySchema décrit le corps d'un 409 avec error, serverVersion nullable et serverEvent au format eventSchema. | [#b2b6b8bd338dde6e-1] |
| `mytimeline:frontend/src/types/event.ts:335` | eventEditSchema | eventEditSchema est le schéma d'édition construit avec les messages FR bruts. | [#fe9de7e37f0c6c9b-1] |
| `mytimeline:frontend/src/types/event.ts:404-414` | eventCreationPayloadSchema | eventCreationPayloadSchema décrit le payload POST /api/events avec name, type, durationValue entier, durationUnit, isRecurring, recurrenceUnit optionnel, date optionnelle, color optionnelle et productId requis. | [#ef1e62514e0e905f-1] |
| `mytimeline:frontend/src/components/timeline/virtualization.ts:209-225` | VerticalModel | VerticalModel regroupe les tops de listes et de lanes, les décalages par catégorie dépliée, les hauteurs de lanes, la hauteur totale et le nombre de lanes visibles. | [#a4c051ab9d511341-1] |
| `mytimeline:frontend/src/components/events/NewEventDrawer.tsx:50-70` | NewEventDrawerProps | Les props du drawer sont open, onClose, onKeyboardShow et onKeyboardHide optionnels, et initialProductId optionnel. | [#aeb71e054bbb3941-1] |
| `mytimeline:frontend/src/components/timeline/TimelineEditHost.tsx:59` | TimelineEditHost | TimelineEditHost est un composant React qui enveloppe TimelineResponsive et ouvre l'éditeur d'événement pré-rempli. | [#e7685cc2e7fb08ff-1] |
| `mytimeline:frontend/src/components/timeline/TimelineSidebar.tsx:39-46` | TimelineSidebarCategory | L'interface TimelineSidebarCategory porte le nom, la couleur nullable, le nombre d'événements et l'état masqué d'une catégorie. | [#62c3924c6c4960f9-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:16-18` | EventEntity | Entité JPA EventEntity mappée sur la table events, avec AuditingEntityListener pour les champs d'audit. | [#4cd7a0a91f64825c-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:21-23` | EventEntity.id | Identifiant UUID généré avec GenerationType.AUTO. | [#5165ff72787424d4-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:25-31` | EventEntity.createdAt | createdAt est non nullable et non modifiable après insertion, updatedAt est non nullable, les deux étant renseignés par l'audit. | [#73e8d3320717bcf2-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:33-35` | EventEntity.version | Le champ version est annoté @Version, non nullable, et porte le verrou optimiste de l'entité. | [#3dd99ae27e2ec76a-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:43-45` | EventEntity.recurrenceUnit | L'énumération RecurrenceUnit est persistée sous forme de chaîne avec EnumType.STRING. | [#995205db589a0c94-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:55-56` | EventEntity.archived | Le champ archived est un boolean non nullable dont la valeur par défaut Java est false. | [#bbc36114a5d762eb-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/infrastructure/entities/EventEntity.java:58-61` | EventEntity.product | Relation ManyToOne vers ProductEntity via la colonne product_id, obligatoire (nullable = false). | [#f723e2d2c3be810c-1] |
| `mytimeline:frontend/src/components/landing/LandingMobileMenu.tsx:53-58` | LandingMobileMenuNavLink | L'interface LandingMobileMenuNavLink porte un anchor typé LandingNavAnchor, un href et un label. | [#bd6cfefa98805efe-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/Event.java:6-26` | Event | Event est un modèle domaine sans annotation JPA portant id, title, type, durées, indicateurs de récurrence, dates, productId, isAllDay, color, archived et version. | [#59eebee91238c5e6-1] |
| `mytimeline:backend/src/main/java/com/matimeline/eventmanager/domain/models/Event.java:26` | Event.version | Le modèle Event déclare un champ version de type Integer, nullable pour un événement non persisté. | [#f9538089e4162db7-1] |
| `mytimeline:frontend/src/types/auth.ts:10-23` | User | L'interface User porte id, name, username, email, role, avatarUrl (string ou null) et themePreference (ThemeOption ou null). | [#123c88c80d6a07c0-1] |
| `mytimeline:frontend/src/types/auth.ts:25-37` | AuthContextType | L'interface AuthContextType expose user, login, register, logout, refreshUser et loading. | [#377150499a864cd1-1] |
| `mytimeline:frontend/src/__tests__/support/visualViewport.ts:13-20` | FakeVisualViewport | La classe FakeVisualViewport étend EventTarget et porte height, offsetTop, width fixée à 390, offsetLeft, pageTop, pageLeft et scale à 1 par défaut. | [#8b5200f6d92c554f-1] |
| `mytimeline:frontend/src/types/settings.ts:21-28` | SessionSchema | SessionSchema valide id (guid), deviceInfo et ipAddress (string nullable), lastActivity, createdAt (string) et current (boolean). | [#c32d4cc23486c784-1] |
| `mytimeline:frontend/src/components/timeline/TimelineView.tsx:1422` | TimelineView.goToToday | L'action Aujourd'hui dispatch GO_TO_TODAY avec le décalage en jours entre le début de la plage et aujourd'hui, puis recentre le défilement. | [#355791a28fb201a5-1] |
| `mytimeline:frontend/src/components/timeline/useTimelineMobileState.ts:196` | useTimelineMobileState | Le niveau de zoom est porté par un useReducer sur zoomReducer, initialisé par initialZoomState. | [#5c5036468ebaeba2-1] |
| `mytimeline:frontend/src/components/timeline/useTimelineMobileState.ts:459` | useTimelineMobileState.setScrollNode | Les valeurs trackWidth, todayLeftPx et rawOnScroll sont copiées dans des refs par useInsertionEffect, pour être lues par setScrollNode. | [#cb17e4c2c763863b-1] |
| `mytimeline:frontend/src/components/timeline/useTimelineMobileState.ts:533-536` | useTimelineMobileState.zoomIn | zoomIn relève l'ancre de zoom avant de dispatcher ZOOM_IN. | [#eeeee809e0606052-1] |
| `mytimeline:frontend/src/components/timeline/useTimelineMobileState.ts:541-547` | useTimelineMobileState.onPinchZoom | onPinchZoom relève l'ancre de zoom puis dispatche ZOOM_IN ou ZOOM_OUT selon la direction du pinch. | [#3e443b18903a8389-1] |
| `mytimeline:frontend/src/components/timeline/useTimelineMobileSelection.ts:23` | useTimelineMobileSelection | Le hook conserve l'événement détaillé selected en useState, initialisé à null. | [#3a7ba8b489e78f11-1] |
| `mytimeline:frontend/src/components/timeline/useTimelineMobileSelection.ts:24` | useTimelineMobileSelection | Le hook conserve la cible d'action actionTarget en useState, initialisée à null. | [#3a7ba8b489e78f11-2] |

## Lignes rétrogradées {#t-demoted_lines}

| Section | Ligne | Motif |
|---|---|---|
| rules | - endDate vaut startDate si le type n'est pas duration ou si durationValue est null, sinon elle ajoute la durée à startDate en jours, semaines, mois ou années. [#cc99956ac9776a16-2] [#07c457f80db0df8d-1] [#07c457f80db0df8d-2] | deducible |
| rules | - Quand un facteur de date change sur un type duration, endDate est recalculée depuis la durée et écrase celle du payload. [#0a5cb14f76e71bab-4] [#2195f700ae4f8511-1] [#e3e385d7059a5f54-1] | deducible |
| rules | - Pour un autre type, endDate suit startDate sauf si le payload en fournit une explicite, qui est conservée. [#0a5cb14f76e71bab-5] [#b84d3ed6e52f3f92-1] [#87b02940d36936a0-1] [#7f8414d0f0636f0e-1] | deducible |
| rules | - Un échec Bean Validation renvoie 400 VALIDATION_FAILED avec un message fixe, sans détail des champs. [#5f1f2d7ff5520ed0-1] | deducible |
| rules | - Une erreur non 409 donne forbidden pour un 403 et error sinon, et sans eventId ni utilisateur authentifié aucun PATCH n'est envoyé. [#72553b1afd7d4b9c-4] [#90826fc9af1289ad-1] | deducible |
| rules | - L'expansion lève IllegalArgumentException si startDate ou l'unité est null, ou si la borne précède startDate. [#ad20550d8c7b7927-1] [#ad20550d8c7b7927-2] [#ad20550d8c7b7927-3] | deducible |
| rules | - La prévisualisation exige startDate et recurrenceUnit, et elle est inactive en création. [#e8c68cae5e1a288c-1] [#df54606069087ac4-1] [#217f1c045eaf144e-1] [#156dffc5eb754f19-1] | deducible |
| rules | - Le titre d'édition compte entre 1 et 100 caractères. Le schéma de création exige une durée supérieure à 0 pour duration, celui d'édition exige durationUnit. [#266280b35925aede-1] [#219eb91abd142306-2] [#266280b35925aede-4] | deducible |
| rules | - Pour un type single, le payload envoie 0 et days pour la durée, et recurrenceUnit n'est transmis que si isRecurring est vrai. [#90c86098bae6947e-1] [#90c86098bae6947e-2] | deducible |
| rules | - Le jeton est refusé si alg n'est pas RS256, si sub est vide, si exp est absent ou passé, ou si nbf est dans le futur. [#a34790c03ee8b251-1] [#a34790c03ee8b251-2] [#988075cfd275a2c9-1] [#988075cfd275a2c9-2] | deducible |
| surface | - La lecture des événements d'un produit lève EventNotFoundException quand la liste est vide, ce qui fait d'un produit sans événement une erreur et non une liste vide [#665d61399deb1d3e-1]. | deducible |
| surface | - POST /api/events/recurrence-preview calcule les occurrences via RecurrenceExpansionService sans rien persister, et le formulaire l'appelle par useRecurrencePreview, avec recurrenceEndDate à null si absente [#0091f7a72002aac6-1] [#03a2a04694f5c3a0-1] [#58ef390b8a7d09ed-1]. | deducible |
| tests | - Les tests fixent que l'archivage invalide products.all sur succès et sur 409, mais pas sur 403 [#8777c3b95941af7e-2] [#8777c3b95941af7e-3] [#8777c3b95941af7e-4]. | deducible |

