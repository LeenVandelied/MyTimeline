package com.matimeline.eventmanager.domain.exceptions;

/**
 * Levée quand un calcul d'{@code endDate} rencontre un {@code durationUnit} invalide
 * (hors {@code days/weeks/months/years}) ou {@code null} alors que {@code type='duration'}.
 *
 * <p>BR-EVE-004 (#54) : la donnée est syntaxiquement recevable (le corps JSON a bien été
 * désérialisé) mais sémantiquement incalculable -> HTTP 422 Unprocessable Entity (mappé
 * par {@code GlobalExceptionHandler}), et non 400 (qui est réservé à la validation Bean
 * Validation en amont) ni 500 (NPE/IllegalArgumentException brute avant #54).
 */
public class InvalidDurationUnitException extends RuntimeException {
    public InvalidDurationUnitException(String durationUnit) {
        super("Unité de durée invalide pour un événement de type 'duration' : "
                + (durationUnit == null ? "null" : durationUnit));
    }
}
