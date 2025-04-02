package com.matimeline.eventmanager.domain.ports.repositories;

import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.User;


public interface UserRepository {
    Optional<User> findDomainUserByUsername(String username);
    Optional<User> findDomainUserById(UUID id);
    User save(User user);
}