package com.matimeline.eventmanager.domain.models;

/**
 * Préférence de thème portée par le compte (#653, ADR-010, BR-AUT-013).
 *
 * <p>Modèle domaine pur — aucune annotation JPA/framework (archi hexagonale stricte).
 * La valeur externe ({@link #value()}) est en MINUSCULES, identique à celle de
 * {@code next-themes} côté front, de l'API ({@code UserResponse.themePreference},
 * {@code PUT /api/me/preferences}) et de la colonne {@code users.theme_preference}
 * (CHECK V16). La persistance passe par un {@code AttributeConverter} d'infrastructure,
 * jamais par {@code @Enumerated(STRING)} (qui écrirait {@code LIGHT}, refusé par le CHECK).
 *
 * <p>L'ABSENCE de préférence n'est pas une constante : elle vaut {@code null} sur
 * {@link User#getThemePreference()} et signifie « le compte n'a encore rien choisi ».
 * {@link #SYSTEM} est un choix explicite (« suivre l'OS »), distinct de {@code null}.
 */
public enum ThemePreference {
    LIGHT("light"),
    DARK("dark"),
    SYSTEM("system");

    private final String value;

    ThemePreference(String value) {
        this.value = value;
    }

    /** Valeur externe en minuscules ({@code light}/{@code dark}/{@code system}). */
    public String value() {
        return value;
    }

    /**
     * Convertit une valeur externe STRICTE (minuscules exactes, sans espace) en constante.
     * Volontairement intolérante (≠ {@code RecurrenceUnit.fromString}) : aucun contrat
     * legacy à absorber, et la même valeur doit passer l'API, le domaine et le CHECK SQL.
     *
     * @throws IllegalArgumentException si {@code value} est {@code null} ou inconnue.
     */
    public static ThemePreference fromValue(String value) {
        if (value != null) {
            for (ThemePreference preference : values()) {
                if (preference.value.equals(value)) {
                    return preference;
                }
            }
        }
        throw new IllegalArgumentException("Préférence de thème invalide : " + value);
    }
}
