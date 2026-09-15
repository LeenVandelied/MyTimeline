package com.matimeline.eventmanager.application.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.matimeline.eventmanager.domain.exceptions.SessionNotFoundException;
import com.matimeline.eventmanager.domain.models.Session;
import com.matimeline.eventmanager.domain.ports.repositories.SessionRepository;

/**
 * #73 : sémantique de révocation portée par {@link SessionServiceImpl} — ownership
 * (404 anti-énumération), isSessionActive (révoqué/inconnu/legacy), rotation.
 */
@ExtendWith(MockitoExtension.class)
class SessionServiceImplTest {

    @Mock
    private SessionRepository sessionRepository;

    @InjectMocks
    private SessionServiceImpl service;

    private Session activeSession(UUID id, String jti, UUID userId, LocalDateTime revokedAt) {
        LocalDateTime now = LocalDateTime.now();
        return new Session(id, jti, userId, "UA", "192.168.1.0", now, now, now.plusDays(2), revokedAt);
    }

    @Test
    void isSessionActive_activeJti_true() {
        String jti = "jti-1";
        when(sessionRepository.findByJti(jti))
                .thenReturn(Optional.of(activeSession(UUID.randomUUID(), jti, UUID.randomUUID(), null)));
        assertTrue(service.isSessionActive(jti));
    }

    @Test
    void isSessionActive_revokedJti_false() {
        String jti = "jti-revoked";
        when(sessionRepository.findByJti(jti))
                .thenReturn(Optional.of(activeSession(UUID.randomUUID(), jti, UUID.randomUUID(), LocalDateTime.now())));
        assertFalse(service.isSessionActive(jti));
    }

    @Test
    void isSessionActive_unknownJti_false() {
        when(sessionRepository.findByJti("ghost")).thenReturn(Optional.empty());
        assertFalse(service.isSessionActive("ghost"));
    }

    @Test
    void isSessionActive_nullJti_legacyToken_true() {
        // Token legacy sans jti : non révocable -> ne bloque pas. Aucun lookup DB.
        assertTrue(service.isSessionActive(null));
        verify(sessionRepository, never()).findByJti(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void revokeSession_ownedByCaller_revokes() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(sessionRepository.findDomainSessionById(sessionId))
                .thenReturn(Optional.of(activeSession(sessionId, "jti", userId, null)));

        service.revokeSession(sessionId, userId);

        verify(sessionRepository).revokeById(sessionId);
    }

    @Test
    void revokeSession_ownedByOther_throws404_andDoesNotRevoke() {
        UUID sessionId = UUID.randomUUID();
        UUID owner = UUID.randomUUID();
        UUID intruder = UUID.randomUUID();
        when(sessionRepository.findDomainSessionById(sessionId))
                .thenReturn(Optional.of(activeSession(sessionId, "jti", owner, null)));

        assertThrows(SessionNotFoundException.class, () -> service.revokeSession(sessionId, intruder));
        verify(sessionRepository, never()).revokeById(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void revokeSession_unknownId_throws404() {
        UUID sessionId = UUID.randomUUID();
        when(sessionRepository.findDomainSessionById(sessionId)).thenReturn(Optional.empty());
        assertThrows(SessionNotFoundException.class,
                () -> service.revokeSession(sessionId, UUID.randomUUID()));
    }

    @Test
    void revokeOtherSessions_delegatesWithCurrentJtiPreserved() {
        UUID userId = UUID.randomUUID();
        when(sessionRepository.revokeAllByUserIdExcept(userId, "current")).thenReturn(3);
        assertEquals(3, service.revokeOtherSessions(userId, "current"));
        verify(sessionRepository).revokeAllByUserIdExcept(userId, "current");
    }

    @Test
    void revokeAllSessions_revokesWithNullException() {
        UUID userId = UUID.randomUUID();
        when(sessionRepository.revokeAllByUserIdExcept(userId, null)).thenReturn(5);
        assertEquals(5, service.revokeAllSessions(userId));
        verify(sessionRepository).revokeAllByUserIdExcept(userId, null);
    }

    @Test
    void revokeCurrentSession_nullJti_noOp() {
        service.revokeCurrentSession(null);
        verify(sessionRepository, never()).revokeByJti(org.mockito.ArgumentMatchers.any());
    }
}
