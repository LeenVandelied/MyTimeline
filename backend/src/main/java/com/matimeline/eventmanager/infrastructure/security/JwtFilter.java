package com.matimeline.eventmanager.infrastructure.security;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import com.matimeline.eventmanager.domain.ports.services.SessionService;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    // #73 : vérification de révocation du jti à chaque requête. Port métier (interface),
    // pas l'impl — lookup indexé (uq_sessions_jti) pour rester O(index) sur le chemin chaud.
    private final SessionService sessionService;
    private final Logger logger = LoggerFactory.getLogger(JwtFilter.class);

    public JwtFilter(JwtService jwtService, UserDetailsService userDetailsService,
                     SessionService sessionService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.sessionService = sessionService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
    
        String token = null;
    
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("jwt".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }
    
        if (token == null) {
            String authorizationHeader = request.getHeader("Authorization");
            if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                token = authorizationHeader.substring(7);
            }
        }
    
        if (token == null) {
            logger.warn("JWT Token not found in request");
            chain.doFilter(request, response);
            return;
        }
    
        try {
            String username = jwtService.extractUsername(token);
    
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                // #73 (BR-AUT-011) : signature + expiration valides ET jti NON révoqué.
                // isSessionActive renvoie false si le jti est révoqué ou inconnu ; true si
                // le token n'a pas de jti (legacy pré-#73). Un token révoqué laisse donc le
                // contexte anonyme -> SecurityConfig.authenticationEntryPoint renvoie 401.
                if (jwtService.validateToken(token, userDetails)
                        && sessionService.isSessionActive(jwtService.extractJti(token))) {
                    UsernamePasswordAuthenticationToken authenticationToken =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authenticationToken);
                } else {
                    logger.warn("Invalid or revoked JWT token for user: {}", username);
                }
            }
        } catch (Exception e) {
            logger.error("JWT processing error", e);
        }
    
        chain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getServletPath().startsWith("/api/auth");
    }
}