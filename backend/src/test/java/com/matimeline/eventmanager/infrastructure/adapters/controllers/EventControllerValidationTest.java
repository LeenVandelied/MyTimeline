package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.application.dtos.EventCreationRequest;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.domain.ports.services.UserService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

/**
 * Validates that @Valid rejects an event with a blank required field with 400
 * before EventService is invoked (issue #31).
 */
@ExtendWith(MockitoExtension.class)
class EventControllerValidationTest {

    @Mock
    private EventService eventService;
    @Mock
    private ProductService productService;
    @Mock
    private UserService userService;
    @Mock
    private JwtService jwtService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        EventController controller = new EventController(eventService, productService, userService, jwtService);
        // GlobalExceptionHandler enregistré pour que MethodArgumentNotValidException -> 400
        // (le standaloneSetup n'embarque pas l'advice par défaut).
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void createEvent_blankName_returns400_andServiceNotCalled() throws Exception {
        String body = "{\"name\":\"\",\"type\":\"BIRTHDAY\",\"durationValue\":1,"
                + "\"durationUnit\":\"DAY\",\"isRecurring\":false,"
                + "\"productId\":\"" + java.util.UUID.randomUUID() + "\"}";

        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verify(eventService, never()).createEvent(org.mockito.ArgumentMatchers.any(EventCreationRequest.class));
    }

    @Test
    void createEvent_recurringWithoutRecurrenceUnit_returns400_andServiceNotCalled() throws Exception {
        // BR-EVE-006 (#54) : isRecurring=true + recurrenceUnit=null -> 400 (@AssertTrue).
        String body = "{\"name\":\"Anniv\",\"type\":\"single\",\"durationValue\":1,"
                + "\"durationUnit\":\"days\",\"isRecurring\":true,"
                + "\"productId\":\"" + java.util.UUID.randomUUID() + "\"}";

        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verify(eventService, never()).createEvent(org.mockito.ArgumentMatchers.any(EventCreationRequest.class));
    }
}
