package com.example.eventmanager.dtos;

import java.util.UUID;

public class ProductCreationRequest {
    private String name;
    private String qrCode;
    private UUID categoryId;
    private UUID userId;

    public String getName() {
        return name;
    }

    public String getQrCode() {
        return qrCode;
    }

    public UUID getCategoryId() {
        return categoryId;
    }

    public UUID getUserId() {
        return userId;
    }
}