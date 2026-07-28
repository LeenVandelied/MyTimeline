package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #78 (RGPD droit à l'effacement) — DELETE /api/me. Parcourt la VRAIE chaîne Spring
 * Security (@AutoConfigureMockMvc applique springSecurity) + Postgres (Testcontainers) +
 * migrations V1..V10. Couvre les critères d'acceptation :
 * <ul>
 *   <li>bon username -> 204, cookie effacé (MaxAge=0), compte + graphe purgés ;</li>
 *   <li>2e appel avec le même token -> 401 (user introuvable / sessions révoquées) ;</li>
 *   <li>mauvais username -> 400, aucune donnée touchée ;</li>
 *   <li>corps absent -> 400 ;</li>
 *   <li>cascade transactionnelle : produits (ARCHIVÉ inclus) + events + catégorie
 *       possédée purgés ; catégorie SYSTÈME (owner NULL) intacte.</li>
 * </ul>
 *
 * <p>Seed via {@link EntityManager} (pattern de {@code SessionRevocationIntegrationTest})
 * plutôt que via les endpoints CRUD, pour maîtriser exactement l'état (dont le produit
 * ARCHIVÉ masqué par {@code @SQLRestriction}, cas de non-régression central).
 */
@SpringBootTest
@AutoConfigureMockMvc
class AccountDeletionIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager em;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PlatformTransactionManager txManager;

    private static final AtomicInteger IP_SEQ = new AtomicInteger(0);

    private static String nextIp() {
        int n = IP_SEQ.incrementAndGet();
        // Sous-réseau 10.78.x.y DÉDIÉ (évite collision de bucket rate-limit avec les
        // autres classes du même contexte Spring, cf. SessionRevocationIntegrationTest).
        return "10.78." + ((n >> 8) & 0xFF) + "." + (n & 0xFF);
    }

    @BeforeEach
    void clearSecurityContextBefore() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearSecurityContextAfter() {
        SecurityContextHolder.clearContext();
    }

    /** Résultat du seed : ids pour asserter la purge. */
    private record Seed(UUID userId, String username, UUID ownedCategoryId,
                        UUID systemCategoryId, UUID activeProductId, UUID archivedProductId,
                        UUID eventOfArchivedId) {}

    /**
     * Seede, dans UNE transaction committée : un user + sa catégorie possédée + une
     * catégorie SYSTÈME (owner NULL) + un produit actif + un produit ARCHIVÉ (masqué par
     * @SQLRestriction) + un event rattaché au produit archivé. Renvoie les ids.
     */
    private Seed seedGraph() {
        String username = "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        return new TransactionTemplate(txManager).execute(status -> {
            UserEntity user = new UserEntity();
            user.setName("DelTest");
            user.setUsername(username);
            user.setEmail(username + "@example.test");
            user.setPassword(passwordEncoder.encode("secret6"));
            user.setRole("ROLE_USER");
            em.persist(user);

            CategoryEntity owned = new CategoryEntity();
            owned.setName("owned-" + username);
            owned.setOwner(user);
            em.persist(owned);

            // Catégorie SYSTÈME : owner NULL, partagée, NE DOIT PAS être supprimée.
            CategoryEntity system = new CategoryEntity();
            system.setName("system-" + username);
            system.setOwner(null);
            em.persist(system);

            ProductEntity active = new ProductEntity();
            active.setName("active");
            active.setArchived(false);
            active.setCategory(owned);
            active.setUser(user);
            em.persist(active);

            ProductEntity archived = new ProductEntity();
            archived.setName("archived");
            archived.setArchived(true); // masqué par @SQLRestriction -> piège de purge
            archived.setCategory(owned);
            archived.setUser(user);
            em.persist(archived);

            EventEntity evt = new EventEntity();
            evt.setTitle("evt");
            evt.setType("single");
            evt.setIsRecurring(false);
            evt.setIsAllDay(true);
            evt.setStartDate(LocalDate.now());
            evt.setEndDate(LocalDate.now());
            evt.setArchived(false);
            evt.setProduct(archived); // event porté par le produit ARCHIVÉ
            em.persist(evt);

            em.flush();
            return new Seed(user.getId(), username, owned.getId(), system.getId(),
                    active.getId(), archived.getId(), evt.getId());
        });
    }

    private Cookie login(String username) throws Exception {
        String body = "{\"username\":\"" + username + "\",\"password\":\"secret6\"}";
        String ip = nextIp();
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .with(req -> { req.setRemoteAddr(ip); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        Cookie jwt = res.getResponse().getCookie("jwt");
        assertNotNull(jwt, "login doit poser le cookie jwt");
        return jwt;
    }

    /**
     * Compte NATIF (contourne le @SQLRestriction de ProductEntity, donc voit AUSSI les
     * lignes archivées) sur {@code table WHERE col = value}. Nom de table/colonne littéral
     * (jamais issu d'une entrée externe) ; la valeur est bindée.
     */
    private long countRow(String table, String col, UUID value) {
        Number n = (Number) new TransactionTemplate(txManager).execute(s ->
                em.createNativeQuery("SELECT count(*) FROM " + table + " WHERE " + col + " = :v")
                        .setParameter("v", value)
                        .getSingleResult());
        return n.longValue();
    }

    @Test
    void deleteMe_correctUsername_purgesGraph_clearsCookie_returns204() throws Exception {
        Seed s = seedGraph();
        Cookie jwt = login(s.username());

        String body = "{\"username\":\"" + s.username() + "\"}";
        MvcResult res = mockMvc.perform(delete("/api/me")
                        .cookie(jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNoContent())
                .andReturn();

        // Cookie effacé (MaxAge=0).
        Cookie cleared = res.getResponse().getCookie("jwt");
        assertNotNull(cleared, "le cookie jwt doit être posé pour effacement");
        assertEquals(0, cleared.getMaxAge(), "MaxAge=0 = suppression");

        // Graphe purgé, ARCHIVÉ inclus (comptage NATIF pour voir les lignes masquées).
        assertEquals(0, countRow("products", "user_id", s.userId()),
                "tous les produits (dont archivé) purgés");
        assertEquals(0, countRow("events", "id", s.eventOfArchivedId()),
                "l'event du produit archivé purgé");
        assertEquals(0, countRow("categories", "id", s.ownedCategoryId()),
                "la catégorie possédée purgée");
        assertEquals(0, countRow("users", "id", s.userId()), "le compte purgé");

        // Catégorie SYSTÈME (owner NULL) INTACTE.
        assertEquals(1, countRow("categories", "id", s.systemCategoryId()),
                "la catégorie système ne doit pas être supprimée");

        // 2e appel avec le MÊME token -> 401 (sessions révoquées + user introuvable).
        mockMvc.perform(get("/api/me").cookie(jwt))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteMe_wrongUsername_returns400_andKeepsEverything() throws Exception {
        Seed s = seedGraph();
        Cookie jwt = login(s.username());

        String body = "{\"username\":\"someone-else\"}";
        mockMvc.perform(delete("/api/me")
                        .cookie(jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        // Rien touché : compte et données intacts.
        assertEquals(1, countRow("users", "id", s.userId()), "compte conservé");
        assertEquals(2, countRow("products", "user_id", s.userId()), "produits conservés");
        assertEquals(1, countRow("categories", "id", s.ownedCategoryId()), "catégorie conservée");

        // Le token reste valide.
        mockMvc.perform(get("/api/me").cookie(jwt))
                .andExpect(status().isOk());
    }

    @Test
    void deleteMe_missingBody_returns400() throws Exception {
        Seed s = seedGraph();
        Cookie jwt = login(s.username());

        mockMvc.perform(delete("/api/me")
                        .cookie(jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(""))
                .andExpect(status().isBadRequest());

        assertEquals(1, countRow("users", "id", s.userId()), "compte conservé");
    }
}
