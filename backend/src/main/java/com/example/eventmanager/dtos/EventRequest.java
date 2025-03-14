package com.example.eventmanager.dtos;

import java.time.LocalDate;

public class EventRequest {
    private String name;
    private String type;
    private Integer durationValue;
    private String durationUnit;
    private Boolean isRecurring;
    private String recurrenceUnit;
    private LocalDate date;

    public String getName() { return name; }
    public String getType() { return type; }
    public Integer getDurationValue() { return durationValue; }
    public String getDurationUnit() { return durationUnit; }
    public Boolean getIsRecurring() { return isRecurring; }
    public String getRecurrenceUnit() { return recurrenceUnit; }
    public LocalDate getDate() { return date; }
}