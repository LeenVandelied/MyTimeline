package com.matimeline.eventmanager.infrastructure.adapters.testsupport;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.models.PasswordResetToken;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.PasswordResetTokenRepository;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * Tests d'intégration du canal de capture test-only (issue #283, ADR-004).
 *
 * <p>Profils {@code test,e2e} : {@code @ActiveProfiles("e2e")} s'AJOUTE au {@code "test"}
 * hérité d'{@link AbstractPostgresIntegrationTest} (Spring fusionne par défaut,
 * {@code inheritProfiles=true}) — exactement la mécanique additive du job CI
 * ({@code SPRING_PROFILES_ACTIVE=dev,e2e}).
 *
 * <p>Passe par la VRAIE chaîne Spring Security ({@code @AutoConfigureMockMvc} applique
 * springSecurity) : le 200/404 obtenu SANS cookie JWT prouve que la chaîne dédiée
 * {@code E2eTestSupportSecurityConfig} est bien consultée avant la chaîne principale
 * (qui répondrait 401 sur {@code anyRequest().authenticated()}).
 *
 * <p>{@code @Transactional} : rollback après chaque test ; le controller lit dans la MÊME
 * transaction que le seed (MockMvc s'exécute sur le thread du test).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
@Transactional
class E2eResetTokenEndpointIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final String ENDPOINT = "/api/test-support/password-reset-token";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private Clock clock;

    @Test
    void returnsLatestUsableToken_withoutAuthentication() throws Exception {
        User user = seedUser();
        LocalDateTime now = LocalDateTime.now(clock);
        // Deux tokens exploitables : le canal doit rendre le PLUS RÉCENT (expiresAt desc),
        // sinon un second forgot-password ferait échouer le reset avec un token périmé.
        seedToken(user.getId(), UUID.randomUUID(), now.plusMinutes(5), null);
        UUID latest = UUID.randomUUID();
        seedToken(user.getId(), latest, now.plusMinutes(15), null);

        mockMvc.perform(get(ENDPOINT).param("email", user.getEmail()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value(latest.toString()));
    }

    /** Compte inconnu : 404 sans corps (aucun oracle d'existence de compte). */
    @Test
    void unknownEmail_returns404() throws Exception {
        mockMvc.perform(get(ENDPOINT).param("email", UUID.randomUUID() + "@example.com"))
                .andExpect(status().isNotFound());
    }

    /** Token déjà consommé : inexploitable pour un reset -> 404, pas un 200 trompeur. */
    @Test
    void consumedToken_returns404() throws Exception {
        User user = seedUser();
        LocalDateTime now = LocalDateTime.now(clock);
        seedToken(user.getId(), UUID.randomUUID(), now.plusMinutes(15), now.minusMinutes(1));

        mockMvc.perform(get(ENDPOINT).param("email", user.getEmail()))
                .andExpect(status().isNotFound());
    }

    /** Token expiré (>15 min, BR-AUT-012) : inexploitable -> 404. */
    @Test
    void expiredToken_returns404() throws Exception {
        User user = seedUser();
        LocalDateTime now = LocalDateTime.now(clock);
        seedToken(user.getId(), UUID.randomUUID(), now.minusMinutes(1), null);

        mockMvc.perform(get(ENDPOINT).param("email", user.getEmail()))
                .andExpect(status().isNotFound());
    }

    /** Paramètre {@code email} absent : 400 (contrat explicite, pas de 500). */
    @Test
    void missingEmailParam_returns400() throws Exception {
        mockMvc.perform(get(ENDPOINT))
                .andExpect(status().isBadRequest());
    }

    /** Compte frais (identité unique par test, aucune constante partagée). */
    private User seedUser() {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        // id=null sur le chemin CREATE : @GeneratedValue refuse un id pré-assigné au persist.
        return userRepository.save(new User(
                null,
                "e2e" + unique,
                "e2e" + unique,
                "$2a$10$notarealbcrypthashjustfortestpurposes000000000000000",
                "ROLE_USER",
                "e2e" + unique + "@example.com",
                null));
    }

    private void seedToken(UUID userId, UUID token, LocalDateTime expiresAt, LocalDateTime usedAt) {
        // Même construction que PasswordResetServiceImpl : id UUID assigné applicativement
        // (PasswordResetTokenEntity n'a pas de @GeneratedValue).
        tokenRepository.create(new PasswordResetToken(UUID.randomUUID(), userId, token, expiresAt, usedAt));
    }
}
