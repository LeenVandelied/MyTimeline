package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

import com.matimeline.eventmanager.application.dtos.EventUpdateRequest;

import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.domain.ports.services.UserService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

import jakarta.servlet.http.Cookie;

@ExtendWith(MockitoExtension.class)
class EventControllerOwnershipTest {

    @Mock
    private EventService eventService;
    @Mock
    private ProductService productService;
    @Mock
    private UserService userService;
    @Mock
    private JwtService jwtService;

    private MockMvc mockMvc;

    private UUID eventId;
    private UUID productId;
    private UUID ownerId;
    private UUID attackerId;

    @BeforeEach
    void setUp() {
        EventController controller = new EventController(eventService, productService, userService, jwtService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();

        eventId = UUID.randomUUID();
        productId = UUID.randomUUID();
        ownerId = UUID.randomUUID();
        attackerId = UUID.randomUUID();
    }

    @Test
    void deleteEvent_crossUser_returns403_andDoesNotDelete() throws Exception {
        User attacker = new User(attackerId, "Attacker", "attacker", "pwd", "ROLE_USER", "a@a.com");
        User owner = new User(ownerId, "Owner", "owner", "pwd", "ROLE_USER", "o@o.com");

        Event event = new Event(eventId, "title", "type", 1, "DAY", false, null, null, null, productId, false);
        Product product = new Product(productId, "prod", null, owner, java.util.List.of());

        when(jwtService.extractUsername("attacker-token")).thenReturn("attacker");
        when(userService.findDomainUserByUsername("attacker")).thenReturn(Optional.of(attacker));
        when(eventService.findEventById(eventId)).thenReturn(Optional.of(event));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(product));

        mockMvc.perform(delete("/api/events/" + eventId).cookie(new Cookie("jwt", "attacker-token")))
                .andExpect(status().isForbidden());

        verify(eventService, never()).deleteById(eventId);
    }

    @Test
    void patchEvent_crossUser_returns403_andDoesNotUpdate() throws Exception {
        User attacker = new User(attackerId, "Attacker", "attacker", "pwd", "ROLE_USER", "a@a.com");
        User owner = new User(ownerId, "Owner", "owner", "pwd", "ROLE_USER", "o@o.com");

        Event event = new Event(eventId, "title", "type", 1, "DAY", false, null, null, null, productId, false);
        Product product = new Product(productId, "prod", null, owner, java.util.List.of());

        when(jwtService.extractUsername("attacker-token")).thenReturn("attacker");
        when(userService.findDomainUserByUsername("attacker")).thenReturn(Optional.of(attacker));
        when(eventService.findEventById(eventId)).thenReturn(Optional.of(event));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(product));

        mockMvc.perform(patch("/api/events/" + eventId)
                        .cookie(new Cookie("jwt", "attacker-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"hacked\"}"))
                .andExpect(status().isForbidden());

        verify(eventService, never()).updateEvent(any(UUID.class), any(EventUpdateRequest.class));
    }

    @Test
    void deleteEvent_owner_returns200_andDeletes() throws Exception {
        User owner = new User(ownerId, "Owner", "owner", "pwd", "ROLE_USER", "o@o.com");
        Event event = new Event(eventId, "title", "type", 1, "DAY", false, null, null, null, productId, false);
        Product product = new Product(productId, "prod", null, owner, java.util.List.of());

        when(jwtService.extractUsername("owner-token")).thenReturn("owner");
        when(userService.findDomainUserByUsername("owner")).thenReturn(Optional.of(owner));
        when(eventService.findEventById(eventId)).thenReturn(Optional.of(event));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(product));

        mockMvc.perform(delete("/api/events/" + eventId).cookie(new Cookie("jwt", "owner-token")))
                .andExpect(status().isOk());

        verify(eventService).deleteById(eventId);
    }
}
