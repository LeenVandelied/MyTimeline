package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;
import java.util.UUID;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.domain.exceptions.InvalidCredentialsException;
import com.matimeline.eventmanager.domain.exceptions.SamePasswordException;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.UserService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

/**
 * Issue #70 — endpoints profil (/api/me).
 * - BR-AUT-008 : GET/PATCH ne sérialisent JAMAIS le hash du mot de passe.
 * - BR-AUT-001 : PATCH avec un username déjà porté par un autre compte -> 409.
 * - change-password : 400 si ancien mot de passe faux, 204 en cas de succès.
 *
 * Montage standalone (MockMvc) + GlobalExceptionHandler branché pour que @Valid
 * produise un 400 — même approche que les autres tests de contrôleur du repo.
 */
@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;
    @Mock
    private JwtService jwtService;

    private MockMvc mockMvc;

    private static final String TOKEN = "valid-token";
    private static final String HASH = "$2a$10$bcryptHashThatMustNeverLeak";

    private User caller;

    @BeforeEach
    void setUp() {
        UserController controller = new UserController(userService, jwtService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        caller = new User(UUID.randomUUID(), "Alice", "alice", HASH, "ROLE_USER", "alice@example.com");
    }

    private void stubAuthenticatedCaller() {
        when(jwtService.extractUsername(TOKEN)).thenReturn("alice");
        when(userService.findDomainUserByUsername("alice")).thenReturn(Optional.of(caller));
    }

    // ----- BR-AUT-008 : aucun hash exposé -----

    @Test
    void getMe_returnsProfile_withoutPasswordHash() throws Exception {
        stubAuthenticatedCaller();

        mockMvc.perform(get("/api/me").cookie(new Cookie("jwt", TOKEN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(result -> {
                    String body = result.getResponse().getContentAsString();
                    org.junit.jupiter.api.Assertions.assertFalse(
                            body.contains(HASH), "le hash ne doit jamais apparaître dans la réponse");
                });
    }

    @Test
    void getMe_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void patchMe_updatesProfile_andDoesNotExposePassword() throws Exception {
        stubAuthenticatedCaller();
        // username inchangé -> pas de check d'unicité déclenché
        when(userService.updateUser(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        String body = "{\"name\":\"Alice B\",\"username\":\"alice\",\"email\":\"alice.b@example.com\"}";

        mockMvc.perform(patch("/api/me")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alice B"))
                .andExpect(jsonPath("$.email").value("alice.b@example.com"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(result -> org.junit.jupiter.api.Assertions.assertFalse(
                        result.getResponse().getContentAsString().contains(HASH)));
    }

    // ----- BR-AUT-001 : unicité username -----

    @Test
    void patchMe_returns409_whenUsernameTakenByAnotherUser() throws Exception {
        stubAuthenticatedCaller();
        User other = new User(UUID.randomUUID(), "Bob", "bob", HASH, "ROLE_USER", "bob@example.com");
        when(userService.findDomainUserByUsername("bob")).thenReturn(Optional.of(other));

        String body = "{\"name\":\"Alice\",\"username\":\"bob\",\"email\":\"alice@example.com\"}";

        mockMvc.perform(patch("/api/me")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("username already taken"));

        verify(userService, never()).updateUser(any(User.class));
    }

    @Test
    void patchMe_returns400_whenValidationFails() throws Exception {
        // username trop court (<3) -> @Valid -> 400 via GlobalExceptionHandler
        String body = "{\"name\":\"Alice\",\"username\":\"ab\",\"email\":\"alice@example.com\"}";

        mockMvc.perform(patch("/api/me")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // ----- change-password -----

    @Test
    void changePassword_returns400_whenOldPasswordWrong() throws Exception {
        stubAuthenticatedCaller();
        // A8/DIP : la vérif du hash vit dans le port. Le contrôleur délègue ;
        // l'échec remonte en InvalidCredentialsException -> 400 via GlobalExceptionHandler.
        doThrow(new InvalidCredentialsException())
                .when(userService).changePassword(eq(caller), eq("wrongold"), eq("newsecret"));

        String body = "{\"oldPassword\":\"wrongold\",\"newPassword\":\"newsecret\"}";

        mockMvc.perform(post("/api/me/change-password")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("invalid current password"));
    }

    @Test
    void changePassword_returns204_andDelegatesToPort_onSuccess() throws Exception {
        stubAuthenticatedCaller();
        doNothing().when(userService).changePassword(eq(caller), eq("rightold"), eq("newsecret"));

        String body = "{\"oldPassword\":\"rightold\",\"newPassword\":\"newsecret\"}";

        mockMvc.perform(post("/api/me/change-password")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNoContent());

        verify(userService).changePassword(eq(caller), eq("rightold"), eq("newsecret"));
    }

    @Test
    void changePassword_returns400_whenNewPasswordSameAsOld() throws Exception {
        stubAuthenticatedCaller();
        // Review PR #132 : new == old (après validation BCrypt de l'ancien) -> 400.
        doThrow(new SamePasswordException())
                .when(userService).changePassword(eq(caller), eq("rightold"), eq("rightold"));

        String body = "{\"oldPassword\":\"rightold\",\"newPassword\":\"rightold\"}";

        mockMvc.perform(post("/api/me/change-password")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("new password must differ"));
    }

    @Test
    void changePassword_returns400_whenNewPasswordTooShort() throws Exception {
        // newPassword < 6 -> @Valid -> 400
        String body = "{\"oldPassword\":\"rightold\",\"newPassword\":\"abc\"}";

        mockMvc.perform(post("/api/me/change-password")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
