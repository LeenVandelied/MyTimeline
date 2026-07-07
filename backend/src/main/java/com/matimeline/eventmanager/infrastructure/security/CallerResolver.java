package com.matimeline.eventmanager.infrastructure.security;

import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.UserService;

/**
 * Résout l'utilisateur authentifié COURANT depuis le {@link SecurityContextHolder}, peuplé
 * en amont par {@link JwtFilter} à partir du cookie {@code jwt} OU du header
 * {@code Authorization: Bearer} (BR-AUT-011). Unique point d'extraction d'identité des
 * contrôleurs (#93).
 *
 * <p><b>Pourquoi (#93)</b> : auparavant chaque contrôleur ré-extrayait le JWT du cookie brut
 * ({@code @CookieValue} + {@link JwtService#extractUsername}). Une requête authentifiée par
 * {@code Authorization: Bearer} (acceptée par {@code JwtFilter}) était alors rejetée à tort en
 * 401 par ce check cookie-only. Lire l'identité via le contexte de sécurité rend la résolution
 * cohérente quel que soit le mode d'authentification, et supprime 4+ méthodes {@code resolveCaller}
 * dupliquées.
 *
 * <p><b>Hexagonal</b> : adaptateur d'infrastructure ({@code infrastructure/security}) dépendant du
 * PORT domaine {@link UserService} (jamais d'un {@code *Impl}).
 *
 * <p><b>Contrat public (STABLE — consommé par #154)</b> : {@link #currentUser()} renvoie un
 * {@code Optional<User>}.
 * <ul>
 *   <li>PRÉSENT : le {@link User} domaine correspondant au principal authentifié.</li>
 *   <li>{@link Optional#empty()} : aucune authentification exploitable dans le contexte
 *       (cas défensif — en production {@code SecurityConfig.hasAuthority("ROLE_USER")} impose
 *       déjà l'authentification en amont, donc un contrôleur n'est atteint qu'authentifié), OU
 *       le username porté par le principal ne correspond à aucun {@code User} (compte purgé /
 *       inconnu).</li>
 * </ul>
 * La méthode ne lève JAMAIS d'exception : c'est l'APPELANT qui décide du statut. Les contrôleurs
 * renvoient {@code 401 UNAUTHORIZED} sur {@code empty} (préserve BR-AUT-005 — 401 sans fuite
 * d'interne). L'ownership (403/404) reste porté par chaque contrôleur/service, inchangé.
 */
@Component
public class CallerResolver {

    private final UserService userService;

    public CallerResolver(UserService userService) {
        this.userService = userService;
    }

    /**
     * Résout le {@link User} domaine du caller authentifié courant.
     *
     * @return le {@code User} du caller, ou {@link Optional#empty()} si le contexte de sécurité
     *         ne porte pas d'authentification exploitable ou si aucun {@code User} ne correspond
     *         au username du principal. Ne lève jamais d'exception.
     */
    public Optional<User> currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        String username = authentication.getName();
        if (username == null || username.isEmpty()) {
            return Optional.empty();
        }
        // Un principal anonyme (AnonymousAuthenticationToken, getName()="anonymousUser") ou un
        // compte purgé ne matche aucun User -> Optional.empty() -> 401 côté contrôleur.
        return userService.findDomainUserByUsername(username);
    }
}
