package com.matimeline.eventmanager.application.services;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.ports.repositories.PasswordResetTokenRepository;

/**
 * Purge périodique des tokens de reset password devenus inutiles (issue #139,
 * follow-up S8 / BR-AUT-012).
 *
 * <p>Chaque forgot-password insère une ligne dans {@code password_reset_tokens}. Sans
 * purge, cette table technique grossit indéfiniment (les tokens ne sont supprimés que
 * par la CASCADE à la suppression du compte). Ce scheduler balaye périodiquement et
 * supprime les tokens :
 * <ul>
 *   <li>déjà consommés ({@code used_at IS NOT NULL}) — sans valeur, usage unique passé ;</li>
 *   <li>expirés au-delà d'une fenêtre de RÉTENTION prudente ({@code expires_at < now - retention}).</li>
 * </ul>
 *
 * <p><b>Sécurité de la borne</b> : un token VALIDE (non consommé ET non expiré) n'entre
 * dans aucune des deux conditions du DELETE — il n'est JAMAIS supprimé, quelle que soit
 * la fenêtre. La fenêtre de rétention ({@code app.password-reset.purge.retention-hours},
 * défaut <b>24h</b>) ne s'applique qu'aux tokens DÉJÀ expirés : elle repousse leur
 * suppression bien au-delà de la validité de 15 min (BR-AUT-012), marge de sûreté contre
 * toute race sur une consommation de dernière seconde. On ne supprime donc que ce qui est
 * inexploitable depuis longtemps.
 *
 * <p>Couche APPLICATION : ne dépend que du port {@link PasswordResetTokenRepository} et de
 * l'horloge injectable ({@link Clock}). Aucun accès à l'impl JPA. Réutilise
 * {@code @EnableScheduling} déjà bootstrappé en S36 ({@code SchedulingConfig}), à l'image
 * de {@link ExportPurgeScheduler} — pas de seconde activation.
 *
 * <p>Aucune migration : simple {@code DELETE}, pas de changement de schéma.
 */
@Component
public class PasswordResetTokenPurgeScheduler {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetTokenPurgeScheduler.class);

    private final PasswordResetTokenRepository tokenRepository;
    private final Clock clock;

    /** Fenêtre de rétention des tokens EXPIRÉS avant suppression (défaut 24h). */
    private final Duration retention;

    public PasswordResetTokenPurgeScheduler(
            PasswordResetTokenRepository tokenRepository,
            Clock clock,
            @Value("${app.password-reset.purge.retention-hours:24}") long retentionHours) {
        this.tokenRepository = tokenRepository;
        this.clock = clock;
        this.retention = Duration.ofHours(retentionHours);
    }

    /**
     * Balaye et purge les tokens consommés / expirés hors fenêtre. Fréquence CONFIGURABLE
     * ({@code app.password-reset.purge.interval-ms}, défaut 24h) ; premier passage différé
     * ({@code app.password-reset.purge.initial-delay-ms}, défaut 5 min) pour ne pas balayer
     * au boot. Directement invocable (tests) sans attendre le tick.
     */
    @Scheduled(fixedDelayString = "${app.password-reset.purge.interval-ms:86400000}",
            initialDelayString = "${app.password-reset.purge.initial-delay-ms:300000}")
    @Transactional
    public void purgeConsumedAndExpired() {
        LocalDateTime expiredBefore = LocalDateTime.now(clock).minus(retention);
        int purged = tokenRepository.deleteConsumedOrExpiredBefore(expiredBefore);
        if (purged > 0) {
            // Log SANS PII : uniquement un COMPTE, jamais de token/user_id/email.
            log.info("Purged {} consumed/expired password reset token(s)", purged);
        }
    }
}
