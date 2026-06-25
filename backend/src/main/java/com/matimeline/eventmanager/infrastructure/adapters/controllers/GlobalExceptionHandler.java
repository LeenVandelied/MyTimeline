package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.matimeline.eventmanager.domain.exceptions.CategoryNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.EventNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.ProductNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.UserNotFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler({
            EventNotFoundException.class,
            ProductNotFoundException.class,
            CategoryNotFoundException.class,
            UserNotFoundException.class
    })
    public ResponseEntity<Map<String, Object>> handleNotFound(RuntimeException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(buildBody(HttpStatus.NOT_FOUND, "Resource not found"));
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

    /**
     * Unauthenticated caller (missing/invalid/expired token) when the exception
     * reaches the DispatcherServlet. The "error" field is the literal code
     * "unauthorized" (acceptance criterion #51), no internal detail leaked.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(AuthenticationException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(buildBody(HttpStatus.UNAUTHORIZED, "unauthorized", "unauthorized"));
    }

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
