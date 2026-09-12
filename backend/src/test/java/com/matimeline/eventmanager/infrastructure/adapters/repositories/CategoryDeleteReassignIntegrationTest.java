package com.matimeline.eventmanager.infrastructure.adapters.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.exceptions.CategoryInUseException;
import com.matimeline.eventmanager.domain.ports.repositories.CategoryRepository;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;
import com.matimeline.eventmanager.domain.ports.services.CategoryService;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;

/**
 * #52 — Suppression de catégorie avec réassignation, contre un vrai Postgres jetable
 * (Flyway V1..V8, owner_id + UNIQUE(owner_id,name)). Vérifie :
 *   - unicité du nom PAR UTILISATEUR (findByOwnerAndName) ;
 *   - 409 (CategoryInUseException) si des produits référencent la catégorie sans cible ;
 *   - réassignation atomique : les produits (archivés inclus) migrent vers la cible
 *     AVANT la suppression de la source, en UNE transaction ;
 *   - un produit archivé (soft delete #50) est bien réassigné (sinon orphelin FK).
 *
 * @Transactional -> rollback après chaque test.
 */
@SpringBootTest
@Transactional
class CategoryDeleteReassignIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired private EntityManager em;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CategoryService categoryService;

    private UserEntity persistUser() {
        UserEntity user = new UserEntity();
        String suffix = UUID.randomUUID().toString();
        user.setName("c52-" + suffix);
        user.setUsername("c52-" + suffix);
        user.setEmail("c52-" + suffix + "@example.test");
        user.setPassword("x");
        user.setRole("ROLE_USER");
        em.persist(user);
        return user;
    }

    private CategoryEntity persistCategory(UserEntity owner, String name) {
        CategoryEntity category = new CategoryEntity();
        category.setName(name);
        category.setOwner(owner);
        em.persist(category);
        return category;
    }

    /** Catégorie système (owner NULL) — visible de tous en lecture (FIX review #153). */
    private CategoryEntity persistSystemCategory(String name) {
        CategoryEntity category = new CategoryEntity();
        category.setName(name);
        category.setOwner(null);
        em.persist(category);
        return category;
    }

    private ProductEntity persistProduct(UserEntity user, CategoryEntity category, boolean archived) {
        ProductEntity product = new ProductEntity();
        product.setName("c52-product-" + UUID.randomUUID());
        product.setCategory(category);
        product.setUser(user);
        product.setArchived(archived);
        em.persist(product);
        return product;
    }

    /** BR-CAT-004 : unicité PAR UTILISATEUR — même nom, deux owners distincts = OK. */
    @Test
    void findByOwnerAndName_isScopedToOwner() {
        UserEntity a = persistUser();
        UserEntity b = persistUser();
        persistCategory(a, "Voiture");
        persistCategory(b, "Voiture");
        em.flush();
        em.clear();

        assertThat(categoryRepository.findByOwnerAndName(a.getId(), "Voiture")).isPresent();
        assertThat(categoryRepository.findByOwnerAndName(b.getId(), "Voiture")).isPresent();
        assertThat(categoryRepository.findByOwnerAndName(UUID.randomUUID(), "Voiture")).isEmpty();
    }

    /**
     * FIX review #153 : scoping cross-tenant du listing. findByOwnerIdOrSystem(caller)
     * ne renvoie QUE les catégories du caller + système (owner NULL, ex. les 4 seed V8),
     * JAMAIS celles d'un autre utilisateur. Vérifié contre un vrai Postgres.
     */
    @Test
    void findByOwnerIdOrSystem_returnsOwnAndSystem_notOtherUsers() {
        UserEntity a = persistUser();
        UserEntity b = persistUser();
        CategoryEntity mineA = persistCategory(a, "Mine-A-" + UUID.randomUUID());
        CategoryEntity mineB = persistCategory(b, "Mine-B-" + UUID.randomUUID());
        CategoryEntity system = persistSystemCategory("System-" + UUID.randomUUID());
        em.flush();
        em.clear();

        var forA = categoryRepository.findByOwnerIdOrSystem(a.getId());

        // La catégorie de A et la catégorie système sont présentes ; celle de B est
        // ABSENTE (pas de fuite cross-tenant).
        assertThat(forA).anyMatch(c -> c.getId().equals(mineA.getId()));
        assertThat(forA).anyMatch(c -> c.getId().equals(system.getId()));
        assertThat(forA).noneMatch(c -> c.getId().equals(mineB.getId()));
        // Toute catégorie retournée est soit à A, soit système (owner NULL).
        assertThat(forA).allMatch(c -> c.getOwnerId() == null || c.getOwnerId().equals(a.getId()));
    }

    /** AP-CAT-05 : suppression d'une catégorie référencée sans cible -> 409, rien supprimé. */
    @Test
    void deleteCategory_referencedWithoutReassign_throws409_andKeepsData() {
        UserEntity user = persistUser();
        CategoryEntity cat = persistCategory(user, "Source-" + UUID.randomUUID());
        persistProduct(user, cat, false);
        em.flush();
        em.clear();

        assertThatThrownBy(() -> categoryService.deleteCategory(cat.getId(), null))
                .isInstanceOf(CategoryInUseException.class);

        // La catégorie survit (aucune suppression partielle).
        assertThat(categoryRepository.existsById(cat.getId())).isTrue();
    }

    /**
     * Réassignation atomique : produits actifs ET archivés migrent vers la cible, puis
     * la source est supprimée. Aucun produit orphelin, la source disparaît.
     */
    @Test
    void deleteCategory_withReassign_movesAllProducts_thenDeletesSource() {
        UserEntity user = persistUser();
        CategoryEntity source = persistCategory(user, "Source-" + UUID.randomUUID());
        CategoryEntity target = persistCategory(user, "Target-" + UUID.randomUUID());
        ProductEntity active = persistProduct(user, source, false);
        ProductEntity archived = persistProduct(user, source, true);
        em.flush();
        em.clear();

        categoryService.deleteCategory(source.getId(), target.getId());
        em.flush();
        em.clear();

        // Source supprimée.
        assertThat(categoryRepository.existsById(source.getId())).isFalse();
        // Plus aucun produit ne référence la source ; tous pointent la cible (natif :
        // contourne @SQLRestriction pour compter aussi le produit archivé).
        assertThat(productRepository.countByCategoryId(source.getId())).isZero();
        assertThat(productRepository.countByCategoryId(target.getId())).isEqualTo(2L);

        Number activeCat = (Number) em.createNativeQuery(
                        "SELECT count(*) FROM products WHERE id = :id AND category_id = :cat")
                .setParameter("id", active.getId())
                .setParameter("cat", target.getId())
                .getSingleResult();
        Number archivedCat = (Number) em.createNativeQuery(
                        "SELECT count(*) FROM products WHERE id = :id AND category_id = :cat")
                .setParameter("id", archived.getId())
                .setParameter("cat", target.getId())
                .getSingleResult();
        assertThat(activeCat.longValue()).isEqualTo(1L);
        assertThat(archivedCat.longValue()).isEqualTo(1L);
    }

    /** Suppression d'une catégorie non référencée -> supprimée directement (204 côté API). */
    @Test
    void deleteCategory_noProducts_deletes() {
        UserEntity user = persistUser();
        CategoryEntity cat = persistCategory(user, "Empty-" + UUID.randomUUID());
        em.flush();
        em.clear();

        categoryService.deleteCategory(cat.getId(), null);
        em.flush();
        em.clear();

        assertThat(categoryRepository.existsById(cat.getId())).isFalse();
    }
}
