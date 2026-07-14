package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.infrastructure.security.JwtService;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #73 : révocation de token via registre de sessions (jti). Parcourt la VRAIE chaîne
 * Spring Security (@AutoConfigureMockMvc applique springSecurity) — le JwtFilter, la
 * migration V10 (table sessions) et la persistance Postgres (Testcontainers) sont
 * réellement exercés. Couvre les critères d'acceptation :
 * <ul>
 *   <li>jti unique embarqué dans chaque JWT généré ;</li>
 *   <li>DELETE /api/sessions/{id} -> requête suivante avec ce token = 401 ;</li>
 *   <li>DELETE /api/sessions/others révoque toutes les sessions sauf la courante ;</li>
 *   <li>POST /logout révoque le token courant ;</li>
 *   <li>GET /api/sessions ne liste que les sessions du caller (ownership) ;</li>
 *   <li>jti jamais exposé dans le DTO (sécurité).</li>
 * </ul>
 *
 * <p>NB : les utilisateurs sont seedés via {@link EntityManager} (pattern éprouvé de
 * {@code CategoryDeleteReassignIntegrationTest}) plutôt que via {@code POST /register} —
 * le flux register réel souffre d'un bug de persistance indépendant (@Version + id
 * assigné, cf. tâche spawn dédiée) hors périmètre de #73. Le {@code POST /login} réel
 * EST exercé (c'est lui qui émet le jti et crée la session).
 */
@SpringBootTest(properties =
        // Le jwt.secret par défaut du profil test contient des '-' (non Base64) : il
        // suffit aux tests qui ne signent jamais de token, mais generateToken() le
        // décode en Base64 -> DecodingException. On fournit ici une clé 256 bits
        // valide Base64 pour exercer le VRAI login (émission + signature du jti).
        "jwt.secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
@AutoConfigureMockMvc
class SessionRevocationIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private EntityManager em;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PlatformTransactionManager txManager;

    // Le RateLimitingFilter (singleton in-memory, partagé dans le contexte Spring)
    // limite login PAR IP. On donne à CHAQUE POST /login une remoteAddr unique pour
    // que les buckets ne collisionnent jamais entre appels/tests — même pattern que
    // RateLimitingAndHeadersIntegrationTest (clé de bucket = clientIp|path).
    private static final AtomicInteger IP_SEQ = new AtomicInteger(0);

    private static String nextIp() {
        int n = IP_SEQ.incrementAndGet();
        // Sous-réseau 10.73.x.y DÉDIÉ à ce test : évite toute collision de bucket
        // rate-limit avec d'autres classes du même contexte Spring (ex.
        // RateLimitingAndHeadersIntegrationTest qui utilise 10.0.0.x).
        return "10.73." + ((n >> 8) & 0xFF) + "." + (n & 0xFF);
    }

    // Isolation du SecurityContext (thread-local) : d'autres tests slice
    // (AuthControllerSecurityTest, standaloneSetup) appellent des contrôleurs qui
    // posent une Authentication via SecurityContextHolder sans la nettoyer. Sur le
    // même thread `main`, cette auth résiduelle ferait que le JwtFilter SAUTE son
    // bloc (getAuthentication()==null faux) et laisserait passer un token pourtant
    // révoqué. On nettoie donc avant ET après chaque test pour un état déterministe.
    @BeforeEach
    void clearSecurityContextBefore() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearSecurityContextAfter() {
        SecurityContextHolder.clearContext();
    }

    /**
     * Seede un utilisateur (mot de passe BCrypt "secret6") et COMMITTE dans une
     * transaction dédiée — le login ouvre sa propre transaction (auth) et doit voir
     * l'utilisateur. Renvoie le username. {@link TransactionTemplate} nécessaire car
     * le test n'est pas @Transactional et l'auto-invocation ne proxie pas @Transactional.
     */
    String seedUser() {
        String username = "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        new TransactionTemplate(txManager).executeWithoutResult(status -> {
            UserEntity user = new UserEntity();
            // id NON assigné -> @GeneratedValue le pose, @Version initialisé par persist
            // (contrairement au register réel qui assigne l'id et casse la persistance).
            user.setName("SessTest");
            user.setUsername(username);
            user.setEmail(username + "@example.test");
            user.setPassword(passwordEncoder.encode("secret6"));
            user.setRole("ROLE_USER");
            em.persist(user);
        });
        return username;
    }

    /** Login réel -> renvoie le cookie jwt posé (token porteur du jti + session créée). */
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

    private String firstSessionId(Cookie caller) throws Exception {
        String json = mockMvc.perform(get("/api/sessions").cookie(caller))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return com.jayway.jsonpath.JsonPath.read(json, "$[0].id");
    }

    @Test
    void generatedToken_containsUniqueJti() throws Exception {
        String username = seedUser();
        Cookie a = login(username);
        Cookie b = login(username);

        String jtiA = jwtService.extractJti(a.getValue());
        String jtiB = jwtService.extractJti(b.getValue());

        assertNotNull(jtiA);
        assertNotNull(jtiB);
        assertTrue(!jtiA.equals(jtiB), "chaque login émet un jti distinct");
    }

    @Test
    void protectedRequest_withValidToken_succeeds_thenRevoked_returns401() throws Exception {
        Cookie jwt = login(seedUser());

        // Le token valide accède à GET /api/sessions (endpoint protégé, passe par JwtFilter).
        UUID sessionId = UUID.fromString(firstSessionId(jwt));

        mockMvc.perform(delete("/api/sessions/" + sessionId).cookie(jwt))
                .andExpect(status().isNoContent());

        // Requête suivante AVEC LE MÊME token -> 401 (jti révoqué, JwtFilter le rejette).
        mockMvc.perform(get("/api/sessions").cookie(jwt))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteSession_ofAnotherUser_returns404_antiEnumeration() throws Exception {
        Cookie owner = login(seedUser());
        Cookie intruder = login(seedUser());

        String ownerSessionId = firstSessionId(owner);

        // L'intrus tente de révoquer la session du owner -> 404 (jamais 403).
        mockMvc.perform(delete("/api/sessions/" + ownerSessionId).cookie(intruder))
                .andExpect(status().isNotFound());

        // La session du owner reste utilisable.
        mockMvc.perform(get("/api/sessions").cookie(owner))
                .andExpect(status().isOk());
    }

    @Test
    void deleteOthers_revokesAllButCurrent() throws Exception {
        String username = seedUser();
        Cookie first = login(username);   // deviendra "autre"
        Cookie current = login(username); // session courante conservée

        mockMvc.perform(delete("/api/sessions/others").cookie(current))
                .andExpect(status().isNoContent());

        // La session "first" est désormais révoquée -> 401.
        mockMvc.perform(get("/api/sessions").cookie(first))
                .andExpect(status().isUnauthorized());

        // La session courante reste active, et ne liste plus qu'elle-même.
        mockMvc.perform(get("/api/sessions").cookie(current))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].current").value(true));
    }

    @Test
    void logout_revokesCurrentToken() throws Exception {
        Cookie jwt = login(seedUser());

        mockMvc.perform(post("/api/auth/logout").cookie(jwt))
                .andExpect(status().isOk());

        // Le token capturé avant logout est neutralisé côté serveur -> 401.
        mockMvc.perform(get("/api/sessions").cookie(jwt))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getSessions_listsOnlyCallerSessions_ownership() throws Exception {
        Cookie userA = login(seedUser());
        login(seedUser()); // userB a une session, ne doit pas apparaître chez A

        MvcResult res = mockMvc.perform(get("/api/sessions").cookie(userA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andReturn();

        // Le jti interne n'est jamais exposé dans le DTO (sécurité).
        String json = res.getResponse().getContentAsString();
        assertTrue(!json.contains("\"jti\""), "le jti ne doit jamais être sérialisé");
    }

    @Test
    void me_afterRevocation_returns401_revokedJtiRejected() throws Exception {
        // Non-régression correctif review S13 (fix #1) : /api/auth/** est bypassé par
        // JwtFilter, GET /me doit donc vérifier LUI-MÊME la révocation du jti. Avant le
        // fix, /me renvoyait 200 avec un token révoqué (session paraissait active côté
        // frontend, vidant #73 de sa substance). Après révocation -> 401.
        Cookie jwt = login(seedUser());

        // Le token valide lit /me (200) tant que sa session est active.
        mockMvc.perform(get("/api/auth/me").cookie(jwt))
                .andExpect(status().isOk());

        // Révocation de la session courante via un DELETE de la session listée.
        UUID sessionId = UUID.fromString(firstSessionId(jwt));
        mockMvc.perform(delete("/api/sessions/" + sessionId).cookie(jwt))
                .andExpect(status().isNoContent());

        // Même token, jti désormais révoqué -> /me renvoie 401 (et non plus 200).
        mockMvc.perform(get("/api/auth/me").cookie(jwt))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refresh_afterLogout_returns401_revokedJtiRejected() throws Exception {
        Cookie jwt = login(seedUser());

        mockMvc.perform(post("/api/auth/logout").cookie(jwt))
                .andExpect(status().isOk());

        // BR-AUT-009 étendue : refresh d'un token dont le jti est révoqué -> 401.
        // #288 : vocabulaire unifié ErrorCode — 401 -> code "unauthorized".
        mockMvc.perform(post("/api/auth/refresh").cookie(jwt))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("unauthorized"));
    }
}
