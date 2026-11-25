package com.matimeline.eventmanager.domain.models;

import java.util.UUID;

/**
 * Commande domaine pure de modification partielle d'un produit (#185). null = champ inchangé ;
 * {@code clearColor} (prioritaire sur {@code color}) remet la couleur à null.
 */
public record ProductUpdateCommand(
        String name,
        UUID categoryId,
        String color,
        boolean clearColor) {
}
