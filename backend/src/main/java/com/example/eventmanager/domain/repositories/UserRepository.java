package com.example.eventmanager.domain.repositories;

import com.example.eventmanager.domain.models.User;
import com.example.eventmanager.infrastructure.persistence.entity.UserEntity;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByUsername(String username);

    default User save(User user) {
        UserEntity entity = UserEntity.fromDomainModel(user);
        UserEntity savedEntity = save(entity);
        return savedEntity.toDomainModel(); 
    }
    
    default Optional<User> findDomainUserByUsername(String username) {
        return findByUsername(username).map(UserEntity::toDomainModel);
    }

}