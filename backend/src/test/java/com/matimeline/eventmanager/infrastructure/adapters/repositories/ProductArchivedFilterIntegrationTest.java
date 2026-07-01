package com.matimeline.eventmanager.infrastructure.adapters.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.application.dtos.ProductUpdateRequest;
import com.matimeline.eventmanager.domain.exceptions.ProductNotFoundException;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;

/**
 * #50 — Vérifie que le soft delete (BR-PRO-007) est effectif de bout en bout via
 * {@code @SQLRestriction("archived = false")} sur ProductEntity :
 *   - un produit archivé disparaît de findAllProducts() (le listing GET s'appuie dessus)
 *     ET de findDomainProductById() ;
 *   - archiveById() ne supprime pas physiquement la ligne (soft delete) et rend le
 *     produit invisible aux lectures Hibernate suivantes ;
 *   - updateProduct() modifie le nom d'un produit actif.
 *
 * Réel Postgres jetable (Testcontainers) + Flyway V1..V7 (archived colonne V7).
 * @Transactional -> rollback après chaque test (valeurs uniques par UUID).
 */
@SpringBootTest
@Transactional
class ProductArchivedFilterIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private EntityManager em;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductService productService;

    private UserEntity persistUser() {
        UserEntity user = new UserEntity();
        String suffix = UUID.randomUUID().toString();
        user.setName("p50-user-" + suffix);
        user.setUsername("p50-user-" + suffix);
        user.setEmail("p50-user-" + suffix + "@example.test");
        user.setPassword("x");
        user.setRole("USER");
        em.persist(user);
        return user;
    }

    private CategoryEntity persistCategory() {
        CategoryEntity category = new CategoryEntity();
        category.setName("p50-cat-" + UUID.randomUUID());
        em.persist(category);
        return category;
    }

    private ProductEntity persistProduct(UserEntity user, CategoryEntity category, boolean archived) {
        ProductEntity product = new ProductEntity();
        product.setName("p50-product-" + UUID.randomUUID());
        product.setCategory(category);
        product.setUser(user);
        product.setArchived(archived);
        em.persist(product);
        return product;
    }

    /** Un produit archivé n'apparaît pas dans findAllProducts() (base du listing GET). */
    @Test
    void archivedProduct_isHiddenFromFindAllProducts() {
        UserEntity user = persistUser();
        CategoryEntity category = persistCategory();
        ProductEntity active = persistProduct(user, category, false);
        ProductEntity archived = persistProduct(user, category, true);
        em.flush();
        em.clear();

        List<Product> all = productRepository.findAllProducts();
        List<UUID> ids = all.stream().map(Product::getId).toList();

        assertThat(ids).contains(active.getId());
        assertThat(ids).doesNotContain(archived.getId());
    }

    /** Un produit archivé n'est pas résolu par findDomainProductById() -> 404 au niveau contrôleur. */
    @Test
    void archivedProduct_isHiddenFromFindById() {
        UserEntity user = persistUser();
        CategoryEntity category = persistCategory();
        ProductEntity archived = persistProduct(user, category, true);
        em.flush();
        em.clear();

        assertThat(productRepository.findDomainProductById(archived.getId())).isEmpty();
    }

    /** archiveById() = soft delete : la ligne survit en base mais devient invisible aux lectures. */
    @Test
    void archiveById_softDeletes_rowSurvivesButHidden() {
        UserEntity user = persistUser();
        CategoryEntity category = persistCategory();
        ProductEntity product = persistProduct(user, category, false);
        UUID id = product.getId();
        em.flush();
        em.clear();

        productService.archiveById(id);
        em.flush();
        em.clear();

        // Invisible via l'API domaine (SQLRestriction).
        assertThat(productRepository.findDomainProductById(id)).isEmpty();

        // Mais la ligne existe toujours physiquement (soft delete, pas de DELETE).
        Long rows = (Long) em.createNativeQuery(
                        "SELECT count(*) FROM products WHERE id = :id AND archived = true")
                .setParameter("id", id)
                .getSingleResult();
        assertThat(rows).isEqualTo(1L);
    }

    /** archiveById() sur un id inexistant -> ProductNotFoundException. */
    @Test
    void archiveById_unknownId_throwsNotFound() {
        UUID unknown = UUID.randomUUID();
        try {
            productService.archiveById(unknown);
            assertThat(false).as("expected ProductNotFoundException").isTrue();
        } catch (ProductNotFoundException expected) {
            // ok
        }
    }

    /** Les events d'un produit archivé ne sont plus atteignables via le produit (SQLRestriction). */
    @Test
    void archivedProduct_eventsUnreachableThroughProductLookup() {
        UserEntity user = persistUser();
        CategoryEntity category = persistCategory();
        ProductEntity product = persistProduct(user, category, true);

        EventEntity event = new EventEntity();
        event.setTitle("p50-event-" + UUID.randomUUID());
        event.setType("single");
        event.setProduct(product);
        em.persist(event);
        em.flush();
        em.clear();

        // Le contrôleur GET .../events résout d'abord le produit -> archivé donc introuvable -> 404.
        assertThat(productRepository.findDomainProductById(product.getId())).isEmpty();
    }

    /** updateProduct() renomme un produit actif (BR-PRO-001). */
    @Test
    void updateProduct_renamesActiveProduct() {
        UserEntity user = persistUser();
        CategoryEntity category = persistCategory();
        ProductEntity product = persistProduct(user, category, false);
        UUID id = product.getId();
        em.flush();
        em.clear();

        ProductUpdateRequest request = new ProductUpdateRequest();
        request.setName("p50-renamed-" + UUID.randomUUID());

        Product updated = productService.updateProduct(id, request);

        assertThat(updated.getName()).isEqualTo(request.getName());

        em.flush();
        em.clear();
        assertThat(productRepository.findDomainProductById(id))
                .isPresent()
                .get()
                .extracting(Product::getName)
                .isEqualTo(request.getName());
    }
}
