package com.example.eventmanager.utils;

import java.time.LocalDate;
import com.example.eventmanager.dtos.EventCreationRequest;

public class Utils {

    public static LocalDate calculateEndDate(EventCreationRequest eventCreationRequest, LocalDate startDate) {
        if ("duration".equals(eventCreationRequest.getType()) && eventCreationRequest.getDurationValue() != null) {
            switch (eventCreationRequest.getDurationUnit()) {
                case "days":
                    return startDate.plusDays(eventCreationRequest.getDurationValue());
                case "weeks":
                    return startDate.plusWeeks(eventCreationRequest.getDurationValue());
                case "months":
                    return startDate.plusMonths(eventCreationRequest.getDurationValue());
                case "years":
                    return startDate.plusYears(eventCreationRequest.getDurationValue());
                default:
                    throw new IllegalArgumentException("Unknown duration unit: " + eventCreationRequest.getDurationUnit());
            }
        }
        return startDate;
    }
}