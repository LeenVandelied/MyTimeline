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
 * #200/#231 — Verrouille le CONTRAT 409 event consommé par la modale comparative (#231) :
 * quand {@code eventService.updateEvent} lève {@link ObjectOptimisticLockingFailureException}
 * (édition concurrente d'une entité {@code @Version}), EventController recharge l'état serveur
 * GAGNANT (ownership déjà vérifié en amont) et lève {@code EventConflictException} ->
 * GlobalExceptionHandler la mappe en HTTP 409 ENRICHI : corps {@code {error, serverVersion,
 * serverEvent{...}}} (et NON un 500 non mappé, ni le corps plat #200). Les clés {@code timestamp}
 * / {@code status} du buildBody détaillé restent ABSENTES (contrat distinct).
 *
 * <p>Advice câblé explicitement (standaloneSetup). La chaîne d'ownership est mockée pour
 * atteindre eventService.updateEvent, qui lève l'exception simulant le 2e update concurrent ;
 * le rechargement d'état serveur (findEventById + findVersionById) est mocké.
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
    void optimisticLockFailure_returns409_withEnrichedBody() throws Exception {
        UUID eventId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        User caller = new User(callerId, "owner", "owner-username", "x", "USER", "owner@example.test");
        Product product = new Product(productId, "p", null, caller, List.of());
        // État serveur GAGNANT rechargé après le conflit (le titre committé par l'autre édition).
        Event serverEvent = new Event(eventId, "titre-serveur", "single", null, null, false, null, null,
                null, null, productId, false, "#3B82F6", false);
        // Version optimiste portée par l'entité serveur rechargée (EventResponse l'expose ;
        // le client la ré-arme sur « garder mes modifications »). Cohérente avec serverVersion.
        serverEvent.setVersion(7);

        // Ownership chain (checkEventOwnership) : caller (SecurityContext via CallerResolver)
        // -> event -> product owner == caller. findEventById sert AUSSI le rechargement d'état
        // serveur sur le chemin de conflit.
        when(callerResolver.currentUser()).thenReturn(Optional.of(caller));
        when(eventService.findEventById(eventId)).thenReturn(Optional.of(serverEvent));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(product));
        when(eventService.findVersionById(eventId)).thenReturn(Optional.of(7));

        // Le 2e update concurrent : Hibernate a détecté le conflit de version -> exception.
        when(eventService.updateEvent(eq(eventId), any(EventUpdateCommand.class)))
                .thenThrow(new ObjectOptimisticLockingFailureException(EventEntity.class, eventId));

        mockMvc.perform(patch("/api/events/{id}", eventId)
                        .cookie(new Cookie("jwt", "valid-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"nouveau titre\"}"))
                .andExpect(status().isConflict())
                // Message neutre conservé (rétro-compat #77) — pas de fuite de version dans le texte.
                .andExpect(jsonPath("$.error").exists())
                // Contrat ENRICHI #231 : serverVersion + entité serveur (projection EventResponse).
                .andExpect(jsonPath("$.serverVersion").value(7))
                .andExpect(jsonPath("$.serverEvent.id").value(eventId.toString()))
                .andExpect(jsonPath("$.serverEvent.title").value("titre-serveur"))
                .andExpect(jsonPath("$.serverEvent.productId").value(productId.toString()))
                .andExpect(jsonPath("$.serverEvent.archived").value(false))
                // Verrou contrat : la version optimiste de serverEvent est exposée (le client
                // la ré-arme sur « garder mes modifications » pour éviter une boucle de 409).
                .andExpect(jsonPath("$.serverEvent.version").value(7))
                // Forme distincte du buildBody détaillé : ni timestamp ni status.
                .andExpect(jsonPath("$.timestamp").doesNotExist())
                .andExpect(jsonPath("$.status").doesNotExist());
    }
}
