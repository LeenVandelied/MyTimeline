package com.example.eventmanager.infrastructure.persistence.jpa;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.eventmanager.domain.models.User;
import com.example.eventmanager.domain.repositories.UserRepository;
import com.example.eventmanager.infrastructure.persistence.entity.UserEntity;

@Repository
public interface UserRepositoryJpa extends JpaRepository<UserEntity, UUID>, UserRepository {

    Optional<UserEntity> findByUsername(String username);

    @Override
    default Optional<User> findDomainUserByUsername(String username) {
        return findByUsername(username).map(UserEntity::toDomainModel);
    }

    @Override
    default Optional<User> findDomainUserById(UUID id) {
      return findById(id).map(UserEntity::toDomainModel);
    }

    @Override
    default User save(User user) {
        UserEntity entity = UserEntity.fromDomainModel(user);
        return save(entity).toDomainModel();
    }
}