package com.matimeline.eventmanager.domain.models;

/**
 * Unité de récurrence d'un événement (design v3, issue #44).
 *
 * <p>Modèle domaine pur — aucune annotation JPA/framework (archi hexagonale stricte).
 * La persistance stocke le nom de la constante ({@code WEEK}/{@code MONTH}/{@code YEAR})
 * via {@code @Enumerated(EnumType.STRING)} côté entité ; la migration V7 réaligne les
 * anciennes valeurs texte libre ({@code weeks}/{@code months}/{@code years}) sur ces noms.
 *
 * <p>Ne concerne QUE {@code recurrenceUnit} (récurrence). NE PAS confondre avec
 * {@code durationUnit} (calcul de {@code endDate}, valeurs {@code days/weeks/months/years})
 * qui reste une String libre distincte (cf. BR-EVE-004/006).
 */
public enum RecurrenceUnit {
    WEEK,
    MONTH,
    YEAR;

    /**
     * Convertit une valeur externe (DTO/JSON) en {@link RecurrenceUnit}.
     *
     * <p>Tolérante à la casse et au pluriel legacy afin de rester rétro-compatible
     * avec le contrat frontend actuel ({@code weeks}/{@code months}/{@code years})
     * en attendant le réalignement Zod des sprints S10/S11. {@code null}/vide -> {@code null}
     * (récurrence non fournie, sémantique PATCH partiel préservée).
     *
     * @throws IllegalArgumentException si la valeur non vide n'est pas reconnue.
     */
    public static RecurrenceUnit fromString(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        switch (normalized.toUpperCase()) {
            case "WEEK":
            case "WEEKS":
                return WEEK;
            case "MONTH":
            case "MONTHS":
                return MONTH;
            case "YEAR":
            case "YEARS":
                return YEAR;
            default:
                throw new IllegalArgumentException("Unité de récurrence invalide : " + value);
        }
    }
}
