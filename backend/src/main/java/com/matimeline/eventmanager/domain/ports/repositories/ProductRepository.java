package com.matimeline.eventmanager.domain.ports.repositories;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.matimeline.eventmanager.domain.models.CategoryProductCounts;
import com.matimeline.eventmanager.domain.models.Product;

@Repository
public interface ProductRepository {
    Optional<Product> findDomainProductById(UUID id);
    List<Product> findAllProducts();

    /**
     * #124 : liste les produits d'un utilisateur en filtrant EN SQL
     * ({@code WHERE user_id = :userId}) au lieu de charger toute la table puis filtrer
     * en Java. Exploite l'index {@code idx_products_user} (posé Sprint 5, #110).
     * #41 : retourne TOUS les produits du user, y compris ceux SANS événement — la
     * liste d'événements est éventuellement vide, jamais {@code null}. Les produits
     * archivés restent exclus via {@code @SQLRestriction("archived = false")} sur
     * {@code ProductEntity}.
     */
    List<Product> findByUserId(UUID userId);

    Product save(Product product);
    void deleteById(UUID id);
    boolean existsById(UUID id);

    /**
     * #52 : nombre de produits (y compris archivés) référençant cette catégorie.
     * Sert à décider si une suppression de catégorie exige une réassignation
     * (AP-CAT-05). Compte SANS le filtre soft-delete pour ne pas laisser d'orphelins
     * FK sur des produits archivés.
     */
    long countByCategoryId(UUID categoryId);

    /**
     * #695 : pour CHAQUE catégorie portant au moins un produit de {@code userId}, le nombre
     * de produits actifs et archivés — en UNE seule requête groupée (pas de comptage par
     * catégorie, qui serait un N+1 sur la page des catégories).
     *
     * <p>Scopé {@code user_id = :userId} : les catégories SYSTÈME sont partagées entre tous
     * les utilisateurs, y compter les produits d'autrui publierait une information
     * inter-utilisateurs sur une surface de lecture banale.
     *
     * <p>L'implémentation est du SQL NATIF : {@code @SQLRestriction("archived = false")} sur
     * {@code ProductEntity} masquerait les archivés d'un comptage JPQL (PIT-S79-006), et ce
     * sont EUX que l'on veut distinguer. Contrepartie : le natif ne filtre rien de lui-même,
     * la séparation actifs / archivés est posée à la main.
     *
     * <p>Une catégorie SANS aucun produit de cet utilisateur est ABSENTE de la map (pas de
     * ligne à grouper) : l'appelant substitue {@link CategoryProductCounts#EMPTY}.
     *
     * <p>Distinct de {@link #countByCategoryId(UUID)}, qui reste le comptage TOUS
     * utilisateurs confondus qui arme le 409 de suppression : ne pas confondre les deux.
     */
    Map<UUID, CategoryProductCounts> countByCategoryForUser(UUID userId);

    /**
     * #52 : réassigne en masse tous les produits d'une catégorie source vers une
     * catégorie cible (bulk UPDATE), archivés inclus, AVANT suppression de la source.
     * Retourne le nombre de lignes déplacées.
     */
    int updateCategoryForProducts(UUID fromCategoryId, UUID toCategoryId);

    /**
     * #78 (RGPD) : supprime DÉFINITIVEMENT tous les produits de {@code userId},
     * ARCHIVÉS INCLUS. Suppression physique volontaire (pas de soft delete) — le
     * compte disparaît. Retourne le nombre de lignes supprimées.
     *
     * <p>ProductEntity porte {@code @SQLRestriction("archived = false")} : une purge
     * via lecture/bulk JPQL IGNORERAIT les produits archivés, laissant leur FK
     * {@code user_id} et bloquant le DELETE users. L'implémentation DOIT contourner le
     * filtre (SQL NATIF bindé), cf. PIT-S10-004 / countByCategoryId. À appeler AVANT
     * la suppression des catégories ({@code products.category_id} NOT NULL).
     */
    int deleteAllByUserId(UUID userId);

    /**
     * #711 : produits ARCHIVÉS de {@code userId} (surface « Archivés », BR-PRO-011).
     *
     * <p>{@code @SQLRestriction("archived = false")} rend ces lignes invisibles à toute
     * lecture Hibernate : l'implémentation DOIT être du SQL NATIF (PIT-S79-006) et filtrer
     * EXPLICITEMENT {@code user_id = :userId AND archived = true} — le natif ne pose aucun
     * filtre de lui-même. Aucun filtre « a des événements » : un archivé sans événement
     * doit rester restaurable. Tri : archivés les plus récemment modifiés d'abord.
     *
     * <p>Les événements ne sont PAS chargés (liste vide, jamais {@code null}) : la surface
     * n'en affiche aucun, et leur chargement paresseux passerait par l'entité restreinte.
     */
    List<Product> findArchivedByUserId(UUID userId);

    /**
     * #711 : restaure ({@code archived = false}) le produit {@code productId} SI ET SEULEMENT
     * SI il appartient à {@code userId} ET est archivé — les deux conditions sont dans le
     * {@code WHERE} du même UPDATE natif (anti-IDOR, BR-PRO-011). Retourne le nombre de
     * lignes modifiées : 0 = inconnu, non archivé ou produit d'autrui (indistinguables pour
     * l'appelant, anti-énumération).
     */
    int restoreArchivedByIdAndUserId(UUID productId, UUID userId);
}