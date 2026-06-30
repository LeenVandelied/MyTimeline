package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;
import org.springframework.stereotype.Repository;

import com.matimeline.eventmanager.application.mappers.PasswordResetTokenMapper;
import com.matimeline.eventmanager.domain.models.PasswordResetToken;
import com.matimeline.eventmanager.domain.ports.repositories.PasswordResetTokenRepository;
import com.matimeline.eventmanager.infrastructure.entities.PasswordResetTokenEntity;

import jakarta.persistence.EntityManager;

@Repository
public class PasswordResetTokenRepositoryJpaImpl
    extends SimpleJpaRepository<PasswordResetTokenEntity, UUID>
    implements PasswordResetTokenRepository {

    private final EntityManager entityManager;
    private final PasswordResetTokenMapper mapper;

    @Autowired
    public PasswordResetTokenRepositoryJpaImpl(EntityManager em, PasswordResetTokenMapper mapper) {
        super(PasswordResetTokenEntity.class, em);
        this.entityManager = em;
        this.mapper = mapper;
    }

    @Override
    public PasswordResetToken save(PasswordResetToken token) {
        // Aligné sur UserRepositoryJpaImpl : l'id du domaine est posé en amont
        // (UUID v à la création) ; merge fait l'INSERT du nouvel enregistrement et
        // l'UPDATE lors de la consommation (used_at).
        PasswordResetTokenEntity entity = mapper.toEntity(token);
        PasswordResetTokenEntity saved = super.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<PasswordResetToken> findByToken(UUID token) {
        String jpql = "SELECT t FROM PasswordResetTokenEntity t WHERE t.token = :token";
        var results = entityManager
            .createQuery(jpql, PasswordResetTokenEntity.class)
            .setParameter("token", token)
            .getResultList();

        if (results.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(mapper.toDomain(results.get(0)));
    }
}
