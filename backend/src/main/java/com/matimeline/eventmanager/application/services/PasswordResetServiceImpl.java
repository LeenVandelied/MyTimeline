package com.matimeline.eventmanager.application.services;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.OptimisticLockException;

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
 *   <li>BR-AUT-012 : {@link #requestReset} ne révèle jamais l'existence du compte
 *       (pas d'exception, pas de retour) — le contrôleur répond toujours 200.
 *       De plus {@code requestReset} est {@code @Async} : lookup + INSERT + envoi
 *       Brevo s'exécutent hors du thread de requête, donc le 200 est rendu en temps
 *       quasi constant que l'email existe ou non (pas de side-channel de timing).</li>
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

    /**
     * BR-AUT-012 (anti-énumération par timing) : exécution {@code @Async} sur
     * l'executor {@code passwordResetExecutor}. Le contrôleur appelle cette méthode
     * via le proxy Spring, qui rend la main IMMÉDIATEMENT (le 200 ne dépend ni du
     * lookup, ni de l'INSERT, ni de la latence réseau Brevo). Email connu et inconnu
     * sont indistinguables côté client (même 200, même ordre de grandeur de latence).
     *
     * <p>Garde-fou side-channel : la tâche async ne propage AUCUNE exception au thread
     * de requête (elle est déjà découplée, mais on catch+log explicitement — sans PII
     * ni token — pour éviter une stacktrace bruyante côté handler async par défaut).
     *
     * <p>Note : appelé directement (sans proxy) en test unitaire, le corps s'exécute
     * de façon synchrone — les assertions sur {@code save}/{@code sendPasswordResetEmail}
     * restent valides ; l'aspect async est une préoccupation d'infrastructure.
     *
     * <p>#142 : {@code locale} est relayée telle quelle au port {@link EmailService}.
     * Aucune validation ici — la résolution (et le repli sur {@code fr}) appartient à
     * l'adapter, qui connaît le catalogue de templates. Aucune valeur ne peut faire
     * échouer ce chemin.
     */
    @Override
    @Async("passwordResetExecutor")
    @Transactional
    public void requestReset(String email, String locale) {
        try {
            Optional<User> maybeUser = userRepository.findDomainUserByEmail(email);
            if (maybeUser.isEmpty()) {
                // BR-AUT-012 : email inconnu -> aucune action, aucun signal. Le contrôleur
                // répond 200 comme pour un email existant (anti-énumération).
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
            // Chemin CREATE : token neuf -> pur INSERT (issue #286, aucun SELECT préalable).
            tokenRepository.create(token);

            // L'envoi email passe par le port (adapter Brevo en infra). Le token brut est
            // transmis au mail mais JAMAIS loggé ici.
            emailService.sendPasswordResetEmail(
                    user.getEmail(), user.getName(), tokenValue.toString(), locale);
        } catch (RuntimeException ex) {
            // Tâche async : ne JAMAIS laisser remonter (côté requête c'est déjà découplé,
            // mais on neutralise tout bruit). Log SANS email/token/PII (anti side-channel).
            log.error("Échec du traitement asynchrone de forgot-password : {}", ex.getClass().getSimpleName());
        }
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
                user.getEmail(),
                user.getAvatar());
        userRepository.save(updated);

        // Usage unique : marquer consommé APRÈS la mise à jour réussie du mot de passe.
        // Anti-TOCTOU (#143) : le verrou optimiste @Version (V15) sur le token porte le
        // UPDATE en WHERE version=<version-lue-au-CHECK>. Si une requête concurrente a
        // consommé ce même token entre findByToken et ici, le flush n'affecte aucune ligne
        // -> ObjectOptimisticLockingFailureException. On la convertit en 400 générique
        // (anti-énumération, aucune info exploitable) ; la transaction rollback annule
        // le changement de mot de passe de la requête perdante (atomicité).
        //
        // ⚠ ROBUSTESSE — pourquoi ce try/catch autour du SEUL save suffit : l'impl JPA
        // (PasswordResetTokenRepositoryJpaImpl.save) fait un saveAndFlush, donc le flush
        // JPA — et donc la détection du conflit optimiste — se produit de façon SYNCHRONE
        // ICI, dans le try. C'est le SEUL point de flush garanti avant la fin de méthode :
        // sans ce flush explicite, Hibernate reporterait l'UPDATE au commit de la
        // transaction (@Transactional), HORS de ce try/catch, et l'exception échapperait au
        // handler (elle remonterait en 500 au lieu du 400 générique). Ne pas remplacer
        // saveAndFlush par un simple persist/merge sans flush sous peine de casser ce
        // contrat. Chemin couvert par PasswordResetTokenConcurrencyIntegrationTest (#143).
        try {
            // Chemin CONSUME : entité managée + saveAndFlush -> WHERE version=<CHECK> (#143).
            tokenRepository.markConsumed(token.consume(LocalDateTime.now(clock)));
        } catch (ObjectOptimisticLockingFailureException | OptimisticLockException ex) {
            throw new InvalidPasswordResetTokenException();
        }
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
