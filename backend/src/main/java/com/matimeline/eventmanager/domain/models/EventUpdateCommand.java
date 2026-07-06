package com.matimeline.eventmanager.domain.models;

import java.time.LocalDate;

/**
 * Commande domaine PURE de mise à jour PARTIELLE d'un événement (#165, PATCH).
 *
 * <p>Remplace l'import de {@code application.dtos.EventUpdateRequest} dans le port
 * {@code domain.ports.services.EventService}. Le contrôleur (infra) traduit le DTO HTTP
 * en cette commande avant d'appeler le port.
 *
 * <p>Sémantique PATCH partielle préservée : chaque champ est un wrapper nullable ;
 * {@code null} = "non fourni" et n'est PAS appliqué (cf. {@code EventServiceImpl.updateEvent}).
 * {@code recurrenceUnit} est une chaîne brute convertie en {@link RecurrenceUnit} par le
 * service. La validation d'entrée (@Size sur title, etc.) reste portée par le DTO HTTP en amont.
 *
 * <p>#201 : {@code startDate}/{@code endDate} sont désormais portés jusqu'au service (avant,
 * le formulaire les envoyait mais le DTO ne les câblait pas -> ignorés silencieusement). Le
 * service applique {@code startDate}, puis dérive/persiste {@code endDate} selon le type
 * (BR-EVE-003 : durée = source de vérité pour {@code type='duration'} ; endDate explicite
 * persistée sinon).
 */
public record EventUpdateCommand(
        String title,
        String type,
        Integer durationValue,
        String durationUnit,
        Boolean isRecurring,
        String recurrenceUnit,
        LocalDate recurrenceEndDate,
        LocalDate startDate,
        LocalDate endDate,
        String color,
        Boolean archived) {
}
