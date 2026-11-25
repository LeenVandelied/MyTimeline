package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.domain.exceptions.EventNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.EventQuotaExceededException;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.EventCreateCommand;
import com.matimeline.eventmanager.domain.models.EventUpdateCommand;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.infrastructure.security.CallerResolver;

import jakarta.servlet.http.Cookie;

/**
 * #127 — Verrouille le contrat des codes d'erreur stables snake_case renvoyés par
 * {@link GlobalExceptionHandler#buildBody} (champ {@code error}), en remplacement de
 * {@code HttpStatus.getReasonPhrase()} ("Not Found", "Bad Request"...). Cf. {@link ErrorCode}.
 *
 * <p>Advice câblé explicitement (standaloneSetup). La chaîne d'ownership est mockée pour
 * atteindre eventService.updateEvent, qui lève {@link EventNotFoundException} simulant une
 * ressource disparue entre le check d'ownership et l'update service (race bénigne).
 */
@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerErrorCodeTest {

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
    void notFoundException_returns404_withStableErrorCode() throws Exception {
        UUID eventId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        User caller = new User(callerId, "owner", "owner-username", "x", "USER", "owner@example.test");
        Product product = new Product(productId, "p", null, caller, List.of());
        Event event = new Event(eventId, "t", "single", null, null, false, null, null,
                null, null, productId, null, null, false);

        when(callerResolver.currentUser()).thenReturn(Optional.of(caller));
        when(eventService.findEventById(eventId)).thenReturn(Optional.of(event));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(product));

        when(eventService.updateEvent(eq(eventId), any(EventUpdateCommand.class)))
                .thenThrow(new EventNotFoundException(eventId));

        mockMvc.perform(patch("/api/events/{id}", eventId)
                        .cookie(new Cookie("jwt", "valid-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"nouveau titre\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("not_found"))
                .andExpect(jsonPath("$.message").value("Resource not found"));
    }

    /**
     * #88 (R8) : le quota dépassé répond 402 (Payment Required, pas un refus de droits) avec
     * le code stable event_quota_exceeded et un message lisible.
     */
    @Test
    void quotaExceeded_returnsStructuredErrorBody() throws Exception {
        UUID productId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        User caller = new User(callerId, "owner", "owner-username", "x", "USER", "owner@example.test");
        Product product = new Product(productId, "p", null, caller, List.of());

        when(callerResolver.currentUser()).thenReturn(Optional.of(caller));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(product));
        when(eventService.createEvent(any(EventCreateCommand.class)))
                .thenThrow(new EventQuotaExceededException(callerId));

        mockMvc.perform(post("/api/events")
                        .cookie(new Cookie("jwt", "valid-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"n\",\"type\":\"single\",\"durationValue\":1,"
                                + "\"durationUnit\":\"days\",\"isRecurring\":false,"
                                + "\"productId\":\"" + productId + "\"}"))
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.status").value(402))
                .andExpect(jsonPath("$.error").value("event_quota_exceeded"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }
}
