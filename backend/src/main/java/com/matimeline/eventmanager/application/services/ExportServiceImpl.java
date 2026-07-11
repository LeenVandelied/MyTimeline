package com.matimeline.eventmanager.application.services;

import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.exceptions.ExportFormatNotSupportedException;
import com.matimeline.eventmanager.domain.models.export.ExportFormat;
import com.matimeline.eventmanager.domain.models.export.ExportJob;
import com.matimeline.eventmanager.domain.models.export.RenderedExport;
import com.matimeline.eventmanager.domain.models.export.UserDataExport;
import com.matimeline.eventmanager.domain.ports.repositories.ExportJobRepository;
import com.matimeline.eventmanager.domain.ports.services.ExportService;
import com.matimeline.eventmanager.domain.ports.services.StoragePort;

import java.time.Clock;
import java.time.LocalDateTime;

/**
 * Use case d'export RGPD (#58, port {@link ExportService}). Orchestration :
 * <ul>
 *   <li>SYNC (JSON/MD) : assemble + rend inline, retour immédiat ;</li>
 *   <li>ASYNC (ZIP/CSV) : crée un job {@code PENDING} (committé), déclenche le worker ;</li>
 *   <li>suivi + téléchargement scopés à l'ownership.</li>
 * </ul>
 * Chaque demande est JOURNALISÉE (audit minimal : userId masqué + format).
 *
 * <p><b>Transactions</b> : {@link #submitAsync} n'est PAS transactionnel — le
 * {@code save(PENDING)} du repository commit dans SA propre transaction AVANT le déclenchement
 * async, garantissant que le worker (autre thread/tx) voit bien la ligne. L'assemblage porte
 * sa propre transaction read-only ({@link UserDataExportAssembler}).
 */
@Service
public class ExportServiceImpl implements ExportService {

    private static final Logger log = LoggerFactory.getLogger(ExportServiceImpl.class);

    private final UserDataExportAssembler assembler;
    private final ExportRendererRegistry rendererRegistry;
    private final ExportJobRepository jobRepository;
    private final AsyncExportRunner asyncRunner;
    private final StoragePort storagePort;
    private final Clock clock;

    public ExportServiceImpl(UserDataExportAssembler assembler,
                             ExportRendererRegistry rendererRegistry,
                             ExportJobRepository jobRepository,
                             AsyncExportRunner asyncRunner,
                             StoragePort storagePort,
                             Clock clock) {
        this.assembler = assembler;
        this.rendererRegistry = rendererRegistry;
        this.jobRepository = jobRepository;
        this.asyncRunner = asyncRunner;
        this.storagePort = storagePort;
        this.clock = clock;
    }

    @Override
    public RenderedExport exportInline(UUID ownerId, ExportFormat format) {
        if (!format.isSync()) {
            // Format async demandé en inline (GET) -> 400.
            throw new ExportFormatNotSupportedException(format.name());
        }
        log.info("export inline demandé: user={} format={}", maskId(ownerId), format);
        UserDataExport data = assembler.assemble(ownerId);
        return rendererRegistry.render(format, data);
    }

    @Override
    public ExportJob submitAsync(UUID ownerId, ExportFormat format) {
        if (format.isSync()) {
            // Format sync soumis en async (POST) -> 400.
            throw new ExportFormatNotSupportedException(format.name());
        }
        log.info("export async soumis: user={} format={}", maskId(ownerId), format);
        // save() commit dans sa propre transaction (repository @Transactional) : la ligne
        // PENDING est durable AVANT le déclenchement du worker (pas de race inter-thread).
        ExportJob pending = jobRepository.save(ExportJob.pending(ownerId, format, LocalDateTime.now(clock)));
        asyncRunner.run(pending.getId());
        return pending;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ExportJob> getJob(UUID jobId, UUID ownerId) {
        return jobRepository.findByIdAndOwnerId(jobId, ownerId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RenderedExport> download(UUID jobId, UUID ownerId) {
        Optional<ExportJob> jobOpt = jobRepository.findByIdAndOwnerId(jobId, ownerId);
        if (jobOpt.isEmpty()) {
            return Optional.empty();
        }
        ExportJob job = jobOpt.get();
        if (!job.isDownloadable(LocalDateTime.now(clock))) {
            // Non terminé, expiré, ou sans fichier -> pas de download (404 côté contrôleur).
            return Optional.empty();
        }
        return storagePort.load(job.getStorageRef())
                .map(bytes -> new RenderedExport(
                        bytes,
                        job.getFormat().contentType(),
                        "mytimeline-export." + job.getFormat().extension()));
    }

    /** Masque l'UUID dans les logs (BR : aucune PII en clair) : préfixe court seulement. */
    private static String maskId(UUID id) {
        String s = id.toString();
        return s.substring(0, 8) + "***";
    }
}
