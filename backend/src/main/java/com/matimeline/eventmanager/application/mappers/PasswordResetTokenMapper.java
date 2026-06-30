package com.matimeline.eventmanager.application.mappers;

import org.springframework.stereotype.Component;

import com.matimeline.eventmanager.domain.models.PasswordResetToken;
import com.matimeline.eventmanager.infrastructure.entities.PasswordResetTokenEntity;

@Component
public class PasswordResetTokenMapper {

    public PasswordResetToken toDomain(PasswordResetTokenEntity entity) {
        return new PasswordResetToken(
            entity.getId(),
            entity.getUserId(),
            entity.getToken(),
            entity.getExpiresAt(),
            entity.getUsedAt()
        );
    }

    public PasswordResetTokenEntity toEntity(PasswordResetToken token) {
        PasswordResetTokenEntity entity = new PasswordResetTokenEntity();
        entity.setId(token.getId());
        entity.setUserId(token.getUserId());
        entity.setToken(token.getToken());
        entity.setExpiresAt(token.getExpiresAt());
        entity.setUsedAt(token.getUsedAt());
        return entity;
    }
}
