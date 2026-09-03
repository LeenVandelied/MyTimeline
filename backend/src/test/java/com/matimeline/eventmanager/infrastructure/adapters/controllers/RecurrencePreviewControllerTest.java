package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.domain.models.RecurrenceExpansion;
import com.matimeline.eventmanager.domain.models.RecurrenceUnit;
import com.matimeline.eventmanager.domain.ports.services.RecurrenceExpansionService;

/**
 * Slice contrôleur (#439) : contrat HTTP de {@code POST /api/events/recurrence-preview}.
 *
 * <p>Le port {@link RecurrenceExpansionService} est MOCKÉ — la logique de capping réelle
 * (plafond {@code MAX_OCCURRENCES} / horizon {@code MAX_UNBOUNDED_EXPANSION_YEARS}) est déjà
 * couverte par {@code RecurrenceExpansionServiceImplTest}. Ici on vérifie UNIQUEMENT la
 * traduction contrôleur : forme JSON {@code {count, capped}}, mapping des statuts (200 / 422 /
 * 400) et non-appel du service quand la Bean Validation échoue en amont.
 *
 * <p>{@code standaloneSetup} + {@link GlobalExceptionHandler} enregistré : reproduit le
 * mapping 422 (BR-EVE-012) et 400 (@Valid) sans démarrer le contexte Spring complet.
 */
@ExtendWith(MockitoExtension.class)
class RecurrencePreviewControllerTest {

    @Mock
    private RecurrenceExpansionService recurrenceExpansionService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        RecurrencePreviewController controller = new RecurrencePreviewController(recurrenceExpansionService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void previewRecurrence_boundedSeriesUnderLimit_returns200_countAndCappedFalse() throws Exception {
        // Série bornée courte : le service rend 3 occurrences, non tronquée.
        List<LocalDate> occ = List.of(
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 8),
                LocalDate.of(2026, 1, 15));
        when(recurrenceExpansionService.expand(
                eq(LocalDate.of(2026, 1, 1)), eq(RecurrenceUnit.WEEK), eq(LocalDate.of(2026, 1, 15))))
                .thenReturn(new RecurrenceExpansion(occ, false));

        String body = "{\"startDate\":\"2026-01-01\",\"recurrenceUnit\":\"WEEK\","
                + "\"recurrenceEndDate\":\"2026-01-15\"}";

        mockMvc.perform(post("/api/events/recurrence-preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(3))
                .andExpect(jsonPath("$.capped").value(false));
    }

    @Test
    void previewRecurrence_unboundedSeriesTruncated_returns200_cappedTrue() throws Exception {
        // Série sans recurrenceEndDate : le service la tronque (horizon 5 ans) -> capped=true.
        List<LocalDate> occ = new ArrayList<>();
        for (int i = 0; i < 61; i++) {
            occ.add(LocalDate.of(2026, 1, 1).plusMonths(i));
        }
        when(recurrenceExpansionService.expand(
                eq(LocalDate.of(2026, 1, 1)), eq(RecurrenceUnit.MONTH), eq(null)))
                .thenReturn(new RecurrenceExpansion(occ, true));

        String body = "{\"startDate\":\"2026-01-01\",\"recurrenceUnit\":\"MONTH\"}";

        mockMvc.perform(post("/api/events/recurrence-preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(61))
                .andExpect(jsonPath("$.capped").value(true));
    }

    @Test
    void previewRecurrence_recurrenceEndDateBeforeStart_returns422() throws Exception {
        // Le service lève IllegalArgumentException ; le contrôleur la traduit en
        // RecurrenceEndDateBeforeStartException -> 422 (même sémantique BR-EVE-012 que le CRUD).
        when(recurrenceExpansionService.expand(any(), any(), any()))
                .thenThrow(new IllegalArgumentException(
                        "recurrenceEndDate (2025-12-31) est antérieure à startDate (2026-01-01)"));

        String body = "{\"startDate\":\"2026-01-01\",\"recurrenceUnit\":\"WEEK\","
                + "\"recurrenceEndDate\":\"2025-12-31\"}";

        mockMvc.perform(post("/api/events/recurrence-preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error").value("unprocessable_entity"));
    }

    @Test
    void previewRecurrence_missingStartDate_returns400_andServiceNotCalled() throws Exception {
        String body = "{\"recurrenceUnit\":\"WEEK\"}";

        mockMvc.perform(post("/api/events/recurrence-preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verify(recurrenceExpansionService, never()).expand(any(), any(), any());
    }

    @Test
    void previewRecurrence_missingRecurrenceUnit_returns400_andServiceNotCalled() throws Exception {
        String body = "{\"startDate\":\"2026-01-01\"}";

        mockMvc.perform(post("/api/events/recurrence-preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verify(recurrenceExpansionService, never()).expand(any(), any(), any());
    }
}
