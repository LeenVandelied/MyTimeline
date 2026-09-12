package com.matimeline.eventmanager.domain.models;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Commande domaine PURE de création d'un événement (#165).
 *
 * <p>Remplace l'import de {@code application.dtos.EventCreationRequest} dans le port
 * {@code domain.ports.services.EventService} : le domaine ne doit pas dépendre de la
 * couche application (inversion du sens de dépendance hexagonal). Le contrôleur (infra)
 * traduit le DTO HTTP en cette commande avant d'appeler le port.
 *
 * <p>Record immuable, aucun framework. Sémantique des champs alignée sur
 * {@code EventCreationRequest} :
 * <ul>
 *   <li>{@code name} : titre de l'événement (mappé vers {@code Event.title}).</li>
 *   <li>{@code recurrenceUnit} : chaîne brute (WEEK/MONTH/YEAR ou legacy) convertie
 *       en {@link RecurrenceUnit} par le service.</li>
 *   <li>{@code date} : startDate souhaitée ; {@code null} -> défaut {@code LocalDate.now()}
 *       appliqué par le service (BR-EVE, {@code EventServiceImpl.createEvent}).</li>
 *   <li>{@code color} : optionnel (BR-EVE-014, #168), nullable.</li>
 *   <li>{@code archived} et {@code recurrenceEndDate} : ABSENTS de la création
 *       (BR-EVE-013/014, PATCH-only).</li>
 * </ul>
 */
public record EventCreateCommand(
        String name,
        String type,
        Integer durationValue,
        String durationUnit,
        Boolean isRecurring,
        String recurrenceUnit,
        LocalDate date,
        Boolean isAllDay,
        String color,
        UUID productId) {
}
