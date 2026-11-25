package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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

import com.matimeline.eventmanager.domain.models.UserTier;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;

/**
 * #88 : le palier n'est écrit que par un chemin dédié. Un PATCH /api/me (qui reconstruit un User
 * sans le palier) ne doit pas ramener un compte PLUS à FREE en base.
 */
@SpringBootTest
@AutoConfigureMockMvc
class UserTierProfilePatchIntegrationTest extends AbstractPostgresIntegrationTest {

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
        // Sous-réseau 10.190.x.y DÉDIÉ (pas de collision de bucket rate-limit avec les autres classes).
        return "10.190." + ((n >> 8) & 0xFF) + "." + (n & 0xFF);
    }

    @BeforeEach
    void clearSecurityContextBefore() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearSecurityContextAfter() {
        SecurityContextHolder.clearContext();
    }

    private record Seed(UUID userId, String username) {}

    private Seed seedPlusUser() {
        String username = "p" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        return new TransactionTemplate(txManager).execute(status -> {
            UserEntity user = new UserEntity();
            user.setName("Plus");
            user.setUsername(username);
            user.setEmail(username + "@example.test");
            user.setPassword(passwordEncoder.encode("Secret60"));
            user.setRole("ROLE_USER");
            user.setTier(UserTier.PLUS);
            em.persist(user);
            em.flush();
            return new Seed(user.getId(), username);
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

    private String rawTier(UUID userId) {
        return new TransactionTemplate(txManager).execute(s ->
                (String) em.createNativeQuery("SELECT tier FROM users WHERE id = :id")
                        .setParameter("id", userId)
                        .getSingleResult());
    }

    @Test
    void patchProfile_keepsPlusTier() throws Exception {
        Seed s = seedPlusUser();
        Cookie jwt = login(s.username());
        assertEquals("PLUS", rawTier(s.userId()));

        String body = "{\"name\":\"Renamed\",\"username\":\"" + s.username()
                + "\",\"email\":\"" + s.username() + "@example.test\"}";
        mockMvc.perform(patch("/api/me")
                        .with(req -> { req.setRemoteAddr(nextIp()); return req; })
                        .cookie(jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        assertEquals("PLUS", rawTier(s.userId()));
    }
}
