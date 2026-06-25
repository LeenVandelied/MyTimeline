package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import com.matimeline.eventmanager.application.dtos.EventCreationRequest;
import com.matimeline.eventmanager.application.dtos.EventUpdateRequest;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.domain.ports.services.UserService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

import io.jsonwebtoken.JwtException;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;
    private final ProductService productService;
    private final UserService userService;
    private final JwtService jwtService;

    @Autowired
    public EventController(EventService eventService,
                           ProductService productService,
                           UserService userService,
                           JwtService jwtService) {
        this.eventService = eventService;
        this.productService = productService;
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping
    public ResponseEntity<Event> createEvent(@Valid @RequestBody EventCreationRequest request,
                                             @CookieValue(value = "jwt", required = false) String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User caller = resolveCaller(token);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Product> product = productService.findDomainProductById(request.getProductId());
        if (product.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        if (product.get().getUser() == null
                || !product.get().getUser().getId().equals(caller.getId())) {
            throw new AccessDeniedException("forbidden");
        }

        Event event = eventService.createEvent(request);
        return ResponseEntity.ok(event);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Event> updateEvent(@PathVariable UUID id,
                                             @Valid @RequestBody EventUpdateRequest request,
                                             @CookieValue(value = "jwt", required = false) String token) {
        ResponseEntity<Event> denied = checkEventOwnership(id, token);
        if (denied != null) {
            return denied;
        }
        Event updatedEvent = eventService.updateEvent(id, request);
        return ResponseEntity.ok(updatedEvent);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID id,
                                            @CookieValue(value = "jwt", required = false) String token) {
        ResponseEntity<Event> denied = checkEventOwnership(id, token);
        if (denied != null) {
            return ResponseEntity.status(denied.getStatusCode()).build();
        }
        eventService.deleteById(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Verifies the authenticated user owns the event (event -> product -> product.user).
     * Returns a non-null ResponseEntity carrying a 401/404 status, or null when ownership is
     * confirmed. An ownership violation throws AccessDeniedException so the centralized
     * @RestControllerAdvice emits the uniform {"error":"forbidden"} 403 body (BR-AUT-007).
     * Identity is derived from the JWT, never from a path param.
     */
    private ResponseEntity<Event> checkEventOwnership(UUID eventId, String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User caller = resolveCaller(token);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Event> event = eventService.findEventById(eventId);
        if (event.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        Optional<Product> product = productService.findDomainProductById(event.get().getProductId());
        if (product.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        if (product.get().getUser() == null
                || !product.get().getUser().getId().equals(caller.getId())) {
            throw new AccessDeniedException("forbidden");
        }

        return null;
    }

    /**
     * Resolves the authenticated User from the JWT, or null when the token is
     * malformed/expired/invalid (JwtException) or the user is unknown.
     * Identity is derived from the JWT, never from a path or body param.
     */
    private User resolveCaller(String token) {
        try {
            String username = jwtService.extractUsername(token);
            return userService.findDomainUserByUsername(username).orElse(null);
        } catch (JwtException e) {
            return null;
        }
    }
}
