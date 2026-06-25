package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<Event> createEvent(@RequestBody EventCreationRequest request) {
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
     * Returns a non-null ResponseEntity carrying the error status when access must be denied,
     * or null when ownership is confirmed. Identity is derived from the JWT, never from a path param.
     */
    private ResponseEntity<Event> checkEventOwnership(UUID eventId, String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String username = jwtService.extractUsername(token);
        Optional<User> user = userService.findDomainUserByUsername(username);
        if (user.isEmpty()) {
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
                || !product.get().getUser().getId().equals(user.get().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return null;
    }
}
