package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;
import org.springframework.stereotype.Repository;

import com.matimeline.eventmanager.application.mappers.CategoryMapper;
import com.matimeline.eventmanager.application.mappers.ProductMapper;
import com.matimeline.eventmanager.application.mappers.UserMapper;
import com.matimeline.eventmanager.domain.models.CategoryProductCounts;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;

import jakarta.persistence.EntityManager;

@Repository
public class ProductRepositoryJpaImpl 
    extends SimpleJpaRepository<ProductEntity, UUID> 
    implements ProductRepository {

    private final ProductMapper productMapper;
    private final CategoryMapper categoryMapper;
    private final UserMapper userMapper;
    private final EntityManager entityManager;

    @Autowired
    public ProductRepositoryJpaImpl(
        EntityManager em,
        ProductMapper productMapper,
        CategoryMapper categoryMapper,
        UserMapper userMapper
    ) {
        super(ProductEntity.class, em);
        this.productMapper = productMapper;
        this.categoryMapper = categoryMapper;
        this.userMapper = userMapper;
        this.entityManager = em;
    }

    @Override
    public Optional<Product> findDomainProductById(UUID id) {
        return findById(id).map(productMapper::toDomain);
    }

    @Override
    public List<Product> findAllProducts() {
        return findAll().stream().map(productMapper::toDomain).toList();
    }

    // #124 — Filtrage user_id EN SQL (remplace findAllProducts() + filtre Java du
    // service). Le prédicat p.user.id se compile sur la colonne FK user_id (pas de
    // jointure vers users), donc le WHERE porte directement sur user_id -> l'index
    // idx_products_user (Sprint 5, #110) est éligible. @SQLRestriction("archived =
    // false") de ProductEntity ajoute automatiquement archived = false au WHERE.
    // #41 — LEFT JOIN FETCH p.events : ramène les produits SANS événement (INNER
    // JOIN les exclurait) et pré-charge la collection (@OneToMany LAZY) pour éviter
    // le N+1 au mapping. SELECT DISTINCT : dé-duplique le parent quand la jointure
    // multiplie les lignes (produit à N events).
    @Override
    public List<Product> findByUserId(UUID userId) {
        return entityManager.createQuery(
                        "SELECT DISTINCT p FROM ProductEntity p "
                                + "LEFT JOIN FETCH p.events "
                                + "WHERE p.user.id = :userId",
                        ProductEntity.class)
                .setParameter("userId", userId)
                .getResultList()
                .stream()
                .map(productMapper::toDomain)
                .toList();
    }

    @Override
    public Product save(Product domainProduct) {
        // Le domaine ne porte PAS @Version : une entité reconstruite par le mapper est
        // détachée avec version=null. La router vers persist() (SimpleJpaRepository.save,
        // isNew=true) casse un UPDATE ("uninitialized version value") ; un merge() de ce
        // graphe détaché déclenche un OptimisticLock (version null vs ligne v0).
        //
        // Pour une MISE À JOUR (id existant en base), on charge donc l'entité GÉRÉE et on
        // recopie les seuls champs mutables (name, category, archived, color). L'audit
        // (@Version/updatedAt) reste piloté par Hibernate ; les events (cascade) intacts.
        if (domainProduct.getId() != null) {
            ProductEntity managed = super.findById(domainProduct.getId()).orElse(null);
            if (managed != null) {
                managed.setName(domainProduct.getName());
                managed.setArchived(domainProduct.isArchived());
                managed.setColor(domainProduct.getColor());
                if (domainProduct.getCategory() != null && domainProduct.getCategory().getId() != null) {
                    // Référence gérée (proxy) sur la catégorie cible : évite d'attacher une
                    // CategoryEntity détachée reconstruite par le mapper.
                    managed.setCategory(entityManager.getReference(
                            CategoryEntity.class, domainProduct.getCategory().getId()));
                }
                ProductEntity flushed = super.save(managed);
                return productMapper.toDomain(flushed);
            }
        }

        // CRÉATION : entité neuve, persist géré par SimpleJpaRepository. Le mapper recopie
        // les associations category/user en entités DÉTACHÉES (id set, version null) :
        // persist() les voit comme "detached entity with generated id / uninitialized
        // version" et échoue (même pitfall PIT-S10-003 que la branche UPDATE côté catégorie).
        // On rattache donc des références GÉRÉES (getReference) sur les lignes existantes
        // avant persist. Les events imbriqués (id null, cf. ProductServiceImpl) restent
        // persistés en cascade sur ce parent.
        ProductEntity entity = productMapper.toEntity(domainProduct);
        if (domainProduct.getCategory() != null && domainProduct.getCategory().getId() != null) {
            entity.setCategory(entityManager.getReference(
                    CategoryEntity.class, domainProduct.getCategory().getId()));
        }
        if (domainProduct.getUser() != null && domainProduct.getUser().getId() != null) {
            entity.setUser(entityManager.getReference(
                    UserEntity.class, domainProduct.getUser().getId()));
        }
        ProductEntity savedEntity = super.save(entity);
        return productMapper.toDomain(savedEntity);
    }

    // #52 — Requêtes NATIVES volontaires : ProductEntity porte @SQLRestriction
    // ("archived = false"), qui masque les lignes archivées des lectures et des bulk
    // ops HQL générés par Hibernate. Or pour l'intégrité FK on doit compter ET
    // réassigner AUSSI les produits archivés (sinon suppression de la catégorie =
    // violation FK sur une ligne archivée invisible). Le SQL natif contourne le
    // @SQLRestriction et opère sur TOUTES les lignes.

    @Override
    public long countByCategoryId(UUID categoryId) {
        Number count = (Number) entityManager
                .createNativeQuery("SELECT count(*) FROM products WHERE category_id = :cat")
                .setParameter("cat", categoryId)
                .getSingleResult();
        return count.longValue();
    }

    // #695 — Compteurs de la carte catégorie. UNE requête groupée pour toute la page
    // (un comptage par catégorie serait un N+1). SQL NATIF pour la MÊME raison que
    // countByCategoryId, mais avec l'effet inverse recherché : le @SQLRestriction ne
    // s'appliquant pas (PIT-S79-006), les deux populations sont visibles ICI et c'est
    // `FILTER (WHERE archived = ...)` qui les sépare — le natif ne filtre rien seul.
    // `WHERE user_id = :uid` n'est PAS une optimisation : les catégories système sont
    // partagées, sans lui la carte publierait le nombre de produits d'autres comptes.
    @Override
    public Map<UUID, CategoryProductCounts> countByCategoryForUser(UUID userId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager
                .createNativeQuery(
                        "SELECT category_id, "
                                + "count(*) FILTER (WHERE archived = false) AS active_count, "
                                + "count(*) FILTER (WHERE archived = true) AS archived_count "
                                + "FROM products WHERE user_id = :uid GROUP BY category_id")
                .setParameter("uid", userId)
                .getResultList();

        Map<UUID, CategoryProductCounts> counts = new HashMap<>();
        for (Object[] row : rows) {
            UUID categoryId = toUuid(row[0]);
            if (categoryId == null) continue;
            counts.put(categoryId, new CategoryProductCounts(
                    ((Number) row[1]).longValue(),
                    ((Number) row[2]).longValue()));
        }
        return counts;
    }

    /**
     * Le pilote JDBC rend une colonne {@code uuid} en {@link UUID}, mais une projection
     * native n'est pas typée par une entité : on ne suppose pas le type rendu (lecture
     * défensive plutôt qu'un cast qui casserait à la première divergence de pilote).
     */
    private UUID toUuid(Object raw) {
        if (raw instanceof UUID uuid) return uuid;
        if (raw instanceof String text) return UUID.fromString(text);
        return null;
    }

    @Override
    public int updateCategoryForProducts(UUID fromCategoryId, UUID toCategoryId) {
        return entityManager
                .createNativeQuery("UPDATE products SET category_id = :to WHERE category_id = :from")
                .setParameter("to", toCategoryId)
                .setParameter("from", fromCategoryId)
                .executeUpdate();
    }

    // #78 — SQL NATIF volontaire (même raison que countByCategoryId) : @SQLRestriction
    // ("archived = false") masque les produits archivés d'un bulk DELETE HQL. Pour purger
    // TOUS les produits du user (archivés inclus) et libérer leur FK user_id avant le
    // DELETE users, on contourne le filtre en natif.
    @Override
    public int deleteAllByUserId(UUID userId) {
        return entityManager
                .createNativeQuery("DELETE FROM products WHERE user_id = :uid")
                .setParameter("uid", userId)
                .executeUpdate();
    }

    // #711 — SQL NATIF volontaire (PIT-S79-006) : @SQLRestriction masque les archivés de
    // toute lecture HQL/findById, c'est donc le seul moyen de les lire. Contrepartie : le
    // natif ne filtre RIEN de lui-même, `archived = true` ET `user_id` sont posés à la main.
    // Mapping manuel (sans ProductMapper.toDomain) : ce dernier parcourt `getEvents()` et
    // déclencherait un chargement paresseux par produit, inutile pour la surface.
    @Override
    public List<Product> findArchivedByUserId(UUID userId) {
        @SuppressWarnings("unchecked")
        List<ProductEntity> rows = entityManager
                .createNativeQuery(
                        "SELECT * FROM products WHERE user_id = :uid AND archived = true "
                                + "ORDER BY updated_at DESC, id",
                        ProductEntity.class)
                .setParameter("uid", userId)
                .getResultList();
        return rows.stream().map(this::toDomainWithoutEvents).toList();
    }

    /**
     * Produit domaine SANS ses événements (liste vide, jamais {@code null}). Le mapping vit
     * ICI et non dans {@code ProductMapper} : ce dernier réside en {@code application}, et lui
     * ajouter une méthode qui parle {@code ProductEntity} creuserait la dette hexagonale gelée
     * par {@code ArchitectureTest} (application -> infrastructure). L'adaptateur JPA, lui, a le
     * droit de connaître les deux.
     */
    private Product toDomainWithoutEvents(ProductEntity entity) {
        return new Product(
                entity.getId(),
                entity.getName(),
                categoryMapper.toDomain(entity.getCategory()),
                userMapper.toDomain(entity.getUser()),
                new ArrayList<>(),
                entity.isArchived(),
                entity.getColor());
    }

    // #711 — UPDATE NATIF : l'entité archivée est introuvable par findById (@SQLRestriction),
    // l'update-in-place de save() est donc impossible. Ownership ET état dans le MÊME WHERE
    // (anti-IDOR) ; le nombre de lignes modifiées décide du 404 côté service. `version` et
    // `updated_at` sont tenus à la main (le natif court-circuite @Version et l'audit JPA).
    @Override
    public int restoreArchivedByIdAndUserId(UUID productId, UUID userId) {
        return entityManager
                .createNativeQuery(
                        "UPDATE products SET archived = false, version = version + 1, updated_at = :now "
                                + "WHERE id = :id AND user_id = :uid AND archived = true")
                .setParameter("now", LocalDateTime.now())
                .setParameter("id", productId)
                .setParameter("uid", userId)
                .executeUpdate();
    }

}
