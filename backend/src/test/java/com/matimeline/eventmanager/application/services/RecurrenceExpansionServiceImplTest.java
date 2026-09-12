package com.matimeline.eventmanager.application.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import com.matimeline.eventmanager.domain.models.RecurrenceExpansion;
import com.matimeline.eventmanager.domain.models.RecurrenceUnit;

/**
 * BR récurrence (#54) : expansion bornée des occurrences + flag capped.
 * #452 : horizon TEMPOREL des séries sans date de fin, en complément du plafond d'occurrences.
 */
class RecurrenceExpansionServiceImplTest {

    private final RecurrenceExpansionServiceImpl service = new RecurrenceExpansionServiceImpl();

    private static final LocalDate START = LocalDate.of(2026, 1, 1);

    @Test
    void weekly52Weeks_returnsExactly52Occurrences() {
        // Borne = start + 51 semaines -> occurrences aux semaines 0..51 incluses = 52.
        LocalDate end = START.plusWeeks(51);
        RecurrenceExpansion result = service.expand(START, RecurrenceUnit.WEEK, end);

        assertThat(result.size()).isEqualTo(52);
        assertThat(result.occurrences().get(0)).isEqualTo(START);
        assertThat(result.occurrences().get(51)).isEqualTo(START.plusWeeks(51));
        assertThat(result.capped()).isFalse();
    }

    @Test
    void firstOccurrenceIsStartDateInclusive() {
        RecurrenceExpansion result = service.expand(START, RecurrenceUnit.MONTH, START);
        assertThat(result.occurrences()).containsExactly(START);
        assertThat(result.capped()).isFalse();
    }

    @Test
    void monthlyRespectsCalendarRollover() {
        // 31 janv -> 28 févr (2026 non bissextile) : plusMonths gère le report.
        LocalDate jan31 = LocalDate.of(2026, 1, 31);
        RecurrenceExpansion result = service.expand(jan31, RecurrenceUnit.MONTH, LocalDate.of(2026, 3, 31));
        assertThat(result.occurrences()).containsExactly(
                LocalDate.of(2026, 1, 31),
                LocalDate.of(2026, 2, 28),
                LocalDate.of(2026, 3, 28));
    }

    /**
     * #452 — Une série SANS date de fin s'arrête à l'horizon TEMPOREL, pour chacune des
     * trois unités. C'est l'assertion qui compte : elle porte sur la portée en ANNÉES,
     * pas sur un nombre d'occurrences.
     *
     * <p>Contrôle négatif du bug d'origine : avec l'ancien plafond en compte pur (4000),
     * la dernière occurrence tombait à ~77 ans (WEEK), ~333 ans (MONTH), 4000 ans (YEAR).
     * Une régression qui retirerait l'horizon ferait donc exploser `yearsSpanned`.
     */
    @ParameterizedTest
    @EnumSource(RecurrenceUnit.class)
    void unbounded_stopsAtTemporalHorizon_whateverTheUnit(RecurrenceUnit unit) {
        RecurrenceExpansion result = service.expand(START, unit, null);

        LocalDate last = result.occurrences().get(result.size() - 1);
        LocalDate horizon = START.plusYears(RecurrenceExpansion.MAX_UNBOUNDED_EXPANSION_YEARS);

        assertThat(last)
                .as("dernière occurrence (%s) au-delà de l'horizon %s", unit, horizon)
                .isBeforeOrEqualTo(horizon);
        assertThat(ChronoUnit.YEARS.between(START, last))
                .as("portée en années (%s)", unit)
                .isLessThanOrEqualTo(RecurrenceExpansion.MAX_UNBOUNDED_EXPANSION_YEARS);
        // L'horizon mord AVANT le plafond d'occurrences pour toute unité.
        assertThat(result.size()).isLessThan(RecurrenceExpansion.MAX_OCCURRENCES);
        assertThat(result.capped()).isTrue();
    }

    /**
     * #452 — La borne est bien TEMPORELLE et non plus en compte : à horizon égal, les trois
     * unités rendent des NOMBRES d'occurrences différents. C'est exactement l'inverse du bug
     * d'origine, où les trois rendaient 4000 occurrences sur des portées de siècles distinctes.
     */
    @Test
    void unbounded_sameHorizonAcrossUnits_butDifferentOccurrenceCounts() {
        int weekly = service.expand(START, RecurrenceUnit.WEEK, null).size();
        int monthly = service.expand(START, RecurrenceUnit.MONTH, null).size();
        int yearly = service.expand(START, RecurrenceUnit.YEAR, null).size();

        // Valeurs exactes pour START=2026-01-01, horizon 2031-01-01 (1826 jours) :
        // WEEK 1826/7 -> indices 0..260 ; MONTH 60 mois -> 0..60 ; YEAR 5 ans -> 0..5.
        assertThat(weekly).isEqualTo(261);
        assertThat(monthly).isEqualTo(61);
        assertThat(yearly).isEqualTo(6);
        assertThat(weekly).isGreaterThan(monthly);
        assertThat(monthly).isGreaterThan(yearly);
    }

    /**
     * #452 — L'horizon ne rogne PAS une intention explicite : une borne fournie au-delà de
     * l'horizon est honorée telle quelle (BR-EVE-012), et la série n'est pas marquée tronquée.
     */
    @Test
    void explicitEndDateBeyondHorizon_isHonoured_notClipped() {
        LocalDate end = START.plusYears(RecurrenceExpansion.MAX_UNBOUNDED_EXPANSION_YEARS + 3L);
        RecurrenceExpansion result = service.expand(START, RecurrenceUnit.YEAR, end);

        assertThat(result.occurrences()).endsWith(end);
        assertThat(result.size()).isEqualTo(9); // années 0..8 incluses
        assertThat(result.capped()).isFalse();
    }

    @Test
    void boundedExactlyAtCap_notFlaggedCapped() {
        // Borne = pile la 4000e occurrence : plafond atteint mais série complète -> capped=false.
        LocalDate end = START.plusWeeks(RecurrenceExpansion.MAX_OCCURRENCES - 1L);
        RecurrenceExpansion result = service.expand(START, RecurrenceUnit.WEEK, end);

        assertThat(result.size()).isEqualTo(RecurrenceExpansion.MAX_OCCURRENCES);
        assertThat(result.capped()).isFalse();
    }

    @Test
    void boundedBeyondCap_flaggedCapped() {
        // Borne au-delà du plafond -> tronqué, capped=true.
        LocalDate end = START.plusWeeks(RecurrenceExpansion.MAX_OCCURRENCES + 10L);
        RecurrenceExpansion result = service.expand(START, RecurrenceUnit.WEEK, end);

        assertThat(result.size()).isEqualTo(RecurrenceExpansion.MAX_OCCURRENCES);
        assertThat(result.capped()).isTrue();
    }

    @Test
    void nullStartDate_throws() {
        assertThatThrownBy(() -> service.expand(null, RecurrenceUnit.WEEK, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void nullUnit_throws() {
        assertThatThrownBy(() -> service.expand(START, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void recurrenceEndDateBeforeStart_throws() {
        assertThatThrownBy(() -> service.expand(START, RecurrenceUnit.WEEK, START.minusDays(1)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
