package com.example.eventmanager.infrastructure.persistence.jpa;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.example.eventmanager.domain.models.User;
import com.example.eventmanager.domain.repositories.UserRepository;
import com.example.eventmanager.infrastructure.persistence.entity.UserEntity;

@Repository
public interface UserRepositoryJpa extends UserRepository {
    Optional<UserEntity> findByUsername(String username);
    
    default Optional<User> findDomainUserByUsername(String username) {
      return findByUsername(username).map(UserEntity::toDomainModel);
  }

  default void saveDomainUser(User user) {
      save(UserEntity.fromDomainModel(user));
  }
}
