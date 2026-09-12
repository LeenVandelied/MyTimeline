package com.matimeline.eventmanager.application.dtos;

import com.matimeline.eventmanager.domain.models.RecurrenceExpansion;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Projection HTTP du résultat d'une prévisualisation de récurrence (#439).
 *
 * <p>Contrat de sortie de {@code POST /api/events/recurrence-preview}, consommé par #67 :
 * <pre>{ "count": &lt;int&gt;, "capped": &lt;boolean&gt; }</pre>
 * <ul>
 *   <li>{@code count} = {@link RecurrenceExpansion#size()} — nombre d'occurrences générées.</li>
 *   <li>{@code capped} = {@link RecurrenceExpansion#capped()} — {@code true} si la série a été
 *       TRONQUÉE (plafond {@link RecurrenceExpansion#MAX_OCCURRENCES} OU horizon
 *       {@link RecurrenceExpansion#MAX_UNBOUNDED_EXPANSION_YEARS}). Le hint LIVE de #67 s'affiche
 *       quand {@code capped=true} et disparaît dès qu'une {@code recurrenceEndDate} ramène la
 *       série sous la limite.</li>
 * </ul>
 *
 * <p>La valeur {@code capped} provient EXCLUSIVEMENT de {@code expansion.capped()} : jamais
 * recalculée ni contournée côté contrôleur (garde mémoire/CPU #54).
 */
@Getter
@AllArgsConstructor
public class RecurrencePreviewResponse {
    private int count;
    private boolean capped;

    public static RecurrencePreviewResponse fromExpansion(RecurrenceExpansion expansion) {
        return new RecurrencePreviewResponse(expansion.size(), expansion.capped());
    }
}
