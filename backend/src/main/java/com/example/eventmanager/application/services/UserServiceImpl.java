package com.example.eventmanager.application.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.eventmanager.domain.models.User;
import com.example.eventmanager.domain.repositories.UserRepository;
import com.example.eventmanager.domain.services.UserService;

import java.util.Optional;
import java.util.UUID;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    @Autowired
    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public User createUser(User user) {
        return userRepository.save(user);
    }

    @Override
    public User updateUser(User user) {
        return userRepository.save(user);
    }

    @Override
    public Optional<User> findDomainUserById(UUID id) {
        return userRepository.findDomainUserById(id);
    }

    @Override
    public Optional<User> findDomainUserByUsername(String username) {
        return userRepository.findDomainUserByUsername(username);
    }
} 