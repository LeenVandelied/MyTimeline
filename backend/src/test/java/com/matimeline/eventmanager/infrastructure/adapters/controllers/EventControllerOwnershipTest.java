package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.matimeline.eventmanager.application.services.EventServiceImpl;
import com.matimeline.eventmanager.application.services.ProductServiceImpl;
import com.matimeline.eventmanager.application.services.UserServiceImpl;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.EventCreateCommand;
import com.matimeline.eventmanager.domain.models.EventUpdateCommand;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.infrastructure.security.JwtService;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.servlet.http.Cookie;

/**
 * Contrat d'intégration #119 — réponse 403 ownership servie EN CONTEXTE SECURITY RÉEL.
 *
 * <p>Le test précédent montait le contrôleur en {@code standaloneSetup} avec
 * {@code GlobalExceptionHandler} branché manuellement comme {@code @ControllerAdvice}.
 * Il validait donc un chemin qui n'existe PAS en production : le 403 d'ownership y
 * était produit par le {@code @RestControllerAdvice}. En prod, la chaîne de filtres
 * Spring Security est active — l'{@code AccessDeniedException} métier levée dans le
 * contrôleur (ownership) remonte jusqu'au {@code ExceptionTranslationFilter}, qui la
 * route vers {@code SecurityConfig.accessDeniedHandler}, UNIQUE émetteur du corps
 * {@code {"error":"forbidden"}}. Le handler du {@code @RestControllerAdvice} a été
 * supprimé (#119) ; ce test garantit que le corps réellement servi reste correct.
 *
 * <p>Montage : {@code @SpringBootTest} + {@code @AutoConfigureMockMvc} → filtre Security
 * réel. {@code @WithMockUser(authorities=ROLE_USER)} franchit la règle
 * {@code hasAuthority("ROLE_USER")} de {@code authorizeHttpRequests} pour ATTEINDRE le
 * contrôleur (sans elle on obtiendrait un 403 d'autorité, pas le 403 d'ownership testé).
 * Le {@code JwtFilter} ne réécrit pas le contexte déjà posé par {@code @WithMockUser}
 * (garde {@code getAuthentication() == null}). Les services métier sont mockés
 * ({@code @MockBean}) pour piloter le scénario attaquant ≠ propriétaire sans DB ;
 * {@code AbstractPostgresIntegrationTest} fournit le conteneur Postgres requis par le
 * démarrage du contexte (Flyway/Hibernate validate).
 */
