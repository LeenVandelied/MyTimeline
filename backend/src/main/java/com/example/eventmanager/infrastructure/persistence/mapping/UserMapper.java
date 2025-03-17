package com.example.eventmanager.infrastructure.persistence.mapping;

import org.springframework.stereotype.Component;

import com.example.eventmanager.domain.models.User;
import com.example.eventmanager.infrastructure.persistence.entity.UserEntity;

@Component
public class UserMapper {
    public User toDomain(UserEntity userEntity) {
        return new User(
            userEntity.getId(),
            userEntity.getName(),
            userEntity.getUsername(),
            userEntity.getPassword(),
            userEntity.getRole(),
            userEntity.getEmail()
        );
    }

    public UserEntity toEntity(User user) {
        UserEntity entity = new UserEntity();
        entity.setId(user.getId());
        entity.setName(user.getName());
        entity.setUsername(user.getUsername());
        entity.setPassword(user.getPassword());
        entity.setRole(user.getRole());
        entity.setEmail(user.getEmail());
        return entity;
    }
}
