package com.matimeline.eventmanager.domain.models.export;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;

/**
 * Tests unitaires du modèle domaine {@link ExportJob} (#58). Verrouille en particulier le fait
 * que {@code completedAt} est la valeur passée explicitement (et NON dérivée du TTL via
 * {@code expiresAt - 24h}) : le domaine ne doit pas connaître la durée du TTL applicatif.
 */
class ExportJobTest {

    @Test
    void markCompleted_setsCompletedAtToProvidedValue_notDerivedFromTtl() {
        ExportJob job = ExportJob.pending(UUID.randomUUID(), ExportFormat.CSV,
                LocalDateTime.of(2026, 7, 11, 10, 0));
        LocalDateTime completedAt = LocalDateTime.of(2026, 7, 11, 10, 5);
        // expiresAt délibérément NON égal à completedAt + 24h : prouve l'absence de dérivation.
        LocalDateTime expiresAt = LocalDateTime.of(2026, 7, 13, 8, 0);

        job.markCompleted("storage-ref-42", completedAt, expiresAt);

        assertEquals(ExportJobStatus.COMPLETED, job.getStatus());
        assertEquals("storage-ref-42", job.getStorageRef());
        assertEquals(completedAt, job.getCompletedAt(),
                "completedAt doit être la valeur passée, pas expiresAt.minusHours(24)");
        assertEquals(expiresAt, job.getExpiresAt());
    }
}
