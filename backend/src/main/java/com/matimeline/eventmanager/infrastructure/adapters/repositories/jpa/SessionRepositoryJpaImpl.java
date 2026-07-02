package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;
import org.springframework.stereotype.Repository;

import com.matimeline.eventmanager.application.mappers.SessionMapper;
import com.matimeline.eventmanager.domain.models.Session;
import com.matimeline.eventmanager.domain.ports.repositories.SessionRepository;
import com.matimeline.eventmanager.infrastructure.entities.SessionEntity;

import jakarta.persistence.EntityManager;

/**
 * Impl JPA du port {@link SessionRepository} (issue #73). Le lookup par jti
 * ({@link #findByJti}) s'appuie sur l'index UNIQUE {@code uq_sessions_jti} (V10)
 * — il est exécuté à chaque requête authentifiée par le JwtFilter.
 *
 * <p>Révocations = UPDATE bulk bindés (JPQL {@code executeUpdate}) : on ne charge
 * pas l'entité pour poser {@code revoked_at}, ce qui évite le round-trip SELECT et
 * reste atomique côté SGBD. Aucune {@code @Version} sur SessionEntity -> pas de
 * conflit optimiste sur ces updates ciblés.
 */
@Repository
public class SessionRepositoryJpaImpl
    extends SimpleJpaRepository<SessionEntity, UUID>
    implements SessionRepository {

    private final EntityManager entityManager;
    private final SessionMapper sessionMapper;

    @Autowired
    public SessionRepositoryJpaImpl(EntityManager em, SessionMapper sessionMapper) {
        super(SessionEntity.class, em);
        this.entityManager = em;
        this.sessionMapper = sessionMapper;
    }

    @Override
    public Session save(Session session) {
        // CRÉATION uniquement (id assigné applicativement). Les mutations d'état
        // (revoked_at, last_activity) passent par des UPDATE bindés dédiés ci-dessous,
        // pas par un save() qui reconstruirait une entité détachée.
        SessionEntity saved = super.save(sessionMapper.toEntity(session));
        return sessionMapper.toDomain(saved);
    }

    @Override
    public Optional<Session> findByJti(String jti) {
        List<SessionEntity> results = entityManager
            .createQuery("SELECT s FROM SessionEntity s WHERE s.jti = :jti", SessionEntity.class)
            .setParameter("jti", jti)
            .setMaxResults(1)
            .getResultList();
        return results.isEmpty()
            ? Optional.empty()
            : Optional.of(sessionMapper.toDomain(results.get(0)));
    }

    @Override
    public Optional<Session> findDomainSessionById(UUID id) {
        return super.findById(id).map(sessionMapper::toDomain);
    }

    @Override
    public List<Session> findActiveByUserId(UUID userId) {
        // Sessions actives = non révoquées ET non expirées. Triées par activité desc.
        return entityManager
            .createQuery(
                "SELECT s FROM SessionEntity s "
                + "WHERE s.userId = :userId AND s.revokedAt IS NULL AND s.expiresAt > :now "
                + "ORDER BY s.lastActivity DESC",
                SessionEntity.class)
            .setParameter("userId", userId)
            .setParameter("now", LocalDateTime.now())
            .getResultList()
            .stream()
            .map(sessionMapper::toDomain)
            .toList();
    }

    @Override
    public void revokeByJti(String jti) {
        // Idempotent : ne touche que les sessions ENCORE actives (revoked_at IS NULL).
        entityManager
            .createQuery(
                "UPDATE SessionEntity s SET s.revokedAt = :now "
                + "WHERE s.jti = :jti AND s.revokedAt IS NULL")
            .setParameter("now", LocalDateTime.now())
            .setParameter("jti", jti)
            .executeUpdate();
    }

    @Override
    public void revokeById(UUID id) {
        entityManager
            .createQuery(
                "UPDATE SessionEntity s SET s.revokedAt = :now "
                + "WHERE s.id = :id AND s.revokedAt IS NULL")
            .setParameter("now", LocalDateTime.now())
            .setParameter("id", id)
            .executeUpdate();
    }

    @Override
    public int revokeAllByUserIdExcept(UUID userId, String exceptJti) {
        // exceptJti NULL -> révocation totale du user. Sinon on épargne la session courante.
        if (exceptJti == null) {
            return entityManager
                .createQuery(
                    "UPDATE SessionEntity s SET s.revokedAt = :now "
                    + "WHERE s.userId = :userId AND s.revokedAt IS NULL")
                .setParameter("now", LocalDateTime.now())
                .setParameter("userId", userId)
                .executeUpdate();
        }
        return entityManager
            .createQuery(
                "UPDATE SessionEntity s SET s.revokedAt = :now "
                + "WHERE s.userId = :userId AND s.revokedAt IS NULL AND s.jti <> :exceptJti")
            .setParameter("now", LocalDateTime.now())
            .setParameter("userId", userId)
            .setParameter("exceptJti", exceptJti)
            .executeUpdate();
    }
}
