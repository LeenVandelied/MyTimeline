package com.matimeline.eventmanager.application.dtos;

import java.time.LocalDate;

import com.matimeline.eventmanager.domain.models.RecurrenceUnit;

import jakarta.validation.constraints.NotNull;

/**
 * Requête de prévisualisation d'une récurrence (#439).
 *
 * <p>Alimente {@code POST /api/events/recurrence-preview} : calcul PUR (aucune donnée
 * utilisateur, aucune écriture) exposant le flag {@code capped} de
 * {@link com.matimeline.eventmanager.domain.models.RecurrenceExpansion} pour le hint LIVE
 * de saisie côté frontend (#67). Découplé d'{@code EventCreationRequest} (Option 2, décision
 * dev 2026-09-03) : l'endpoint de preview ne partage pas le DTO de création — il n'a besoin
 * que des trois champs qui pilotent l'expansion.
 *
 * <p>{@code recurrenceUnit} est lié DIRECTEMENT à l'enum {@link RecurrenceUnit}
 * ({@code WEEK}/{@code MONTH}/{@code YEAR}, désérialisation Jackson exacte) : c'est le contrat
 * stable consommé par #67, aligné sur la sérialisation de {@code EventResponse.recurrenceUnit}.
 * Un champ requis manquant (ou un enum inconnu) est rejeté en 400 en amont du contrôleur.
 */
public class RecurrencePreviewRequest {

    /** Première occurrence (incluse). Requis -> 400 si absent. */
    @NotNull(message = "startDate is required")
    private LocalDate startDate;

    /** Unité de récurrence WEEK/MONTH/YEAR. Requis -> 400 si absent/inconnu. */
    @NotNull(message = "recurrenceUnit is required")
    private RecurrenceUnit recurrenceUnit;

    /**
     * Borne de fin incluse. Optionnel : {@code null} = récurrence indéfinie, bornée à l'horizon
     * {@link com.matimeline.eventmanager.domain.models.RecurrenceExpansion#MAX_UNBOUNDED_EXPANSION_YEARS}
     * (BR-EVE-012 / #452). Une borne strictement avant {@code startDate} est incohérente -> 422.
     */
    private LocalDate recurrenceEndDate;

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public RecurrenceUnit getRecurrenceUnit() {
        return recurrenceUnit;
    }

    public void setRecurrenceUnit(RecurrenceUnit recurrenceUnit) {
        this.recurrenceUnit = recurrenceUnit;
    }

    public LocalDate getRecurrenceEndDate() {
        return recurrenceEndDate;
    }

    public void setRecurrenceEndDate(LocalDate recurrenceEndDate) {
        this.recurrenceEndDate = recurrenceEndDate;
    }
}
