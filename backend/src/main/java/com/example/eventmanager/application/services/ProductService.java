package com.example.eventmanager.application.services;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.eventmanager.domain.models.Category;
import com.example.eventmanager.domain.models.Event;
import com.example.eventmanager.domain.models.Product;
import com.example.eventmanager.domain.models.User;
import com.example.eventmanager.domain.repositories.CategoryRepository;
import com.example.eventmanager.domain.repositories.EventRepository;
import com.example.eventmanager.domain.repositories.ProductRepository;
import com.example.eventmanager.domain.repositories.UserRepository;
import com.example.eventmanager.dtos.EventRequest;
import com.example.eventmanager.dtos.ProductCreationRequest;

@Service
public class ProductService {
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Autowired
    public ProductService(ProductRepository productRepository, 
                          EventRepository eventRepository, 
                          CategoryRepository categoryRepository, 
                          UserRepository userRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    public Product createProduct(ProductCreationRequest request) {
        Category category = categoryRepository.findDomainCategoryById(request.getCategory())
                .orElseThrow(() -> new RuntimeException("Category not found"));
    
        User user = userRepository.findDomainUserById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
    
        Product product = new Product(UUID.randomUUID(), request.getName(), request.getQrCode(), category, user, new ArrayList<>());
    
        request.getEvents().forEach(eventRequest -> {
            LocalDate startDate = (eventRequest.getDate() != null) ? eventRequest.getDate() : LocalDate.now();
    
            Event event = new Event(
                    UUID.randomUUID(),
                    eventRequest.getName(),
                    eventRequest.getType(),
                    eventRequest.getDurationValue(),
                    eventRequest.getDurationUnit(),
                    eventRequest.getIsRecurring(),
                    eventRequest.getRecurrenceUnit(),
                    startDate,
                    calculateEndDate(eventRequest, startDate),
                    product.getId()
            );
            product.addEvent(event);
        });
    
        productRepository.save(product);
        return product;
    }

    private LocalDate calculateEndDate(EventRequest eventRequest, LocalDate startDate) {
        if ("duration".equals(eventRequest.getType()) && eventRequest.getDurationValue() != null) {
            switch (eventRequest.getDurationUnit()) {
                case "days":
                    return startDate.plusDays(eventRequest.getDurationValue());
                case "weeks":
                    return startDate.plusWeeks(eventRequest.getDurationValue());
                case "months":
                    return startDate.plusMonths(eventRequest.getDurationValue());
                case "years":
                    return startDate.plusYears(eventRequest.getDurationValue());
                default:
                    throw new IllegalArgumentException("Unknown duration unit: " + eventRequest.getDurationUnit());
            }
        }
        return startDate;
    }

    public List<Product> getProductsWithEvents() {
        return productRepository.findAllProducts().stream()
                .filter(Product::hasEvents)
                .collect(Collectors.toList());
    }
}