package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.domain.ports.services.UserService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

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
    private UserService userService;
    @Mock
    private JwtService jwtService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        EventController controller = new EventController(eventService, productService, userService, jwtService);
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
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }

    /**
     * FIX review S10 : une race d'unicité (UNIQUE(owner_id,name)) lève une
     * DataIntegrityViolationException NON mappée -> 500 avec fuite du détail SQL.
     * Le handler la mappe en 409 avec un message métier générique, sans SQL. Difficile
     * à provoquer via un vrai concurrent : on invoque le handler directement (unit) et
     * on vérifie code + corps sans divulgation du message d'exception d'origine.
     */
    @Test
    void handleDataIntegrityViolation_returns409_withGenericMessage_noSqlLeak() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        DataIntegrityViolationException dbEx = new DataIntegrityViolationException(
                "ERROR: duplicate key value violates unique constraint \"uq_owner_name\"");

        ResponseEntity<Map<String, Object>> resp = handler.handleDataIntegrityViolation(dbEx);

        assertEquals(HttpStatus.CONFLICT, resp.getStatusCode());
        assertEquals("Conflit d'intégrité (nom déjà utilisé ou contrainte violée).",
                resp.getBody().get("error"));
        // Anti-fuite : le détail SQL d'origine ne doit pas apparaître dans le corps.
        org.junit.jupiter.api.Assertions.assertFalse(
                resp.getBody().toString().contains("uq_owner_name"));
    }
}
