package com.matimeline.eventmanager.application.dtos;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.validation.constraints.AssertTrue;
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
 *   indispensable car certains PATCH (mise à jour des couleurs seules, par
 *   exemple) n'envoient pas de title.
 *
 * #201 : {@code startDate}/{@code endDate} sont désormais EXPOSÉS et RÉELLEMENT
 * consommés (auparavant le formulaire les envoyait mais le DTO les ignorait
 * silencieusement -> faux contrôle frontend). Contrat de dates (cf. issue-201-done) :
 * pour {@code type='duration'} la durée reste la source de vérité de {@code endDate}
 * (BR-EVE-003, l'endDate du payload est ignorée pour ce type) ; pour tout autre type
 * (single...) une {@code endDate} explicite est persistée telle quelle. La cohérence
 * inter-champ {@code endDate >= startDate} est portée par {@code @AssertTrue} ci-dessous
 * (400) quand les DEUX dates sont présentes dans le payload — parité avec le refine Zod
 * frontend ({@code buildEventEditSchema} endErr, BR-EVE-002).
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

    private LocalDate recurrenceEndDate;

    private LocalDate startDate;

    private LocalDate endDate;

    private String color;

    private Boolean archived;

    /**
     * #absorb (BR-EVE-015) : version optimiste détenue par le client au chargement du
     * formulaire. NULLABLE pour rétro-compat (un PATCH partiel legacy sans version — ex.
     * changement de couleur seul — n'arme pas le contrôle). Quand présente, le service
     * compare à la version serveur COURANTE et lève {@code EventConflictException} (409
     * enrichi #231) en cas de décalage : conflit d'édition DÉTERMINISTE via l'API.
     */
    private Integer version;

    /**
     * BR-EVE-002 (#201) : cohérence inter-champ {@code endDate >= startDate}. La garde ne
     * s'applique que lorsque les DEUX dates sont présentes DANS LE PAYLOAD (PATCH partiel :
     * une date seule s'appuie sur l'état persisté, invisible au niveau DTO). Le formulaire
     * d'édition envoie toujours les deux ensemble (cf. EventEditForm), c'est le scénario ciblé.
     * Violé -> {@code @Valid} -> {@code MethodArgumentNotValidException} -> HTTP 400 (handler
     * existant, aucun nouveau mapping dans GlobalExceptionHandler). {@code @JsonIgnore} : champ
     * dérivé, non attendu sur le wire. Retourne {@code true} (valide) si l'une des deux dates
     * est absente.
     */
    @JsonIgnore
    @AssertTrue(message = "endDate must be on or after startDate")
    public boolean isEndDateConsistent() {
        if (startDate == null || endDate == null) {
            return true;
        }
        return !endDate.isBefore(startDate);
    }

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

    public LocalDate getRecurrenceEndDate() {
        return recurrenceEndDate;
    }

    public void setRecurrenceEndDate(LocalDate recurrenceEndDate) {
        this.recurrenceEndDate = recurrenceEndDate;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public Boolean getArchived() {
        return archived;
    }

    public void setArchived(Boolean archived) {
        this.archived = archived;
    }

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }
}
