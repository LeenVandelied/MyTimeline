package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Date;
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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.matimeline.eventmanager.domain.ports.services.SessionService;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.infrastructure.security.JwtService;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.SignatureException;

/**
 * #489 : rotation de la clé de connexion sans déconnexion, de bout en bout. Une session ouverte
 * AVANT la rotation (jeton signé par l'ancienne clé privée, session active pour son jti) passe
 * la vraie chaîne Spring Security (JwtFilter, contrôle de session) puis /refresh, qui la
 * migre sur un jeton signé par la clé courante.
 *
 * <p>⚠ Aucune clé committée : les deux paires sont générées en mémoire et injectées par
 * {@link DynamicPropertySource} (contexte Spring dédié). Seule la clé PUBLIQUE de l'ancienne
 * paire est configurée, comme en exploitation ; sa clé privée ne sert qu'à forger le jeton
 * « d'avant la rotation ».
 */
@SpringBootTest
@AutoConfigureMockMvc
class KeyRotationSessionIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final KeyPair CURRENT = newKeyPair();
    private static final KeyPair PREVIOUS = newKeyPair();

    @DynamicPropertySource
    static void rotationKeys(DynamicPropertyRegistry registry) {
        registry.add("jwt.private-key",
                () -> Base64.getEncoder().encodeToString(CURRENT.getPrivate().getEncoded()));
        registry.add("jwt.previous-public-key",
                () -> Base64.getEncoder().encodeToString(PREVIOUS.getPublic().getEncoded()));
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private EntityManager em;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PlatformTransactionManager txManager;

    // Sous-réseau dédié : pas de collision de bucket rate-limit (/refresh) avec les autres
    // classes du même conteneur (même motif que SessionRevocationIntegrationTest).
    private static final AtomicInteger IP_SEQ = new AtomicInteger(0);

    private static String nextIp() {
        int n = IP_SEQ.incrementAndGet();
        return "10.89." + ((n >> 8) & 0xFF) + "." + (n & 0xFF);
    }

    // SecurityContext résiduel d'autres tests sur le même thread : voir
    // SessionRevocationIntegrationTest.
    @BeforeEach
    void clearSecurityContextBefore() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearSecurityContextAfter() {
        SecurityContextHolder.clearContext();
    }

    private static KeyPair newKeyPair() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return generator.generateKeyPair();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Seede un utilisateur commité (id généré au persist) et le renvoie. */
    private UserEntity seedUser() {
        String username = "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        UserEntity user = new UserEntity();
        new TransactionTemplate(txManager).executeWithoutResult(status -> {
            user.setName("RotationTest");
            user.setUsername(username);
            user.setEmail(username + "@example.test");
            user.setPassword(passwordEncoder.encode("Secret60"));
            user.setRole("ROLE_USER");
            em.persist(user);
        });
        return user;
    }

    /**
     * Cookie d'une session ouverte avant la rotation : jeton au format de production (jti, iat,
     * exp à la validité nominale) signé par l'ANCIENNE clé privée, et session active pour son
     * jti, enregistrée comme le fait le login.
     */
    private Cookie sessionFromBeforeRotation(UserEntity user) {
        String jti = UUID.randomUUID().toString();
        Date now = new Date();
        String token = Jwts.builder()
                .subject(user.getUsername())
                .id(jti)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + JwtService.TOKEN_VALIDITY_MS))
                .signWith(PREVIOUS.getPrivate(), Jwts.SIG.RS256)
                .compact();
        sessionService.createSession(jti, user.getId(), "rotation-test", "10.89.0.0",
                LocalDateTime.now().plusSeconds(JwtService.TOKEN_VALIDITY_MS / 1000));
        return new Cookie("jwt", token);
    }

    @Test
    void protectedRoute_withTokenOfPreviousKey_andActiveSession_returns200() throws Exception {
        Cookie oldCookie = sessionFromBeforeRotation(seedUser());

        mockMvc.perform(get("/api/sessions").cookie(oldCookie))
                .andExpect(status().isOk());
    }

    @Test
    void refresh_withTokenOfPreviousKey_issuesCookieSignedByCurrentKey() throws Exception {
        Cookie oldCookie = sessionFromBeforeRotation(seedUser());
        String ip = nextIp();

        MvcResult result = mockMvc.perform(post("/api/auth/refresh")
                        .with(req -> { req.setRemoteAddr(ip); return req; })
                        .cookie(oldCookie))
                .andExpect(status().isOk())
                .andReturn();
        Cookie refreshed = result.getResponse().getCookie("jwt");

        assertThat(refreshed).as("/refresh doit poser un nouveau cookie jwt").isNotNull();
        String newToken = refreshed.getValue();
        // Ordre : « pas l'ancienne clé » d'abord, pour que chaque moitié puisse échouer seule.
        assertThatThrownBy(() -> Jwts.parser().verifyWith(PREVIOUS.getPublic()).build()
                .parseSignedClaims(newToken))
                .as("le jeton rafraîchi n'est plus signé par l'ancienne clé")
                .isInstanceOf(SignatureException.class);
        assertThat(Jwts.parser().verifyWith(CURRENT.getPublic()).build()
                .parseSignedClaims(newToken).getPayload().getId())
                .as("le jeton rafraîchi se vérifie avec la clé courante et porte un jti")
                .isNotBlank();

        // Le nouveau cookie ouvre la route protégée ; l'ancien jti est révoqué par /refresh.
        mockMvc.perform(get("/api/sessions").cookie(refreshed))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/sessions").cookie(oldCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedRoute_withTokenOfPreviousKey_withoutActiveSession_returns401() throws Exception {
        // Témoin : la clé précédente ne court-circuite pas le contrôle de session.
        UserEntity user = seedUser();
        String token = Jwts.builder()
                .subject(user.getUsername())
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(PREVIOUS.getPrivate(), Jwts.SIG.RS256)
                .compact();

        mockMvc.perform(get("/api/sessions").cookie(new Cookie("jwt", token)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void contextUsesInjectedCurrentKey() {
        // Garde du montage : sans elle, une propriété mal injectée (paire éphémère) ferait
        // passer le test de /refresh pour une mauvaise raison.
        assertThat(jwtService.getPublicKeySpkiBase64())
                .isEqualTo(Base64.getEncoder().encodeToString(CURRENT.getPublic().getEncoded()));
    }
}
