package com.matimeline.eventmanager.application.dtos;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.CategoryProductCounts;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Projection HTTP d'une catégorie (issue #52) — fin de l'exposition du domain model
 * en sortie (AP-CAT-03).
 *
 * <p>FIX review #153 : n'expose PLUS {@code ownerId} (UUID d'un utilisateur) — fuite
 * d'identifiant + sape l'anti-énumération. Le seul bit d'information utile au front est
 * de savoir si la catégorie est « système » (owner NULL, non éditable, cf. ADR-002) :
 * on expose donc un booléen {@code system} dérivé ({@code ownerId == null}).
 *
 * <p>#695 — {@code productCount} / {@code archivedProductCount} : nombre de produits DU
 * CALLER rattachés à la catégorie, actifs et archivés SÉPARÉS (un produit archivé occupe
 * toujours sa catégorie, DEC-S89-001). Ces deux champs ne sont renseignés que par
 * {@code GET /api/categories} (le seul endpoint qui a de quoi les calculer en une requête
 * groupée) et sont ABSENTS du JSON ailleurs — {@code @JsonInclude(NON_NULL)} sur des
 * {@code Integer}, pas des {@code 0} : un zéro serait un compteur faux, indistinguable
 * d'une catégorie réellement vide, et c'est exactement le mensonge que #695 corrige.
 * Le contrat Zod correspondant les déclare donc {@code .optional()}.
 */
@Getter
@AllArgsConstructor
public class CategoryResponse {
    private UUID id;
    private String name;
    private String color;
    private String description;
    private boolean system;

    /** #695 — produits actifs du caller. {@code null} = non calculé sur cette route. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Integer productCount;

    /** #695 — produits archivés du caller. {@code null} = non calculé sur cette route. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Integer archivedProductCount;

    /** Sans compteurs (POST / GET {id} / PATCH) : les deux champs sortent du JSON. */
    public static CategoryResponse fromDomain(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getColor(),
                category.getDescription(),
                category.getOwnerId() == null,
                null,
                null);
    }

    /** #695 — avec compteurs (listing) : {@code counts} vient du comptage groupé scopé au caller. */
    public static CategoryResponse fromDomain(Category category, CategoryProductCounts counts) {
        CategoryProductCounts safe = counts == null ? CategoryProductCounts.EMPTY : counts;
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getColor(),
                category.getDescription(),
                category.getOwnerId() == null,
                Math.toIntExact(safe.active()),
                Math.toIntExact(safe.archived()));
    }
}
