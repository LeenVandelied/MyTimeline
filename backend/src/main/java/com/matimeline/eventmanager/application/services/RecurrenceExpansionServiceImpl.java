package com.matimeline.eventmanager.application.services;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.matimeline.eventmanager.domain.models.RecurrenceExpansion;
import com.matimeline.eventmanager.domain.models.RecurrenceUnit;
import com.matimeline.eventmanager.domain.ports.services.RecurrenceExpansionService;

/**
 * Expansion bornée des occurrences d'une récurrence (#54).
 *
 * <p>Génère les dates de proche en proche via {@code plusWeeks/plusMonths/plusYears}
 * (report calendaire correct : fin de mois, années bissextiles). Le plafond dur
 * {@link RecurrenceExpansion#MAX_OCCURRENCES} borne à la fois les récurrences sans
 * {@code recurrenceEndDate} (indéfinies) et les intervalles longs légitimes (vieil
 * événement hebdomadaire) — dans ce cas {@code capped=true} le signale.
 */
@Service
public class RecurrenceExpansionServiceImpl implements RecurrenceExpansionService {

    @Override
    public RecurrenceExpansion expand(LocalDate startDate, RecurrenceUnit unit, LocalDate recurrenceEndDate) {
        if (startDate == null) {
            throw new IllegalArgumentException("startDate est obligatoire pour développer une récurrence");
        }
        if (unit == null) {
            throw new IllegalArgumentException("recurrenceUnit est obligatoire pour développer une récurrence");
        }
        if (recurrenceEndDate != null && recurrenceEndDate.isBefore(startDate)) {
            throw new IllegalArgumentException(
                    "recurrenceEndDate (" + recurrenceEndDate + ") est antérieure à startDate (" + startDate + ")");
        }

        List<LocalDate> occurrences = new ArrayList<>();
        LocalDate current = startDate;
        boolean capped = false;

        while (recurrenceEndDate == null || !current.isAfter(recurrenceEndDate)) {
            occurrences.add(current);
            if (occurrences.size() >= RecurrenceExpansion.MAX_OCCURRENCES) {
                // Plafond atteint. Il n'est "cappé" que s'il reste (ou pourrait rester)
                // des occurrences à générer : borne absente, OU prochaine occurrence
                // encore dans la fenêtre.
                LocalDate next = advance(current, unit);
                capped = recurrenceEndDate == null || !next.isAfter(recurrenceEndDate);
                break;
            }
            current = advance(current, unit);
        }

        return new RecurrenceExpansion(occurrences, capped);
    }

    private LocalDate advance(LocalDate date, RecurrenceUnit unit) {
        switch (unit) {
            case WEEK:
                return date.plusWeeks(1);
            case MONTH:
                return date.plusMonths(1);
            case YEAR:
                return date.plusYears(1);
            default:
                // Enum exhaustif (WEEK/MONTH/YEAR) — inatteignable, garde-fou défensif.
                throw new IllegalArgumentException("RecurrenceUnit non gérée : " + unit);
        }
    }
}
