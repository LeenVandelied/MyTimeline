# issue-201-done

commits: [38f8c65b9890d4abdf0fb2e8d123ecaa9c673733, 204dae254083189ab6e8363da89c6179bc86bbe7]

## fix review (204dae2)
MAJEUR-2 (trou validation fermé): @AssertTrue DTO ne gardait que la paire du payload. PATCH endDate SEULE (sans startDate) sur single pouvait persister endDate < startDate en base (contournement). -> garde SERVICE sur état fusionné (miroir BR-EVE-012): endDate<startDate -> nouvelle EndDateBeforeStartException mappée 422 (aligné RecurrenceEndDateBeforeStartException/InvalidDurationUnit). isBefore stricte (== toléré). @AssertTrue DTO conservé (fail-fast payload).
MAJEUR-1 (comportement acté): flip type duration->single via type seul collapse endDate sur startDate persistée (BR-EVE-003). Volontaire, désormais testé explicitement (asserts type+endDate).
Fichiers +: EndDateBeforeStartException.java (nouveau), EventServiceImpl (garde post-merge), GlobalExceptionHandler (@ExceptionHandler 422; #200 déjà mergé, ajout additif sans conflit).
Tests +: unit endDate-seule<startDate rejetée + borne == tolérée; integration Postgres endDate-seule<startDate -> 422 + rien persisté; flip type enrichi. Suite 280/280 verte.

## resume
Objectif: aligner contrat startDate/endDate form<->DTO. Form envoyait startDate/endDate au PATCH, EventUpdateRequest les IGNORAIT (faux contrôle). -> câblés bout-en-bout.

Décision contrat (dates PATCH + create):
- type='duration': durée = source de vérité endDate (BR-EVE-003). startDate déplacée -> endDate re-dérivée (start+durée); endDate explicite du payload volontairement écrasée.
- type!='duration' (single): endDate explicite persistée telle quelle; sinon endDate suit startDate dès que type/startDate change.
- Garde endDate>=startDate: @AssertTrue sur EventUpdateRequest -> 400 via handler MethodArgumentNotValid EXISTANT (aucun nouveau mapping; GlobalExceptionHandler NON touché, périmètre #200 respecté). S'applique quand les 2 dates présentes au payload (cas form). PATCH partiel 1 date: pas de garde inter-champ possible au DTO (état persisté invisible), acceptable.
- Création: inchangée (date + Utils.calculateEndDate déjà en place, BR-EVE-005).

BR touchées: BR-EVE-003 (dérivation endDate étendue au PATCH startDate), BR-EVE-002 (endDate>=startDate désormais gardée backend).

Fichiers clés:
- EventUpdateRequest.java: +startDate,+endDate,+@AssertTrue isEndDateConsistent()
- EventUpdateCommand.java: record +startDate,+endDate (9->11 champs)
- EventController.toUpdateCommand: câble les 2 champs
- EventServiceImpl.updateEvent: applique startDate/endDate AVANT recalcul; recalcul déclenché aussi par startDate; branche duration vs single
- (repo/mapper: 0 changement, copyMutableFields recopiait déjà start/endDate)

Frontend: event.ts LECTURE SEULE, aucun désalignement type (startDate/endDate déjà dans buildEventEditSchema + envoyés par eventService.updateEvent). Zone archived NON touchée (#188). Pas d'édition front.

Pitfalls: builder Upd + 3 constructeurs record dans tests adaptés (9->11 args). Flaky NON lié: EventOptimisticLockConflictIntegrationTest (#200, préfixe i200-) échoue parfois en suite (course threads: OptimisticLockException Hibernate brute vs ObjectOptimisticLockingFailureException Spring selon timing status.flush()); PASSE en isolation; hors mon périmètre.

Tests: 277/277 PASSED (BUILD SUCCESS). Ajouts:
- EventServiceImplTest: singleWithExplicitEndDate_persistsAsIs, durationStartDateMoved_reDerivesEndDate, singleStartDateMoved_collapsesToStartDate (3)
- EventPatchAndRecurrenceIntegrationTest: patchSingleWithExplicitDates_persistsInDatabase (scénario désaccord), patchDurationMovesStartDate_reDerivesEndDate (2)

## MEMORY
[MEMORY:decision] Contexte: form event envoyait startDate/endDate au PATCH mais DTO les ignorait. Decision: PATCH consomme startDate/endDate; pour type=duration la durée reste source de vérité de endDate (endDate explicite écrasée si startDate/durée changent), pour type single endDate explicite persistée telle quelle. Why: cohérence BR-EVE-003 sans casser le calcul par durée; symétrie create/update.
[MEMORY:business-rule] BR-EVE-002 evolue: endDate>=startDate désormais GARDÉE backend (@AssertTrue EventUpdateRequest -> 400) quand les 2 dates au payload, plus seulement frontend. Contrainte: garde DTO uniquement (pas d'accès état persisté), donc PATCH mono-date non gardé inter-champ.
[MEMORY:business-rule] BR-EVE-003 etendue: dérivation endDate ne vit plus qu'à la création; au PATCH type=duration, déplacer startDate re-dérive endDate (start+durée). type single: endDate=startDate si pas d'endDate explicite.
[MEMORY:pitfall] Contexte: ajout de 2 champs à un record domaine (EventUpdateCommand) casse tous les `new EventUpdateCommand(...)` positionnels des tests. Solution: adapter builder Upd + constructeurs inline (grep `new EventUpdateCommand`). Prévention: préférer un builder de test unique.

## recommandations suite
- Pas de RECOMMAND_TEST_RUNNER (277 tests < 500, suite ~1-2min < 3min, lancée inline OK).
- Pas de RECOMMAND_DB_EXPERT (aucune migration, copyMutableFields déjà OK).
- RECOMMAND_FOLLOWUP: EventOptimisticLockConflictIntegrationTest (#200) est FLAKY en suite complète (assertion sur le type d'exception optimistic-lock sensible au timing du flush). À stabiliser côté #200 (catcher/traduire aussi jakarta.persistence.OptimisticLockException, ou assert sur les deux types). Hors périmètre #201.
- RECOMMAND_FOLLOWUP (mineur, front): eventCreationSchema n'expose pas startDate/endDate séparés (create envoie `date` seul); si le form de création doit un jour saisir endDate explicite pour single, aligner Zod create + EventCreationRequest. Non requis par #201 (create déjà cohérent).

STATUS: COMPLETED
