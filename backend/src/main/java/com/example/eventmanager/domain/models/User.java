package com.example.eventmanager.domain.models;

import java.util.UUID;

public class User {
    private UUID id;
    private String username;
    private String name;
    private String password;
    private String role;
    private String email;

    public User(UUID id, String name, String username, String password, String role, String email) {
        this.id = id;
        this.name = name;
        this.username = username;
        this.password = password;
        this.role = role;
        this.email = email;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getUsername() {
        return username;
    }

    public String getPassword() {
        return password;
    }

    public String getRole() {
        return role;
    }

    public String getEmail() {
        return email;
    }
}