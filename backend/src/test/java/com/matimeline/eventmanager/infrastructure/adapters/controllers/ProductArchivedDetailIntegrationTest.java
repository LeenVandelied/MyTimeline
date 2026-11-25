package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;

/**
 * #718 — Fiche en lecture seule d'un produit archivé, de bout en bout (même montage que
 * {@code ProductRestoreIntegrationTest} : Spring Security réelle, {@code CallerResolver} réel,
 * SQL natif sur Postgres jetable, aucun service mocké).
 *
 * <p>CE QUI FAIT ROUGIR :
 * <ul>
 *   <li>lire le produit par {@code findDomainProductById} (filtré par {@code @SQLRestriction})
 *       -> {@code getArchivedDetail_returnsNameCategoryAndAllEvents_forOwner} en 404 ;</li>
 *   <li>charger les événements par la relation de l'entité filtrée -> événement archivé ou
 *       liste manquants ;</li>
 *   <li>retirer {@code user_id = :uid} de la requête native -> l'archivé d'autrui répond 200 ;</li>
 *   <li>retirer {@code archived = true} -> le produit actif répond 200 ;</li>
 *   <li>sauter {@code requireOwner} -> le chemin au nom d'autrui répond autre chose que 403.</li>
 * </ul>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProductArchivedDetailIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager em;

    private UserEntity persistUser() {
        UserEntity u = new UserEntity();
        String suffix = UUID.randomUUID().toString();
        u.setName("r718-" + suffix);
        u.setUsername("r718-" + suffix);
        u.setEmail("r718-" + suffix + "@example.test");
        u.setPassword("x");
        u.setRole("ROLE_USER");
        em.persist(u);
        return u;
    }

    private CategoryEntity persistCategory() {
        CategoryEntity c = new CategoryEntity();
        c.setName("r718-cat-" + UUID.randomUUID());
        em.persist(c);
        return c;
    }

    private ProductEntity persistProduct(UserEntity owner, CategoryEntity category, boolean archived) {
        ProductEntity p = new ProductEntity();
        p.setName("r718-product-" + UUID.randomUUID());
        p.setCategory(category);
        p.setUser(owner);
        p.setArchived(archived);
        em.persist(p);
        return p;
    }

    private EventEntity persistEvent(ProductEntity product, boolean archived) {
        EventEntity e = new EventEntity();
        e.setTitle("r718-event-" + UUID.randomUUID());
        e.setType("single");
        e.setProduct(product);
        e.setArchived(archived);
        em.persist(e);
        return e;
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

    private String archivedDetailUrl(UserEntity pathUser, UUID productId) {
        return "/api/users/" + pathUser.getId() + "/products/archived/" + productId;
    }

    /**
     * T1 — Le propriétaire lit nom, catégorie et les DEUX événements (actif et archivé) d'un
     * produit archivé, et le produit reste archivé (lecture seule, aucune restauration).
     */
    @Test
    void getArchivedDetail_returnsNameCategoryAndAllEvents_forOwner() throws Exception {
        UserEntity caller = persistUser();
        CategoryEntity category = persistCategory();
        ProductEntity product = persistProduct(caller, category, true);
        EventEntity activeEvent = persistEvent(product, false);
        EventEntity archivedEvent = persistEvent(product, true);
        UUID productId = product.getId();
        String productName = product.getName();
        String categoryName = category.getName();
        sync();

        mockMvc.perform(get(archivedDetailUrl(caller, productId)).with(as(caller)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(productId.toString()))
                .andExpect(jsonPath("$.name").value(productName))
                .andExpect(jsonPath("$.category.id").value(category.getId().toString()))
                .andExpect(jsonPath("$.category.name").value(categoryName))
                .andExpect(jsonPath("$.events.length()").value(2))
                .andExpect(jsonPath("$.events[*].id").value(containsInAnyOrder(
                        activeEvent.getId().toString(), archivedEvent.getId().toString())));
        sync();

        assertThat(isArchivedInDb(productId)).isTrue();
    }

    /**
     * T2 — Archivé d'autrui, produit actif du demandeur, identifiant inconnu : trois 404, sans
     * distinction de cause (BR-PRO-011, anti-énumération). Le chemin porte l'id du demandeur,
     * le 403 est donc franchi.
     */
    @Test
    void getArchivedDetail_returns404_forOtherUsersActiveOrUnknownProduct() throws Exception {
        UserEntity caller = persistUser();
        UserEntity other = persistUser();
        CategoryEntity category = persistCategory();
        ProductEntity foreignArchived = persistProduct(other, category, true);
        persistEvent(foreignArchived, false);
        ProductEntity ownActive = persistProduct(caller, category, false);
        persistEvent(ownActive, false);
        sync();

        mockMvc.perform(get(archivedDetailUrl(caller, foreignArchived.getId())).with(as(caller)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get(archivedDetailUrl(caller, ownActive.getId())).with(as(caller)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get(archivedDetailUrl(caller, UUID.randomUUID())).with(as(caller)))
                .andExpect(status().isNotFound());
    }

    /**
     * T3 — Le chemin est au nom d'un autre utilisateur, même quand le produit archivé lui
     * appartient : 403 (BR-PRO-004), comme les autres routes du contrôleur.
     */
    @Test
    void getArchivedDetail_returns403_whenPathUserIsNotCaller() throws Exception {
        UserEntity caller = persistUser();
        UserEntity owner = persistUser();
        ProductEntity archived = persistProduct(owner, persistCategory(), true);
        persistEvent(archived, false);
        sync();

        mockMvc.perform(get(archivedDetailUrl(owner, archived.getId())).with(as(caller)))
                .andExpect(status().isForbidden());
    }
}
