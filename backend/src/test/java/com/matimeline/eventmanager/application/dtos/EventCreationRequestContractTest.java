package com.matimeline.eventmanager.application.dtos;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * BR-EVE-014 (#168) : contrat du DTO de création events.
 *
 * <p>Vérifie que {@code color} est exposé au même titre que sur {@code EventUpdateRequest}
 * (auparavant asymétrie create/update : impossible de créer un event coloré directement).
 * Champ additif optionnel — l'absence de {@code color} dans le JSON reste valide (non-cassant).
 */
class EventCreationRequestContractTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldExposeColorAtCreation() throws Exception {
        String body = "{\"name\":\"Anniv\",\"type\":\"single\",\"durationValue\":1,"
                + "\"durationUnit\":\"days\",\"isRecurring\":false,\"color\":\"#ff8800\","
                + "\"productId\":\"" + java.util.UUID.randomUUID() + "\"}";

        EventCreationRequest request = objectMapper.readValue(body, EventCreationRequest.class);

        assertThat(request.getColor()).isEqualTo("#ff8800");
    }

    @Test
    void shouldRemainValidWhenColorAbsent_nonBreaking() throws Exception {
        String body = "{\"name\":\"Anniv\",\"type\":\"single\",\"durationValue\":1,"
                + "\"durationUnit\":\"days\",\"isRecurring\":false,"
                + "\"productId\":\"" + java.util.UUID.randomUUID() + "\"}";

        EventCreationRequest request = objectMapper.readValue(body, EventCreationRequest.class);

        assertThat(request.getColor()).isNull();
    }
}
