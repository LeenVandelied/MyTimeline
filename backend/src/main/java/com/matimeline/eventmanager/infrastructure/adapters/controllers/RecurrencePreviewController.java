package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.matimeline.eventmanager.application.dtos.RecurrencePreviewRequest;
import com.matimeline.eventmanager.application.dtos.RecurrencePreviewResponse;
import com.matimeline.eventmanager.domain.exceptions.RecurrenceEndDateBeforeStartException;
import com.matimeline.eventmanager.domain.models.RecurrenceExpansion;
import com.matimeline.eventmanager.domain.ports.services.RecurrenceExpansionService;

import jakarta.validation.Valid;

/**
 * Prévisualisation d'une récurrence (#439) — expose le flag {@code capped} sur un chemin HTTP.
 *
 * <p><b>Contexte.</b> Le port {@link RecurrenceExpansionService} (calcul borné des occurrences,
 * #54/#452) n'avait AUCUN appelant dans {@code src/main} : le flag {@code capped} n'était exposé
 * nulle part. Cet endpoint le câble pour le hint LIVE de saisie côté frontend (#67).
 *
 * <p><b>Option 2 (décision dev 2026-09-03).</b> Endpoint DÉDIÉ plutôt qu'un champ ajouté à
 * {@code EventResponse} : #67 exige un hint pendant la frappe (avant toute soumission), ce qu'un
 * flag renvoyé seulement après un POST/GET ne permet pas. Contrôleur séparé d'{@code EventController}
 * pour ne pas coupler ce dernier (ni ses tests) au port d'expansion, qu'aucune de ses méthodes
 * n'utilise.
 *
 * <p><b>Sécurité.</b> Monté sous {@code /api/events/**} : authentifié via {@code SecurityConfig}
 * ({@code hasAuthority("ROLE_USER")}) comme le reste du domaine events. AUCUN contrôle d'ownership :
 * calcul PUR, ne lit ni n'écrit aucune donnée utilisateur, ne touche pas la DB — il n'y a donc pas
 * de ressource à protéger, seulement l'exigence d'être authentifié (pas anonyme).
 */
@RestController
@RequestMapping("/api/events")
public class RecurrencePreviewController {

    private final RecurrenceExpansionService recurrenceExpansionService;

    public RecurrencePreviewController(RecurrenceExpansionService recurrenceExpansionService) {
        this.recurrenceExpansionService = recurrenceExpansionService;
    }

    /**
     * Calcule le nombre d'occurrences et le flag {@code capped} d'une récurrence, sans rien
     * persister.
     *
     * @param request {@code startDate} + {@code recurrenceUnit} requis (400 si absents),
     *                {@code recurrenceEndDate} optionnel.
     * @return {@code 200 { count, capped }} — {@code capped} vient EXCLUSIVEMENT de
     *         {@code expansion.capped()} (jamais recalculé, garde #54).
     * @throws RecurrenceEndDateBeforeStartException si {@code recurrenceEndDate < startDate}
     *         (-> 422, même sémantique BR-EVE-012 que le CRUD).
     */
    @PostMapping("/recurrence-preview")
    public ResponseEntity<RecurrencePreviewResponse> previewRecurrence(
            @Valid @RequestBody RecurrencePreviewRequest request) {
        // @Valid garantit startDate et recurrenceUnit non-null (400 en amont sinon) : la SEULE
        // IllegalArgumentException que expand(...) peut encore lever ici est recurrenceEndDate
        // strictement antérieure à startDate. On la traduit vers l'exception DOMAINE mappée en
        // 422 par GlobalExceptionHandler — on réutilise la sémantique d'erreur du chemin CRUD
        // (BR-EVE-012) au lieu d'en introduire une seconde, et on n'ajoute aucune comparaison de
        // dates dans l'infra (la règle reste portée par le service).
        RecurrenceExpansion expansion;
        try {
            expansion = recurrenceExpansionService.expand(
                    request.getStartDate(),
                    request.getRecurrenceUnit(),
                    request.getRecurrenceEndDate());
        } catch (IllegalArgumentException ex) {
            throw new RecurrenceEndDateBeforeStartException(
                    request.getRecurrenceEndDate(), request.getStartDate());
        }
        return ResponseEntity.ok(RecurrencePreviewResponse.fromExpansion(expansion));
    }
}
