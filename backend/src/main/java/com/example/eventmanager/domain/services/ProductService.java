package com.example.eventmanager.domain.services;

import com.example.eventmanager.domain.models.Product;
import com.example.eventmanager.dtos.ProductCreationRequest;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductService {
    Product createProduct(ProductCreationRequest request);
    
    List<Product> getProductsWithEvents();
    Optional<Product> findDomainProductById(UUID id);
    
    void deleteById(UUID id);
    
    boolean existsById(UUID id);
} 