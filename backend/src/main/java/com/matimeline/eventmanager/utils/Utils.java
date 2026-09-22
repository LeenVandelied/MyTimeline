package com.matimeline.eventmanager.utils;

import java.time.LocalDate;
import java.util.Set;

import com.matimeline.eventmanager.application.dtos.EventCreationRequest;
import com.matimeline.eventmanager.domain.exceptions.InvalidDurationUnitException;
import com.matimeline.eventmanager.domain.exceptions.InvalidEventTypeException;

public class Utils {

    /** Valeurs de {@code type} autorisées (contrainte DB {@code ck_events_type}, V4). */
    private static final Set<String> ALLOWED_EVENT_TYPES = Set.of("duration", "single");

    /**
     * Valide le {@code type} d'un événement AVANT la persistance (BR-EVE-002).
     *
     * <p>Symétrique de la validation {@code durationUnit} de {@link #calculateEndDate}. Un
     * {@code type} null ou hors {@code duration/single} lève une {@link InvalidEventTypeException}
     * (mappée en 422), au lieu de laisser la contrainte DB {@code ck_events_type} produire une
     * {@code DataIntegrityViolationException} non gérée — cette dernière étant masquée en 401 par
     * le dispatch {@code /error} (voir SecurityConfig). Appelée au create ET au PATCH (si fourni).
     */
    public static void validateEventType(String type) {
        if (type == null || !ALLOWED_EVENT_TYPES.contains(type)) {
            throw new InvalidEventTypeException(type);
        }
    }

    /**
     * Calcule l'{@code endDate} à partir d'un {@link EventCreationRequest} (façade création).
     * Délègue à la surcharge par champs primitifs, réutilisable au PATCH (#54).
     */
    public static LocalDate calculateEndDate(EventCreationRequest eventCreationRequest, LocalDate startDate) {
        return calculateEndDate(
                eventCreationRequest.getType(),
                eventCreationRequest.getDurationValue(),
                eventCreationRequest.getDurationUnit(),
                startDate);
    }

    /**
     * Calcule l'{@code endDate} d'un événement (BR-EVE-003).
     *
     * <ul>
     *   <li>{@code type='duration'} + {@code durationValue} non null -> {@code startDate} + durée.</li>
     *   <li>tout autre {@code type} (dont {@code single}) ou {@code durationValue} null -> {@code startDate}.</li>
     * </ul>
     *
     * <p>BR-EVE-004 (#54) : null-guard sur {@code durationUnit} AVANT le {@code switch} pour
     * éviter la {@code NullPointerException} documentée (switch(null)). Un {@code durationUnit}
     * null ou inconnu alors que {@code type='duration'} lève une {@link InvalidDurationUnitException}
     * (mappée en HTTP 422), et non plus une NPE (500) ou une {@code IllegalArgumentException} brute.
     */
    public static LocalDate calculateEndDate(String type, Integer durationValue, String durationUnit,
                                             LocalDate startDate) {
        if (!"duration".equals(type) || durationValue == null) {
            return startDate;
        }
        if (durationUnit == null) {
            throw new InvalidDurationUnitException(null);
        }
        switch (durationUnit) {
            case "days":
                return startDate.plusDays(durationValue);
            case "weeks":
                return startDate.plusWeeks(durationValue);
            case "months":
                return startDate.plusMonths(durationValue);
            case "years":
                return startDate.plusYears(durationValue);
            default:
                throw new InvalidDurationUnitException(durationUnit);
        }
    }
}
