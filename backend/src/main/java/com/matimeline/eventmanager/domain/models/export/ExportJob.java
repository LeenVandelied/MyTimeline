package com.matimeline.eventmanager.domain.models.export;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Modèle métier d'un job d'export asynchrone (#58). POJO PUR (aucun framework) — l'entité
 * JPA {@code ExportJobEntity} et le mapper vivent côté infrastructure/application.
 *
 * <p>Transitions pilotées par le use case ({@code ExportServiceImpl} / {@code AsyncExportRunner}) :
 * {@link #markRunning()}, {@link #markCompleted(String, LocalDateTime)},
 * {@link #markFailed(String)}. {@code storageRef} (référence opaque {@code StoragePort}),
 * {@code completedAt} et {@code expiresAt} ne sont renseignés qu'à la complétion.
 * {@code errorCode} est un code technique borné (jamais de PII ni de stack).
 */
public class ExportJob {

    private final UUID id;
    private final UUID ownerId;
    private final ExportFormat format;
    private ExportJobStatus status;
    private String storageRef;
    private String errorCode;
    private final LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private LocalDateTime expiresAt;

    public ExportJob(UUID id, UUID ownerId, ExportFormat format, ExportJobStatus status,
                     String storageRef, String errorCode, LocalDateTime createdAt,
                     LocalDateTime completedAt, LocalDateTime expiresAt) {
        this.id = id;
        this.ownerId = ownerId;
        this.format = format;
        this.status = status;
        this.storageRef = storageRef;
        this.errorCode = errorCode;
        this.createdAt = createdAt;
        this.completedAt = completedAt;
        this.expiresAt = expiresAt;
    }

    /** Fabrique un job neuf en attente (id null : généré par la couche persistance). */
    public static ExportJob pending(UUID ownerId, ExportFormat format, LocalDateTime createdAt) {
        return new ExportJob(null, ownerId, format, ExportJobStatus.PENDING,
                null, null, createdAt, null, null);
    }

    public void markRunning() {
        this.status = ExportJobStatus.RUNNING;
    }

    public void markCompleted(String storageRef, LocalDateTime expiresAt) {
        this.status = ExportJobStatus.COMPLETED;
        this.storageRef = storageRef;
        this.completedAt = expiresAt.minusHours(24);
        this.expiresAt = expiresAt;
    }

    public void markFailed(String errorCode) {
        this.status = ExportJobStatus.FAILED;
        this.errorCode = errorCode;
    }

    /** {@code true} si le job est terminé, non expiré, et pointe un fichier stocké. */
    public boolean isDownloadable(LocalDateTime now) {
        return status == ExportJobStatus.COMPLETED
                && storageRef != null
                && expiresAt != null
                && now.isBefore(expiresAt);
    }

    public UUID getId() {
        return id;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public ExportFormat getFormat() {
        return format;
    }

    public ExportJobStatus getStatus() {
        return status;
    }

    public String getStorageRef() {
        return storageRef;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }
}
