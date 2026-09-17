package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;

/**
 * #711 — Restauration d'un produit archivé, de bout en bout : chaîne Spring Security réelle
 * ({@code @AutoConfigureMockMvc}), {@code CallerResolver} réel (User lu en base), SQL natif réel
 * sur Postgres jetable. Aucun service mocké : c'est la requête native qui porte l'ownership
 * (BR-PRO-011), un slice à service mocké ne pourrait pas la tester.
 *
 * <p>CE QUI FAIT ROUGIR :
 * <ul>
 *   <li>retirer {@code user_id = :uid} de l'UPDATE natif -> {@code restore_otherUsersArchivedProduct_*}
 *       (IDOR) passe en 204 et le produit d'autrui est restauré ;</li>
 *   <li>retirer {@code archived = true} du WHERE -> {@code restore_activeProduct_*} passe en 204 ;</li>
 *   <li>déclarer la route {@code /products/archived} après une lecture par UUID qui la capterait ->
 *       {@code getArchived_*} en 400 (conversion UUID) au lieu de 200.</li>
 * </ul>
 *
 * <p>{@code @Transactional} : MockMvc s'exécute dans le thread du test, donc dans la transaction
 * du test (données visibles, rollback final). {@code flush + clear} avant chaque requête pour que
 * le SQL natif lise l'état réellement écrit, pas le contexte de persistance.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProductRestoreIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager em;

    @Autowired
    private ProductRepository productRepository;

    private UserEntity persistUser() {
        UserEntity u = new UserEntity();
        String suffix = UUID.randomUUID().toString();
        u.setName("r711-" + suffix);
        u.setUsername("r711-" + suffix);
        u.setEmail("r711-" + suffix + "@example.test");
        u.setPassword("x");
        u.setRole("ROLE_USER");
        em.persist(u);
        return u;
    }

    private CategoryEntity persistCategory() {
        CategoryEntity c = new CategoryEntity();
        c.setName("r711-cat-" + UUID.randomUUID());
        em.persist(c);
        return c;
    }

    private ProductEntity persistProduct(UserEntity owner, CategoryEntity category, boolean archived) {
        ProductEntity p = new ProductEntity();
        p.setName("r711-product-" + UUID.randomUUID());
        p.setCategory(category);
        p.setUser(owner);
        p.setArchived(archived);
        em.persist(p);
        return p;
    }

    private void persistEvent(ProductEntity product) {
        EventEntity e = new EventEntity();
        e.setTitle("r711-event-" + UUID.randomUUID());
        e.setType("single");
        e.setProduct(product);
        em.persist(e);
    }

    private RequestPostProcessor as(UserEntity u) {
        return user(u.getUsername()).authorities(
                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER"));
    }

    private void sync() {
        em.flush();
        em.clear();
    }

    private boolean isArchivedInDb(UUID productId) {
        Boolean archived = (Boolean) em.createNativeQuery("SELECT archived FROM products WHERE id = :id")
                .setParameter("id", productId)
                .getSingleResult();
        return archived;
    }

    // -------------------------------------------------------------------------
    // GET /users/{userId}/products/archived
    // -------------------------------------------------------------------------

    /**
     * Liste = archivés du caller seulement (actifs et archivés d'autrui exclus), y compris un
     * archivé SANS événement (pas de filtre BR-PRO-006). Routage : le littéral {@code archived}
     * n'est pas capté par {@code /products/{productId}} (sinon 400 de conversion UUID).
     */
    @Test
    void getArchived_returnsOnlyCallersArchivedProducts_includingWithoutEvents() throws Exception {
        UserEntity caller = persistUser();
        UserEntity other = persistUser();
        CategoryEntity category = persistCategory();
        ProductEntity active = persistProduct(caller, category, false);
        ProductEntity archivedNoEvent = persistProduct(caller, category, true);
        ProductEntity archivedWithEvent = persistProduct(caller, category, true);
        persistEvent(archivedWithEvent);
        ProductEntity foreignArchived = persistProduct(other, category, true);
        sync();

        mockMvc.perform(get("/api/users/" + caller.getId() + "/products/archived").with(as(caller)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[*].id").value(hasItem(archivedNoEvent.getId().toString())))
                .andExpect(jsonPath("$[*].id").value(hasItem(archivedWithEvent.getId().toString())))
                .andExpect(jsonPath("$[*].id").value(not(hasItem(active.getId().toString()))))
                .andExpect(jsonPath("$[*].id").value(not(hasItem(foreignArchived.getId().toString()))))
                .andExpect(jsonPath("$[0].category.id").value(category.getId().toString()))
                // Contrat ArchivedProductResponse : ni events, ni user, ni archived.
                .andExpect(jsonPath("$[0].events").doesNotExist())
                .andExpect(jsonPath("$[0].user").doesNotExist())
                .andExpect(jsonPath("$[0].archived").doesNotExist());
    }

    @Test
    void getArchived_pathUserDiffersFromCaller_returns403() throws Exception {
        UserEntity caller = persistUser();
        UserEntity other = persistUser();
        persistProduct(other, persistCategory(), true);
        sync();

        mockMvc.perform(get("/api/users/" + other.getId() + "/products/archived").with(as(caller)))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // POST /users/{userId}/products/{productId}/restore
    // -------------------------------------------------------------------------

    /**
     * Cas nominal : 204, le produit ET ses événements réapparaissent dans le listing actif
     * (lecture Hibernate soumise à @SQLRestriction), il quitte la liste des archivés, et la
     * version est incrémentée (le natif court-circuite @Version).
     */
    @Test
    void restore_ownArchivedProduct_returns204_andProductWithEventsIsVisibleAgain() throws Exception {
        UserEntity caller = persistUser();
        CategoryEntity category = persistCategory();
        ProductEntity product = persistProduct(caller, category, true);
        persistEvent(product);
        UUID productId = product.getId();
        sync();

        mockMvc.perform(post("/api/users/" + caller.getId() + "/products/" + productId + "/restore")
                        .with(as(caller)))
                .andExpect(status().isNoContent());
        sync();

        assertThat(isArchivedInDb(productId)).isFalse();
        Product restored = productRepository.findByUserId(caller.getId()).stream()
                .filter(p -> p.getId().equals(productId))
                .findFirst()
                .orElseThrow();
        assertThat(restored.getEvents()).hasSize(1);
        assertThat(productRepository.findArchivedByUserId(caller.getId()))
                .extracting(Product::getId)
                .doesNotContain(productId);
        Integer version = (Integer) em.createNativeQuery("SELECT version FROM products WHERE id = :id")
                .setParameter("id", productId)
                .getSingleResult();
        assertThat(version).isEqualTo(1);

        mockMvc.perform(get("/api/users/" + caller.getId() + "/products").with(as(caller)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id").value(hasItem(productId.toString())));
    }

    /**
     * IDOR (bloquant) : le caller passe SON userId dans le path (403 franchi) mais vise
     * l'archivé d'un autre -> 404 (pas 403 : anti-énumération) et le produit RESTE archivé.
     */
    @Test
    void restore_otherUsersArchivedProduct_returns404_andStaysArchived() throws Exception {
        UserEntity caller = persistUser();
        UserEntity victim = persistUser();
        ProductEntity foreign = persistProduct(victim, persistCategory(), true);
        sync();

        mockMvc.perform(post("/api/users/" + caller.getId() + "/products/" + foreign.getId() + "/restore")
                        .with(as(caller)))
                .andExpect(status().isNotFound());
        sync();

        assertThat(isArchivedInDb(foreign.getId())).isTrue();
    }

    @Test
    void restore_unknownProduct_returns404() throws Exception {
        UserEntity caller = persistUser();
        sync();

        mockMvc.perform(post("/api/users/" + caller.getId() + "/products/" + UUID.randomUUID() + "/restore")
                        .with(as(caller)))
                .andExpect(status().isNotFound());
    }

    /** Un produit ACTIF n'est pas « restaurable » : 404, et sa version n'est pas touchée. */
    @Test
    void restore_activeProduct_returns404_andIsNotTouched() throws Exception {
        UserEntity caller = persistUser();
        ProductEntity active = persistProduct(caller, persistCategory(), false);
        sync();

        mockMvc.perform(post("/api/users/" + caller.getId() + "/products/" + active.getId() + "/restore")
                        .with(as(caller)))
                .andExpect(status().isNotFound());
        sync();

        Integer version = (Integer) em.createNativeQuery("SELECT version FROM products WHERE id = :id")
                .setParameter("id", active.getId())
                .getSingleResult();
        assertThat(version).isZero();
    }

    /** BR-PRO-004 : path {userId} ≠ caller -> 403, même quand le produit appartient au path. */
    @Test
    void restore_pathUserDiffersFromCaller_returns403_andStaysArchived() throws Exception {
        UserEntity caller = persistUser();
        UserEntity owner = persistUser();
        ProductEntity archived = persistProduct(owner, persistCategory(), true);
        sync();

        mockMvc.perform(post("/api/users/" + owner.getId() + "/products/" + archived.getId() + "/restore")
                        .with(as(caller)))
                .andExpect(status().isForbidden());
        sync();

        assertThat(isArchivedInDb(archived.getId())).isTrue();
    }
}
