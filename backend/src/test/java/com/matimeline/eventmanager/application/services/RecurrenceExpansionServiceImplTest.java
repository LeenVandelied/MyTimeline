package com.matimeline.eventmanager.application.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.matimeline.eventmanager.domain.models.RecurrenceExpansion;
import com.matimeline.eventmanager.domain.models.RecurrenceUnit;

/**
 * BR récurrence (#54) : expansion bornée des occurrences + flag capped.
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

    @Test
    void unboundedYearly_cappedAtMaxOccurrences() {
        // recurrenceEndDate null -> borné au plafond, capped=true.
        RecurrenceExpansion result = service.expand(START, RecurrenceUnit.YEAR, null);

        assertThat(result.size()).isEqualTo(RecurrenceExpansion.MAX_OCCURRENCES);
        assertThat(result.capped()).isTrue();
    }

    @Test
    void unboundedWeekly_cappedAt4000() {
        RecurrenceExpansion result = service.expand(START, RecurrenceUnit.WEEK, null);
        assertThat(result.size()).isEqualTo(4000);
        assertThat(result.capped()).isTrue();
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
