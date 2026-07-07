package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.EventUpdateCommand;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.security.CallerResolver;

import jakarta.servlet.http.Cookie;

/**
 * #200 — Verrouille le CONTRAT 409 consommé par #77 (Vague 2) : quand la couche service
 * lève {@link ObjectOptimisticLockingFailureException} (édition concurrente d'une entité
 * {@code @Version}), GlobalExceptionHandler la mappe en HTTP 409 avec un corps plat
 * {@code {"error":"..."}} (même forme que CategoryNameConflict), et NON un 500 non mappé.
 *
 * <p>Advice câblé explicitement (standaloneSetup). La chaîne d'ownership est mockée pour
 * atteindre eventService.updateEvent, qui lève l'exception simulant le 2e update concurrent.
 */
@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerOptimisticLockTest {

    @Mock
    private EventService eventService;
    @Mock
    private ProductService productService;
    @Mock
    private CallerResolver callerResolver;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        EventController controller = new EventController(eventService, productService, callerResolver);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void optimisticLockFailure_returns409_withFlatBody() throws Exception {
        UUID eventId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        User caller = new User(callerId, "owner", "owner-username", "x", "USER", "owner@example.test");
        Product product = new Product(productId, "p", null, caller, List.of());
        Event event = new Event(eventId, "t", "single", null, null, false, null, null,
                null, null, productId, null, null, false);

        // Ownership chain (checkEventOwnership) : caller (SecurityContext via CallerResolver)
        // -> event -> product owner == caller.
        when(callerResolver.currentUser()).thenReturn(Optional.of(caller));
        when(eventService.findEventById(eventId)).thenReturn(Optional.of(event));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(product));

        // Le 2e update concurrent : Hibernate a détecté le conflit de version -> exception.
        when(eventService.updateEvent(eq(eventId), any(EventUpdateCommand.class)))
                .thenThrow(new ObjectOptimisticLockingFailureException(EventEntity.class, eventId));

        mockMvc.perform(patch("/api/events/{id}", eventId)
                        .cookie(new Cookie("jwt", "valid-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"nouveau titre\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").exists())
                .andExpect(jsonPath("$.timestamp").doesNotExist())
                .andExpect(jsonPath("$.status").doesNotExist());
    }
}
