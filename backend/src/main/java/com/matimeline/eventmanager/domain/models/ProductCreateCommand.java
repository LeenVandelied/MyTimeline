package com.matimeline.eventmanager.domain.models;

import java.util.List;
import java.util.UUID;

/**
 * Commande domaine pure de création d'un produit (#185). Le contrôleur traduit le DTO HTTP en
 * cette commande avant d'appeler le port {@code ProductService}, comme pour les événements (#165).
 *
 * <p>{@code color} est nullable (héritage de la catégorie) ; {@code events} peut être null ou
 * vide (un produit sans événement est autorisé, BR-PRO-005).
 */
public record ProductCreateCommand(
        String name,
        UUID categoryId,
        UUID userId,
        String color,
        List<EventCreateCommand> events) {
}
