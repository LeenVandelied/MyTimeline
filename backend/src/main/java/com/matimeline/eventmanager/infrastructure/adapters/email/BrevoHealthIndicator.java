package com.matimeline.eventmanager.infrastructure.adapters.email;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * HealthIndicator Actuator dédié à la disponibilité de l'envoi d'email Brevo (issue #140).
 *
 * <p>{@link BrevoEmailService} fonctionne en NO-OP silencieux si {@code BREVO_API_KEY}
 * est absente : en prod, aucun email de réinitialisation ne partirait plus sans que
 * personne ne s'en aperçoive. Ce bean expose ce risque via {@code /actuator/health} :
 * l'absence de clé remonte {@code DOWN}, la présence remonte {@code UP}.
 *
 * <p>Actif UNIQUEMENT en profil {@code prod} ({@code @Profile("prod")}) : en dev/test le
 * NO-OP est volontaire (pas de clé), donc aucun DOWN injustifié. Le bean n'existe simplement
 * pas hors prod → composant {@code brevo} absent de {@code /actuator/health}.
 *
 * <p>Sécurité (règle secrets absolue) : la VALEUR de la clé n'est jamais loggée ni exposée
 * dans le détail du health — seule sa présence/absence est reportée. Aucun fail-fast au boot :
 * l'application démarre normalement et se contente de remonter DOWN (séparation avec #216).
 */
@Component
@Profile("prod")
public class BrevoHealthIndicator implements HealthIndicator {

    private final String apiKey;

    public BrevoHealthIndicator(@Value("${brevo.api.key:}") String apiKey) {
        this.apiKey = apiKey;
    }

    @Override
    public Health health() {
        if (apiKey == null || apiKey.isBlank()) {
            return Health.down()
                    .withDetail("reason",
                            "BREVO_API_KEY absente en profil prod : l'envoi d'email "
                                    + "(réinitialisation de mot de passe) est désactivé (NO-OP).")
                    .build();
        }
        return Health.up().build();
    }
}
