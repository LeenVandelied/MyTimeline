package com.matimeline.eventmanager.infrastructure.adapters.email;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;

/**
 * Test unitaire du {@link BrevoHealthIndicator} (issue #140).
 *
 * <p>Instancie directement le bean avec une clé absente/vide/présente (pas de
 * {@code @SpringBootTest}, pas de Testcontainers) et vérifie l'état {@code DOWN}/{@code UP}
 * ainsi que la non-fuite de la valeur de la clé dans le détail.
 */
class BrevoHealthIndicatorTest {

    @Test
    void health_shouldBeDown_whenApiKeyIsNull() {
        Health health = new BrevoHealthIndicator(null).health();

        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
        assertThat(health.getDetails()).containsKey("reason");
    }

    @Test
    void health_shouldBeDown_whenApiKeyIsBlank() {
        Health health = new BrevoHealthIndicator("   ").health();

        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
        assertThat(health.getDetails().get("reason")).asString().contains("BREVO_API_KEY");
    }

    @Test
    void health_shouldBeUp_whenApiKeyIsPresent() {
        Health health = new BrevoHealthIndicator("xkeysib-secret-value").health();

        assertThat(health.getStatus()).isEqualTo(Status.UP);
    }

    @Test
    void health_shouldNeverLeakApiKeyValue() {
        String secret = "xkeysib-super-secret-value";

        Health health = new BrevoHealthIndicator(secret).health();

        assertThat(health.getDetails().values()).noneMatch(v -> String.valueOf(v).contains(secret));
    }
}
