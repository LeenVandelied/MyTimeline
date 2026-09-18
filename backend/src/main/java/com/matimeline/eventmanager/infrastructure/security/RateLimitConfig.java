package com.matimeline.eventmanager.infrastructure.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.github.bucket4j.TimeMeter;

/**
 * Holds the time source backing the rate-limiting buckets in its own
 * configuration class — deliberately NOT inside SecurityConfig.
 *
 * <p>Putting this bean in SecurityConfig created a construction cycle:
 * SecurityConfig depends on RateLimitingFilter, which depends on the TimeMeter,
 * which (when defined as a @Bean method on SecurityConfig) cannot be produced
 * until SecurityConfig itself is built. Extracting it here breaks the cycle.
 *
 * <p>Production uses real nanotime; a test can override this bean to advance the
 * rate-limit window deterministically without sleeping.
 */
@Configuration
public class RateLimitConfig {

    @Bean
    public TimeMeter rateLimitTimeMeter() {
        return TimeMeter.SYSTEM_NANOTIME;
    }
}
