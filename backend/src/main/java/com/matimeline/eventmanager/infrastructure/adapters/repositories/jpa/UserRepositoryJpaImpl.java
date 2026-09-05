package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;
import org.springframework.stereotype.Repository;

import com.matimeline.eventmanager.application.mappers.UserMapper;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;

import jakarta.persistence.EntityManager;

@Repository
public class UserRepositoryJpaImpl
    extends SimpleJpaRepository<UserEntity, UUID>
    implements UserRepository {

    private final EntityManager entityManager;
    private final UserMapper userMapper;

    @Autowired
    public UserRepositoryJpaImpl(EntityManager em, UserMapper userMapper) {
        super(UserEntity.class, em);
        this.entityManager = em;
        this.userMapper = userMapper;
    }

    @Override
    public Optional<User> findDomainUserByUsername(String username) {
        String jpql = "SELECT u FROM UserEntity u WHERE u.username = :uname";
        var results = entityManager
            .createQuery(jpql, UserEntity.class)
            .setParameter("uname", username)
            .getResultList();

        if (results.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(userMapper.toDomain(results.get(0)));
    }

    @Override
    public Optional<User> findDomainUserByEmail(String email) {
        // BR-AUT-001 : email porte une contrainte unique DB (uq_users_email, V2),
        // donc au plus un résultat. On garde getResultList()+premier élément (comme
        // findDomainUserByUsername) plutôt que getSingleResult() pour ne pas lever
        // sur 0 résultat (cas nominal de forgot-password avec email inconnu).
        String jpql = "SELECT u FROM UserEntity u WHERE u.email = :email";
        var results = entityManager
            .createQuery(jpql, UserEntity.class)
            .setParameter("email", email)
            .getResultList();

        if (results.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(userMapper.toDomain(results.get(0)));
    }

    @Override
    public Optional<User> findDomainUserById(UUID id) {
        return super.findById(id).map(userMapper::toDomain);
    }

    // PIT-S10-003 (aligné sur Product/EventRepositoryJpaImpl.save) : UserEntity porte
    // @Version + @GeneratedValue(AUTO). Reconstruire une UserEntity via le mapper produit
    // une entité DÉTACHÉE (version=null). SimpleJpaRepository.save la classe via isNew
    // (version==null -> true) et la route vers persist() ; or persist() sur un id DÉJÀ
    // assigné (le domaine génère l'UUID en amont, ex. register -> new User(UUID.randomUUID(),
    // ...)) fait lever Hibernate : "Detached entity with generated id ... has an
    // uninitialized version value 'null'". On distingue donc création et mise à jour.
    @Override
    public User save(User domainUser) {
        // MISE À JOUR : id déjà présent EN BASE (updateUser / changePassword). On recopie les
        // champs mutables sur l'entité GÉRÉE ; l'id, @Version et les timestamps d'audit
        // restent pilotés par Hibernate (pas de persist d'une entité détachée).
        if (domainUser.getId() != null) {
            UserEntity managed = super.findById(domainUser.getId()).orElse(null);
            if (managed != null) {
                copyMutableFields(domainUser, managed);
                return userMapper.toDomain(super.save(managed));
            }
        }

        // CRÉATION : entité NEUVE. On force id=null pour laisser @GeneratedValue assigner
        // l'UUID et @Version s'initialiser via persist (pattern SAIN des seeds de test).
        // L'id fourni par le domaine en création n'est pas réutilisé par l'appelant (register
        // renvoie un message et relit l'utilisateur par username au login).
        UserEntity entity = userMapper.toEntity(domainUser);
        entity.setId(null);
        return userMapper.toDomain(super.save(entity));
    }

    private void copyMutableFields(User source, UserEntity target) {
        target.setName(source.getName());
        target.setUsername(source.getUsername());
        target.setPassword(source.getPassword());
        target.setRole(source.getRole());
        target.setEmail(source.getEmail());
        target.setAvatar(source.getAvatar());
    }

    // #78 (RGPD) : suppression physique du compte. Natif bindé pour éviter le
    // select+delete de SimpleJpaRepository.deleteById (pas de @SQLRestriction sur users,
    // mais on reste cohérent avec les purges enfants). Les FK ON DELETE CASCADE
    // (sessions V10, password_reset_tokens V6) sont purgées par Postgres ; les FK
    // non-cascade (products/events/categories) DOIVENT déjà être vidées par le service.
    @Override
    public void deleteById(UUID userId) {
        entityManager
                .createNativeQuery("DELETE FROM users WHERE id = :uid")
                .setParameter("uid", userId)
                .executeUpdate();
    }

}