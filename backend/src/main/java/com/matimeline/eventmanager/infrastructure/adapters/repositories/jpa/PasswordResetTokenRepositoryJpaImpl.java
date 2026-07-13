package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import java.time.LocalDateTime;
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
        // Deux chemins distincts (le domaine ne porte pas @Version, verrou en infra) :
        //  - INSERT (forgot-password) : id inconnu en base -> persist d'une entité neuve.
        //  - UPDATE / consommation (reset-password) : id déjà présent. On charge l'entité
        //    MANAGÉE (convention #4, cp-backend) et on recopie le SEUL champ mutable
        //    (used_at). Dans la transaction de resetPassword, findByToken a déjà chargé
        //    cette entité dans le contexte de persistance : findById renvoie la MÊME
        //    instance avec la version lue au CHECK (cache L1 = lecture répétable). Le
        //    UPDATE porte donc WHERE version=<version-du-CHECK> -> anti-TOCTOU (#143).
        return super.findById(token.getId())
            .map(managed -> updateManaged(managed, token))
            .orElseGet(() -> insertNew(token));
    }

    private PasswordResetToken insertNew(PasswordResetToken token) {
        PasswordResetTokenEntity entity = mapper.toEntity(token);
        return mapper.toDomain(super.save(entity));
    }

    private PasswordResetToken updateManaged(PasswordResetTokenEntity managed, PasswordResetToken token) {
        managed.setUsedAt(token.getUsedAt());
        // saveAndFlush : force le flush ICI (dans le try/catch de resetPassword) pour que
        // l'ObjectOptimisticLockingFailureException remonte de façon SYNCHRONE et non au
        // commit (hors de portée du catch). NE PAS repasser par mapper.toEntity : une
        // entité reconstruite serait détachée (version=null) -> merge fragile (cf. #4).
        PasswordResetTokenEntity saved = super.saveAndFlush(managed);
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

    @Override
    public int deleteConsumedOrExpiredBefore(LocalDateTime expiredBefore) {
        // DELETE en masse (issue #139). Requête cible :
        //   DELETE FROM password_reset_tokens WHERE used_at IS NOT NULL OR expires_at < :cutoff
        // Un token valide (used_at nul ET expires_at futur) ne matche AUCUNE des deux
        // conditions -> jamais supprimé. Bulk delete JPQL : contourne le @Version (#143)
        // — sans intérêt sur une suppression — et ne charge pas les entités (pas de N+1).
        // Le contexte de persistance n'est pas synchronisé par ce DELETE : acceptable ici,
        // le scheduler ne lit aucun token dans la même transaction.
        String jpql = "DELETE FROM PasswordResetTokenEntity t "
                + "WHERE t.usedAt IS NOT NULL OR t.expiresAt < :cutoff";
        return entityManager.createQuery(jpql)
                .setParameter("cutoff", expiredBefore)
                .executeUpdate();
    }
}
