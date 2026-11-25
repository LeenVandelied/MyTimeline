package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;

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

import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * Contrôle du {userId} du path sur GET /api/users/{userId}/products avec la VRAIE chaîne de
 * sécurité : cookie JWT d'un compte supprimé ensuite -> 401, autre utilisateur authentifié sur
 * l'id d'autrui -> 403. Seed via EntityManager, login réel (cf. SessionRevocationIntegrationTest).
 */
@SpringBootTest
@AutoConfigureMockMvc
class ProductPathOwnershipIntegrationTest extends AbstractPostgresIntegrationTest {

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
        // Sous-réseau 10.240.x.y DÉDIÉ (évite collision de bucket rate-limit avec les autres classes).
        return "10.240." + ((n >> 8) & 0xFF) + "." + (n & 0xFF);
    }

    @BeforeEach
    void clearSecurityContextBefore() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearSecurityContextAfter() {
        SecurityContextHolder.clearContext();
    }

    private record Seeded(UUID id, String username) {}

    private Seeded seedUser() {
        String username = "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        UUID id = new TransactionTemplate(txManager).execute(status -> {
            UserEntity user = new UserEntity();
            user.setName("PathOwn");
            user.setUsername(username);
            user.setEmail(username + "@example.test");
            user.setPassword(passwordEncoder.encode("Secret60"));
            user.setRole("ROLE_USER");
            em.persist(user);
            em.flush();
            return user.getId();
        });
        return new Seeded(id, username);
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
    void getProducts_tokenOfDeletedUser_returns401() throws Exception {
        Seeded user = seedUser();
        Cookie jwt = login(user.username());

        mockMvc.perform(get("/api/users/" + user.id() + "/products").cookie(jwt))
                .andExpect(status().isOk());

        // Suppression native : le token reste signé et non expiré, mais son user n'existe plus.
        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            em.createNativeQuery("DELETE FROM sessions WHERE user_id = :id")
                    .setParameter("id", user.id()).executeUpdate();
            em.createNativeQuery("DELETE FROM users WHERE id = :id")
                    .setParameter("id", user.id()).executeUpdate();
        });

        mockMvc.perform(get("/api/users/" + user.id() + "/products").cookie(jwt))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getProducts_otherUsersPath_returns403() throws Exception {
        Seeded owner = seedUser();
        Seeded intruder = seedUser();
        Cookie jwt = login(intruder.username());

        mockMvc.perform(get("/api/users/" + owner.id() + "/products").cookie(jwt))
                .andExpect(status().isForbidden());
    }
}
