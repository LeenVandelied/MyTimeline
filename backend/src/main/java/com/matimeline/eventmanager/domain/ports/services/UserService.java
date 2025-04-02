package com.matimeline.eventmanager.domain.ports.services;

import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.User;

public interface UserService {
    User createUser(User user);
    User updateUser(User user);
    
    Optional<User> findDomainUserById(UUID id);
    Optional<User> findDomainUserByUsername(String username);
    
} 