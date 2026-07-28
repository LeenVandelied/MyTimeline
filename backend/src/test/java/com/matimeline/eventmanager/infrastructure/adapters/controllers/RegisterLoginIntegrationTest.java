package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * Couvre le VRAI flux d'inscription contre Postgres (Testcontainers, migrations V1..V10) :
 * {@code POST /api/auth/register} -> 201 puis {@code POST /api/auth/login} -> 200 + cookie jwt.
 *
 * <p>Non-régression PIT-S10-003 : jusqu'ici aucun test n'exerçait le register RÉEL en base —
 * les slices MockMvc mockaient {@code userService}, masquant le fait que
 * {@code UserRepositoryJpaImpl.save} routait une {@code UserEntity} détachée (id assigné par le
 * domaine, version=null) vers {@code persist()}, ce que Hibernate rejette ("Detached entity with
 * generated id ... uninitialized version value"). Le contrôleur enrobe l'exception en 500, donc
 * ce test échouait en 500 avant le correctif.
 */
@SpringBootTest
@AutoConfigureMockMvc
class RegisterLoginIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager em;

    @Autowired
    private PlatformTransactionManager txManager;

    private static final AtomicInteger IP_SEQ = new AtomicInteger(0);

    /** Sous-réseau 10.79.x.y DÉDIÉ (évite la collision de bucket rate-limit avec les autres
     * classes @SpringBootTest partageant le contexte, cf. AccountDeletionIntegrationTest). */
    private static String nextIp() {
        int n = IP_SEQ.incrementAndGet();
        return "10.79." + ((n >> 8) & 0xFF) + "." + (n & 0xFF);
    }

    @BeforeEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private long countUsers(String username) {
        Number n = (Number) new TransactionTemplate(txManager).execute(s ->
                em.createNativeQuery("SELECT count(*) FROM users WHERE username = :u")
                        .setParameter("u", username)
                        .getSingleResult());
        return n.longValue();
    }

    @Test
    void register_thenLogin_persistsUser_andIssuesJwtCookie() throws Exception {
        String username = "reg" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String email = username + "@example.test";
        String password = "secret6";

        String registerBody = "{"
                + "\"name\":\"Reg Test\","
                + "\"username\":\"" + username + "\","
                + "\"email\":\"" + email + "\","
                + "\"password\":\"" + password + "\"}";

        // Register RÉEL -> 201 (échouait en 500 avant le correctif PIT-S10-003).
        mockMvc.perform(post("/api/auth/register")
                        .with(req -> { req.setRemoteAddr(nextIp()); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody))
                .andExpect(status().isCreated());

        // La ligne est bien persistée en base (@GeneratedValue a assigné l'id, @Version initialisé).
        assertTrue(countUsers(username) == 1L, "l'utilisateur doit être persisté exactement une fois");

        // Login -> 200 + cookie jwt (prouve que le hash BCrypt persisté est vérifiable).
        String loginBody = "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}";
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .with(req -> { req.setRemoteAddr(nextIp()); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn();

        Cookie jwt = res.getResponse().getCookie("jwt");
        assertNotNull(jwt, "le login doit poser le cookie jwt");
        assertNotNull(jwt.getValue(), "le cookie jwt doit porter une valeur");
        assertTrue(!jwt.getValue().isBlank(), "le cookie jwt ne doit pas être vide");
    }

    /**
     * Couvre la branche MISE À JOUR de {@code UserRepositoryJpaImpl.save} contre Postgres —
     * même angle mort (jusqu'ici seulement mocké) que la création : {@code changePassword}
     * réécrit une {@code UserEntity} d'id EXISTANT. Sans la copie sur l'entité gérée, le
     * chemin persist/merge d'une entité détachée (version=null) échouerait aussi.
     * On prouve la persistance en se reconnectant avec le NOUVEAU mot de passe.
     */
    @Test
    void changePassword_updatesPersistedHash_soReloginUsesNewPassword() throws Exception {
        String username = "upd" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String email = username + "@example.test";
        String oldPassword = "secret6";
        String newPassword = "secret7new";

        String registerBody = "{"
                + "\"name\":\"Upd Test\","
                + "\"username\":\"" + username + "\","
                + "\"email\":\"" + email + "\","
                + "\"password\":\"" + oldPassword + "\"}";
        mockMvc.perform(post("/api/auth/register")
                        .with(req -> { req.setRemoteAddr(nextIp()); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody))
                .andExpect(status().isCreated());

        Cookie jwt = login(username, oldPassword);

        String changeBody = "{\"oldPassword\":\"" + oldPassword + "\",\"newPassword\":\"" + newPassword + "\"}";
        mockMvc.perform(post("/api/me/change-password")
                        .cookie(jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(changeBody))
                .andExpect(status().isNoContent());

        // L'ancien mot de passe ne fonctionne plus, le nouveau oui -> la MISE À JOUR a bien
        // été persistée (pas seulement mutée en mémoire).
        mockMvc.perform(post("/api/auth/login")
                        .with(req -> { req.setRemoteAddr(nextIp()); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + oldPassword + "\"}"))
                .andExpect(status().isUnauthorized());

        Cookie jwt2 = login(username, newPassword);
        assertNotNull(jwt2, "le login avec le nouveau mot de passe doit poser le cookie jwt");
    }

    private Cookie login(String username, String password) throws Exception {
        String body = "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}";
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .with(req -> { req.setRemoteAddr(nextIp()); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        Cookie jwt = res.getResponse().getCookie("jwt");
        assertNotNull(jwt, "le login doit poser le cookie jwt");
        return jwt;
    }
}
