package com.matimeline.eventmanager.domain.models;

import java.time.LocalDate;
import java.util.UUID;

public class Event {
    private UUID id;
    private String title;
    private String type;
    private Integer durationValue;
    private String durationUnit;
    private Boolean isRecurring;
    private RecurrenceUnit recurrenceUnit;
    private LocalDate recurrenceEndDate;
    private LocalDate startDate;
    private LocalDate endDate;
    private UUID productId;
    private Boolean isAllDay;
    private String color;
    private boolean archived;
    // #absorb (BR-EVE-015) : version optimiste (@Version sur EventEntity) remontée au
    // domaine pour (1) l'exposer dans EventResponse — le client la renvoie au PATCH —,
    // (2) permettre le check optimiste DÉTERMINISTE dans EventServiceImpl.updateEvent.
    // Nullable : un Event fraîchement construit (create, non persisté) ne la porte pas ;
    // elle est renseignée par EventMapper.toDomain depuis l'entité gérée.
    private Integer version;

    public Event(UUID id, String title, String type, Integer durationValue, String durationUnit,
                 Boolean isRecurring, RecurrenceUnit recurrenceUnit, LocalDate startDate, LocalDate endDate, UUID productId, Boolean isAllDay) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.durationValue = durationValue;
        this.durationUnit = durationUnit;
        this.isRecurring = isRecurring;
        this.recurrenceUnit = recurrenceUnit;
        this.startDate = startDate;
        this.endDate = endDate;
        this.productId = productId;
        this.isAllDay = isAllDay;
        this.archived = false;
    }

    public Event(UUID id, String title, String type, Integer durationValue, String durationUnit,
                 Boolean isRecurring, RecurrenceUnit recurrenceUnit, LocalDate recurrenceEndDate,
                 LocalDate startDate, LocalDate endDate, UUID productId, Boolean isAllDay,
                 String color, boolean archived) {
        this(id, title, type, durationValue, durationUnit, isRecurring, recurrenceUnit, startDate, endDate, productId, isAllDay);
        this.recurrenceEndDate = recurrenceEndDate;
        this.color = color;
        this.archived = archived;
    }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public String getType() { return type; }
    public Integer getDurationValue() { return durationValue; }
    public String getDurationUnit() { return durationUnit; }
    public Boolean getIsRecurring() { return isRecurring; }
    public RecurrenceUnit getRecurrenceUnit() { return recurrenceUnit; }
    public LocalDate getRecurrenceEndDate() { return recurrenceEndDate; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public UUID getProductId() { return productId; }
    public Boolean getIsAllDay() { return isAllDay; }
    public String getColor() { return color; }
    public boolean isArchived() { return archived; }
    public Integer getVersion() { return version; }

    public void setTitle(String title) { this.title = title; }
    public void setType(String type) { this.type = type; }
    public void setDurationValue(Integer durationValue) { this.durationValue = durationValue; }
    public void setDurationUnit(String durationUnit) { this.durationUnit = durationUnit; }
    public void setIsRecurring(Boolean isRecurring) { this.isRecurring = isRecurring; }
    public void setRecurrenceUnit(RecurrenceUnit recurrenceUnit) { this.recurrenceUnit = recurrenceUnit; }
    public void setRecurrenceEndDate(LocalDate recurrenceEndDate) { this.recurrenceEndDate = recurrenceEndDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public void setProduct(UUID productId) { this.productId = productId; }
    public void setColor(String color) { this.color = color; }
    public void setArchived(boolean archived) { this.archived = archived; }
    public void setVersion(Integer version) { this.version = version; }
}
