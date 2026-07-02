package com.matimeline.eventmanager.utils;

import java.time.LocalDate;

import com.matimeline.eventmanager.application.dtos.EventCreationRequest;
import com.matimeline.eventmanager.domain.exceptions.InvalidDurationUnitException;

public class Utils {

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
