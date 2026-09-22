package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import com.matimeline.eventmanager.domain.exceptions.EventConflictException;
import com.matimeline.eventmanager.domain.exceptions.ExportFormatNotSupportedException;
import com.matimeline.eventmanager.domain.exceptions.RecurrenceUnitRequiredException;
import com.matimeline.eventmanager.domain.models.Event;

/**
 * #290 — Contrat d'erreur structuré {@code buildBody} sur les handlers migrés du
 * {@link GlobalExceptionHandler} qui construisaient auparavant un corps PLAT
 * {@code {"error":<texte>}}. Après migration, le corps porte
 * {@code {timestamp,status,error:<code stable>,message:<texte humain>}} : {@code error}
 * devient un code stable (taxonomie NIVEAU STATUT, cf. {@link ErrorCode}) et le texte
 * humain part dans {@code message}.
 *
 * <p>Test unitaire pur (invocation directe des méthodes du handler, sans MockMvc/contexte
 * Spring) : couvre les handlers SANS test HTTP dédié (export, upload-size, recurrenceUnit,
 * conflit de version optimiste générique) et VERROUILLE la non-régression du handler
 * {@link GlobalExceptionHandler#handleEventConflict} (corps ENRICHI #231 NON migré).
 */
class GlobalExceptionHandlerContractTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleExportFormatNotSupported_returns400_structuredBadRequest() {
        ResponseEntity<Map<String, Object>> resp =
                handler.handleExportFormatNotSupported(new ExportFormatNotSupportedException("pdf"));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        Map<String, Object> body = resp.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("status")).isEqualTo(400);
        assertThat(body.get("error")).isEqualTo("bad_request");
        assertThat(body.get("message")).isEqualTo("unsupported export format");
        assertThat(body).containsKey("timestamp");
    }

    @Test
    void handleMaxUploadSize_returns400_structuredBadRequest_userMessage() {
        ResponseEntity<Map<String, Object>> resp =
                handler.handleMaxUploadSize(new MaxUploadSizeExceededException(5_000_000L));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        Map<String, Object> body = resp.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("error")).isEqualTo("bad_request");
        assertThat(body.get("message")).isEqualTo("fichier trop volumineux (max 5 Mo)");
    }

    @Test
    void handleRecurrenceUnitRequired_returns400_structuredBadRequest() {
        ResponseEntity<Map<String, Object>> resp =
                handler.handleRecurrenceUnitRequired(new RecurrenceUnitRequiredException(UUID.randomUUID()));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        Map<String, Object> body = resp.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("error")).isEqualTo("bad_request");
        assertThat(body.get("message")).isEqualTo("recurrenceUnit is required when isRecurring is true");
    }

    @Test
    void handleOptimisticLock_returns409_structuredConflict_neutralMessage() {
        // Chemin GÉNÉRIQUE (Product/Category/User @Version) — le conflit d'EVENT est
        // intercepté en amont par EventController (EventConflictException, corps enrichi).
        ResponseEntity<Map<String, Object>> resp = handler.handleOptimisticLock(
                new ObjectOptimisticLockingFailureException(Object.class, UUID.randomUUID()));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        Map<String, Object> body = resp.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("status")).isEqualTo(409);
        assertThat(body.get("error")).isEqualTo("conflict");
        assertThat(body.get("message")).isEqualTo("resource was modified concurrently, please retry");
    }

    /**
     * NON-RÉGRESSION #231 : le handler du conflit d'EVENT garde son corps ENRICHI PLAT
     * {@code {error:<texte>, serverVersion, serverEvent}} — PAS migré vers buildBody
     * (ni {@code timestamp} ni {@code status}, {@code error} reste le TEXTE consommé mot
     * pour mot par la modale comparative frontend, cf. eventConflictBodySchema).
     */
    @Test
    void handleEventConflict_keepsEnrichedFlatBody_notMigrated() {
        Event serverEvent = new Event(UUID.randomUUID(), "titre-serveur", "single",
                null, null, false, null, null, null, UUID.randomUUID(), false);
        ResponseEntity<Map<String, Object>> resp =
                handler.handleEventConflict(new EventConflictException(serverEvent, 7));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        Map<String, Object> body = resp.getBody();
        assertThat(body).isNotNull();
        // Corps enrichi conservé : error=TEXTE (pas un code), serverVersion + serverEvent présents.
        assertThat(body.get("error")).isEqualTo("resource was modified concurrently, please retry");
        assertThat(body.get("serverVersion")).isEqualTo(7);
        assertThat(body).containsKey("serverEvent");
        // Forme distincte du buildBody structuré : ni timestamp ni status.
        assertThat(body).doesNotContainKeys("timestamp", "status", "message");
    }
}
