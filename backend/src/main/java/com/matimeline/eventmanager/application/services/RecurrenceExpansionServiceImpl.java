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
 * (report calendaire correct : fin de mois, années bissextiles).
 *
 * <p>DEUX bornes complémentaires, chacune sur son cas (#452) :
 * <ul>
 *   <li>{@link RecurrenceExpansion#MAX_UNBOUNDED_EXPANSION_YEARS} — horizon TEMPOREL, appliqué
 *       aux séries SANS {@code recurrenceEndDate} ;</li>
 *   <li>{@link RecurrenceExpansion#MAX_OCCURRENCES} — plafond mémoire/CPU en NOMBRE d'occurrences,
 *       appliqué à toutes les séries, seul à mordre sur une borne explicite lointaine.</li>
 * </ul>
 * Dans les deux cas {@code capped=true} signale la troncature.
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

        // #452 — Une série sans borne explicite est développée jusqu'à l'HORIZON TEMPOREL,
        // et non plus jusqu'au seul plafond d'occurrences (qui, exprimé en compte, laissait
        // filer le mensuel sur ~333 ans). Une borne explicite est honorée telle quelle :
        // l'horizon ne rogne jamais une intention utilisateur (BR-EVE-012).
        boolean unbounded = (recurrenceEndDate == null);
        LocalDate effectiveEnd = unbounded
                ? startDate.plusYears(RecurrenceExpansion.MAX_UNBOUNDED_EXPANSION_YEARS)
                : recurrenceEndDate;

        List<LocalDate> occurrences = new ArrayList<>();
        LocalDate current = startDate;
        boolean capped = false;

        while (!current.isAfter(effectiveEnd)) {
            occurrences.add(current);
            if (occurrences.size() >= RecurrenceExpansion.MAX_OCCURRENCES) {
                // Plafond d'occurrences atteint. Il n'est "cappé" que s'il reste des
                // occurrences à générer : prochaine occurrence encore dans la fenêtre.
                capped = !advance(current, unit).isAfter(effectiveEnd);
                break;
            }
            current = advance(current, unit);
        }

        // Une série indéfinie est par définition infinie : l'horizon la tronque TOUJOURS,
        // donc `capped` reste vrai — sémantique inchangée pour les consommateurs (#67/#439),
        // seul le VOLUME rendu change.
        if (unbounded) {
            capped = true;
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
