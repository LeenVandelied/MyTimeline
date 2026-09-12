package com.matimeline.eventmanager.infrastructure.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Source de temps injectable (issue #49). Production utilise l'horloge système ;
 * un test peut surcharger ce bean (ou injecter un Clock fixe via constructeur) pour
 * piloter l'expiration des tokens (15 min) de façon déterministe sans Thread.sleep.
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock systemClock() {
        return Clock.systemDefaultZone();
    }
}
