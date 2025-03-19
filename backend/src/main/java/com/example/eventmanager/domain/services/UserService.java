package com.example.eventmanager.domain.services;

import com.example.eventmanager.domain.models.User;
import java.util.Optional;
import java.util.UUID;

public interface UserService {
    User createUser(User user);
    User updateUser(User user);
    
    Optional<User> findDomainUserById(UUID id);
    Optional<User> findDomainUserByUsername(String username);
    
} 