package com.matimeline.eventmanager.application.services;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.models.export.ExportJob;
import com.matimeline.eventmanager.domain.ports.repositories.ExportJobRepository;
import com.matimeline.eventmanager.domain.ports.services.StoragePort;

/**
 * Purge périodique des exports RGPD expirés (issue #267, dette ADR-003 §3).
 *
 * <p>Les exports asynchrones (#58) déposent un fichier sur disque assorti d'une URL valable 24h
 * ({@code ExportJob.expiresAt}). Sans purge, fichiers et lignes {@code export_jobs} s'accumulent
 * indéfiniment (coût disque + rétention de données perso au-delà de leur utilité = mauvais RGPD).
 * Ce scheduler balaye les jobs expirés et, pour chacun, supprime d'ABORD le fichier
 * (via {@link StoragePort#delete}, idempotent) PUIS la ligne : si l'ordre était inversé et le
 * process crashait entre les deux, le fichier deviendrait orphelin sans trace en base.
 *
 * <p>Couche APPLICATION : ne dépend que des ports du domaine ({@link ExportJobRepository},
 * {@link StoragePort} qualifié {@code exportStorage}) et de l'horloge injectable ({@link Clock}).
 * Aucun accès à l'impl JPA ni à {@code LocalStorageAdapter}.
 *
 * <p>Robustesse : un échec sur un job (I/O, DB) est isolé (try/catch par job) et n'empêche pas
 * le traitement des suivants — le job échoué sera retenté au tick suivant. Log SANS PII :
 * on ne journalise qu'un COMPTE, jamais email/user_id/storage_ref/jobId.
 */
@Component
public class ExportPurgeScheduler {

    private static final Logger log = LoggerFactory.getLogger(ExportPurgeScheduler.class);

    private final ExportJobRepository exportJobRepository;
    private final StoragePort exportStorage;
    private final Clock clock;

    public ExportPurgeScheduler(ExportJobRepository exportJobRepository,
                                @Qualifier("exportStorage") StoragePort exportStorage,
                                Clock clock) {
        this.exportJobRepository = exportJobRepository;
        this.exportStorage = exportStorage;
        this.clock = clock;
    }

    /**
     * Balaye et purge les jobs expirés. Fréquence CONFIGURABLE
     * ({@code app.export.purge.interval-ms}, défaut 1h) ; premier passage différé
     * ({@code app.export.purge.initial-delay-ms}, défaut 5 min) pour ne pas balayer au boot.
     * Directement invocable (tests) sans attendre le tick.
     */
    @Scheduled(fixedDelayString = "${app.export.purge.interval-ms:3600000}",
            initialDelayString = "${app.export.purge.initial-delay-ms:300000}")
    @Transactional
    public void purgeExpired() {
        LocalDateTime now = LocalDateTime.now(clock);
        List<ExportJob> expired = exportJobRepository.findExpired(now);
        int purged = 0;
        for (ExportJob job : expired) {
            try {
                String storageRef = job.getStorageRef();
                if (storageRef != null) {
                    // Fichier d'abord (idempotent : réf absente = no-op), ligne ensuite.
                    exportStorage.delete(storageRef);
                }
                exportJobRepository.deleteById(job.getId());
                purged++;
            } catch (RuntimeException ex) {
                // Log SANS PII (type d'exception uniquement) ; le job sera retenté au prochain tick.
                log.warn("Skipping one expired export job during purge ({}), will retry next run",
                        ex.getClass().getSimpleName());
            }
        }
        if (purged > 0) {
            log.info("Purged {} expired export job(s)", purged);
        }
    }
}
