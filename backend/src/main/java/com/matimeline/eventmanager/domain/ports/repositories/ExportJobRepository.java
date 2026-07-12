package com.matimeline.eventmanager.domain.ports.repositories;

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
}
