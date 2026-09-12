package com.matimeline.eventmanager.application.validation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Set;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.matimeline.eventmanager.application.dtos.AuthRequest;
import com.matimeline.eventmanager.application.dtos.ChangePasswordRequest;
import com.matimeline.eventmanager.application.dtos.RegisterRequest;
import com.matimeline.eventmanager.application.dtos.ResetPasswordRequest;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

/**
 * #148 — Politique de mot de passe UNIQUE (BR-AUT-003).
 *
 * <p>Prouve trois choses distinctes :
 * <ol>
 *   <li>la règle (>= 8, une majuscule, un chiffre) rejette chaque classe de mot
 *       de passe non conforme ;</li>
 *   <li>elle est <strong>identique</strong> sur les trois DTOs de création /
 *       modification — le bug d'origine était justement que register, reset et
 *       change-password divergeaient ;</li>
 *   <li>elle ne retombe <strong>PAS</strong> sur le chemin d'authentification
 *       ({@code AuthRequest}), sans quoi tout compte créé avant #148 avec un mot
 *       de passe à 6 caractères serait verrouillé (preuve bout-en-bout :
 *       {@code AuthControllerLegacyPasswordLoginTest}).</li>
 * </ol>
 *
 * <p>Jeu de rejet : trop court, sans majuscule, sans chiffre, et {@code abcdef}
 * (le mot de passe que l'ANCIENNE politique acceptait — il doit désormais être
 * refusé à la création, mais rester utilisable au login).
 */
class PasswordPolicyTest {

    private static final String OUT_OF_POLICY = "Ab1, Secret1, secret60, SecretAbc, abcdef";

    private static final String VALID = "Secret60";

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    // ---------------------------------------------------------------- register

    @ParameterizedTest
    @ValueSource(strings = { "Ab1", "Secret1", "secret60", "SecretAbc", "abcdef" })
    void register_rejectsPasswordOutsidePolicy(String password) {
        assertTrue(hasViolationOn(registerWith(password), "password"),
                "register doit rejeter le mot de passe hors politique : " + password);
    }

    @Test
    void register_acceptsCompliantPassword() {
        assertFalse(hasViolationOn(registerWith(VALID), "password"),
                "register doit accepter un mot de passe conforme");
    }

    @Test
    void register_rejectsPasswordLongerThanLoginAccepts() {
        // Sans borne haute, on pouvait créer un mot de passe que le login
        // (@Size(max = 100) sur AuthRequest) refusait ensuite de recevoir.
        String tooLong = "A1" + "a".repeat(StrongPasswordValidator.MAX_LENGTH);
        assertTrue(hasViolationOn(registerWith(tooLong), "password"),
                "register doit rejeter un mot de passe plus long que ce que le login accepte");
    }

    // ------------------------------------------------------------------- reset

    @ParameterizedTest
    @ValueSource(strings = { "Ab1", "Secret1", "secret60", "SecretAbc", "abcdef" })
    void resetPassword_rejectsPasswordOutsidePolicy(String password) {
        assertTrue(hasViolationOn(resetWith(password), "newPassword"),
                "reset-password doit rejeter le mot de passe hors politique : " + password);
    }

    @Test
    void resetPassword_acceptsCompliantPassword() {
        assertFalse(hasViolationOn(resetWith(VALID), "newPassword"),
                "reset-password doit accepter un mot de passe conforme");
    }

    // ------------------------------------------------------------------ change

    @ParameterizedTest
    @ValueSource(strings = { "Ab1", "Secret1", "secret60", "SecretAbc", "abcdef" })
    void changePassword_rejectsPasswordOutsidePolicy(String password) {
        assertTrue(hasViolationOn(changeWith("anythingLegacy", password), "newPassword"),
                "change-password doit rejeter le mot de passe hors politique : " + password);
    }

    @Test
    void changePassword_neverConstrainsOldPassword() {
        // `oldPassword` est un mot de passe EXISTANT, potentiellement antérieur à
        // #148. Le contraindre empêcherait un compte legacy de se mettre en
        // conformité — exactement l'inverse du but recherché.
        assertFalse(hasViolationOn(changeWith("abcdef", VALID), "oldPassword"),
                "oldPassword ne doit PAS être soumis à la politique de complexité");
    }

    // ----------------------------------------------- identité des trois règles

    @ParameterizedTest
    @ValueSource(strings = { "Ab1", "Secret1", "secret60", "SecretAbc", "abcdef", "Secret60", "MotDePasse2026" })
    void policyIsIdenticalAcrossCreationAndModificationEndpoints(String password) {
        boolean registerRejects = hasViolationOn(registerWith(password), "password");

        assertEquals(registerRejects, hasViolationOn(resetWith(password), "newPassword"),
                "register et reset-password doivent trancher identiquement : " + password);
        assertEquals(registerRejects,
                hasViolationOn(changeWith("anythingLegacy", password), "newPassword"),
                "register et change-password doivent trancher identiquement : " + password);
    }

    // ------------------------------------------------- le login reste épargné

    @ParameterizedTest
    @ValueSource(strings = { "abcdef", "secret", "Secret1" })
    void login_doesNotApplyThePolicy_soLegacyAccountsCanStillAuthenticate(String legacyPassword) {
        AuthRequest req = new AuthRequest();
        req.setUsername("legacyUser");
        req.setPassword(legacyPassword);

        assertFalse(hasViolationOn(req, "password"),
                "le login ne doit PAS appliquer la politique (" + OUT_OF_POLICY
                        + " restent des mots de passe légitimes en base) : " + legacyPassword);
    }

    // ------------------------------------------------------------------ outils

    private RegisterRequest registerWith(String password) {
        RegisterRequest req = new RegisterRequest();
        req.setName("Valid Name");
        req.setUsername("validUser");
        req.setEmail("valid@example.com");
        req.setPassword(password);
        return req;
    }

    private ResetPasswordRequest resetWith(String newPassword) {
        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setToken("38400000-8cf0-11bd-b23e-10b96e4ef00d");
        req.setNewPassword(newPassword);
        return req;
    }

    private ChangePasswordRequest changeWith(String oldPassword, String newPassword) {
        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setOldPassword(oldPassword);
        req.setNewPassword(newPassword);
        return req;
    }

    private <T> boolean hasViolationOn(T bean, String property) {
        Set<ConstraintViolation<T>> violations = validator.validate(bean);
        return violations.stream()
                .anyMatch(v -> property.equals(v.getPropertyPath().toString()));
    }
}
