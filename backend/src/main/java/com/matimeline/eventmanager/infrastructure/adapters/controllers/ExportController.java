package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import java.time.Clock;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.matimeline.eventmanager.application.dtos.ExportJobResponse;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.models.export.ExportFormat;
import com.matimeline.eventmanager.domain.models.export.ExportJob;
import com.matimeline.eventmanager.domain.models.export.ExportJobStatus;
import com.matimeline.eventmanager.domain.models.export.RenderedExport;
import com.matimeline.eventmanager.domain.ports.services.ExportService;
import com.matimeline.eventmanager.infrastructure.security.CallerResolver;
import com.matimeline.eventmanager.infrastructure.security.ExportTokenService;
import com.matimeline.eventmanager.infrastructure.security.ExportTokenService.ExportDownloadToken;

/**
 * Export RGPD des données utilisateur (#58, ADR-003). Endpoints protégés par {@code JwtFilter}
 * ({@code /api/export/**} = ROLE_USER) ; l'identité est TOUJOURS dérivée du JWT via
 * {@link CallerResolver}, jamais d'un paramètre. Ownership strict : un user n'accède qu'à ses
 * propres données / jobs / fichiers (job d'autrui -> 404, anti-énumération).
 *
 * <ul>
 *   <li>{@code GET  /api/export?format=json|markdown} : export inline (200).</li>
 *   <li>{@code POST /api/export?format=zip|csv} : soumet un job async (202, {@code jobId}).</li>
 *   <li>{@code GET  /api/export/job/{jobId}} : statut + (si terminé) URL signée 24h.</li>
 *   <li>{@code GET  /api/export/download/{jobId}?token=…} : téléchargement du fichier.</li>
 * </ul>
 * Hexagonal : dépend du PORT {@link ExportService}. Le token de download (capacité 24h) est
 * signé côté infra/security ({@link ExportTokenService}).
 */
@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final ExportService exportService;
    private final CallerResolver callerResolver;
    private final ExportTokenService exportTokenService;
    private final Clock clock;

    public ExportController(ExportService exportService,
                            CallerResolver callerResolver,
                            ExportTokenService exportTokenService,
                            Clock clock) {
        this.exportService = exportService;
        this.callerResolver = callerResolver;
        this.exportTokenService = exportTokenService;
        this.clock = clock;
    }

    /** Export SYNCHRONE inline (JSON/Markdown). Un format async -> 400 (via le handler). */
    @GetMapping
    public ResponseEntity<?> exportInline(@RequestParam("format") String format) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        ExportFormat exportFormat = ExportFormat.fromParam(format);
        RenderedExport rendered = exportService.exportInline(callerOpt.get().getId(), exportFormat);
        return fileResponse(rendered);
    }

    /** Soumet un job d'export ASYNCHRONE (ZIP/CSV). Un format sync -> 400 (via le handler). */
    @PostMapping
    public ResponseEntity<?> submitAsync(@RequestParam("format") String format) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User caller = callerOpt.get();
        ExportFormat exportFormat = ExportFormat.fromParam(format);
        ExportJob job = exportService.submitAsync(caller.getId(), exportFormat);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ExportJobResponse.fromDomain(job, buildDownloadUrl(job, caller.getId())));
    }

    /** Statut d'un job (scopé au propriétaire). Job inconnu/d'autrui -> 404. */
    @GetMapping("/job/{jobId}")
    public ResponseEntity<?> jobStatus(@PathVariable UUID jobId) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User caller = callerOpt.get();
        return exportService.getJob(jobId, caller.getId())
                .<ResponseEntity<?>>map(job -> ResponseEntity.ok(
                        ExportJobResponse.fromDomain(job, buildDownloadUrl(job, caller.getId()))))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    /**
     * Téléchargement du fichier d'un job terminé. Vérification triple (défense en profondeur) :
     * auth (JwtFilter) + token signé valide (signature + expiration 24h) + ownership 3-way
     * ({@code caller == token.uid == job.owner}). Tout écart -> 404.
     */
    @GetMapping("/download/{jobId}")
    public ResponseEntity<?> download(@PathVariable UUID jobId,
                                      @RequestParam("token") String token) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UUID callerId = callerOpt.get().getId();

        Optional<ExportDownloadToken> claims = exportTokenService.verify(token);
        if (claims.isEmpty()
                || !claims.get().jobId().equals(jobId)
                || !claims.get().ownerId().equals(callerId)) {
            // Token invalide/expiré/altéré, ou ne correspond pas au job/caller -> 404.
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        return exportService.download(jobId, callerId)
                .<ResponseEntity<?>>map(this::fileResponse)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    /** Réponse fichier : type MIME + pièce jointe nommée. */
    private ResponseEntity<?> fileResponse(RenderedExport rendered) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(rendered.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + rendered.filename() + "\"")
                .body(rendered.content());
    }

    /**
     * Construit l'URL de download signée (token de capacité 24h) si le job est terminé,
     * sinon {@code null}. Le token lie jobId + ownerId et expire à {@code job.expiresAt}.
     */
    private String buildDownloadUrl(ExportJob job, UUID ownerId) {
        if (job.getStatus() != ExportJobStatus.COMPLETED || job.getExpiresAt() == null) {
            return null;
        }
        Date expiration = Date.from(job.getExpiresAt().atZone(clock.getZone()).toInstant());
        String token = exportTokenService.sign(job.getId(), ownerId, expiration);
        return "/api/export/download/" + job.getId() + "?token=" + token;
    }
}
