package com.matimeline.eventmanager.domain.exceptions;

/**
 * FIX review #153 : la cible de réassignation ({@code reassignToCategoryId}) est la
 * catégorie en cours de suppression (cible == source). Réassigner vers elle-même serait
 * un no-op suivi d'un {@code deleteById} -> violation FK / produits orphelins. Distincte
 * de {@link CategoryInUseException} pour porter un message dédié (l'ancien réutilisait le
 * message « fournissez reassignToCategoryId », trompeur ici). Mappée en 409 CONFLICT.
 */
public class CategoryReassignTargetInvalidException extends RuntimeException {
    public CategoryReassignTargetInvalidException() {
        super("The reassignment target category cannot be the category being deleted.");
    }
}
