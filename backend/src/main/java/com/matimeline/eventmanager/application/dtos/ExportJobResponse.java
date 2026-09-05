package com.matimeline.eventmanager.application.dtos;

import java.time.LocalDateTime;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.export.ExportJob;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Projection HTTP d'un job d'export asynchrone (#58). <b>CONTRAT FIGÉ</b> — source de vérité
 * pour l'alignement frontend #59 (Sprint 33).
 *
 * <p>Forme JSON :
 * <pre>
 * {
 *   "jobId": "&lt;uuid&gt;",
 *   "status": "PENDING|RUNNING|COMPLETED|FAILED",
 *   "format": "ZIP|CSV",
 *   "downloadUrl": "/api/export/download/&lt;jobId&gt;?token=&lt;jwt&gt;" | null,
 *   "expiresAt": "&lt;ISO-8601&gt;" | null
 * }
 * </pre>
 * {@code downloadUrl} et {@code expiresAt} ne sont non-null que lorsque {@code status ==
 * COMPLETED}. {@code downloadUrl} porte un token de capacité signé expirant à {@code expiresAt}
 * (24h, cf. ADR-003). Champs internes NON exposés : {@code storageRef}, {@code errorCode},
 * {@code ownerId}.
 */
@Getter
@AllArgsConstructor
public class ExportJobResponse {

    private UUID jobId;
    private String status;
    private String format;
    private String downloadUrl;
    private LocalDateTime expiresAt;

    /**
     * @param downloadUrl URL de téléchargement signée (null si le job n'est pas terminé),
     *                    construite par le contrôleur (le token vit côté infra/security).
     */
    public static ExportJobResponse fromDomain(ExportJob job, String downloadUrl) {
        return new ExportJobResponse(
                job.getId(),
                job.getStatus().name(),
                job.getFormat().name(),
                downloadUrl,
                job.getExpiresAt());
    }
}
