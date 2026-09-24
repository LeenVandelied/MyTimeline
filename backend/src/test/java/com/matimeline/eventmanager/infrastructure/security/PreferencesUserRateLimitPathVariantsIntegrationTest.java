package com.matimeline.eventmanager.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #831 (revue S112, security-expert MINEUR 1) — aucune variante du chemin
 * {@code PUT /api/me/preferences} ne doit ÉCRIRE la préférence sans être comptée dans le seau
 * par utilisateur de {@link UserRateLimitingFilter}.
 *
 * <p><b>Pourquoi un vrai serveur ({@code RANDOM_PORT}) et pas MockMvc.</b> Les variantes visées
 * ({@code //}, {@code ;jsessionid=}, {@code %70}) sont précisément celles que le conteneur
 * servlet (Tomcat) normalise, décode ou retire AVANT la chaîne de filtres. MockMvc court-circuite
 * Tomcat : un vert MockMvc ne dirait rien de la prod. Ici la requête brute traverse Tomcat, le
 * pare-feu {@code StrictHttpFirewall}, {@code JwtFilter}, le limiteur puis le routage MVC.
 *
 * <p><b>Oracle, par variante</b> (compte neuf à chaque fois, donc seau neuf) :
 * <ol>
 *   <li>la variante est envoyée UNE fois sur le seau plein ;</li>
 *   <li>le chemin canonique est rejoué jusqu'au premier 429, en comptant ses 200 ;</li>
 *   <li>la variante est renvoyée, seau vide.</li>
 * </ol>
 * Deux issues acceptables : (a) la variante n'atteint pas le contrôleur (400/404/405) et le
 * canonique garde ses {@value UserRateLimitingFilter#DEFAULT_PREFERENCES_PER_MINUTE} jetons ;
 * (b) elle l'atteint (2xx) ET consomme un jeton du MÊME seau (le canonique n'en a plus que
 * {@code plafond - 1}) ET reçoit 429 une fois le seau vide. Le défaut débusqué : une variante
 * en 2xx sur seau vide = écriture non comptée.
 *
 * <p>Les requêtes sont AUTHENTIFIÉES (PIT-S83-012) : un 401 ne dirait rien du routage.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PreferencesUserRateLimitPathVariantsIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final int CEILING = UserRateLimitingFilter.DEFAULT_PREFERENCES_PER_MINUTE;

    /** Issue (a) : la requête n'atteint pas le contrôleur (pare-feu, route absente, méthode). */
    private static final Set<Integer> NOT_ROUTED = Set.of(400, 404, 405);

    private static final String CANONICAL = "/api/me/preferences";

    @LocalServerPort
    private int port;

    @Autowired
    private EntityManager em;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PlatformTransactionManager txManager;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    private String seedUser() {
        String username = "rlp" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        new TransactionTemplate(txManager).executeWithoutResult(status -> {
            UserEntity user = new UserEntity();
            user.setName("RateLimitPath");
            user.setUsername(username);
            user.setEmail(username + "@example.test");
            user.setPassword(passwordEncoder.encode("Secret60"));
            user.setRole("ROLE_USER");
            em.persist(user);
            em.flush();
        });
        return username;
    }

    /** Connexion réelle ; renvoie l'en-tête {@code Cookie} à rejouer ({@code jwt=...}). */
    private String login(String username) throws Exception {
        HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/login"))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(
                                "{\"username\":\"" + username + "\",\"password\":\"Secret60\"}"))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertEquals(200, res.statusCode(), "login : " + res.body());
        String jwt = res.headers().allValues("Set-Cookie").stream()
                .filter(c -> c.startsWith("jwt="))
                .map(c -> c.substring(0, c.indexOf(';') < 0 ? c.length() : c.indexOf(';')))
                .findFirst()
                .orElse(null);
        assertNotNull(jwt, "login doit poser le cookie jwt");
        return jwt;
    }

    /** PUT sur un chemin BRUT (aucun ré-encodage : {@link URI#create} garde {@code %70}, {@code //}, {@code ;}). */
    private int put(String rawPath, String cookie, String value) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + rawPath))
                .header("Content-Type", "application/json")
                .header("Cookie", cookie)
                .PUT(HttpRequest.BodyPublishers.ofString("{\"themePreference\":\"" + value + "\"}"))
                .build();
        return http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {
            "/api/me/%70references",
            "/api/me//preferences",
            "/api/me/preferences/",
            "/api/me/preferences;jsessionid=x",
            "/api/me/Preferences"
    })
    void pathVariant_neverWritesUncounted(String variant) throws Exception {
        String cookie = login(seedUser());

        // 1. Variante sur seau plein : routée (2xx) ou non (400/404/405) — rien d'autre.
        int fresh = put(variant, cookie, "dark");
        boolean routed = fresh >= 200 && fresh < 300;
        assertTrue(routed || NOT_ROUTED.contains(fresh),
                variant + " : statut inattendu sur seau plein = " + fresh);

        // 2. Canonique jusqu'au premier 429 : la variante a-t-elle consommé un jeton du même seau ?
        int canonicalOk = 0;
        int last = 200;
        for (int i = 0; i <= CEILING && last == 200; i++) {
            last = put(CANONICAL, cookie, i % 2 == 0 ? "light" : "dark");
            if (last == 200) {
                canonicalOk++;
            }
        }
        assertEquals(429, last, variant + " : le canonique doit finir en 429");
        assertEquals(routed ? CEILING - 1 : CEILING, canonicalOk,
                variant + " (statut " + fresh + ") : jetons canoniques restants — "
                        + (routed ? "une variante ROUTÉE doit être comptée dans le même seau"
                                  : "une variante NON routée ne doit rien consommer"));

        // 3. Variante sur seau vide : jamais d'écriture (429 si routée, 400/404/405 sinon).
        int exhausted = put(variant, cookie, "light");
        System.out.printf("[#831 path-variant] %-36s fresh=%d canonicalOk=%d exhausted=%d%n",
                variant, fresh, canonicalOk, exhausted);
        if (routed) {
            assertEquals(429, exhausted, variant + " : routée ET seau vide → doit être comptée (429)");
        } else {
            assertTrue(NOT_ROUTED.contains(exhausted),
                    variant + " : non routée, statut seau vide = " + exhausted);
        }
    }
}
