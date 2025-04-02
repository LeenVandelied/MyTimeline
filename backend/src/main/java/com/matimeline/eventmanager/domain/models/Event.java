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
    private String recurrenceUnit;
    private LocalDate startDate;
    private LocalDate endDate;
    private UUID productId;
    private Boolean isAllDay;

    public Event(UUID id, String title, String type, Integer durationValue, String durationUnit, 
                 Boolean isRecurring, String recurrenceUnit, LocalDate startDate, LocalDate endDate, UUID productId, Boolean isAllDay) {
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
    }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public String getType() { return type; }
    public Integer getDurationValue() { return durationValue; }
    public String getDurationUnit() { return durationUnit; }
    public Boolean getIsRecurring() { return isRecurring; }
    public String getRecurrenceUnit() { return recurrenceUnit; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public UUID getProductId() { return productId; }
    public Boolean getIsAllDay() { return isAllDay; }

    public void setTitle(String title) { this.title = title; }
    public void setType(String type) { this.type = type; }
    public void setDurationValue(Integer durationValue) { this.durationValue = durationValue; }
    public void setDurationUnit(String durationUnit) { this.durationUnit = durationUnit; }
    public void setIsRecurring(Boolean isRecurring) { this.isRecurring = isRecurring; }
    public void setRecurrenceUnit(String recurrenceUnit) { this.recurrenceUnit = recurrenceUnit; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public void setProduct(UUID productId) { this.productId = productId; }  
}