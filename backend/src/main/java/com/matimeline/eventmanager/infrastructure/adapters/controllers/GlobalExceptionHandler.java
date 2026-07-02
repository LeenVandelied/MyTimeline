package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.matimeline.eventmanager.domain.exceptions.AccountDeletionMismatchException;
import com.matimeline.eventmanager.domain.exceptions.CategoryInUseException;
import com.matimeline.eventmanager.domain.exceptions.CategoryNameConflictException;
import com.matimeline.eventmanager.domain.exceptions.CategoryNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.CategoryReassignTargetInvalidException;
import com.matimeline.eventmanager.domain.exceptions.EventNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.InvalidCredentialsException;
import com.matimeline.eventmanager.domain.exceptions.InvalidDurationUnitException;
import com.matimeline.eventmanager.domain.exceptions.InvalidPasswordResetTokenException;
import com.matimeline.eventmanager.domain.exceptions.ProductNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.RecurrenceUnitRequiredException;
import com.matimeline.eventmanager.domain.exceptions.SamePasswordException;
import com.matimeline.eventmanager.domain.exceptions.SessionNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.UserNotFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler({
            EventNotFoundException.class,
            ProductNotFoundException.class,
            CategoryNotFoundException.class,
            UserNotFoundException.class,
            SessionNotFoundException.class
    })
    public ResponseEntity<Map<String, Object>> handleNotFound(RuntimeException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(buildBody(HttpStatus.NOT_FOUND, "Resource not found"));
    }

    @ExceptionHandler(CategoryNameConflictException.class)
    public ResponseEntity<Map<String, Object>> handleCategoryNameConflict(CategoryNameConflictException ex) {
        // BR-CAT-004 (#52) : nom de catégorie déjà pris par CET utilisateur -> 409.
        // Corps plat {"error":...} cohérent avec les autres erreurs métier.
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("error", "category name already used"));
    }

    @ExceptionHandler(CategoryInUseException.class)
    public ResponseEntity<Map<String, Object>> handleCategoryInUse(CategoryInUseException ex) {
        // AP-CAT-05 (#52) : suppression d'une catégorie référencée sans réassignation
        // -> 409. Le message métier explicite (nombre de produits + marche à suivre)
        // est renvoyé tel quel pour guider le client (critère d'acceptation).
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidCredentials(InvalidCredentialsException ex) {
        // #70 : ancien mot de passe faux (POST /api/me/change-password) -> 400.
        // Corps plat {"error":...} cohérent avec les autres erreurs métier des
        // contrôleurs (login/register), distinct du corps détaillé buildBody.
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "invalid current password"));
    }

    @ExceptionHandler(SamePasswordException.class)
    public ResponseEntity<Map<String, Object>> handleSamePassword(SamePasswordException ex) {
        // Review PR #132 : nouveau mot de passe identique à l'ancien -> 400.
        // Même corps plat {"error":...} que InvalidCredentialsException.
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "new password must differ"));
    }

    @ExceptionHandler(AccountDeletionMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleAccountDeletionMismatch(AccountDeletionMismatchException ex) {
        // #78 (BR-AUT-001 variante) : username de confirmation != caller (dérivé du JWT)
        // -> 400. Message neutre {"error":...} (anti-énumération : ne révèle pas si un
        // autre compte porte ce username), cohérent avec les autres erreurs métier 400.
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "username confirmation does not match"));
    }

    @ExceptionHandler(InvalidPasswordResetTokenException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidPasswordResetToken(InvalidPasswordResetTokenException ex) {
        // #49 : token de réinitialisation inexistant / mal formé / expiré (>15 min) /
        // déjà consommé -> 400. Corps plat {"error":...} générique (anti-énumération :
        // ne distingue pas les causes), cohérent avec les autres erreurs métier.
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "invalid or expired token"));
    }

    @ExceptionHandler(CategoryReassignTargetInvalidException.class)
    public ResponseEntity<Map<String, Object>> handleCategoryReassignTargetInvalid(
            CategoryReassignTargetInvalidException ex) {
        // FIX review #153 : DELETE avec reassignToCategoryId == id (cible == source) -> 409
        // avec un message DÉDIÉ (au lieu de réutiliser CategoryInUseException, dont le
        // message « fournissez reassignToCategoryId » était trompeur pour ce cas).
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("error", ex.getMessage()));
    }

    // FIX review #153 : SUPPRESSION du @ExceptionHandler(DataIntegrityViolationException)
    // global. Il mappait TOUTE violation de contrainte en 409 « nom déjà utilisé »,
    // masquant des violations non liées (FK RESTRICT owner_id, autres contraintes) sous
    // un message trompeur. La protection anti-race d'unicité est désormais SCOPÉE au save
    // dans CategoryServiceImpl (try/catch -> CategoryNameConflictException). Les autres
    // violations remontent normalement (500 générique) sans être masquées.

    @ExceptionHandler(InvalidDurationUnitException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidDurationUnit(InvalidDurationUnitException ex) {
        // BR-EVE-004 (#54) : durationUnit null/inconnu pour type='duration' -> 422
        // Unprocessable Entity. La requête est bien formée (400 = Bean Validation en amont)
        // mais le calcul d'endDate est impossible. Enveloppe l'ancienne NPE(500)/
        // IllegalArgumentException brute de Utils.calculateEndDate. Corps détaillé buildBody
        // (même forme que les 400/404) — message métier explicite pour guider le client.
        return ResponseEntity
                .status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(buildBody(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage()));
    }

    @ExceptionHandler(RecurrenceUnitRequiredException.class)
    public ResponseEntity<Map<String, Object>> handleRecurrenceUnitRequired(RecurrenceUnitRequiredException ex) {
        // BR-EVE-006 (#95fix) : PATCH /api/events/{id} amenant l'état fusionné à
        // isRecurring=true / recurrenceUnit=null -> 400. Le chemin CREATE l'impose déjà via
        // @AssertTrue (400) ; ici la garde est côté service (état fusionné, pas payload) car
        // un PATCH partiel peut légitimement s'appuyer sur un recurrenceUnit déjà en base.
        // Corps plat {"error":...} cohérent avec les autres erreurs métier 400.
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "recurrenceUnit is required when isRecurring is true"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(buildBody(HttpStatus.BAD_REQUEST, "Validation failed"));
    }

    // NOTE (#119) : aucun @ExceptionHandler(AccessDeniedException) ici. Les accès
    // refusés (403) — règle hasAuthority OU AccessDeniedException métier levée dans
    // un contrôleur (ownership) — remontent jusqu'au ExceptionTranslationFilter de
    // Spring Security, qui les route vers SecurityConfig.accessDeniedHandler.
    // Ce dernier est l'UNIQUE point de vérité du corps 403 {"error":"forbidden"}.
    // Un handler ici créait un chemin jamais exécuté en prod : le @RestControllerAdvice
    // n'est pas atteint pour les 403 interceptés par la chaîne de filtres Security.

    // NOTE (review PR #121) : aucun @ExceptionHandler(AuthenticationException) ici.
    // Même raisonnement que le 403 (#119) : les 401 d'authentification levés dans la
    // chaîne de filtres Spring Security sont interceptés par ExceptionTranslationFilter
    // et routés vers SecurityConfig.authenticationEntryPoint, UNIQUE point de vérité du
    // corps 401 {"error":"unauthorized"}. AuthController gère lui-même ses exceptions
    // d'auth (BadCredentials, JWT expiré/invalide) et renvoie directement. Un handler ici
    // produisait un corps de forme différente ({timestamp,status,error,message}) sur un
    // chemin jamais atteint en prod — supprimé pour éviter la divergence de contrat 401.

    private Map<String, Object> buildBody(HttpStatus status, String message) {
        return buildBody(status, status.getReasonPhrase(), message);
    }

    private Map<String, Object> buildBody(HttpStatus status, String error, String message) {
        return Map.of(
                "timestamp", Instant.now().toString(),
                "status", status.value(),
                "error", error,
                "message", message
        );
    }
}
