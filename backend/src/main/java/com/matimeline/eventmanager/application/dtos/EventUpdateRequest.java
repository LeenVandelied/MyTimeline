package com.matimeline.eventmanager.application.dtos;

import jakarta.validation.constraints.Size;

/**
 * DTO de mise à jour partielle (PATCH /api/events/{id}).
 *
 * Sémantique PATCH partielle : chaque champ est optionnel (wrapper types nullable).
 * Un champ {@code null} signifie "non fourni" et n'est PAS appliqué côté service.
 *
 * Validation conditionnelle "si présent alors valide" :
 * - {@code title} utilise {@code @Size(min = 1)} (et non {@code @NotBlank}) pour
 *   rejeter une chaîne vide ("" -> HTTP 400) tout en autorisant l'absence (null),
 *   indispensable car certains PATCH (mise à jour des couleurs seules via
 *   {@code updateEventColor}) n'envoient pas de title.
 *
 * Le contrat JSON sur le wire est inchangé (mêmes noms de champs que le Map précédent).
 */
public class EventUpdateRequest {

    @Size(min = 1, max = 100, message = "Title must be between 1 and 100 characters")
    private String title;

    private String type;

    private Integer durationValue;

    private String durationUnit;

    private Boolean isRecurring;

    private String recurrenceUnit;

    private String backgroundColor;

    private String borderColor;

    private String textColor;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
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

    public String getBackgroundColor() {
        return backgroundColor;
    }

    public void setBackgroundColor(String backgroundColor) {
        this.backgroundColor = backgroundColor;
    }

    public String getBorderColor() {
        return borderColor;
    }

    public void setBorderColor(String borderColor) {
        this.borderColor = borderColor;
    }

    public String getTextColor() {
        return textColor;
    }

    public void setTextColor(String textColor) {
        this.textColor = textColor;
    }
}
