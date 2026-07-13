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

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.http.MediaType;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;


@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    // Sérialisation JSON des réponses d'erreur (#126) — instance dédiée et
    // sans état, indépendante de l'ObjectMapper applicatif (aucune config
    // custom requise pour un corps aussi simple qu'un Map<String,String>).
    private static final ObjectMapper ERROR_RESPONSE_MAPPER = new ObjectMapper();

    private final JwtFilter jwtFilter;
    private final RateLimitingFilter rateLimitingFilter;

    // CORS (#120) — origines autorisées externalisées par profil
    // (app.cors.allowed-origins, liste séparée par virgules). En dur,
    // "http://localhost:3000" cassait la prod et mélangeait dev/prod.
    // Default FAIL-SAFE intentionnel : si la propriété est absente, on retombe
    // sur localhost dev (jamais un wildcard, incompatible avec allowCredentials=true).
    // Profils : dev = http://localhost:3000 ; prod = origine(s) via env CORS_ALLOWED_ORIGINS.
    private final List<String> allowedOrigins;

    // userDetailsService n'est pas injecté ici : il est fourni en paramètre du @Bean
    // authenticationManager(...) (où Spring le résout), pas via ce constructeur.
    public SecurityConfig(@Lazy JwtFilter jwtFilter,
                          RateLimitingFilter rateLimitingFilter,
                          @Value("${app.cors.allowed-origins:http://localhost:3000}") List<String> allowedOrigins) {
        this.jwtFilter = jwtFilter;
        this.rateLimitingFilter = rateLimitingFilter;
        this.allowedOrigins = allowedOrigins;
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
                // Actuator health (#37) — PUBLIC pour le healthcheck Docker/orchestrateur.
                // Seul /actuator/health est whitelisté (les autres endpoints actuator
                // ne sont pas exposés sur le web par défaut, et resteraient authenticated).
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/users/{userId}/products/**").hasAuthority("ROLE_USER")
                .requestMatchers("/api/products/**").hasAuthority("ROLE_USER")
                .requestMatchers("/api/events/**").hasAuthority("ROLE_USER")
                .requestMatchers("/api/users/**").hasAuthority("ROLE_USER")
                .requestMatchers("/api/sessions/**").hasAuthority("ROLE_USER")
                .requestMatchers("/api/me/**").hasAuthority("ROLE_USER")
                // Export RGPD (#58) : inline (GET), soumission async (POST), suivi de job
                // et téléchargement signé — tous réservés à l'utilisateur authentifié.
                .requestMatchers("/api/export/**").hasAuthority("ROLE_USER")
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
        // Origines externalisées par profil (#120) — voir champ allowedOrigins.
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Cookie"));
        // exposedHeaders (#120) : "Authorization" retiré — depuis le passage
        // cookie-only JWT (#104) le front ne lit plus jamais ce header de réponse
        // (le token vit dans le cookie HttpOnly, illisible en JS). Seul Set-Cookie
        // reste exposé.
        config.setExposedHeaders(List.of("Set-Cookie"));
        // --- Décision SameSite (#120) ---
        // Le cookie `jwt` reste posé en SameSite=Lax (AuthController.COOKIE_SAME_SITE),
        // NON passé à Strict. Justification : le front Next.js (localhost:3000 en dev,
        // origine distincte en prod) est une origine SÉPARÉE de l'API ; ses requêtes
        // authentifiées sont cross-site (CORS + allowCredentials), or Strict bloque
        // l'envoi du cookie sur toute requête initiée par une autre origine (y compris
        // les navigations entrantes depuis un lien externe / email de confirmation).
        // La protection CSRF est assurée autrement : pas de form-POST navigateur sur
        // l'API (cookie HttpOnly + clients fetch CORS), donc Lax suffit sans casser
        // le flux SPA. Runbook : docs/runbook/cors-cookie-samesite.md.
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
     *
     * Sérialisé via Jackson (#126) plutôt que par concaténation de chaîne :
     * tous les appelants actuels passent des constantes ("unauthorized",
     * "forbidden"), mais une concaténation manuelle produirait un JSON
     * invalide/injectable si un futur appelant passait une valeur dynamique
     * contenant des guillemets ou un backslash.
     */
    private static void writeJsonError(HttpServletResponse response, int status, String error)
            throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        ERROR_RESPONSE_MAPPER.writeValue(response.getWriter(), Map.of("error", error));
    }
}