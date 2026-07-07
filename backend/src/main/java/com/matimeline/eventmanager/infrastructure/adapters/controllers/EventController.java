package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import com.matimeline.eventmanager.application.dtos.EventCreationRequest;
import com.matimeline.eventmanager.application.dtos.EventResponse;
import com.matimeline.eventmanager.application.dtos.EventUpdateRequest;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.EventCreateCommand;
import com.matimeline.eventmanager.domain.models.EventUpdateCommand;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.infrastructure.security.CallerResolver;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;
    private final ProductService productService;
    private final CallerResolver callerResolver;

    @Autowired
    public EventController(EventService eventService,
                           ProductService productService,
                           CallerResolver callerResolver) {
        this.eventService = eventService;
        this.productService = productService;
        this.callerResolver = callerResolver;
    }

    @PostMapping
    public ResponseEntity<EventResponse> createEvent(@Valid @RequestBody EventCreationRequest request) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User caller = callerOpt.get();

        Optional<Product> product = productService.findDomainProductById(request.getProductId());
        if (product.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        if (product.get().getUser() == null
                || !product.get().getUser().getId().equals(caller.getId())) {
            throw new AccessDeniedException("forbidden");
        }

        // #165 : traduction DTO HTTP -> commande domaine PURE (le port n'importe plus
        // application.dtos). Le controller (infra) est le seul point de couplage au DTO.
        Event event = eventService.createEvent(toCreateCommand(request));
        // #165 : POST renvoie 201 Created (auparavant 200) + EventResponse (plus l'entité
        // domaine brute). Contrat consommé par #150.
        return ResponseEntity.status(HttpStatus.CREATED).body(EventResponse.fromDomain(event));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<EventResponse> updateEvent(@PathVariable UUID id,
                                             @Valid @RequestBody EventUpdateRequest request) {
        ResponseEntity<EventResponse> denied = checkEventOwnership(id);
        if (denied != null) {
            return denied;
        }
        Event updatedEvent = eventService.updateEvent(id, toUpdateCommand(request));
        return ResponseEntity.ok(EventResponse.fromDomain(updatedEvent));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID id) {
        ResponseEntity<EventResponse> denied = checkEventOwnership(id);
        if (denied != null) {
            return ResponseEntity.status(denied.getStatusCode()).build();
        }
        eventService.deleteById(id);
        return ResponseEntity.ok().build();
    }

    /** #165 : mappe le DTO HTTP de création vers la commande domaine pure. */
    private EventCreateCommand toCreateCommand(EventCreationRequest request) {
        return new EventCreateCommand(
                request.getName(),
                request.getType(),
                request.getDurationValue(),
                request.getDurationUnit(),
                request.getIsRecurring(),
                request.getRecurrenceUnit(),
                request.getDate(),
                request.getIsAllDay(),
                request.getColor(),
                request.getProductId());
    }

    /** #165 : mappe le DTO HTTP de mise à jour partielle vers la commande domaine pure. */
    private EventUpdateCommand toUpdateCommand(EventUpdateRequest request) {
        return new EventUpdateCommand(
                request.getTitle(),
                request.getType(),
                request.getDurationValue(),
                request.getDurationUnit(),
                request.getIsRecurring(),
                request.getRecurrenceUnit(),
                request.getRecurrenceEndDate(),
                request.getStartDate(),
                request.getEndDate(),
                request.getColor(),
                request.getArchived());
    }

    /**
     * Verifies the authenticated user owns the event (event -> product -> product.user).
     * Returns a non-null ResponseEntity carrying a 401/404 status, or null when ownership is
     * confirmed. An ownership violation throws AccessDeniedException, qui remonte jusqu'au
     * ExceptionTranslationFilter de Spring Security et est routée vers
     * SecurityConfig.accessDeniedHandler — l'unique émetteur du corps 403 {"error":"forbidden"}
     * (#119, BR-AUT-007). Identité résolue via {@link CallerResolver} (SecurityContext peuplé par
     * JwtFilter, cookie OU Bearer), jamais d'un path param.
     */
    private ResponseEntity<EventResponse> checkEventOwnership(UUID eventId) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User caller = callerOpt.get();

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
}
