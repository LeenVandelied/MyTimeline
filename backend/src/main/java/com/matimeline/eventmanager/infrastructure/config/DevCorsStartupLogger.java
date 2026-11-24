package com.matimeline.eventmanager.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

import java.util.List;

/** Squelette (tests d'abord, #549) : sans effet, sans profil ni log. */
public class DevCorsStartupLogger {

    private final List<String> allowedOrigins;

    public DevCorsStartupLogger(
            @Value("${app.cors.allowed-origins:http://localhost:3000}") List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logActiveCorsConfig() {
        // volontairement vide
    }
}
