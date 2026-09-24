package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #653 (BR-AUT-013, ADR-010) — préférence de thème du compte, bout en bout : VRAIE chaîne
 * Spring Security + Postgres (Testcontainers) + migrations V1..V16 + {@code ddl-auto=validate}.
 * Le démarrage même du contexte prouve que V16 et le mapping {@code UserEntity.themePreference}
 * concordent (sinon {@code SchemaManagementException} au boot).
 *
 * <p>Couvre :
 * <ul>
 *   <li>compte neuf : {@code themePreference} à {@code null} sur {@code /api/me} ET
 *       {@code /api/auth/me} (la clé présente, lue par le front à la connexion) ;</li>
 *   <li>{@code PUT /api/me/preferences} : 200, valeur stockée en MINUSCULES, relue par les
 *       deux {@code /me} et par une NOUVELLE session (« second appareil ») ;</li>
 *   <li>non-effacement : un {@code PATCH /api/me} ultérieur ne remet pas la préférence à null ;</li>
 *   <li>400 sur valeur invalide / 401 anonyme à travers la vraie chaîne de filtres ;</li>
 *   <li>CHECK {@code ck_users_theme_preference} : une valeur hors ensemble est refusée par la base.</li>
 * </ul>
 */
@SpringBootTest
@AutoConfigureMockMvc
class ThemePreferenceIntegrationTest extends AbstractPostgresIntegrationTest {

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
        // Sous-réseau 10.153.x.y DÉDIÉ (pas de collision de bucket rate-limit avec les autres
        // classes du même contexte Spring — même motif que AccountDeletionIntegrationTest).
        return "10.153." + ((n >> 8) & 0xFF) + "." + (n & 0xFF);
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

    private Seed seedUser() {
        String username = "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        return new TransactionTemplate(txManager).execute(status -> {
            UserEntity user = new UserEntity();
            user.setName("Theme");
            user.setUsername(username);
            user.setEmail(username + "@example.test");
            user.setPassword(passwordEncoder.encode("Secret60"));
            user.setRole("ROLE_USER");
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

    /** Valeur BRUTE de la colonne (natif) : prouve le format stocké, pas le mapping. */
    private String rawThemePreference(UUID userId) {
        return (String) new TransactionTemplate(txManager).execute(s ->
                em.createNativeQuery("SELECT theme_preference FROM users WHERE id = :id")
                        .setParameter("id", userId)
                        .getSingleResult());
    }

    private void putPreference(Cookie jwt, String value) throws Exception {
        mockMvc.perform(put("/api/me/preferences")
                        .cookie(jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"themePreference\":\"" + value + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.themePreference").value(value))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void newAccount_hasNullPreference_onBothMeEndpoints() throws Exception {
        Seed s = seedUser();
        Cookie jwt = login(s.username());

        mockMvc.perform(get("/api/me").cookie(jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.themePreference").hasJsonPath())
                .andExpect(jsonPath("$.themePreference").isEmpty());

        mockMvc.perform(get("/api/auth/me").cookie(jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.themePreference").hasJsonPath())
                .andExpect(jsonPath("$.themePreference").isEmpty());

        assertNull(rawThemePreference(s.userId()), "aucun défaut inventé : NULL en base");
    }

    @Test
    void putPreference_isStoredLowercase_andReadBackByBothMe_andBySecondSession() throws Exception {
        Seed s = seedUser();
        Cookie deviceA = login(s.username());

        putPreference(deviceA, "dark");
        assertEquals("dark", rawThemePreference(s.userId()), "valeur stockée en minuscules (CHECK V16)");

        mockMvc.perform(get("/api/me").cookie(deviceA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.themePreference").value("dark"));

        // « Second appareil » : nouvelle session, le front lit /api/auth/me à la connexion.
        Cookie deviceB = login(s.username());
        mockMvc.perform(get("/api/auth/me").cookie(deviceB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.themePreference").value("dark"));

        // Remplacement idempotent, y compris vers le choix explicite « system ».
        putPreference(deviceB, "system");
        putPreference(deviceB, "system");
        assertEquals("system", rawThemePreference(s.userId()));
    }

    @Test
    void patchProfile_afterPreference_doesNotEraseIt() throws Exception {
        Seed s = seedUser();
        Cookie jwt = login(s.username());
        putPreference(jwt, "light");

        // PATCH reconstruit un User SANS préférence : ADR-010 § 3 garantit qu'il ne l'efface pas.
        String body = "{\"name\":\"Renamed\",\"username\":\"" + s.username()
                + "\",\"email\":\"" + s.username() + "@example.test\"}";
        mockMvc.perform(patch("/api/me")
                        .with(req -> { req.setRemoteAddr(nextIp()); return req; })
                        .cookie(jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed"))
                .andExpect(jsonPath("$.themePreference").value("light"));

        assertEquals("light", rawThemePreference(s.userId()));
    }

    @Test
    void putPreference_invalidValue_returns400_andLeavesColumnUntouched() throws Exception {
        Seed s = seedUser();
        Cookie jwt = login(s.username());

        mockMvc.perform(put("/api/me/preferences")
                        .cookie(jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"themePreference\":\"LIGHT\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));

        mockMvc.perform(put("/api/me/preferences")
                        .cookie(jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"themePreference\":null}"))
                .andExpect(status().isBadRequest());

        assertNull(rawThemePreference(s.userId()));
    }

    @Test
    void putPreference_anonymous_returns401() throws Exception {
        mockMvc.perform(put("/api/me/preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"themePreference\":\"dark\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void checkConstraint_rejectsOutOfSetValue_atDatabaseLevel() {
        Seed s = seedUser();
        // Défense en profondeur : même un écrivain qui contournerait l'API (import manuel,
        // bug futur) ne peut poser une valeur hors {light,dark,system}.
        assertThrows(Exception.class, () -> new TransactionTemplate(txManager).execute(st ->
                em.createNativeQuery("UPDATE users SET theme_preference = 'LIGHT' WHERE id = :id")
                        .setParameter("id", s.userId())
                        .executeUpdate()));
        assertNull(rawThemePreference(s.userId()));
    }
}
