package com.example.eventmanager.domain.models;

import java.util.Date;
import java.util.UUID;

public class Event {
    private UUID id;
    private String title;
    private Date startDate;
    private Date endDate;
    private Product product;

    public Event(UUID id, String title, Date startDate, Date endDate, Product product) {
        this.id = id;
        this.title = title;
        this.startDate = startDate;
        this.endDate = endDate;
        this.product = product;
    }

    public UUID getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public Date getStartDate() {
        return startDate;
    }

    public Date getEndDate() {
        return endDate;
    }

    public Product getProduct() {
        return product;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setStartDate(Date startDate) {
        this.startDate = startDate;
    }

    public void setEndDate(Date endDate) {
        this.endDate = endDate;
    }

    public void setProduct(Product product) {
        this.product = product;
    }
}