@SpringBootTest
@AutoConfigureMockMvc
class EventControllerOwnershipTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    // On mocke les types CONCRETS *ServiceImpl (et non les interfaces) : plusieurs
    // contrôleurs (Auth/Product/Category) injectent le concret (anti-pattern A8 repo-wide).
    // Un mock du concret satisfait à la fois ces contrôleurs ET EventController qui dépend
    // des interfaces (Impl implements l'interface). Mocker l'interface laisserait les
    // contrôleurs à injection concrète sans bean → ApplicationContext KO.
    @MockBean
    private EventServiceImpl eventService;
    @MockBean
    private ProductServiceImpl productService;
    @MockBean
    private UserServiceImpl userService;
    @MockBean
    private JwtService jwtService;

    private UUID eventId;
    private UUID productId;
    private UUID ownerId;
    private UUID attackerId;

    @BeforeEach
    void setUp() {
        eventId = UUID.randomUUID();
        productId = UUID.randomUUID();
        ownerId = UUID.randomUUID();
        attackerId = UUID.randomUUID();
    }

    private void stubCrossUserOwnership() {
        User attacker = new User(attackerId, "Attacker", "attacker", "pwd", "ROLE_USER", "a@a.com");
        User owner = new User(ownerId, "Owner", "owner", "pwd", "ROLE_USER", "o@o.com");

        Event event = new Event(eventId, "title", "type", 1, "DAY", false, null, null, null, productId, false);
        Product product = new Product(productId, "prod", null, owner, java.util.List.of());

        when(jwtService.extractUsername("attacker-token")).thenReturn("attacker");
        when(userService.findDomainUserByUsername("attacker")).thenReturn(Optional.of(attacker));
        when(eventService.findEventById(eventId)).thenReturn(Optional.of(event));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(product));
    }

    /**
     * DELETE cross-user : l'attaquant (ROLE_USER mais ≠ propriétaire) déclenche
     * l'{@code AccessDeniedException} métier dans le contrôleur. Le 403 réellement
     * servi par la chaîne Security DOIT porter {@code {"error":"forbidden"}} ; la
     * suppression ne doit jamais être exécutée.
     */
    @Test
    @WithMockUser(username = "attacker", authorities = {"ROLE_USER"})
    void deleteEvent_crossUser_returns403ForbiddenJson_andDoesNotDelete() throws Exception {
        stubCrossUserOwnership();

        mockMvc.perform(delete("/api/events/" + eventId).cookie(new Cookie("jwt", "attacker-token")))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("forbidden"));

        verify(eventService, never()).deleteById(eventId);
    }

    /**
     * PATCH cross-user : même garantie sur l'endpoint de mise à jour — 403
     * {@code {"error":"forbidden"}} servi par {@code accessDeniedHandler}, aucune
     * mutation appliquée.
     */
    @Test
    @WithMockUser(username = "attacker", authorities = {"ROLE_USER"})
    void patchEvent_crossUser_returns403ForbiddenJson_andDoesNotUpdate() throws Exception {
        stubCrossUserOwnership();

        mockMvc.perform(patch("/api/events/" + eventId)
                        .cookie(new Cookie("jwt", "attacker-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"hacked\"}"))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("forbidden"));

        verify(eventService, never()).updateEvent(any(UUID.class), any(EventUpdateCommand.class));
    }

    /**
     * Chemin propriétaire (contrôle négatif) : le caller EST le propriétaire,
     * aucune {@code AccessDeniedException}, la suppression aboutit (200) et est
     * bien déléguée au service.
     */
    @Test
    @WithMockUser(username = "owner", authorities = {"ROLE_USER"})
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

    /**
     * #165 : POST /api/events (propriétaire) DOIT répondre 201 Created (auparavant 200)
     * avec un corps {@code EventResponse} (plus le modèle domaine brut). Ce test verrouille
     * le nouveau contrat consommé par #150 : code 201 + champs/noms JSON exacts
     * (title, isAllDay, color, archived, recurrenceUnit sérialisé en nom d'enum...).
     */
    @Test
    @WithMockUser(username = "owner", authorities = {"ROLE_USER"})
    void createEvent_owner_returns201_withEventResponseBody() throws Exception {
        User owner = new User(ownerId, "Owner", "owner", "pwd", "ROLE_USER", "o@o.com");
        Product product = new Product(productId, "prod", null, owner, java.util.List.of());

        Event created = new Event(
                eventId, "Anniv", "single", 1, "days",
                false, null, null,
                java.time.LocalDate.of(2026, 7, 2), java.time.LocalDate.of(2026, 7, 2),
                productId, true, "#abcdef", false);

        when(jwtService.extractUsername("owner-token")).thenReturn("owner");
        when(userService.findDomainUserByUsername("owner")).thenReturn(Optional.of(owner));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(product));
        when(eventService.createEvent(any(EventCreateCommand.class))).thenReturn(created);

        String body = "{\"name\":\"Anniv\",\"type\":\"single\",\"durationValue\":1,"
                + "\"durationUnit\":\"days\",\"isRecurring\":false,\"isAllDay\":true,"
                + "\"color\":\"#abcdef\",\"productId\":\"" + productId + "\"}";

        mockMvc.perform(post("/api/events")
                        .cookie(new Cookie("jwt", "owner-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(eventId.toString()))
                .andExpect(jsonPath("$.title").value("Anniv"))
                .andExpect(jsonPath("$.type").value("single"))
                .andExpect(jsonPath("$.isAllDay").value(true))
                .andExpect(jsonPath("$.color").value("#abcdef"))
                .andExpect(jsonPath("$.archived").value(false))
                .andExpect(jsonPath("$.productId").value(productId.toString()));

        verify(eventService).createEvent(any(EventCreateCommand.class));
    }
}
