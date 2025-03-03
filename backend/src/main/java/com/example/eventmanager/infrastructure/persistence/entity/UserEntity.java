package com.example.eventmanager.infrastructure.persistence.entity;

import jakarta.persistence.*;

import com.example.eventmanager.domain.models.User;

import java.util.UUID;

@Entity
@Table(name = "users")
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String username;
    private String password;
    private String role;
    private String email;

    public User toDomainModel() {
        return new User(id, username, password, role, email);
    }

    public static UserEntity fromDomainModel(User user) {
        UserEntity entity = new UserEntity();
        entity.id = user.getId();
        entity.username = user.getUsername();
        entity.password = user.getPassword();
        entity.role = user.getRole();
        entity.email = user.getEmail();
        return entity;
    }
}