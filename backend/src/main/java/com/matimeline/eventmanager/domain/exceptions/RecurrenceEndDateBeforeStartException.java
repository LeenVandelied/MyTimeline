package com.matimeline.eventmanager.domain.exceptions;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Levée quand l'état fusionné d'un événement viole BR-EVE-012 :
 * {@code recurrenceEndDate} est antérieure à {@code startDate}.
 *
 * <p>BR-EVE-012 (#168) : {@code recurrenceEndDate} borne la fin d'une récurrence ; une date
 * de fin AVANT le début est incohérente et était jusqu'ici acceptée silencieusement.
 * Le PATCH ne portant pas {@code startDate}, la garde ne peut vivre au niveau DTO (elle ne
 * voit pas l'état persisté) : elle porte sur l'ENTITÉ fusionnée dans
 * {@code EventServiceImpl.updateEvent} (recurrenceEndDate du payload vs startDate en base).
 *
 * <p>La donnée est syntaxiquement recevable (corps JSON désérialisé) mais sémantiquement
 * incohérente -> HTTP 422 Unprocessable Entity (mappé par {@code GlobalExceptionHandler}),
 * cohérent avec {@code InvalidDurationUnitException} (BR-EVE-004) et non 400 (réservé à la
 * Bean Validation en amont). Cf. [[DEC-S12-001]].
 */
public class RecurrenceEndDateBeforeStartException extends RuntimeException {
    public RecurrenceEndDateBeforeStartException(UUID id, LocalDate recurrenceEndDate, LocalDate startDate) {
        super("BR-EVE-012 : recurrenceEndDate (" + recurrenceEndDate + ") ne peut pas être "
                + "antérieure à startDate (" + startDate + ") pour l'événement " + id);
    }

    /**
     * Variante SANS id d'événement — contexte de PRÉVISUALISATION (#439) où le calcul est PUR
     * (aucun event persisté, {@code POST /api/events/recurrence-preview}). Même règle BR-EVE-012,
     * même mapping 422 via {@code GlobalExceptionHandler} : réutilise la sémantique d'erreur du
     * chemin CRUD plutôt que d'en introduire une seconde.
     */
    public RecurrenceEndDateBeforeStartException(LocalDate recurrenceEndDate, LocalDate startDate) {
        super("BR-EVE-012 : recurrenceEndDate (" + recurrenceEndDate + ") ne peut pas être "
                + "antérieure à startDate (" + startDate + ")");
    }
}
