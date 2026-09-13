package com.matimeline.eventmanager.infrastructure.security;

import static com.matimeline.eventmanager.infrastructure.security.RateLimitDefaultCeilingsIntegrationTest.LOGIN_BODY;
import static com.matimeline.eventmanager.infrastructure.security.RateLimitDefaultCeilingsIntegrationTest.REGISTER_BODY;
import static com.matimeline.eventmanager.infrastructure.security.RateLimitDefaultCeilingsIntegrationTest.RESET_BODY;
import static com.matimeline.eventmanager.infrastructure.security.RateLimitDefaultCeilingsIntegrationTest.assertCeiling;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #475 / #547 — contrat des plafonds de rate-limit SOUS LE PROFIL {@code e2e} :
 * {@code register} 30, {@code login} 30, {@code reset-password} 15 (seau par IP), par minute et par IP.
 *
 * <p><b>Ce que ce test prouve, et que rien d'autre ne prouve.</b> Il active réellement le profil
 * {@code e2e} ({@code @ActiveProfiles("e2e")} s'AJOUTE au {@code "test"} du socle) et exerce le
 * filtre à travers la vraie chaîne de filtres : c'est le contrôle qui atteste que
 * {@code application-e2e.properties} est chargé et que ses valeurs atteignent
 * {@code RateLimitingFilter}. Un fichier mal nommé, une clé mal orthographiée ou une surcouche
 * écrasée par {@code application-dev.properties} feraient rougir ici. Depuis #547 la stack E2E
 * tourne filtre ARMÉ : ces plafonds sont ceux que la suite Playwright traverse vraiment.
 *
 * <p><b>Les chiffres ne sont pas justifiés ici.</b> Le budget (nominal et pire cas sur les deux
 * passes CI, retries compris) est recompté depuis les sources E2E par
 * {@code frontend/src/__tests__/e2e-rate-limit-budget.test.ts}, qui lit les mêmes valeurs dans
 * {@code application-e2e.properties}. Les constantes ci-dessous ne sont que l'attendu de la
 * configuration résolue. (Ex-{@code RegisterRateLimitE2eProfileIntegrationTest}, renommée au S88.)
 *
 * <p>Chaque créneau est asserté sur ses DEUX bords : rien n'est bridé jusqu'au plafond (la marge
 * existe vraiment), et la requête suivante prend un 429 (on dimensionne, on ne désarme pas).
 * Contexte partagé avec les autres IT {@code @ActiveProfiles("e2e")} (PIT-S37-002).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e")
class RateLimitE2eProfileIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final int E2E_REGISTER = 30;
    private static final int E2E_LOGIN = 30;
    private static final int E2E_RESET_PASSWORD = 15;

    @Autowired
    private MockMvc mockMvc;

    @Value("${app.rate-limit.register-per-minute}")
    private int configuredRegister;

    @Value("${app.rate-limit.login-per-minute}")
    private int configuredLogin;

    @Value("${app.rate-limit.reset-password-per-minute}")
    private int configuredResetPassword;

    @Test
    void e2eProfile_registerCeilingIsThirty() throws Exception {
        assertCeiling(mockMvc, "/api/auth/register", REGISTER_BODY, "10.75.1.1", E2E_REGISTER,
                "if the first requests fail, application-e2e.properties is not being loaded");
    }

    @Test
    void e2eProfile_loginCeilingIsThirty() throws Exception {
        assertCeiling(mockMvc, "/api/auth/login", LOGIN_BODY, "10.75.1.2", E2E_LOGIN,
                "if the first requests fail, application-e2e.properties is not being loaded");
    }

    @Test
    void e2eProfile_resetPasswordPerIpCeilingIsFifteen() throws Exception {
        assertCeiling(mockMvc, "/api/auth/reset-password", RESET_BODY, "10.75.1.3", E2E_RESET_PASSWORD,
                "if the first requests fail, application-e2e.properties is not being loaded");
    }

    /**
     * Les valeurs RÉSOLUES par Spring sous le profil e2e. Une autre valeur signifie que le fichier
     * n'est pas chargé, ou qu'il a été modifié sans que le budget de la suite soit recompté
     * (e2e-rate-limit-budget.test.ts lit ces mêmes clés et rougit sous le pire cas).
     */
    @Test
    void e2eCeilingsReadFromConfiguration() {
        assertEquals(E2E_REGISTER, configuredRegister, "app.rate-limit.register-per-minute (profil e2e)");
        assertEquals(E2E_LOGIN, configuredLogin, "app.rate-limit.login-per-minute (profil e2e)");
        assertEquals(E2E_RESET_PASSWORD, configuredResetPassword,
                "app.rate-limit.reset-password-per-minute (profil e2e)");
    }
}
