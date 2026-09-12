package com.matimeline.eventmanager.domain.exceptions;

import java.util.UUID;

/**
 * Levée quand l'état fusionné d'un événement viole BR-EVE-006 :
 * {@code isRecurring=true} alors que {@code recurrenceUnit} est {@code null}.
 *
 * <p>BR-EVE-006 (#54 create / #95fix update) : un événement récurrent DOIT porter une
 * unité de récurrence (WEEK/MONTH/YEAR). Le chemin CREATE l'impose déjà via
 * {@code EventCreationRequest.isRecurrenceUnitConsistent()} (@AssertTrue -> 400). Le chemin
 * PATCH étant partiel, la garde ne peut vivre au niveau DTO (qui ne voit pas l'état persisté) :
 * elle porte sur l'ENTITÉ fusionnée dans {@code EventServiceImpl.updateEvent}, et cette
 * exception est mappée en HTTP 400 par {@code GlobalExceptionHandler}.
 */
public class RecurrenceUnitRequiredException extends RuntimeException {
    public RecurrenceUnitRequiredException(UUID id) {
        super("BR-EVE-006 : recurrenceUnit requis (WEEK/MONTH/YEAR) quand isRecurring=true "
                + "pour l'événement " + id);
    }
}
