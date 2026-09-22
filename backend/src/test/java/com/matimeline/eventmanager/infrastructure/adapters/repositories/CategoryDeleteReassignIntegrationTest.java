package com.matimeline.eventmanager.infrastructure.adapters.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.exceptions.CategoryInUseException;
import com.matimeline.eventmanager.domain.models.CategoryProductCounts;
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

    /**
     * #546 (scénario S79 #463) — catégorie ne portant QU'UN produit archivé, DELETE sans
     * cible -> 409, la catégorie survit. DÉCISION #546 (option A) : un produit archivé
     * OCCUPE toujours sa catégorie. `products.category_id` est NOT NULL + FK (V1) : si le
     * comptage excluait les archivés, `deleteById` violerait la FK sur la ligne archivée
     * (500). Ce test verrouille ce contrat ; le correctif est côté UI (bascule du dialog
     * en réassignation sur 409).
     */
    @Test
    void deleteCategory_onlyArchivedProducts_withoutReassign_throws409_andKeepsCategory() {
        UserEntity user = persistUser();
        CategoryEntity cat = persistCategory(user, "ArchivedOnly-" + UUID.randomUUID());
        ProductEntity archived = persistProduct(user, cat, true);
        em.flush();
        em.clear();

        assertThatThrownBy(() -> categoryService.deleteCategory(cat.getId(), null))
                .isInstanceOf(CategoryInUseException.class);

        assertThat(categoryRepository.existsById(cat.getId())).isTrue();
        Number stillLinked = (Number) em.createNativeQuery(
                        "SELECT count(*) FROM products WHERE id = :id AND category_id = :cat")
                .setParameter("id", archived.getId())
                .setParameter("cat", cat.getId())
                .getSingleResult();
        assertThat(stillLinked.longValue()).isEqualTo(1L);
    }

    /**
     * #546 critère 3 — contournement `?reassignToCategoryId=` : une catégorie ne portant
     * QUE des produits archivés est supprimable en réassignant vers une cible ; le produit
     * archivé migre (pas d'orphelin FK) et reste archivé.
     */
    @Test
    void deleteCategory_onlyArchivedProducts_withReassign_movesArchived_thenDeletesSource() {
        UserEntity user = persistUser();
        CategoryEntity source = persistCategory(user, "ArchivedOnly-" + UUID.randomUUID());
        CategoryEntity target = persistCategory(user, "Bin-" + UUID.randomUUID());
        ProductEntity archived = persistProduct(user, source, true);
        em.flush();
        em.clear();

        categoryService.deleteCategory(source.getId(), target.getId());
        em.flush();
        em.clear();

        assertThat(categoryRepository.existsById(source.getId())).isFalse();
        Number moved = (Number) em.createNativeQuery(
                        "SELECT count(*) FROM products WHERE id = :id AND category_id = :cat AND archived = true")
                .setParameter("id", archived.getId())
                .setParameter("cat", target.getId())
                .getSingleResult();
        assertThat(moved.longValue()).isEqualTo(1L);
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

    // ------------- #695 : compteurs de la carte catégorie (actifs / archivés) -------------

    /**
     * #695 — `countByCategoryForUser` sépare actifs et archivés pour UNE catégorie. C'est
     * le cas qui motive l'issue : une catégorie ne portant QUE des archivés n'est pas vide
     * (elle refuse la suppression sans réassignation, cf. le test 409 ci-dessus), et le
     * listing produits ne peut pas le dire (`@SQLRestriction`, PIT-S79-006). Contre un vrai
     * Postgres : `count(*) FILTER (...)` est du SQL natif, un mock ne prouverait rien.
     */
    @Test
    void countByCategoryForUser_separatesActiveFromArchived() {
        UserEntity user = persistUser();
        CategoryEntity mixed = persistCategory(user, "Mixed-" + UUID.randomUUID());
        CategoryEntity archivedOnly = persistCategory(user, "ArchivedOnly-" + UUID.randomUUID());
        CategoryEntity untouched = persistCategory(user, "Empty-" + UUID.randomUUID());
        persistProduct(user, mixed, false);
        persistProduct(user, mixed, false);
        persistProduct(user, mixed, true);
        persistProduct(user, archivedOnly, true);
        em.flush();
        em.clear();

        Map<UUID, CategoryProductCounts> counts =
                productRepository.countByCategoryForUser(user.getId());

        assertThat(counts.get(mixed.getId())).isEqualTo(new CategoryProductCounts(2L, 1L));
        // LE cas de l'issue : 0 actif, 1 archivé -> la carte ne doit PLUS dire « aucun produit ».
        assertThat(counts.get(archivedOnly.getId())).isEqualTo(new CategoryProductCounts(0L, 1L));
        // Catégorie sans produit : ABSENTE de la map (aucune ligne à grouper), pas un (0,0).
        assertThat(counts).doesNotContainKey(untouched.getId());
    }

    /**
     * #695 — scope utilisateur. Les catégories SYSTÈME (owner NULL) sont partagées : sans
     * `WHERE user_id = :uid`, la carte d'un utilisateur publierait le nombre de produits
     * d'un AUTRE compte. Deux utilisateurs posent ici des produits sur la MÊME catégorie
     * système ; chacun ne doit voir que les siens.
     */
    @Test
    void countByCategoryForUser_countsOnlyCallerProducts_onSharedSystemCategory() {
        UserEntity mine = persistUser();
        UserEntity other = persistUser();
        CategoryEntity system = persistSystemCategory("SharedSystem-" + UUID.randomUUID());
        persistProduct(mine, system, false);
        persistProduct(other, system, false);
        persistProduct(other, system, false);
        persistProduct(other, system, true);
        em.flush();
        em.clear();

        assertThat(productRepository.countByCategoryForUser(mine.getId()).get(system.getId()))
                .isEqualTo(new CategoryProductCounts(1L, 0L));
        assertThat(productRepository.countByCategoryForUser(other.getId()).get(system.getId()))
                .isEqualTo(new CategoryProductCounts(2L, 1L));
    }

    /**
     * #695 — `countByCategoryForUser` (carte, scopé au caller) et `countByCategoryId`
     * (armement du 409 / intégrité FK, TOUS utilisateurs) ne comptent PAS la même chose :
     * le test les oppose pour qu'aucune refonte ne remplace l'un par l'autre.
     */
    @Test
    void countByCategoryForUser_isNotCountByCategoryId() {
        UserEntity mine = persistUser();
        UserEntity other = persistUser();
        CategoryEntity system = persistSystemCategory("SharedSystem-" + UUID.randomUUID());
        persistProduct(mine, system, false);
        persistProduct(other, system, true);
        em.flush();
        em.clear();

        CategoryProductCounts forMe =
                productRepository.countByCategoryForUser(mine.getId()).get(system.getId());
        assertThat(forMe.total()).isEqualTo(1L);
        // Le comptage global voit les deux produits (c'est lui qui protège la FK).
        assertThat(productRepository.countByCategoryId(system.getId())).isEqualTo(2L);
    }
}
