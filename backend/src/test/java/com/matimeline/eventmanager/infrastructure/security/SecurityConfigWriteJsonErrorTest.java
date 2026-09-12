package com.matimeline.eventmanager.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Method;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletResponse;

/**
 * Issue #126 : writeJsonError ne doit plus concaténer le JSON à la main.
 * La méthode est private static — invoquée par réflexion pour vérifier,
 * sans dépendre du contexte Spring complet, qu'elle produit un JSON valide
 * même quand le message contient des guillemets ou un backslash (cas qui
 * cassait/injectait la concaténation manuelle d'origine).
 */
class SecurityConfigWriteJsonErrorTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void writeJsonError_producesValidJson_whenErrorContainsQuotesAndBackslash() throws Exception {
        String maliciousError = "unauthorized\", \"injected\": \"value\\";

        StringWriter body = new StringWriter();
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.getWriter()).thenReturn(new PrintWriter(body));

        invokeWriteJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, maliciousError);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        JsonNode json = MAPPER.readTree(body.toString());
        assertThat(json.get("error").asText()).isEqualTo(maliciousError);
        assertThat(json.size()).isEqualTo(1);
    }

    @Test
    void writeJsonError_producesValidJson_forConstantErrorCodes() throws Exception {
        StringWriter body = new StringWriter();
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.getWriter()).thenReturn(new PrintWriter(body));

        invokeWriteJsonError(response, HttpServletResponse.SC_FORBIDDEN, "forbidden");

        JsonNode json = MAPPER.readTree(body.toString());
        assertThat(json.get("error").asText()).isEqualTo("forbidden");
    }

    private static void invokeWriteJsonError(HttpServletResponse response, int status, String error)
            throws Exception {
        Method method = SecurityConfig.class.getDeclaredMethod(
                "writeJsonError", HttpServletResponse.class, int.class, String.class);
        method.setAccessible(true);
        method.invoke(null, response, status, error);
    }
}
