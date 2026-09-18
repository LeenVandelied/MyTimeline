package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.infrastructure.security.CallerResolver;

/**
 * Validates that MethodArgumentNotValidException (@Valid failures) is mapped by
 * GlobalExceptionHandler to a 400 carrying the same structured body
 * {timestamp,status,error,message} as the 404 handlers, with a generic message
 * (no raw field-error list). Advice is wired explicitly via setControllerAdvice.
 */
@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerValidationTest {

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
    void validationFailure_returns400_withStructuredBody() throws Exception {
        String body = "{\"name\":\"\",\"type\":\"BIRTHDAY\",\"durationValue\":1,"
                + "\"durationUnit\":\"DAY\",\"isRecurring\":false,"
                + "\"productId\":\"" + java.util.UUID.randomUUID() + "\"}";

        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("validation_failed"))
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }
}
