package com.matimeline.eventmanager.application.dtos;

import java.time.LocalDate;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class EventCreationRequest {
    @NotBlank(message = "Name is required")
    @Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
    private String name;

    @NotBlank(message = "Type is required")
    private String type;

    @NotNull(message = "Duration value is required")
    private Integer durationValue;

    @NotBlank(message = "Duration unit is required")
    private String durationUnit;

    @NotNull(message = "Is recurring flag is required")
    private Boolean isRecurring;

    private String recurrenceUnit;

    private LocalDate date;

    private Boolean isAllDay;

    /**
     * BR-EVE-014 (#168) : couleur d'affichage de l'événement, fournie DÈS la création
     * (auparavant seul {@code EventUpdateRequest} l'exposait -> il fallait créer puis PATCH).
     * Champ ADDITIF optionnel (nullable) : les clients existants qui ne l'envoient pas
     * restent valides (non-cassant). Aligné sur {@code EventUpdateRequest.color} (String
     * libre, aucune contrainte de format hex côté backend — cf. BR-EVE-009). Le refine Zod
     * frontend correspondant reste à répercuter (#150, S15).
     */
    private String color;

    @NotNull(message = "Product ID is required")
    private UUID productId;

    /**
     * BR-EVE-006 (#54) : validation conditionnelle — {@code recurrenceUnit} MUST être non-null
     * (et non vide) quand {@code isRecurring=true}. Une récurrence sans unité est inexploitable.
     * {@code @AssertTrue} sur ce getter dérivé : déclenché par {@code @Valid} -> HTTP 400 si violé.
     * {@code @JsonIgnore} pour ne pas exposer/attendre ce champ calculé sur le wire.
     * Retourne {@code true} (valide) quand {@code isRecurring} est null/false : la contrainte
     * ne s'applique qu'à la récurrence active.
     */
    @JsonIgnore
    @AssertTrue(message = "recurrenceUnit is required when isRecurring is true")
    public boolean isRecurrenceUnitConsistent() {
        if (!Boolean.TRUE.equals(isRecurring)) {
            return true;
        }
        return recurrenceUnit != null && !recurrenceUnit.trim().isEmpty();
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Integer getDurationValue() {
        return durationValue;
    }

    public void setDurationValue(Integer durationValue) {
        this.durationValue = durationValue;
    }

    public String getDurationUnit() {
        return durationUnit;
    }

    public void setDurationUnit(String durationUnit) {
        this.durationUnit = durationUnit;
    }

    public Boolean getIsRecurring() {
        return isRecurring;
    }

    public void setIsRecurring(Boolean isRecurring) {
        this.isRecurring = isRecurring;
    }

    public String getRecurrenceUnit() {
        return recurrenceUnit;
    }

    public void setRecurrenceUnit(String recurrenceUnit) {
        this.recurrenceUnit = recurrenceUnit;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public UUID getProductId() {
        return productId;
    }

    public void setProductId(UUID productId) {
        this.productId = productId;
    }

    public Boolean getIsAllDay() {
        return isAllDay;
    }

    public void setIsAllDay(Boolean isAllDay) {
        this.isAllDay = isAllDay;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }
}