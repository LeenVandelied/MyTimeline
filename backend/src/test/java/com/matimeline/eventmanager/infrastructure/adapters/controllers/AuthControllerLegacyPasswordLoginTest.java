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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #148 — GARDE-FOU DE NON-RÉGRESSION : durcir la politique de mot de passe
 * (BR-AUT-003 : >= 8, une majuscule, un chiffre) NE DOIT PAS verrouiller les
 * comptes créés avant le durcissement.
 *
 * <p>C'est le risque nommé dans l'issue. Le compte est semé DIRECTEMENT en base
 * avec un hash BCrypt d'un mot de passe à 6 caractères — impossible de passer
 * par {@code POST /api/auth/register}, qui le refuse désormais (c'est justement
 * ce que ce test rend visible : le seul moyen d'obtenir un tel compte est qu'il
 * préexiste, ce qui est exactement la situation en production).
 *
 * <p>Un test qui se contenterait de vérifier l'absence d'annotation sur
 * {@code AuthRequest} ne prouverait rien : la chaîne d'authentification complète
 * (filtre de validation, {@code AuthenticationManager}, comparaison BCrypt) est
 * ici traversée pour de vrai contre Postgres.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerLegacyPasswordLoginTest extends AbstractPostgresIntegrationTest {

    /** Mot de passe conforme à l'ANCIENNE politique (min 6) et rejeté par la nouvelle. */
    private static final String LEGACY_PASSWORD = "abcdef";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager em;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PlatformTransactionManager txManager;

    private static final AtomicInteger IP_SEQ = new AtomicInteger(0);

    /** Sous-réseau 10.83.x.y DÉDIÉ : évite la collision de bucket rate-limit avec
     * les autres classes @SpringBootTest partageant le contexte. */
    private static String nextIp() {
        int n = IP_SEQ.incrementAndGet();
        return "10.83." + ((n >> 8) & 0xFF) + "." + (n & 0xFF);
    }

    @BeforeEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    /**
     * Sème un compte legacy dans UNE transaction COMMITTÉE (pattern
     * {@code AccountDeletionIntegrationTest}). Le hash BCrypt est celui d'un mot de
     * passe à 6 caractères : la ligne est donc littéralement celle qu'aurait laissée
     * une inscription antérieure à #148. L'id n'est pas pré-assigné —
     * {@code @GeneratedValue} + {@code @Version} rejettent un id fourni au persist.
     */
    private String seedLegacyAccount() {
        String username = "legacy" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        new TransactionTemplate(txManager).execute(status -> {
            UserEntity user = new UserEntity();
            user.setName("Legacy Account");
            user.setUsername(username);
            user.setEmail(username + "@example.test");
            user.setPassword(passwordEncoder.encode(LEGACY_PASSWORD));
            user.setRole("ROLE_USER");
            em.persist(user);
            em.flush();
            return user.getId();
        });
        return username;
    }

    private MvcResult login(String username, String password) throws Exception {
        String body = "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}";
        return mockMvc.perform(post("/api/auth/login")
                        .with(req -> { req.setRemoteAddr(nextIp()); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn();
    }


    @Test
    void login_withPreExistingSixCharPassword_stillSucceeds_andIssuesJwtCookie() throws Exception {
        String username = seedLegacyAccount();

        MvcResult res = login(username, LEGACY_PASSWORD);

        assertTrue(res.getResponse().getStatus() == 200,
                "un compte antérieur à #148 doit toujours pouvoir se connecter, statut reçu : "
                        + res.getResponse().getStatus());
        Cookie jwt = res.getResponse().getCookie("jwt");
        assertNotNull(jwt, "le login legacy doit poser le cookie jwt");
        assertTrue(jwt.getValue() != null && !jwt.getValue().isBlank(),
                "le cookie jwt du login legacy doit porter une valeur");
    }

    /**
     * Contre-épreuve : le compte legacy se connecte, mais son mot de passe est bien
     * refusé À LA CRÉATION. Sans cette moitié, le test ci-dessus passerait aussi si
     * la politique n'avait jamais été appliquée.
     */
    @Test
    void register_withTheSameSixCharPassword_isRejected() throws Exception {
        String username = "newacc" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String body = "{"
                + "\"name\":\"New Account\","
                + "\"username\":\"" + username + "\","
                + "\"email\":\"" + username + "@example.test\","
                + "\"password\":\"" + LEGACY_PASSWORD + "\"}";

        mockMvc.perform(post("/api/auth/register")
                        .with(req -> { req.setRemoteAddr(nextIp()); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    /** Le compte legacy peut se mettre en conformité : son ancien mot de passe hors
     * politique est accepté comme `oldPassword`, le nouveau doit la respecter. */
    @Test
    void legacyAccount_canChangeToACompliantPassword_thenLogInWithIt() throws Exception {
        String username = seedLegacyAccount();
        Cookie jwt = login(username, LEGACY_PASSWORD).getResponse().getCookie("jwt");
        assertNotNull(jwt, "pré-requis : le login legacy doit réussir");

        String newPassword = "Legacy2026";
        // review S71 — `POST /api/me/change-password` est un slot RATE-LIMITÉ (5/min/IP,
        // `RateLimitingFilter.LIMITS`, ajouté par #134). Sans `setRemoteAddr` cet appel
        // retombait sur le 127.0.0.1 par défaut de MockMvc, donc sur un bucket PARTAGÉ
        // avec toute autre classe @SpringBootTest appelant ce endpoint sans IP dédiée
        // (aujourd'hui `RegisterLoginIntegrationTest` : 2 jetons consommés sur 5 — sous
        // le seuil, mais la marge dépend d'un décompte qu'aucun test ne garde).
        // On applique donc à CE troisième appel la convention que la classe s'était
        // déjà donnée pour `login`/`register` (sous-réseau 10.83.x.y dédié, cf. `nextIp`) :
        // le verdict ne dépend plus du nombre d'appels des autres classes.
        // ⚠ Ce n'est PAS une déflakisation prouvée : le flaky signalé par l'audit n'a pas
        // pu être reproduit (3 conteneurs neufs, verts). C'est la suppression d'un couplage
        // réel, pas la correction d'une cause établie.
        mockMvc.perform(post("/api/me/change-password")
                        .with(req -> { req.setRemoteAddr(nextIp()); return req; })
                        .cookie(jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"oldPassword\":\"" + LEGACY_PASSWORD
                                + "\",\"newPassword\":\"" + newPassword + "\"}"))
                .andExpect(status().isNoContent());

        assertNotNull(login(username, newPassword).getResponse().getCookie("jwt"),
                "le compte doit se reconnecter avec son nouveau mot de passe conforme");
    }
}
