package com.matimeline.eventmanager.application.services;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.exceptions.InvalidPasswordResetTokenException;
import com.matimeline.eventmanager.domain.models.PasswordResetToken;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.PasswordResetTokenRepository;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;
import com.matimeline.eventmanager.domain.ports.services.EmailService;
import com.matimeline.eventmanager.domain.ports.services.PasswordResetService;

/**
 * Implémentation du flux "mot de passe oublié" (issue #49).
 *
 * <p>Architecture hexagonale : dépend UNIQUEMENT de ports (UserRepository,
 * PasswordResetTokenRepository, EmailService) + PasswordEncoder. Aucune dépendance
 * à Brevo/HTTP (cachée derrière {@link EmailService}).
 *
 * <p>Sécurité :
 * <ul>
 *   <li>BR-AUT-005 : {@link #requestReset} ne révèle jamais l'existence du compte
 *       (pas d'exception, pas de retour) — le contrôleur répond toujours 200.</li>
 *   <li>BR-AUT-002 : {@link #resetPassword} ré-encode via le même PasswordEncoder.</li>
 *   <li>Aucun token / mot de passe loggé.</li>
 * </ul>
 */
@Service
public class PasswordResetServiceImpl implements PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetServiceImpl.class);

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    /**
     * Durée de validité du token. Cadrage S8 : 15 min (override dev volontaire vs 2h).
     * Externalisée pour ajustement par profil sans recompiler.
     */
    private final Duration tokenValidity;

    public PasswordResetServiceImpl(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            EmailService emailService,
            PasswordEncoder passwordEncoder,
            Clock clock,
            @Value("${app.password-reset.token-validity-minutes:15}") long tokenValidityMinutes) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
        this.tokenValidity = Duration.ofMinutes(tokenValidityMinutes);
    }

    @Override
    @Transactional
    public void requestReset(String email) {
        Optional<User> maybeUser = userRepository.findDomainUserByEmail(email);
        if (maybeUser.isEmpty()) {
            // BR-AUT-005 : email inconnu -> aucune action, aucun signal. Le contrôleur
            // répondra 200 comme pour un email existant (anti-énumération).
            return;
        }

        User user = maybeUser.get();
        LocalDateTime now = LocalDateTime.now(clock);
        UUID tokenValue = UUID.randomUUID();

        PasswordResetToken token = new PasswordResetToken(
                UUID.randomUUID(),
                user.getId(),
                tokenValue,
                now.plus(tokenValidity),
                null);
        tokenRepository.save(token);

        // L'envoi email passe par le port (adapter Brevo en infra). Le token brut est
        // transmis au mail mais JAMAIS loggé ici.
        emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), tokenValue.toString());
    }

    @Override
    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        UUID tokenValue = parseToken(rawToken);

        PasswordResetToken token = tokenRepository.findByToken(tokenValue)
                .orElseThrow(InvalidPasswordResetTokenException::new);

        // Expiré (>15 min) OU déjà consommé -> 400. Message générique (anti-énumération).
        if (!token.isUsable(LocalDateTime.now(clock))) {
            throw new InvalidPasswordResetTokenException();
        }

        User user = userRepository.findDomainUserById(token.getUserId())
                // Cas limite : compte supprimé entre génération et reset. On refuse
                // sans révéler la cause (même 400 générique).
                .orElseThrow(InvalidPasswordResetTokenException::new);

        // BR-AUT-002 : ré-encodage BCrypt via le même PasswordEncoder que register.
        String newHash = passwordEncoder.encode(newPassword);
        User updated = new User(
                user.getId(),
                user.getName(),
                user.getUsername(),
                newHash,
                user.getRole(),
                user.getEmail());
        userRepository.save(updated);

        // Usage unique : marquer consommé APRÈS la mise à jour réussie du mot de passe.
        tokenRepository.save(token.consume(LocalDateTime.now(clock)));
    }

    private UUID parseToken(String rawToken) {
        if (rawToken == null) {
            throw new InvalidPasswordResetTokenException();
        }
        try {
            return UUID.fromString(rawToken);
        } catch (IllegalArgumentException ex) {
            // Token non-UUID = forcément invalide ; pas de lookup, 400 générique.
            throw new InvalidPasswordResetTokenException();
        }
    }
}
