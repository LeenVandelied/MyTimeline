package com.matimeline.eventmanager.domain.models;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * #653 (BR-AUT-013) — conversion STRICTE de la préférence de thème. La même valeur doit passer
 * l'API ({@code @Pattern}), le domaine et le CHECK SQL V16 : aucune tolérance de casse/espace.
 */
class ThemePreferenceTest {

    @Test
    void fromValue_acceptsExactLowercaseValues_andRoundTrips() {
        for (ThemePreference preference : ThemePreference.values()) {
            assertEquals(preference, ThemePreference.fromValue(preference.value()));
        }
        assertEquals("light", ThemePreference.LIGHT.value());
        assertEquals("dark", ThemePreference.DARK.value());
        assertEquals("system", ThemePreference.SYSTEM.value());
    }

    @ParameterizedTest
    @ValueSource(strings = {"LIGHT", "Dark", " system", "system ", "", "auto", "LIGHT_MODE"})
    void fromValue_rejectsAnythingElse(String value) {
        assertThrows(IllegalArgumentException.class, () -> ThemePreference.fromValue(value));
    }

    @Test
    void fromValue_rejectsNull() {
        assertThrows(IllegalArgumentException.class, () -> ThemePreference.fromValue(null));
    }
}
