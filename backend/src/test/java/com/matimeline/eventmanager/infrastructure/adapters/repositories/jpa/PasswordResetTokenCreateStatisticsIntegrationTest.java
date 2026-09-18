package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;

import jakarta.persistence.EntityManagerFactory;

import com.matimeline.eventmanager.domain.models.PasswordResetToken;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.PasswordResetTokenRepository;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * Preuve d'absence de SELECT superflu sur le chemin CREATE (issue #286).
 *
 * <p>Avant #286, {@code save()} sondait systématiquement {@code findById} avant toute
 * écriture, y compris pour un token NEUF (forgot-password) : un aller-retour DB inutile.
 * Le port scinde désormais {@code create()} (pur INSERT) et {@code markConsumed()} (verrou
 * #143). Ce test verrouille le contrat côté INSERT via les statistiques Hibernate :
 * {@code create()} ne charge AUCUNE entité (findById supprimé) et n'émet qu'un seul INSERT.
 *
 * <p>Le verrou anti-TOCTOU du chemin consume (#143 / PAT-S37-001) reste couvert, inchangé,
 * par {@code PasswordResetTokenConcurrencyIntegrationTest}.
 */
@SpringBootTest
class PasswordResetTokenCreateStatisticsIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionTemplate txTemplate;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Test
    void create_issuesInsertOnly_noSuperfluousSelect() {
        // Owner committé (le token porte user_id NOT NULL). id=null en création : UserEntity
        // porte @GeneratedValue -> l'UUID est assigné par Hibernate ; on relit l'id réel.
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        UUID ownerId = txTemplate.execute(status -> userRepository.save(new User(
                null,
                "Bob " + suffix,
                "u" + suffix,
                "$2a$10$abcdefghijklmnopqrstuv",
                "ROLE_USER",
                suffix + "@example.com")).getId());

        // On mesure UNIQUEMENT le chemin create : statistiques réinitialisées après le seed.
        Statistics stats = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        stats.setStatisticsEnabled(true);
        stats.clear();

        txTemplate.executeWithoutResult(status -> tokenRepository.create(new PasswordResetToken(
                UUID.randomUUID(),
                ownerId,
                UUID.randomUUID(),
                LocalDateTime.now().plusHours(1),
                null)));

        // #286 : plus de findById -> aucun chargement/SELECT d'entité sur le chemin create.
        assertThat(stats.getEntityLoadCount())
                .as("chemin create : aucun chargement d'entité (findById supprimé, #286)")
                .isZero();
        // Écriture unique : l'INSERT du token neuf, rien d'autre.
        assertThat(stats.getEntityInsertCount())
                .as("chemin create : exactement un INSERT")
                .isEqualTo(1L);
    }
}
