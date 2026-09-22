package com.matimeline.eventmanager.domain.ports.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.export.ExportJob;

/**
 * Port de persistance des jobs d'export asynchrones (#58). Impl JPA côté infrastructure
 * ({@code ExportJobRepositoryJpaImpl}). La table {@code export_jobs} porte une FK
 * {@code user_id → users(id) ON DELETE CASCADE} : la purge de compte (#78) supprime les
 * jobs automatiquement.
 */
public interface ExportJobRepository {

    /** Persiste un job (création si id null, sinon mise à jour de statut/ref/expiration). */
    ExportJob save(ExportJob job);

    /** Recherche par id, SANS filtre d'ownership (usage worker async interne). */
    Optional<ExportJob> findDomainById(UUID id);

    /**
     * Recherche SCOPÉE au propriétaire : renvoie le job seulement si {@code job.ownerId}
     * égale {@code ownerId}. Un job d'autrui renvoie {@link Optional#empty()} (le contrôleur
     * traduit en 404, anti-énumération — cf. convention 2 backend).
     */
    Optional<ExportJob> findByIdAndOwnerId(UUID id, UUID ownerId);

    /**
     * Jobs EXPIRÉS à purger (#267) : {@code expires_at IS NOT NULL AND expires_at < now}.
     * {@code expires_at} n'est renseigné qu'à la complétion (COMPLETED) — un job PENDING/RUNNING
     * ou COMPLETED non expiré ne remonte JAMAIS. Sert le scheduler de purge TTL 24h ; l'index
     * {@code idx_export_jobs_expires_at} (V14) évite le seq scan.
     */
    List<ExportJob> findExpired(LocalDateTime now);

    /** Supprime la ligne d'un job (#267), après suppression du fichier via {@code StoragePort}. */
    void deleteById(UUID id);
}
