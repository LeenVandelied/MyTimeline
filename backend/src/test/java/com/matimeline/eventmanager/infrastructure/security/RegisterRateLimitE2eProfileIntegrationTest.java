package com.matimeline.eventmanager.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #475 — contrat du plafond {@code register} SOUS LE PROFIL {@code e2e} : 20/min/IP.
 *
 * <p><b>Ce que ce test prouve, et que rien d'autre ne prouve.</b> Il ne se contente pas de
 * vérifier qu'une propriété injectée est lue : il active réellement le profil {@code e2e}
 * ({@code @ActiveProfiles("e2e")} s'AJOUTE au {@code "test"} du socle) et exerce le filtre à
 * travers la vraie chaîne de filtres. C'est donc le SEUL contrôle qui atteste que
 * {@code application-e2e.properties} est bien chargé par ce profil et que sa valeur atteint
 * effectivement {@code RateLimitingFilter}. Un fichier mal nommé, une clé mal orthographiée
 * ou une surcouche écrasée par {@code application-dev.properties} feraient rougir ici — et
 * nulle part ailleurs, puisque la stack E2E réelle désarme le filtre entier
 * ({@code RATE_LIMIT_ENABLED=false}) et ne peut donc rien mesurer.
 *
 * <p><b>La marge, en chiffres.</b> Budget nominal de la suite Playwright sur une minute :
 * 4 provisions du projet {@code setup} ({@code ALL_ACCOUNTS}) + 1 auto-inscription du
 * golden-path = 5. Plafond e2e = 20. Marge = 15 inscriptions supplémentaires par minute.
 * Le test assert les DEUX bords : rien n'est bridé jusqu'à 20 (la marge existe vraiment),
 * et la 21e prend un 429 (le plafond reste un plafond — on dimensionne, on ne désarme pas).
 *
 * <p>Corps volontairement invalide : le filtre consomme son jeton avant le contrôleur, donc
 * 20 requêtes rejetées en 400 prouvent exactement la même chose que 20 inscriptions réelles,
 * sans 20 hachages BCrypt ni 20 lignes en base. Cf. {@code RegisterRateLimitDefaultIntegrationTest}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
class RegisterRateLimitE2eProfileIntegrationTest extends AbstractPostgresIntegrationTest {

    /** Valeur attendue de {@code app.rate-limit.register-per-minute} dans application-e2e.properties. */
    private static final int E2E_LIMIT = 20;

    /**
     * Inscriptions émises par un run Playwright nominal dans une même fenêtre d'une minute :
     * {@code ALL_ACCOUNTS.length} (4, frontend/e2e/support/accounts.ts) + l'auto-inscription de
     * golden-path.spec.ts (1). C'est le nombre que la marge doit couvrir.
     */
    private static final int E2E_SUITE_REGISTERS_PER_RUN = 5;

    private static final String REGISTER_BODY = "{\"name\":\"x\",\"username\":\"x\",\"email\":\"x\",\"password\":\"x\"}";

    @Autowired
    private MockMvc mockMvc;

    private int register(String socketIp) throws Exception {
        return mockMvc.perform(post("/api/auth/register")
                        .with(req -> { req.setRemoteAddr(socketIp); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER_BODY))
                .andReturn().getResponse().getStatus();
    }

    /** Le profil e2e relève effectivement le plafond : les 20 premières passent. */
    @Test
    void e2eProfile_raisesRegisterCeilingToTwenty() throws Exception {
        String ip = "10.75.1.1";
        for (int i = 1; i <= E2E_LIMIT; i++) {
            assertNotEquals(429, register(ip),
                    "register #" + i + " must pass under the e2e ceiling of " + E2E_LIMIT
                            + " — if this fails, application-e2e.properties is not being loaded");
        }
    }

    /** Le plafond relevé reste un plafond : la 21e est refusée. */
    @Test
    void e2eProfile_stillThrottlesPastTheRaisedCeiling() throws Exception {
        String ip = "10.75.1.2";
        for (int i = 1; i <= E2E_LIMIT; i++) {
            register(ip);
        }
        assertEquals(429, register(ip),
                "the e2e ceiling must still throttle: raising it is a sizing decision, not a bypass");
    }

    /**
     * LE CRITÈRE D'ACCEPTATION DE #475, exprimé en chiffres. Sans cette assertion, un futur
     * abaissement du plafond e2e (ou un ajout de compte dans {@code ALL_ACCOUNTS} non
     * répercuté ici) ramènerait silencieusement le budget à « 100 % sans marge » — l'état que
     * l'issue corrige. Le pendant côté suite, qui recompte les inscriptions à partir des
     * SOURCES E2E, vit dans {@code frontend/src/__tests__/e2e-register-budget.test.ts}.
     */
    @Test
    void e2eCeilingLeavesRoomForMoreRegistersThanTheSuiteEmits() {
        int margin = E2E_LIMIT - E2E_SUITE_REGISTERS_PER_RUN;
        assertEquals(15, margin,
                "marge attendue = plafond e2e (" + E2E_LIMIT + ") - budget nominal de la suite ("
                        + E2E_SUITE_REGISTERS_PER_RUN + ")");
    }
}
