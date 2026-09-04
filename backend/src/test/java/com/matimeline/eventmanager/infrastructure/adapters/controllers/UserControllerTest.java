package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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

import com.matimeline.eventmanager.domain.exceptions.AccountDeletionMismatchException;
import com.matimeline.eventmanager.domain.exceptions.AvatarNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.InvalidAvatarException;
import com.matimeline.eventmanager.domain.exceptions.InvalidCredentialsException;
import com.matimeline.eventmanager.domain.exceptions.SamePasswordException;
import com.matimeline.eventmanager.domain.models.AvatarContent;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.AvatarService;
import com.matimeline.eventmanager.domain.ports.services.UserService;
import com.matimeline.eventmanager.infrastructure.security.CallerResolver;

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
    private CallerResolver callerResolver;
    @Mock
    private AvatarService avatarService;

    private MockMvc mockMvc;

    private static final String TOKEN = "valid-token";
    private static final String HASH = "$2a$10$bcryptHashThatMustNeverLeak";

    private User caller;

    @BeforeEach
    void setUp() {
        UserController controller = new UserController(userService, callerResolver, avatarService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        caller = new User(UUID.randomUUID(), "Alice", "alice", HASH, "ROLE_USER", "alice@example.com");
    }

    // #93 : identité résolue via CallerResolver (SecurityContext), plus via le cookie brut.
    // Les tests sans auth n'appellent pas ce helper -> currentUser() = Optional.empty()
    // (défaut Mockito) -> 401.
    private void stubAuthenticatedCaller() {
        when(callerResolver.currentUser()).thenReturn(Optional.of(caller));
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

    /**
     * #134 — le STATUT reste 409 (contrat frontend inchangé : ProfileSection.tsx
     * discrimine sur {@code error.response?.status === 409}), mais le CORPS ne doit
     * plus confirmer l'existence d'un compte tiers : code générique "conflict",
     * strictement identique au 409 de {@code AuthController.register}.
     */
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
                .andExpect(jsonPath("$.error").value(ErrorCode.CONFLICT.getCode()));

        verify(userService, never()).updateUser(any(User.class));
    }

    /**
     * #134 — non-régression anti-énumération : aucun mot du corps ne doit décrire la
     * CAUSE du conflit. Une simple égalité sur "conflict" (test ci-dessus) laisserait
     * passer un futur enrichissement du body ({@code message}, {@code field}...) qui
     * réintroduirait l'oracle. On assert donc aussi l'ABSENCE des marqueurs, et
     * l'absence du username sondé — qui est la donnée que l'attaquant cherche à
     * confirmer.
     */
    @Test
    void patchMe_conflictBody_leaksNoUsernameExistenceHint() throws Exception {
        stubAuthenticatedCaller();
        User other = new User(UUID.randomUUID(), "Bob", "bob", HASH, "ROLE_USER", "bob@example.com");
        when(userService.findDomainUserByUsername("bob")).thenReturn(Optional.of(other));

        String body = "{\"name\":\"Alice\",\"username\":\"bob\",\"email\":\"alice@example.com\"}";

        String responseBody = mockMvc.perform(patch("/api/me")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andReturn().getResponse().getContentAsString();

        String lower = responseBody.toLowerCase(java.util.Locale.ROOT);
        org.junit.jupiter.api.Assertions.assertFalse(lower.contains("taken"),
                "le corps ne doit pas dire que le username est pris : " + responseBody);
        org.junit.jupiter.api.Assertions.assertFalse(lower.contains("username"),
                "le corps ne doit pas nommer le champ en cause : " + responseBody);
        org.junit.jupiter.api.Assertions.assertFalse(lower.contains("exist"),
                "le corps ne doit pas évoquer l'existence d'un compte : " + responseBody);
        org.junit.jupiter.api.Assertions.assertFalse(lower.contains("bob"),
                "le corps ne doit pas renvoyer le username sondé : " + responseBody);
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
                // #290 : contrat structuré — `error`=code stable, texte humain en `message`.
                .andExpect(jsonPath("$.error").value("bad_request"))
                .andExpect(jsonPath("$.message").value("invalid current password"));
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
                // #290 : `error`=code stable, texte humain en `message`.
                .andExpect(jsonPath("$.error").value("bad_request"))
                .andExpect(jsonPath("$.message").value("new password must differ"));
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

    // ----- DELETE /api/me (#78, RGPD) -----

    @Test
    void deleteMe_withoutToken_returns401() throws Exception {
        String body = "{\"username\":\"alice\"}";

        mockMvc.perform(delete("/api/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());

        verify(userService, never()).deleteAccount(any(User.class), any());
    }

    @Test
    void deleteMe_withoutBody_returns400() throws Exception {
        // Corps absent -> HttpMessageNotReadable -> 400 AVANT le corps de méthode (donc
        // avant resolveCaller) : pas besoin de stubber le caller. Le port n'est jamais appelé.
        mockMvc.perform(delete("/api/me")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(""))
                .andExpect(status().isBadRequest());

        verify(userService, never()).deleteAccount(any(User.class), any());
    }

    @Test
    void deleteMe_withBlankUsername_returns400() throws Exception {
        // @NotBlank -> MethodArgumentNotValid -> 400 pendant le binding @Valid, AVANT le
        // corps de méthode (donc avant resolveCaller) : pas besoin de stubber le caller.
        String body = "{\"username\":\"\"}";

        mockMvc.perform(delete("/api/me")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verify(userService, never()).deleteAccount(any(User.class), any());
    }

    @Test
    void deleteMe_withWrongUsername_returns400() throws Exception {
        // Mismatch -> le port lève AccountDeletionMismatchException -> 400 (message neutre).
        stubAuthenticatedCaller();
        doThrow(new AccountDeletionMismatchException())
                .when(userService).deleteAccount(eq(caller), eq("bob"));

        String body = "{\"username\":\"bob\"}";

        mockMvc.perform(delete("/api/me")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                // #290 : `error`=code stable, texte neutre en `message`.
                .andExpect(jsonPath("$.error").value("bad_request"))
                .andExpect(jsonPath("$.message").value("username confirmation does not match"));
    }

    @Test
    void deleteMe_withCorrectUsername_returns204_andClearsCookie() throws Exception {
        stubAuthenticatedCaller();
        doNothing().when(userService).deleteAccount(eq(caller), eq("alice"));

        String body = "{\"username\":\"alice\"}";

        mockMvc.perform(delete("/api/me")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNoContent())
                .andExpect(result -> {
                    Cookie cleared = result.getResponse().getCookie("jwt");
                    org.junit.jupiter.api.Assertions.assertNotNull(cleared, "le cookie jwt doit être posé pour effacement");
                    org.junit.jupiter.api.Assertions.assertEquals(0, cleared.getMaxAge(), "MaxAge=0 = suppression");
                    org.junit.jupiter.api.Assertions.assertEquals("", cleared.getValue(), "valeur vidée");
                });

        verify(userService).deleteAccount(eq(caller), eq("alice"));
    }

    // ----- Avatar (#75, BR-AUT-001) -----

    /** Petit JPEG factice (magic bytes FF D8 FF) — le service réel valide, ici mocké. */
    private static org.springframework.mock.web.MockMultipartFile jpegPart() {
        return new org.springframework.mock.web.MockMultipartFile(
                "file", "photo.jpg", "image/jpeg",
                new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x11, 0x22});
    }

    @Test
    void uploadAvatar_withoutToken_returns401() throws Exception {
        mockMvc.perform(multipart("/api/me/avatar").file(jpegPart()))
                .andExpect(status().isUnauthorized());

        verify(avatarService, never()).uploadAvatar(any(User.class), any());
    }

    @Test
    void uploadAvatar_success_returns200_withAvatarUrl_andDelegatesToPort() throws Exception {
        stubAuthenticatedCaller();
        doNothing().when(avatarService).uploadAvatar(eq(caller), any(byte[].class));
        // Après upload, le contrôleur relit le user : renvoie un caller AVEC avatar posé.
        User withAvatar = new User(caller.getId(), "Alice", "alice", HASH, "ROLE_USER",
                "alice@example.com", "generated-ref.jpg");
        when(userService.findDomainUserById(caller.getId())).thenReturn(Optional.of(withAvatar));

        mockMvc.perform(multipart("/api/me/avatar")
                        .file(jpegPart())
                        .cookie(new Cookie("jwt", TOKEN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value("/api/me/avatar"))
                .andExpect(jsonPath("$.password").doesNotExist());

        verify(avatarService).uploadAvatar(eq(caller), any(byte[].class));
    }

    @Test
    void uploadAvatar_invalidFile_returns400() throws Exception {
        stubAuthenticatedCaller();
        // Le service (magic bytes / taille) lève -> 400 via GlobalExceptionHandler.
        doThrow(new InvalidAvatarException("type de fichier non autorisé (JPEG, PNG ou WebP attendu)"))
                .when(avatarService).uploadAvatar(eq(caller), any(byte[].class));

        mockMvc.perform(multipart("/api/me/avatar")
                        .file(new org.springframework.mock.web.MockMultipartFile(
                                "file", "evil.exe", "application/octet-stream",
                                new byte[] {0x4D, 0x5A, 0x00}))
                        .cookie(new Cookie("jwt", TOKEN)))
                .andExpect(status().isBadRequest())
                // #290 : `error`=code stable, message dynamique lisible en `message`.
                .andExpect(jsonPath("$.error").value("bad_request"))
                .andExpect(jsonPath("$.message").value("type de fichier non autorisé (JPEG, PNG ou WebP attendu)"));
    }

    @Test
    void getAvatar_success_streamsBytes_withContentType() throws Exception {
        stubAuthenticatedCaller();
        byte[] bytes = new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x01};
        when(avatarService.getAvatar(caller)).thenReturn(new AvatarContent(bytes, "image/jpeg"));

        mockMvc.perform(get("/api/me/avatar").cookie(new Cookie("jwt", TOKEN)))
                .andExpect(status().isOk())
                .andExpect(result -> org.junit.jupiter.api.Assertions.assertEquals(
                        "image/jpeg", result.getResponse().getContentType()))
                .andExpect(result -> org.junit.jupiter.api.Assertions.assertArrayEquals(
                        bytes, result.getResponse().getContentAsByteArray()));
    }

    @Test
    void getAvatar_whenNone_returns404() throws Exception {
        stubAuthenticatedCaller();
        doThrow(new AvatarNotFoundException()).when(avatarService).getAvatar(caller);

        mockMvc.perform(get("/api/me/avatar").cookie(new Cookie("jwt", TOKEN)))
                .andExpect(status().isNotFound());
    }

    @Test
    void getAvatar_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/me/avatar"))
                .andExpect(status().isUnauthorized());

        verify(avatarService, never()).getAvatar(any(User.class));
    }

    @Test
    void deleteAvatar_success_returns204_andDelegatesToPort() throws Exception {
        stubAuthenticatedCaller();
        doNothing().when(avatarService).deleteAvatar(caller);

        mockMvc.perform(delete("/api/me/avatar").cookie(new Cookie("jwt", TOKEN)))
                .andExpect(status().isNoContent());

        verify(avatarService).deleteAvatar(caller);
    }

    @Test
    void deleteAvatar_withoutToken_returns401() throws Exception {
        mockMvc.perform(delete("/api/me/avatar"))
                .andExpect(status().isUnauthorized());

        verify(avatarService, never()).deleteAvatar(any(User.class));
    }
}
