package com.matimeline.eventmanager.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #475 / #547 — contrat des plafonds PAR DÉFAUT des trois créneaux réglables par profil,
 * en vigueur dans tout profil qui ne pose pas leur propriété (prod comprise) :
 * {@code register} 5/min/IP, {@code login} 10/min/IP, {@code reset-password} 5/min/IP (seau par IP).
 *
 * <p><b>Pourquoi ce test compte.</b> #475 puis #547 ont rendu ces créneaux configurables
 * ({@code app.rate-limit.*-per-minute}). Sans cette classe, une surcouche de profil mal placée ou
 * un défaut mal recopié dans un placeholder {@code @Value} relèverait un plafond de PRODUCTION en
 * silence. C'est l'armement des valeurs par défaut ; le pendant e2e est
 * {@link RateLimitE2eProfileIntegrationTest}. (Ex-{@code RegisterRateLimitDefaultIntegrationTest},
 * renommée au S88 quand login et reset-password l'ont rejointe.)
 *
 * <p><b>Corps volontairement invalides.</b> Le filtre s'exécute AVANT le contrôleur : le jeton
 * bucket4j est consommé quel que soit le sort applicatif de la requête. Ce qui est asserté est le
 * STATUT 429, jamais le succès métier — pas de hachage BCrypt ni de ligne en base. Le corps de
 * reset-password ne porte PAS de {@code token} : le throttle PAR TOKEN (#141) est alors sauté et
 * seul le seau par IP peut répondre 429.
 *
 * <p>Même configuration de contexte que les autres IT {@code @SpringBootTest} par défaut : aucun
 * contexte Spring supplémentaire (PIT-S37-002).
 */
@SpringBootTest
@AutoConfigureMockMvc
class RateLimitDefaultCeilingsIntegrationTest extends AbstractPostgresIntegrationTest {

    static final String REGISTER_BODY = "{\"name\":\"x\",\"username\":\"x\",\"email\":\"x\",\"password\":\"x\"}";
    static final String LOGIN_BODY = "{\"username\":\"\",\"password\":\"\"}";
    /** Sans champ {@code token} : seul le seau PAR IP s'applique (cf. javadoc de classe). */
    static final String RESET_BODY = "{\"newPassword\":\"x\"}";

    @Autowired
    private MockMvc mockMvc;

    /**
     * IP de socket distincte par méthode de test : les seaux vivent dans le bean singleton,
     * partagé par tout le contexte Spring (lui-même mis en cache entre classes de test). Une IP
     * réutilisée ferait dépendre le résultat de l'ordre d'exécution.
     */
    static int hit(MockMvc mockMvc, String path, String body, String socketIp) throws Exception {
        return mockMvc.perform(post(path)
                        .with(req -> { req.setRemoteAddr(socketIp); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn().getResponse().getStatus();
    }

    /** Les {@code ceiling} premières passent, la suivante prend 429. */
    static void assertCeiling(MockMvc mockMvc, String path, String body, String ip, int ceiling, String why)
            throws Exception {
        for (int i = 1; i <= ceiling; i++) {
            assertNotEquals(429, hit(mockMvc, path, body, ip),
                    path + " #" + i + " must pass under the ceiling of " + ceiling + " — " + why);
        }
        assertEquals(429, hit(mockMvc, path, body, ip),
                path + " #" + (ceiling + 1) + " must be throttled: the ceiling is " + ceiling + "/min/IP — " + why);
    }

    @Test
    void defaultProfile_registerCeilingIsFive() throws Exception {
        assertCeiling(mockMvc, "/api/auth/register", REGISTER_BODY, "10.75.0.1", 5,
                "default MUST NOT be raised outside the e2e profile");
    }

    @Test
    void defaultProfile_loginCeilingIsTen() throws Exception {
        assertCeiling(mockMvc, "/api/auth/login", LOGIN_BODY, "10.75.0.2", 10,
                "default MUST NOT be raised outside the e2e profile");
    }

    @Test
    void defaultProfile_resetPasswordPerIpCeilingIsFive() throws Exception {
        assertCeiling(mockMvc, "/api/auth/reset-password", RESET_BODY, "10.75.0.3", 5,
                "default MUST NOT be raised outside the e2e profile");
    }
}
