package com.example.eventmanager.application.services;

import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.eventmanager.domain.models.User;
import com.example.eventmanager.domain.repositories.UserRepository;

@Service
public class UserService {
  
  private final UserRepository userRepository;

  @Autowired
  public UserService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public Optional<User> findDomainUserById(UUID id) {
    return userRepository.findDomainUserById(id);
  }
  
  public Optional<User> findDomainUserByUsername(String username) {
    return userRepository.findDomainUserByUsername(username);
  }

  @Transactional
  public User save(User user) {
    return userRepository.save(user);
  }
}
