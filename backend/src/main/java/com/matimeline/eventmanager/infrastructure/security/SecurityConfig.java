package com.matimeline.eventmanager.infrastructure.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;

import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.http.MediaType;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;


@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    private final JwtFilter jwtFilter;
    private final RateLimitingFilter rateLimitingFilter;

    public SecurityConfig(UserDetailsService userDetailsService, @Lazy JwtFilter jwtFilter,
                          RateLimitingFilter rateLimitingFilter) {
        this.jwtFilter = jwtFilter;
        this.rateLimitingFilter = rateLimitingFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(HttpSecurity http, PasswordEncoder passwordEncoder, UserDetailsService userDetailsService) throws Exception {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder);
    
        return new ProviderManager(authProvider);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers
                // X-Frame-Options: DENY — block clickjacking via framing.
                .frameOptions(frame -> frame.deny())
                // X-Content-Type-Options: nosniff — on by default, kept explicit.
                .contentTypeOptions(opts -> {})
                // Strict-Transport-Security — force HTTPS for a year, incl. subdomains.
                // requestMatcher(any) so the header is emitted even when the request
                // reaching the app is plain HTTP (TLS terminated at the reverse proxy);
                // Spring's default only writes HSTS on already-secure requests.
                .httpStrictTransportSecurity(hsts -> hsts
                        .includeSubDomains(true)
                        .maxAgeInSeconds(31536000)
                        .requestMatcher(request -> true))
                // Referrer-Policy: strict-origin-when-cross-origin.
                .referrerPolicy(referrer -> referrer
                        .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                // CSP hardened (#101): explicit per-resource directives instead of the
                // permissive default-src 'self'. This header is emitted on the backend's
                // own responses (a JSON API); the directives shrink the XSS surface of any
                // HTML the API could ever render (error pages, future SSR) — BR-SEC-003.
                //   script-src 'self'      : no inline/eval JS, no remote scripts.
                //   style-src 'self'       : no inline CSS. The Next.js front (Tailwind)
                //                            runs on its OWN origin (localhost:3000) under
                //                            ITS OWN CSP, so Tailwind's build-time CSS is
                //                            never governed by THIS header — no 'unsafe-inline'.
                //   connect-src 'self'     : XHR/fetch/WS only back to the API origin.
                //   img-src 'self' data:   : self + inline data URIs (favicons, tiny SVGs).
                //   font-src 'self'        : fonts from the API origin only.
                //   frame-ancestors 'none' : anti-clickjacking (complements X-Frame-Options).
                //   default-src 'self'     : minimal fallback for any directive not listed
                //                            above (e.g. object-src, base-uri).
                //   base-uri 'self'        : NON hérité de default-src en CSP3 ;
                //                            verrouille <base href> contre l'injection.
                //   object-src 'none'      : bloque explicitement plugins/embed legacy.
                .contentSecurityPolicy(csp -> csp
                        .policyDirectives(
                            "default-src 'self'; "
                            + "script-src 'self'; "
                            + "style-src 'self'; "
                            + "connect-src 'self'; "
                            + "img-src 'self' data:; "
                            + "font-src 'self'; "
                            + "base-uri 'self'; "
                            + "object-src 'none'; "
                            + "frame-ancestors 'none'"))
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/users/{userId}/products/**").hasAuthority("ROLE_USER")
                .requestMatchers("/api/products/**").hasAuthority("ROLE_USER")
                .requestMatchers("/api/events/**").hasAuthority("ROLE_USER")
                .requestMatchers("/api/users/**").hasAuthority("ROLE_USER")
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) ->
                        writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "unauthorized"))
                .accessDeniedHandler((request, response, accessDeniedException) ->
                        writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "forbidden"))
            )
            // Rate-limit BEFORE jwtFilter: jwtFilter skips /api/auth/**, but the
            // sensitive auth POSTs are exactly what must be throttled, so the
            // rate-limit filter has to run on them ahead of everything.
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(List.of("http://localhost:3000"));
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Cookie"));
        config.setExposedHeaders(List.of("Authorization", "Set-Cookie"));
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public UserDetailsService userDetailsService(UserRepository userRepository) {
        return new CustomUserDetailsService(userRepository);
    }

    /**
     * Writes a minimal JSON error body directly to the servlet response.
     * Used by the authenticationEntryPoint (401) and accessDeniedHandler (403):
     * these fire inside the security filter chain, BEFORE the DispatcherServlet,
     * so they never reach the @RestControllerAdvice. No internal message or
     * stack trace is exposed — only the stable "error" code.
     */
    private static void writeJsonError(HttpServletResponse response, int status, String error)
            throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("{\"error\":\"" + error + "\"}");
    }
}