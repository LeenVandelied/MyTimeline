package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;

/**
 * #88 : sans aucune propriété app.monetization.* (défauts : monétisation désactivée), un compte
 * gratuit déjà au-dessus du plafond gratuit en base crée quand même un événement (201).
 */
@SpringBootTest
@AutoConfigureMockMvc
class EventQuotaDefaultsIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final int OVER_FREE_LIMIT = 21;

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
        // Sous-réseau 10.189.x.y DÉDIÉ (pas de collision de bucket rate-limit avec les autres classes).
        return "10.189." + ((n >> 8) & 0xFF) + "." + (n & 0xFF);
    }

    @BeforeEach
    void clearSecurityContextBefore() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearSecurityContextAfter() {
        SecurityContextHolder.clearContext();
    }

    private record Seed(String username, UUID productId) {}

    /** Compte gratuit + produit actif portant déjà plus d'événements que le plafond gratuit. */
    private Seed seedUserOverFreeLimit() {
        String username = "d" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        return new TransactionTemplate(txManager).execute(status -> {
            UserEntity user = new UserEntity();
            user.setName("Defaults");
            user.setUsername(username);
            user.setEmail(username + "@example.test");
            user.setPassword(passwordEncoder.encode("Secret60"));
            user.setRole("ROLE_USER");
            em.persist(user);
            CategoryEntity category = new CategoryEntity();
            category.setName("i88-cat-" + UUID.randomUUID());
            em.persist(category);
            ProductEntity product = new ProductEntity();
            product.setName("i88-product-" + UUID.randomUUID());
            product.setCategory(category);
            product.setUser(user);
            em.persist(product);
            for (int i = 0; i < OVER_FREE_LIMIT; i++) {
                EventEntity event = new EventEntity();
                event.setTitle("i88-event-" + i);
                event.setType("single");
                event.setProduct(product);
                em.persist(event);
            }
            em.flush();
            return new Seed(username, product.getId());
        });
    }

    private Cookie login(String username) throws Exception {
        String body = "{\"username\":\"" + username + "\",\"password\":\"Secret60\"}";
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

    @Test
    void createEvent_returns201_overFreeLimit_whenMonetizationUnset() throws Exception {
        Seed seed = seedUserOverFreeLimit();
        Cookie jwt = login(seed.username());

        String body = "{\"name\":\"Defaults event\",\"type\":\"single\",\"durationValue\":1,"
                + "\"durationUnit\":\"days\",\"isRecurring\":false,\"productId\":\"" + seed.productId() + "\"}";

        mockMvc.perform(post("/api/events")
                        .cookie(jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }
}
