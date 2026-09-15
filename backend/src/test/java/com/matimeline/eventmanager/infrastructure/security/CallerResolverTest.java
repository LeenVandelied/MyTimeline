package com.matimeline.eventmanager.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.UserService;

/**
 * #93 — contrat de {@link CallerResolver} : résolution de l'identité via le
 * {@link SecurityContextHolder} peuplé par {@code JwtFilter} (cookie OU Bearer), et
 * {@link Optional#empty()} (jamais d'exception) en l'absence d'authentification
 * exploitable — les contrôleurs en dérivent le 401 sans fuite (BR-AUT-005).
 */
@ExtendWith(MockitoExtension.class)
class CallerResolverTest {

    @Mock
    private UserService userService;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private CallerResolver resolver() {
        return new CallerResolver(userService);
    }

    private void authenticateAs(String username) {
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null, authorities));
    }

    @Test
    void currentUser_resolvesDomainUser_fromAuthenticationName() {
        User caller = new User(UUID.randomUUID(), "Alice", "alice", "pwd", "ROLE_USER", "a@a.com");
        when(userService.findDomainUserByUsername("alice")).thenReturn(Optional.of(caller));
        authenticateAs("alice");

        Optional<User> result = resolver().currentUser();

        assertThat(result).containsSame(caller);
    }

    @Test
    void currentUser_returnsEmpty_whenNoAuthentication() {
        // Cas défensif : aucun contexte (en prod, SecurityConfig impose déjà l'auth en amont).
        Optional<User> result = resolver().currentUser();

        assertThat(result).isEmpty();
        verifyNoInteractions(userService);
    }

    @Test
    void currentUser_returnsEmpty_whenPrincipalHasNoMatchingUser() {
        // Username porté par le principal mais compte inconnu / purgé -> empty -> 401.
        when(userService.findDomainUserByUsername("ghost")).thenReturn(Optional.empty());
        authenticateAs("ghost");

        Optional<User> result = resolver().currentUser();

        assertThat(result).isEmpty();
    }

    @Test
    void currentUser_returnsEmpty_forAnonymousToken() {
        // AnonymousAuthenticationToken (getName()="anonymousUser") ne matche aucun User.
        lenient().when(userService.findDomainUserByUsername("anonymousUser")).thenReturn(Optional.empty());
        SecurityContextHolder.getContext().setAuthentication(
                new AnonymousAuthenticationToken("key", "anonymousUser",
                        List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));

        Optional<User> result = resolver().currentUser();

        assertThat(result).isEmpty();
    }
}
