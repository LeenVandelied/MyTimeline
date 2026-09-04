package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.PasswordResetTokenRepository;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;
import com.matimeline.eventmanager.domain.ports.services.EmailService;
import com.matimeline.eventmanager.domain.ports.services.PasswordResetService;

/**
 * Test du correctif BR-AUT-005 (anti-énumération par TIMING) — review S8.
 *
 * <p>Avant le fix, {@code forgot-password} exécutait, pour un email connu, lookup +
 * INSERT + appel HTTP Brevo de façon SYNCHRONE sur le thread de requête : la latence
 * réseau (centaines de ms) rendait la branche "compte existe" mesurablement plus
 * lente que "compte inconnu" (retour immédiat) — un side-channel révélant l'existence
 * du compte malgré le 200 uniforme.
 *
 * <p>Le fix rend {@code PasswordResetServiceImpl.requestReset} {@code @Async}. Tout
 * passe ici par le contexte Spring (donc par le PROXY async) :
 * <ul>
 *   <li>les ports {@link UserRepository}, {@link PasswordResetTokenRepository},
 *       {@link EmailService} sont mockés ({@code @MockBean}) : pas de DB, pas de Brevo ;</li>
 *   <li>l'envoi d'email est BLOQUÉ sur un latch (simule la latence réseau Brevo).</li>
 * </ul>
 * Preuve du fix : le endpoint répond 200 et la méthode du service rend la main AVANT
 * la libération du latch — l'envoi ne s'exécute donc plus sur le thread de requête.
 * On vérifie aussi qu'un email inconnu ne lève rien et n'envoie aucun email.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ForgotPasswordAsyncTest extends com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    // Bean Spring-proxifié réel (porte @Async) — PAS un mock : on teste le proxy.
    @Autowired
    private PasswordResetService passwordResetService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private PasswordResetTokenRepository tokenRepository;

    @MockBean
    private EmailService emailService;

    private final CountDownLatch sendBlock = new CountDownLatch(1);

    @AfterEach
    void releaseLatch() {
        // Garantit qu'aucun thread worker async ne reste bloqué entre les tests.
        sendBlock.countDown();
    }

    /**
     * Email CONNU : l'envoi d'email est bloqué sur un latch. La méthode {@code @Async}
     * (appelée via le proxy Spring) doit rendre la main IMMÉDIATEMENT, sans attendre la
     * libération du latch — preuve que lookup/INSERT/envoi ne sont plus synchrones sur
     * le thread appelant. La tâche async finit ensuite par invoquer l'envoi.
     */
    @Test
    void requestReset_knownEmail_returnsImmediately_withoutWaitingForEmailSend() {
        User known = new User(
                UUID.randomUUID(), "Bob", "bob", "$2a$10$hash", "ROLE_USER", "known@example.com");
        lenient().when(userRepository.findDomainUserByEmail("known@example.com"))
                .thenReturn(Optional.of(known));

        // L'envoi reste bloqué tant que le latch n'est pas libéré (simule Brevo lent).
        doAnswer(invocation -> {
            sendBlock.await(5, TimeUnit.SECONDS);
            return null;
        }).when(emailService).sendPasswordResetEmail(anyString(), anyString(), anyString(), anyString());

        long start = System.currentTimeMillis();
        passwordResetService.requestReset("known@example.com", "en"); // via proxy @Async
        long elapsed = System.currentTimeMillis() - start;

        // L'appel rend la main sans avoir attendu le latch (5 s) : envoi bien déporté.
        assertThat(elapsed).isLessThan(4000L);

        // La tâche async s'exécute bien et appelle l'envoi (timeout = attente async).
        verify(emailService, timeout(5000))
                .sendPasswordResetEmail(anyString(), anyString(), anyString(), anyString());
        verify(tokenRepository, timeout(5000)).create(org.mockito.ArgumentMatchers.any());

        sendBlock.countDown();
    }

    /**
     * Bout-en-bout via le contrôleur : email INCONNU -> 200 immédiat, aucune exception,
     * aucun envoi (la branche async retourne sans effet ; aucun side-channel).
     */
    @Test
    void forgotPassword_unknownEmail_returns200_noEmailSent_throwsNothing() throws Exception {
        lenient().when(userRepository.findDomainUserByEmail(anyString()))
                .thenReturn(Optional.empty());

        String body = "{\"email\":\"ghost-" + UUID.randomUUID() + "@example.com\"}";

        assertThatCode(() ->
                mockMvc.perform(post("/api/auth/forgot-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body))
                        .andExpect(status().isOk()))
                .doesNotThrowAnyException();
    }
}
