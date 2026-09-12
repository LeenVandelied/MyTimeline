package com.matimeline.eventmanager.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * Garde-fou CVE-2026-40973 — <em>Arbitrary Code Execution and Session Hijacking via predictable
 * session identifiers</em>.
 *
 * <p>docs/security/cve-acceptance.md accepte cette CVE (HIGH, non corrigeable sans bump mineur Boot
 * 3.5.x — décision #180) sur l'hypothèse que l'application est <b>STATELESS</b> :
 * {@code SessionCreationPolicy.STATELESS} (SecurityConfig), authentification par cookie JWT
 * HttpOnly, aucune {@code HttpSession} serveur créée — le vecteur de détournement de session est
 * donc non applicable.
 *
 * <p>Ce test FIGE cette hypothèse à l'exécution, à travers la vraie chaîne de filtres Spring
 * Security ({@code @AutoConfigureMockMvc} applique {@code springSecurity}). Si un développeur change
 * la {@code SessionCreationPolicy} (ex. ALWAYS) ou introduit un usage d'{@code HttpSession},
 * l'application se met à matérialiser des sessions serveur (HttpSession + cookie {@code JSESSIONID})
 * et ce test échoue — invalidant l'acceptation de la CVE AVANT le merge.
 *
 * <p>Complément statique : la règle ArchUnit {@code productionCodeShouldNotUseHttpSession}
 * (ArchitectureTest) interdit toute dépendance de production sur {@code HttpSession}.
 */
@SpringBootTest
@AutoConfigureMockMvc
class StatelessSessionGuardTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    /** Une requête anonyme ne doit créer NI HttpSession serveur NI cookie JSESSIONID. */
    @Test
    void anonymousRequest_createsNoServerSession() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/me")).andReturn();

        assertThat(result.getRequest().getSession(false))
                .as("aucune HttpSession serveur ne doit être créée (app STATELESS — CVE-2026-40973)")
                .isNull();
        assertNoJsessionIdCookie(result.getResponse());
    }

    /**
     * Une requête AUTHENTIFIÉE ne doit pas davantage matérialiser de session : sous STATELESS le
     * SecurityContext n'est jamais persisté côté serveur. Un passage à une policy créatrice de
     * session ferait apparaître un JSESSIONID / une HttpSession ici.
     */
    @Test
    void authenticatedRequest_createsNoServerSession() throws Exception {
        MvcResult result =
                mockMvc.perform(get("/api/auth/me").with(user("guard").roles("USER"))).andReturn();

        assertThat(result.getRequest().getSession(false))
                .as("une requête authentifiée ne doit pas créer de session (app STATELESS — CVE-2026-40973)")
                .isNull();
        assertNoJsessionIdCookie(result.getResponse());
    }

    private static void assertNoJsessionIdCookie(MockHttpServletResponse response) {
        assertThat(response.getHeaders("Set-Cookie"))
                .as("aucun cookie de session servlet (JSESSIONID) ne doit être posé (app STATELESS)")
                .noneMatch(header -> header.toUpperCase().contains("JSESSIONID"));
    }
}
