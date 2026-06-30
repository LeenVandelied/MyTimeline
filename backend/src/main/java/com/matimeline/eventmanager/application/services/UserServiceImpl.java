package com.matimeline.eventmanager.application.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.exceptions.InvalidCredentialsException;
import com.matimeline.eventmanager.domain.exceptions.SamePasswordException;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;
import com.matimeline.eventmanager.domain.ports.services.UserService;

import java.util.Optional;
import java.util.UUID;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public User createUser(User user) {
        return userRepository.save(user);
    }

    @Override
    @Transactional
    public User updateUser(User user) {
        // A15 : @Transactional aligné sur createUser. Sans transaction, une erreur
        // au milieu d'un save multi-étapes laisserait des données partiellement mises
        // à jour (cf. risque documenté #70).
        return userRepository.save(user);
    }

    @Override
    @Transactional
    public void changePassword(User caller, String oldPassword, String newPassword) {
        // A8/DIP : logique métier (vérif ancien hash + re-hash) en couche application,
        // plus dans le contrôleur. BR-AUT-005 : échec -> InvalidCredentialsException (400).
        if (!passwordEncoder.matches(oldPassword, caller.getPassword())) {
            throw new InvalidCredentialsException();
        }
        // Le nouveau mot de passe doit différer de l'ancien (vérif APRÈS le contrôle
        // BCrypt de l'ancien, donc seul un appelant légitime peut déclencher ce 400).
        if (passwordEncoder.matches(newPassword, caller.getPassword())) {
            throw new SamePasswordException();
        }
        String newHash = passwordEncoder.encode(newPassword);
        User updated = new User(
                caller.getId(),
                caller.getName(),
                caller.getUsername(),
                newHash,
                caller.getRole(),
                caller.getEmail());
        userRepository.save(updated);
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