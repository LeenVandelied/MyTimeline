package com.matimeline.eventmanager.utils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.matimeline.eventmanager.application.dtos.EventCreationRequest;
import com.matimeline.eventmanager.domain.exceptions.InvalidDurationUnitException;

/**
 * BR-EVE-003/004 (#54) : calcul d'endDate + null-guard sur durationUnit.
 */
class UtilsTest {

    private static final LocalDate START = LocalDate.of(2026, 1, 1);

    @Test
    void computesEndDatePerDurationUnit() {
        assertThat(Utils.calculateEndDate("duration", 3, "days", START)).isEqualTo(START.plusDays(3));
        assertThat(Utils.calculateEndDate("duration", 3, "weeks", START)).isEqualTo(START.plusWeeks(3));
        assertThat(Utils.calculateEndDate("duration", 3, "months", START)).isEqualTo(START.plusMonths(3));
        assertThat(Utils.calculateEndDate("duration", 3, "years", START)).isEqualTo(START.plusYears(3));
    }

    @Test
    void returnsStartDateForSingleType() {
        assertThat(Utils.calculateEndDate("single", 5, "days", START)).isEqualTo(START);
    }

    @Test
    void returnsStartDateForUnknownTypeTreatedAsSingle() {
        assertThat(Utils.calculateEndDate("whatever", 5, "days", START)).isEqualTo(START);
    }

    @Test
    void returnsStartDateWhenDurationValueNull() {
        assertThat(Utils.calculateEndDate("duration", null, "days", START)).isEqualTo(START);
    }

    @Test
    void throwsInvalidDurationUnitOnUnknownUnit() {
        assertThatThrownBy(() -> Utils.calculateEndDate("duration", 3, "fortnights", START))
                .isInstanceOf(InvalidDurationUnitException.class);
    }

    @Test
    void doesNotNpeWhenDurationUnitNull_throwsInvalidDurationUnit() {
        // Avant #54 : switch(null) -> NullPointerException (500). Désormais 422.
        assertThatThrownBy(() -> Utils.calculateEndDate("duration", 3, null, START))
                .isInstanceOf(InvalidDurationUnitException.class);
    }

    @Test
    void dtoOverloadDelegatesToPrimitiveOverload() {
        EventCreationRequest req = new EventCreationRequest();
        req.setType("duration");
        req.setDurationValue(2);
        req.setDurationUnit("weeks");
        assertThat(Utils.calculateEndDate(req, START)).isEqualTo(START.plusWeeks(2));
    }
}
