package com.matimeline.eventmanager.application.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.matimeline.eventmanager.domain.exceptions.InvalidPasswordResetTokenException;
import com.matimeline.eventmanager.domain.models.PasswordResetToken;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.PasswordResetTokenRepository;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;
import com.matimeline.eventmanager.domain.ports.services.EmailService;

/**
 * Tests unitaires de {@link PasswordResetServiceImpl} (issue #49).
 *
 * <p>Couvre les AC : forgot-password no-op + no-leak sur email inconnu (BR-AUT-005),
 * envoi email + persistance token sur email connu ; reset-password token inexistant /
 * expiré (>15 min) / déjà consommé -> InvalidPasswordResetTokenException (->400) ;
 * succès -> re-hash BCrypt (BR-AUT-002) + marquage consommé (usage unique).
 *
 * <p>Clock FIXE pour piloter l'expiration sans Thread.sleep.
 */
@ExtendWith(MockitoExtension.class)
class PasswordResetServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository tokenRepository;
    @Mock private EmailService emailService;
    @Mock private PasswordEncoder passwordEncoder;

    // Instant fixe : 2026-06-30T12:00:00Z. Validité 15 min => expiration à 12:15.
    private static final Instant NOW = Instant.parse("2026-06-30T12:00:00Z");
    private final Clock fixedClock = Clock.fixed(NOW, ZoneOffset.UTC);

    private PasswordResetServiceImpl newService() {
        return new PasswordResetServiceImpl(
                userRepository, tokenRepository, emailService, passwordEncoder, fixedClock, 15L);
    }

    private LocalDateTime now() {
        return LocalDateTime.now(fixedClock);
    }

    private User user(UUID id) {
        return new User(id, "Alice", "alice", "$2a$10$oldHash", "ROLE_USER", "alice@example.com");
    }

    // ----- forgot-password (requestReset) -----

    @Test
    void requestReset_unknownEmail_doesNothing_noLeak() {
        when(userRepository.findDomainUserByEmail("ghost@example.com")).thenReturn(Optional.empty());

        newService().requestReset("ghost@example.com");

        // BR-AUT-005 : aucun token persisté, aucun email envoyé, aucune exception.
        verify(tokenRepository, never()).save(any());
        verifyNoInteractions(emailService);
    }

    @Test
    void requestReset_knownEmail_persistsToken_andSendsEmail() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findDomainUserByEmail("alice@example.com")).thenReturn(Optional.of(user(userId)));

        newService().requestReset("alice@example.com");

        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(tokenCaptor.capture());
        PasswordResetToken saved = tokenCaptor.getValue();
        assertThat(saved.getUserId()).isEqualTo(userId);
        assertThat(saved.getUsedAt()).isNull();
        // Expiration = now + 15 min (cadrage S8).
        assertThat(saved.getExpiresAt()).isEqualTo(now().plusMinutes(15));

        verify(emailService).sendPasswordResetEmail(anyString(), anyString(), anyString());
    }

    // ----- reset-password -----

    @Test
    void resetPassword_nonExistentToken_throws() {
        UUID token = UUID.randomUUID();
        when(tokenRepository.findByToken(token)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> newService().resetPassword(token.toString(), "newsecret"))
                .isInstanceOf(InvalidPasswordResetTokenException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_malformedToken_throws_withoutLookup() {
        assertThatThrownBy(() -> newService().resetPassword("not-a-uuid", "newsecret"))
                .isInstanceOf(InvalidPasswordResetTokenException.class);

        verifyNoInteractions(tokenRepository);
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_expiredToken_throws() {
        UUID tokenValue = UUID.randomUUID();
        // Expiré il y a 1 min (expiresAt = now - 1).
        PasswordResetToken expired = new PasswordResetToken(
                UUID.randomUUID(), UUID.randomUUID(), tokenValue, now().minusMinutes(1), null);
        when(tokenRepository.findByToken(tokenValue)).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> newService().resetPassword(tokenValue.toString(), "newsecret"))
                .isInstanceOf(InvalidPasswordResetTokenException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_alreadyUsedToken_throws() {
        UUID tokenValue = UUID.randomUUID();
        // Non expiré (expire dans 5 min) MAIS déjà consommé.
        PasswordResetToken used = new PasswordResetToken(
                UUID.randomUUID(), UUID.randomUUID(), tokenValue,
                now().plusMinutes(5), now().minusMinutes(2));
        when(tokenRepository.findByToken(tokenValue)).thenReturn(Optional.of(used));

        assertThatThrownBy(() -> newService().resetPassword(tokenValue.toString(), "newsecret"))
                .isInstanceOf(InvalidPasswordResetTokenException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_validToken_reHashes_updatesUser_andConsumesToken() {
        UUID userId = UUID.randomUUID();
        UUID tokenValue = UUID.randomUUID();
        PasswordResetToken valid = new PasswordResetToken(
                UUID.randomUUID(), userId, tokenValue, now().plusMinutes(10), null);
        when(tokenRepository.findByToken(tokenValue)).thenReturn(Optional.of(valid));
        when(userRepository.findDomainUserById(userId)).thenReturn(Optional.of(user(userId)));
        when(passwordEncoder.encode("newsecret")).thenReturn("$2a$10$newHash");

        newService().resetPassword(tokenValue.toString(), "newsecret");

        // BR-AUT-002 : ré-encodage BCrypt.
        verify(passwordEncoder).encode("newsecret");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getPassword()).isEqualTo("$2a$10$newHash");
        assertThat(userCaptor.getValue().getId()).isEqualTo(userId);

        // Usage unique : token marqué consommé (used_at posé).
        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(tokenCaptor.capture());
        assertThat(tokenCaptor.getValue().getUsedAt()).isEqualTo(now());
    }

    @Test
    void resetPassword_validToken_butUserDeleted_throws() {
        UUID userId = UUID.randomUUID();
        UUID tokenValue = UUID.randomUUID();
        PasswordResetToken valid = new PasswordResetToken(
                UUID.randomUUID(), userId, tokenValue, now().plusMinutes(10), null);
        when(tokenRepository.findByToken(tokenValue)).thenReturn(Optional.of(valid));
        when(userRepository.findDomainUserById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> newService().resetPassword(tokenValue.toString(), "newsecret"))
                .isInstanceOf(InvalidPasswordResetTokenException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void boundary_tokenExpiringExactlyNow_isNotUsable() {
        // expiresAt == now : considéré expiré (isExpired utilise !isAfter(now)).
        UUID tokenValue = UUID.randomUUID();
        PasswordResetToken atBoundary = new PasswordResetToken(
                UUID.randomUUID(), UUID.randomUUID(), tokenValue, now(), null);
        when(tokenRepository.findByToken(tokenValue)).thenReturn(Optional.of(atBoundary));

        assertThatThrownBy(() -> newService().resetPassword(tokenValue.toString(), "newsecret"))
                .isInstanceOf(InvalidPasswordResetTokenException.class);
    }
}
