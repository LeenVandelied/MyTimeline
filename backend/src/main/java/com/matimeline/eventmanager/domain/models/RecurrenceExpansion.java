package com.matimeline.eventmanager.domain.models;

import java.time.LocalDate;
import java.util.List;

/**
 * Résultat borné de l'expansion d'une récurrence (#54).
 *
 * @param occurrences dates de début de chaque occurrence, {@code startDate} inclus, triées croissant.
 * @param capped {@code true} si le plafond de sécurité ({@link RecurrenceExpansion#MAX_OCCURRENCES})
 *               a été atteint avant la {@code recurrenceEndDate} (ou en l'absence de borne) — l'appelant
 *               peut alors signaler que la série est tronquée (consommé par le hint frontend #67).
 */
public record RecurrenceExpansion(List<LocalDate> occurrences, boolean capped) {

    /**
     * Plafond dur d'occurrences générées, borne de sécurité mémoire/CPU.
     * Une récurrence hebdomadaire sans {@code recurrenceEndDate} atteint ce plafond
     * en ~77 ans (52 occ/an) — comportement documenté (risque technique #54).
     */
    public static final int MAX_OCCURRENCES = 4000;

    public int size() {
        return occurrences.size();
    }
}
