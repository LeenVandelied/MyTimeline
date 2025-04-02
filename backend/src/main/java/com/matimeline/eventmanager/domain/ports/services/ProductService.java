package com.matimeline.eventmanager.domain.ports.services;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.application.dtos.ProductCreationRequest;
import com.matimeline.eventmanager.domain.models.Product;

public interface ProductService {
    Product createProduct(ProductCreationRequest request);
    
    List<Product> getProductsWithEvents(UUID userId);
    Optional<Product> findDomainProductById(UUID id);
    
    void deleteById(UUID id);
    
    boolean existsById(UUID id);
} 