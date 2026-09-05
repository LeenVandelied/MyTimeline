package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.models.export.ExportJob;
import com.matimeline.eventmanager.domain.ports.repositories.ExportJobRepository;
import com.matimeline.eventmanager.infrastructure.entities.ExportJobEntity;

import jakarta.persistence.EntityManager;

/**
 * Impl JPA du port {@link ExportJobRepository} (#58). Suit le pattern maison
 * (cf. {@code ProductRepositoryJpaImpl}) : CRÉATION via {@code persist} (id null), MISE À
 * JOUR par chargement de l'entité GÉRÉE + recopie des champs mutables (transitions de
 * statut) — évite d'attacher une entité détachée reconstruite par le mapper.
 */
@Repository
public class ExportJobRepositoryJpaImpl
        extends SimpleJpaRepository<ExportJobEntity, UUID>
        implements ExportJobRepository {

    private final ExportJobMapper mapper;
    private final EntityManager entityManager;

    @Autowired
    public ExportJobRepositoryJpaImpl(EntityManager em, ExportJobMapper mapper) {
        super(ExportJobEntity.class, em);
        this.mapper = mapper;
        this.entityManager = em;
    }

    // @Transactional explicite (propagation REQUIRED) : appelé par ExportServiceImpl.submitAsync
    // qui n'est PAS transactionnel -> le PENDING commit dans SA propre transaction, durable
    // AVANT le déclenchement du worker async (évite la race inter-thread). Appelé sous une
    // transaction existante (worker @Transactional), il la rejoint normalement.
    @Override
    @Transactional
    public ExportJob save(ExportJob job) {
        if (job.getId() != null) {
            ExportJobEntity managed = super.findById(job.getId()).orElse(null);
            if (managed != null) {
                // Transitions de statut : seuls ces champs évoluent après création.
                managed.setStatus(job.getStatus().name());
                managed.setStorageRef(job.getStorageRef());
                managed.setErrorCode(job.getErrorCode());
                managed.setCompletedAt(job.getCompletedAt());
                managed.setExpiresAt(job.getExpiresAt());
                return mapper.toDomain(super.save(managed));
            }
        }
        // Création : id null -> persist géré par SimpleJpaRepository.
        ExportJobEntity entity = mapper.toEntity(job);
        return mapper.toDomain(super.save(entity));
    }

    @Override
    public Optional<ExportJob> findDomainById(UUID id) {
        return super.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<ExportJob> findByIdAndOwnerId(UUID id, UUID ownerId) {
        // Filtre d'ownership EN SQL : un job d'autrui ne remonte jamais (anti-énumération).
        return entityManager.createQuery(
                        "SELECT j FROM ExportJobEntity j WHERE j.id = :id AND j.userId = :owner",
                        ExportJobEntity.class)
                .setParameter("id", id)
                .setParameter("owner", ownerId)
                .setMaxResults(1)
                .getResultStream()
                .findFirst()
                .map(mapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExportJob> findExpired(LocalDateTime now) {
        // Balayage de purge (#267) : seuls les jobs AVEC un expires_at dépassé remontent.
        // expires_at IS NOT NULL exclut PENDING/RUNNING ; < :now exclut les COMPLETED non expirés.
        // Sert par l'index idx_export_jobs_expires_at (V14).
        return entityManager.createQuery(
                        "SELECT j FROM ExportJobEntity j "
                                + "WHERE j.expiresAt IS NOT NULL AND j.expiresAt < :now",
                        ExportJobEntity.class)
                .setParameter("now", now)
                .getResultList()
                .stream()
                .map(mapper::toDomain)
                .toList();
    }

    // deleteById(UUID) : hérité de SimpleJpaRepository (findById().ifPresent(delete) -> idempotent,
    // no-op si la ligne est déjà absente). Satisfait le port ExportJobRepository#deleteById.
}
