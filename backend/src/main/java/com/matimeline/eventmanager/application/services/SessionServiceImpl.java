package com.matimeline.eventmanager.application.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.exceptions.SessionNotFoundException;
import com.matimeline.eventmanager.domain.models.Session;
import com.matimeline.eventmanager.domain.ports.repositories.SessionRepository;
import com.matimeline.eventmanager.domain.ports.services.SessionService;

/**
 * Orchestration des sessions actives (issue #73). Applique la sémantique de
 * révocation (BR-AUT-009/010/011) au-dessus du port {@link SessionRepository}.
 *
 * <p>Ne fait AUCUNE troncature IP ni génération de jti : ces responsabilités
 * techniques (dépendantes de la requête HTTP) sont portées par l'infrastructure
 * (AuthController / JwtService). Le service ne reçoit que des valeurs déjà propres.
 */
@Service
public class SessionServiceImpl implements SessionService {

    private final SessionRepository sessionRepository;

    @Autowired
    public SessionServiceImpl(SessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Override
    @Transactional
    public Session createSession(String jti, UUID userId, String deviceInfo, String ipAddress,
                                 LocalDateTime expiresAt) {
        LocalDateTime now = LocalDateTime.now();
        Session session = new Session(
            UUID.randomUUID(),
            jti,
            userId,
            deviceInfo,
            ipAddress,
            now,       // lastActivity
            now,       // createdAt
            expiresAt,
            null       // revokedAt (active)
        );
        return sessionRepository.save(session);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isSessionActive(String jti) {
        if (jti == null) {
            // Token legacy sans jti (émis avant cette feature) : pas de session à
            // vérifier -> on ne bloque pas. Le JwtFilter décide de la politique
            // (cf. commentaire dans JwtFilter). Ici, absence de jti != révoqué.
            return true;
        }
        // Cohérence avec findActiveByUserId (GET /sessions) : une session non révoquée
        // mais expirée n'est pas active. En pratique le JWT expiré est déjà rejeté par
        // validateToken en amont ; ce filtre aligne les deux chemins de lecture (defense-in-depth).
        return sessionRepository.findByJti(jti)
                .filter(s -> s.getExpiresAt() == null || s.getExpiresAt().isAfter(LocalDateTime.now()))
                .map(Session::isActive)
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Session> getActiveSessions(UUID userId) {
        return sessionRepository.findActiveByUserId(userId);
    }

    @Override
    @Transactional
    public void revokeCurrentSession(String jti) {
        if (jti == null) {
            return; // logout d'un token legacy sans jti : rien à révoquer.
        }
        sessionRepository.revokeByJti(jti);
    }

    @Override
    @Transactional
    public void revokeSession(UUID sessionId, UUID userId) {
        // Ownership : la session ciblée doit appartenir au caller, sinon 404
        // (anti-énumération — ne pas distinguer "inexistante" de "à autrui").
        Session session = sessionRepository.findDomainSessionById(sessionId)
                .filter(s -> s.getUserId().equals(userId))
                .orElseThrow(() -> new SessionNotFoundException(sessionId));
        sessionRepository.revokeById(session.getId());
    }

    @Override
    @Transactional
    public int revokeOtherSessions(UUID userId, String currentJti) {
        // currentJti conservé (épargné). Les autres sessions actives sont révoquées.
        return sessionRepository.revokeAllByUserIdExcept(userId, currentJti);
    }

    @Override
    @Transactional
    public int revokeAllSessions(UUID userId) {
        // Déconnexion globale (consommé par #78). exceptJti null -> tout révoquer.
        return sessionRepository.revokeAllByUserIdExcept(userId, null);
    }
}
