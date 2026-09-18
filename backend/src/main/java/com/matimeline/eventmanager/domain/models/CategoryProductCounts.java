package com.matimeline.eventmanager.domain.models;

/**
 * #695 — Produits d'UNE catégorie, du point de vue d'UN utilisateur : actifs et archivés
 * comptés séparément.
 *
 * <p>Pourquoi deux compteurs et pas un total : la carte catégorie doit dire la même chose
 * que le refus de suppression. Un produit ARCHIVÉ occupe toujours sa catégorie
 * (DEC-S89-001 : {@code products.category_id} NOT NULL + FK, comptage natif de
 * {@code countByCategoryId} archivés inclus) — donc une catégorie ne portant que des
 * archivés n'est pas vide, mais ses produits ne sont pas non plus visibles des listes.
 * Les fusionner en un total ferait mentir l'un des deux écrans.
 *
 * <p>Type DOMAINE volontaire : le port {@code ProductRepository} ne doit pas rendre le
 * {@code Object[]} d'une requête native JPA (règle hexagonale, cf. ArchitectureTest).
 *
 * @param active   produits NON archivés (ceux que le listing produits montre)
 * @param archived produits archivés (invisibles des listes, mais toujours rattachés)
 */
public record CategoryProductCounts(long active, long archived) {

    /** Neutre : catégorie sans aucun produit pour cet utilisateur. */
    public static final CategoryProductCounts EMPTY = new CategoryProductCounts(0L, 0L);

    /**
     * Total occupant la catégorie (actifs + archivés) — c'est CE nombre qui décide du 409
     * de {@code DELETE /api/categories/{id}} sans cible de réassignation.
     */
    public long total() {
        return active + archived;
    }
}
