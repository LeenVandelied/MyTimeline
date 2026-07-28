package com.matimeline.eventmanager.application.services;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.matimeline.eventmanager.domain.models.export.ExportFormat;
import com.matimeline.eventmanager.domain.models.export.ExportJob;
import com.matimeline.eventmanager.domain.models.export.ExportJobStatus;
import com.matimeline.eventmanager.domain.ports.repositories.ExportJobRepository;
import com.matimeline.eventmanager.domain.ports.services.StoragePort;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

/**
 * #267 — purge TTL des exports RGPD expirés. Parcourt la VRAIE chaîne Postgres (Testcontainers,
 * migrations V1..V14 incl. l'index de purge) + stockage local réel ({@code exportStorage}).
 *
 * <p>Couvre :
 * <ul>
 *   <li>job COMPLETED expiré -> fichier supprimé (exportStorage) + ligne purgée ;</li>
 *   <li>job COMPLETED NON expiré -> intact (fichier ET ligne conservés) ;</li>
 *   <li>idempotence : fichier déjà absent -> purge no-op (ligne purgée, aucune exception).</li>
 * </ul>
 *
 * <p>Le tick {@code @Scheduled} est neutralisé pendant le test (initial-delay très long) : on
 * invoque {@link ExportPurgeScheduler#purgeExpired()} directement pour un contrôle déterministe.
 */
@SpringBootTest(properties = {
        // Empêche le tick automatique d'interférer avec les assertions (on appelle purgeExpired() nous-mêmes).
        "app.export.purge.initial-delay-ms=3600000",
        "app.export.purge.interval-ms=3600000"
})
class ExportPurgeSchedulerIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private ExportPurgeScheduler scheduler;

    @Autowired
    private ExportJobRepository exportJobRepository;

    @Autowired
    @Qualifier("exportStorage")
    private StoragePort exportStorage;

    @Autowired
    private EntityManager em;

    @Autowired
    private PlatformTransactionManager txManager;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** Crée un utilisateur (FK export_jobs.user_id -> users) et renvoie son id. */
    private UUID seedUser() {
        String username = "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        return new TransactionTemplate(txManager).execute(status -> {
            UserEntity user = new UserEntity();
            user.setName("PurgeTest");
            user.setUsername(username);
            user.setEmail(username + "@example.test");
            user.setPassword(passwordEncoder.encode("secret6"));
            user.setRole("ROLE_USER");
            em.persist(user);
            em.flush();
            return user.getId();
        });
    }

    /** Persiste un job COMPLETED pointant {@code storageRef}, expirant à {@code expiresAt}. */
    private UUID seedCompletedJob(UUID ownerId, String storageRef, LocalDateTime expiresAt) {
        LocalDateTime createdAt = expiresAt.minusHours(24);
        ExportJob job = new ExportJob(null, ownerId, ExportFormat.ZIP, ExportJobStatus.COMPLETED,
                storageRef, null, createdAt, createdAt, expiresAt);
        return exportJobRepository.save(job).getId();
    }

    @Test
    void expiredCompletedJob_fileAndRowPurged() {
        UUID ownerId = seedUser();
        String ref = exportStorage.store("expired-dump".getBytes(StandardCharsets.UTF_8), "zip");
        UUID jobId = seedCompletedJob(ownerId, ref, LocalDateTime.now().minusHours(1));

        assertTrue(exportStorage.load(ref).isPresent(), "précondition : fichier présent avant purge");
        assertTrue(exportJobRepository.findDomainById(jobId).isPresent(), "précondition : ligne présente");

        scheduler.purgeExpired();

        assertTrue(exportStorage.load(ref).isEmpty(), "fichier supprimé via exportStorage");
        assertTrue(exportJobRepository.findDomainById(jobId).isEmpty(), "ligne export_jobs purgée");
    }

    @Test
    void nonExpiredCompletedJob_leftIntact() {
        UUID ownerId = seedUser();
        String ref = exportStorage.store("fresh-dump".getBytes(StandardCharsets.UTF_8), "zip");
        UUID jobId = seedCompletedJob(ownerId, ref, LocalDateTime.now().plusHours(2));

        scheduler.purgeExpired();

        assertTrue(exportStorage.load(ref).isPresent(), "fichier non expiré conservé");
        assertTrue(exportJobRepository.findDomainById(jobId).isPresent(), "ligne non expirée conservée");
    }

    @Test
    void expiredJob_fileAlreadyAbsent_idempotentNoOp() {
        UUID ownerId = seedUser();
        // Réf plausible mais aucun fichier associé (jamais stocké) : delete = no-op.
        String danglingRef = "export-" + UUID.randomUUID() + ".zip";
        UUID jobId = seedCompletedJob(ownerId, danglingRef, LocalDateTime.now().minusHours(1));

        assertTrue(exportStorage.load(danglingRef).isEmpty(), "précondition : fichier absent");

        assertDoesNotThrow(scheduler::purgeExpired, "purge idempotente sur fichier absent");

        assertFalse(exportJobRepository.findDomainById(jobId).isPresent(),
                "ligne purgée malgré fichier déjà absent");
    }
}
