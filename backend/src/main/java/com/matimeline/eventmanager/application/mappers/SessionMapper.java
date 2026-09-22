package com.matimeline.eventmanager.application.mappers;

import org.springframework.stereotype.Component;

import com.matimeline.eventmanager.domain.models.Session;
import com.matimeline.eventmanager.infrastructure.entities.SessionEntity;

/**
 * Mapping {@code SessionEntity} <-> {@code Session} (issue #73). L'IP stockée est
 * déjà tronquée (RGPD) en amont de la création — le mapper la recopie telle quelle.
 */
@Component
public class SessionMapper {

    public Session toDomain(SessionEntity e) {
        return new Session(
            e.getId(),
            e.getJti(),
            e.getUserId(),
            e.getDeviceInfo(),
            e.getIpAddress(),
            e.getLastActivity(),
            e.getCreatedAt(),
            e.getExpiresAt(),
            e.getRevokedAt()
        );
    }

    public SessionEntity toEntity(Session s) {
        SessionEntity e = new SessionEntity();
        e.setId(s.getId());
        e.setJti(s.getJti());
        e.setUserId(s.getUserId());
        e.setDeviceInfo(s.getDeviceInfo());
        e.setIpAddress(s.getIpAddress());
        e.setLastActivity(s.getLastActivity());
        e.setCreatedAt(s.getCreatedAt());
        e.setExpiresAt(s.getExpiresAt());
        e.setRevokedAt(s.getRevokedAt());
        return e;
    }
}
