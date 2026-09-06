package com.matimeline.eventmanager.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
 * golden-path + 3 inscriptions émises par le helper {@code support/auth.ts#registerOnly}
 * (1 dans {@code forgot-password.spec.ts}, 2 dans {@code reset-password-failures.spec.ts})
 * = 8. Plafond e2e = 20. Marge = 12 inscriptions supplémentaires par minute.
 * <b>Ces 3 dernières manquaient au chiffre annoncé au cycle 1</b> : le compteur de specs
 * ne regardait alors que les fichiers {@code *.spec.ts} et ne voyait pas un register émis
 * depuis un helper. Corrigé au cycle 2 de revue du S79, des deux côtés.
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
     * golden-path.spec.ts (1) + les 3 appels à {@code support/auth.ts#registerOnly}. C'est le
     * nombre que la marge doit couvrir. Il est RECOMPTÉ depuis les sources par
     * {@code frontend/src/__tests__/e2e-register-budget.test.ts} — ici il n'est que recopié,
     * donc c'est là-bas que le recompte fait foi.
     */
    private static final int E2E_SUITE_REGISTERS_PER_RUN = 8;

    /** Marge minimale exigée, alignée sur {@code MIN_MARGIN} de e2e-register-budget.test.ts. */
    private static final int MIN_MARGIN = 5;

    private static final String REGISTER_BODY = "{\"name\":\"x\",\"username\":\"x\",\"email\":\"x\",\"password\":\"x\"}";

    @Autowired
    private MockMvc mockMvc;

    /**
     * Plafond LU DANS LA CONFIGURATION résolue par Spring sous le profil {@code e2e}. C'est
     * la seule valeur de ce fichier qui vienne d'ailleurs que d'une constante Java.
     */
    @Value("${app.rate-limit.register-per-minute}")
    private int configuredRegisterCeiling;

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
     * LE CRITÈRE D'ACCEPTATION DE #475, confronté à la CONFIGURATION RÉSOLUE.
     *
     * <p><b>Ce que cette version corrige (cycle 2 de revue, S79).</b> La précédente assertait
     * {@code 20 - 5 == 15} à partir de deux constantes Java : de l'arithmétique pure, verte
     * même si {@code application-e2e.properties} était supprimé, renommé ou écrasé. Elle ne
     * pouvait rien détecter. Celle-ci lit {@code app.rate-limit.register-per-minute} dans
     * l'environnement Spring du profil {@code e2e} : abaisser le plafond dans le fichier la
     * fait rougir, ce qui est exactement la régression qu'on prétend garder.
     *
     * <p>Le pendant côté suite, qui recompte les inscriptions à partir des SOURCES E2E
     * (specs ET helpers de {@code e2e/support/}), vit dans
     * {@code frontend/src/__tests__/e2e-register-budget.test.ts}.
     */
    @Test
    void e2eCeilingReadFromConfigurationLeavesRoomForMoreRegistersThanTheSuiteEmits() {
        assertEquals(E2E_LIMIT, configuredRegisterCeiling,
                "app.rate-limit.register-per-minute résolu sous le profil e2e doit valoir "
                        + E2E_LIMIT + " (application-e2e.properties). Une autre valeur signifie que le "
                        + "fichier n'est pas chargé, ou qu'il a été modifié sans que le budget de la "
                        + "suite Playwright soit recompté.");

        int margin = configuredRegisterCeiling - E2E_SUITE_REGISTERS_PER_RUN;
        assertTrue(margin >= MIN_MARGIN,
                "marge = plafond CONFIGURÉ (" + configuredRegisterCeiling + ") - budget nominal de la "
                        + "suite (" + E2E_SUITE_REGISTERS_PER_RUN + ") = " + margin + ", minimum exigé "
                        + MIN_MARGIN + ". Sous ce seuil, la suite redevient ce que #475 corrige : "
                        + "un budget au plafond, où toute spec qui s'inscrit fait échouer la CI.");
    }
}
