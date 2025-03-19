package com.example.eventmanager.infrastructure.persistence.jpa;

import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;
import org.springframework.stereotype.Repository;

import com.example.eventmanager.domain.models.User;
import com.example.eventmanager.domain.repositories.UserRepository;
import com.example.eventmanager.infrastructure.persistence.entity.UserEntity;
import com.example.eventmanager.infrastructure.persistence.mapping.UserMapper;

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
    public Optional<User> findDomainUserById(UUID id) {
        return super.findById(id).map(userMapper::toDomain);
    }

    @Override
    public User save(User domainUser) {
        UserEntity entity = userMapper.toEntity(domainUser);

        UserEntity saved = super.save(entity);

        return userMapper.toDomain(saved);
    }

}