package com.matimeline.eventmanager.domain.ports.services;

import java.time.LocalDate;

import com.matimeline.eventmanager.domain.models.RecurrenceExpansion;
import com.matimeline.eventmanager.domain.models.RecurrenceUnit;

/**
 * Port métier : expansion bornée des occurrences d'une récurrence (#54).
 *
 * <p>À partir d'une {@code startDate}, d'une {@link RecurrenceUnit} ({@code WEEK/MONTH/YEAR})
 * et d'une {@code recurrenceEndDate} optionnelle, génère la liste des dates d'occurrence
 * jusqu'à la borne (incluse), ou — borne absente — jusqu'à l'horizon temporel
 * {@link RecurrenceExpansion#MAX_UNBOUNDED_EXPANSION_YEARS} ; le plafond
 * {@link RecurrenceExpansion#MAX_OCCURRENCES} reste appliqué en complément.
 * Modèle domaine pur — aucune dépendance framework.
 */
public interface RecurrenceExpansionService {

    /**
     * Développe les occurrences d'une récurrence.
     *
     * @param startDate         première occurrence (incluse) ; obligatoire.
     * @param unit              unité de récurrence ({@code WEEK/MONTH/YEAR}) ; obligatoire.
     * @param recurrenceEndDate borne de fin incluse ; {@code null} = récurrence indéfinie, bornée à
     *                          l'horizon {@link RecurrenceExpansion#MAX_UNBOUNDED_EXPANSION_YEARS}
     *                          (#452) — le plafond {@link RecurrenceExpansion#MAX_OCCURRENCES} reste
     *                          appliqué, mais ne mord que sur une borne explicite lointaine.
     * @return la liste des occurrences + le flag {@code capped}.
     * @throws IllegalArgumentException si {@code startDate} ou {@code unit} est {@code null},
     *                                  ou si {@code recurrenceEndDate} est strictement avant
     *                                  {@code startDate} (série vide illégale).
     */
    RecurrenceExpansion expand(LocalDate startDate, RecurrenceUnit unit, LocalDate recurrenceEndDate);
}
