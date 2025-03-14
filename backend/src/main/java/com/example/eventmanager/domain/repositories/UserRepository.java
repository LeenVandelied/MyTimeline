package com.example.eventmanager.domain.repositories;

import com.example.eventmanager.domain.models.User;

import java.util.Optional;
import java.util.UUID;


public interface UserRepository {
    Optional<User> findDomainUserByUsername(String username);
    Optional<User> findDomainUserById(UUID id);
    User save(User user);
}