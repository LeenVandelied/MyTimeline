package com.matimeline.eventmanager.domain.exceptions;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Levée quand l'état fusionné d'un événement viole BR-EVE-002 :
 * {@code endDate} est antérieure à {@code startDate}.
 *
 * <p>BR-EVE-002 (#201) : {@code endDate >= startDate}. Le formulaire d'édition envoie souvent
 * les DEUX dates ensemble (garde fail-fast {@code @AssertTrue} sur {@code EventUpdateRequest}
 * -> 400 au niveau payload). MAIS un PATCH partiel peut n'envoyer que {@code endDate} SEULE :
 * pour un event {@code type != 'duration'} cette endDate est persistée telle quelle, et si elle
 * est antérieure à la {@code startDate} déjà en base, le contrôle DTO est contourné (il ne voit
 * pas l'état persisté). La garde ne peut donc pas vivre uniquement au niveau DTO : elle porte
 * ici sur l'ENTITÉ fusionnée dans {@code EventServiceImpl.updateEvent}, après application des
 * champs partiels et (re)dérivation d'endDate.
 *
 * <p>La donnée est syntaxiquement recevable (corps JSON désérialisé) mais sémantiquement
 * incohérente -> HTTP 422 Unprocessable Entity (mappé par {@code GlobalExceptionHandler}),
 * cohérent avec {@code RecurrenceEndDateBeforeStartException} (BR-EVE-012) et
 * {@code InvalidDurationUnitException} (BR-EVE-004). Cf. [[DEC-S12-001]].
 */
public class EndDateBeforeStartException extends RuntimeException {
    public EndDateBeforeStartException(UUID id, LocalDate endDate, LocalDate startDate) {
        super("BR-EVE-002 : endDate (" + endDate + ") ne peut pas être antérieure à "
                + "startDate (" + startDate + ") pour l'événement " + id);
    }
}
