package com.matimeline.eventmanager.application.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.matimeline.eventmanager.domain.exceptions.InvalidCredentialsException;
import com.matimeline.eventmanager.domain.exceptions.SamePasswordException;
import com.matimeline.eventmanager.domain.exceptions.UserNotFoundException;
import com.matimeline.eventmanager.domain.models.ThemePreference;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;

/**
 * Review PR #132 — changePassword (BR-AUT-005 + new != old).
 * Vérifie les trois branches de {@link UserServiceImpl#changePassword} :
 * ancien mot de passe faux (400), nouveau == ancien (400), succès (re-hash + save).
 */
@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserServiceImpl userService;

    private static final String CURRENT_HASH = "$2a$10$currentHash";

    private User caller;

    @BeforeEach
    void setUp() {
        caller = new User(UUID.randomUUID(), "Alice", "alice", CURRENT_HASH, "ROLE_USER", "alice@example.com");
    }

    @Test
    void changePassword_throwsInvalidCredentials_whenOldPasswordWrong() {
        when(passwordEncoder.matches("wrongold", CURRENT_HASH)).thenReturn(false);

        assertThatThrownBy(() -> userService.changePassword(caller, "wrongold", "newsecret"))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void changePassword_throwsSamePassword_whenNewEqualsOld() {
        // old == new == "rightold" : matches("rightold", hash) sert aux deux checks
        // (ancien valide -> on dépasse BCrypt ; puis new == hash courant -> 400).
        when(passwordEncoder.matches("rightold", CURRENT_HASH)).thenReturn(true);

        assertThatThrownBy(() -> userService.changePassword(caller, "rightold", "rightold"))
                .isInstanceOf(SamePasswordException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void changePassword_reHashesAndSaves_onSuccess() {
        when(passwordEncoder.matches("rightold", CURRENT_HASH)).thenReturn(true);
        when(passwordEncoder.matches("newsecret", CURRENT_HASH)).thenReturn(false);
        when(passwordEncoder.encode("newsecret")).thenReturn("$2a$10$newHash");

        userService.changePassword(caller, "rightold", "newsecret");

        verify(passwordEncoder).encode("newsecret");
        verify(userRepository).save(any(User.class));
    }

    // ----- #653 (BR-AUT-013) : préférence de thème, chemin d'écriture dédié -----

    @Test
    void updateThemePreference_writesThroughDedicatedPort_neverThroughSave() {
        User updated = new User(caller.getId(), "Alice", "alice", CURRENT_HASH, "ROLE_USER",
                "alice@example.com", null, ThemePreference.DARK);
        when(userRepository.updateThemePreference(caller.getId(), ThemePreference.DARK))
                .thenReturn(Optional.of(updated));

        User result = userService.updateThemePreference(caller, ThemePreference.DARK);

        assertThat(result.getThemePreference()).isEqualTo(ThemePreference.DARK);
        verify(userRepository).updateThemePreference(eq(caller.getId()), eq(ThemePreference.DARK));
        // Pas de reconstruction du User complet : save() n'est jamais appelé.
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateThemePreference_throwsUserNotFound_whenAccountVanished() {
        when(userRepository.updateThemePreference(caller.getId(), ThemePreference.LIGHT))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateThemePreference(caller, ThemePreference.LIGHT))
                .isInstanceOf(UserNotFoundException.class);
    }

    @Test
    void updateThemePreference_refusesNull_neverResetsToNoChoice() {
        assertThatThrownBy(() -> userService.updateThemePreference(caller, null))
                .isInstanceOf(NullPointerException.class);

        verify(userRepository, never()).updateThemePreference(any(), any());
    }
}
