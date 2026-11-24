package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;

/**
 * #88 (R8) : dépassement de quota de bout en bout, VRAIE chaîne Spring Security + Postgres.
 * Monétisation activée et plafond gratuit forcé à zéro dans CE contexte de test seulement
 * (propriétés de la classe) : un compte au palier gratuit ne peut plus créer d'événement.
 * Attendu : 402 avec le corps d'erreur structuré, et aucun événement créé en base.
 */
@SpringBootTest(properties = {
        "app.monetization.enabled=true",
        "app.monetization.free-limit=0"
})
@AutoConfigureMockMvc
class EventQuotaExceededIntegrationTest extends AbstractPostgresIntegrationTest {

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
        // Sous-réseau 10.188.x.y DÉDIÉ (pas de collision de bucket rate-limit avec les autres classes).
        return "10.188." + ((n >> 8) & 0xFF) + "." + (n & 0xFF);
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

    /** Compte (palier par défaut, jamais choisi) + produit actif, committés. */
    private Seed seedUserWithProduct() {
        String username = "q" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        return new TransactionTemplate(txManager).execute(status -> {
            UserEntity user = new UserEntity();
            user.setName("Quota");
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

    private long eventCount(UUID productId) {
        Number n = new TransactionTemplate(txManager).execute(s ->
                (Number) em.createNativeQuery("SELECT count(*) FROM events WHERE product_id = :pid")
                        .setParameter("pid", productId)
                        .getSingleResult());
        return n.longValue();
    }

    @Test
    void createEvent_returnsStructuredError_whenLimitForcedToZero() throws Exception {
        Seed seed = seedUserWithProduct();
        Cookie jwt = login(seed.username());

        String body = "{\"name\":\"Quota event\",\"type\":\"single\",\"durationValue\":1,"
                + "\"durationUnit\":\"days\",\"isRecurring\":false,\"productId\":\"" + seed.productId() + "\"}";

        mockMvc.perform(post("/api/events")
                        .cookie(jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.status").value(402))
                .andExpect(jsonPath("$.error").value("event_quota_exceeded"))
                .andExpect(jsonPath("$.message").isNotEmpty());

        assertThat(eventCount(seed.productId())).isZero();
    }
}
