package com.matimeline.eventmanager.infrastructure.adapters.testsupport;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Chaîne de sécurité DÉDIÉE au canal de capture E2E (issue #283).
 *
 * <p>ACTIVE UNIQUEMENT EN PROFIL {@code e2e}. Elle n'ouvre QUE
 * {@value #TEST_SUPPORT_PATH_PATTERN} et laisse la chaîne principale
 * ({@code SecurityConfig}) intacte : aucune règle {@code permitAll} n'est ajoutée à la
 * configuration de production, qui ne mentionne même pas ce chemin.
 *
 * <p>POURQUOI UNE CHAÎNE SÉPARÉE plutôt qu'un {@code requestMatchers(...).permitAll()} dans
 * {@code SecurityConfig} : la règle vivrait alors dans le code de production, active en prod,
 * pour un endpoint qui n'y existe pas. Ici, si le profil {@code e2e} n'est pas actif, ni le
 * controller ni cette chaîne n'existent → le chemin retombe sur la chaîne principale
 * ({@code anyRequest().authenticated()}) et répond 401 (défense en profondeur).
 *
 * <p>{@code @Order(1)} : la chaîne principale n'est pas ordonnée (donc
 * {@code LOWEST_PRECEDENCE}) et matche tout ; cette chaîne restreinte doit être consultée
 * AVANT elle. Le canal est anonyme (le test appelle sans cookie JWT), en lecture seule et
 * sans état ({@code STATELESS}, cohérent avec la posture anti-CVE-2026-40973 : aucune
 * {@code HttpSession}). CSRF désactivé comme sur la chaîne principale (API sans formulaire
 * navigateur ; l'endpoint est de toute façon un GET).
 */
@Configuration
@Profile("e2e")
public class E2eTestSupportSecurityConfig {

    /** Unique chemin ouvert par cette chaîne (préfixe du controller test-only). */
    static final String TEST_SUPPORT_PATH_PATTERN = "/api/test-support/**";

    @Bean
    @Order(1)
    public SecurityFilterChain e2eTestSupportFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher(TEST_SUPPORT_PATH_PATTERN)
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        return http.build();
    }
}
