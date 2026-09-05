package com.matimeline.eventmanager.application.services;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.models.export.ExportJob;
import com.matimeline.eventmanager.domain.models.export.RenderedExport;
import com.matimeline.eventmanager.domain.models.export.UserDataExport;
import com.matimeline.eventmanager.domain.ports.repositories.ExportJobRepository;
import com.matimeline.eventmanager.domain.ports.services.StoragePort;

/**
 * Worker asynchrone d'export (#58, ADR-003). Exécuté sur l'executor dédié
 * {@code exportExecutor} ({@code AsyncConfig}). Reprend le job {@code PENDING} (committé par
 * le use case avant l'appel), le passe {@code RUNNING}, génère + stocke le fichier, puis
 * {@code COMPLETED} (+ ref + expiration 24h) ou {@code FAILED} (code borné, jamais de PII).
 *
 * <p>Bean SÉPARÉ de {@code ExportServiceImpl} : {@code @Async} n'agit que sur un appel
 * inter-bean (via proxy), jamais en self-invocation.
 */
@Component
public class AsyncExportRunner {

    private static final Logger log = LoggerFactory.getLogger(AsyncExportRunner.class);

    /** Durée de vie du fichier téléchargeable (ADR-003). */
    public static final int DOWNLOAD_TTL_HOURS = 24;

    private final ExportJobRepository jobRepository;
    private final UserDataExportAssembler assembler;
    private final ExportRendererRegistry rendererRegistry;
    private final StoragePort storagePort;
    private final Clock clock;

    public AsyncExportRunner(ExportJobRepository jobRepository,
                             UserDataExportAssembler assembler,
                             ExportRendererRegistry rendererRegistry,
                             @Qualifier("exportStorage") StoragePort storagePort,
                             Clock clock) {
        this.jobRepository = jobRepository;
        this.assembler = assembler;
        this.rendererRegistry = rendererRegistry;
        this.storagePort = storagePort;
        this.clock = clock;
    }

    /**
     * Génère le fichier du job {@code jobId} en tâche de fond. Ne propage aucune exception
     * (thread async) : tout échec est capturé et matérialisé en statut {@code FAILED}.
     */
    @Async("exportExecutor")
    @Transactional
    public void run(UUID jobId) {
        ExportJob job = jobRepository.findDomainById(jobId).orElse(null);
        if (job == null) {
            log.warn("export job introuvable, abandon: job={}", jobId);
            return;
        }
        job.markRunning();
        jobRepository.save(job);

        try {
            UserDataExport data = assembler.assemble(job.getOwnerId());
            RenderedExport rendered = rendererRegistry.render(job.getFormat(), data);
            String storageRef = storagePort.store(rendered.content(), job.getFormat().extension());

            LocalDateTime now = LocalDateTime.now(clock);
            LocalDateTime expiresAt = now.plusHours(DOWNLOAD_TTL_HOURS);
            job.markCompleted(storageRef, now, expiresAt);
            jobRepository.save(job);
            log.info("export job terminé: job={} format={}", jobId, job.getFormat());
        } catch (RuntimeException e) {
            // Code d'erreur BORNÉ (jamais le message/stack : évite toute fuite PII/interne).
            job.markFailed("GENERATION_ERROR");
            jobRepository.save(job);
            log.error("export job échoué: job={} cause={}", jobId, e.getClass().getSimpleName());
        }
    }
}
