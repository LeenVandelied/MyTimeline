package com.example.eventmanager.application.services;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.eventmanager.domain.models.Category;
import com.example.eventmanager.domain.models.Event;
import com.example.eventmanager.domain.models.Product;
import com.example.eventmanager.domain.models.User;
import com.example.eventmanager.domain.repositories.CategoryRepository;
import com.example.eventmanager.domain.repositories.EventRepository;
import com.example.eventmanager.domain.repositories.ProductRepository;
import com.example.eventmanager.domain.repositories.UserRepository;
import com.example.eventmanager.domain.services.ProductService;
import com.example.eventmanager.dtos.ProductCreationRequest;
import com.example.eventmanager.utils.Utils;

@Service
public class ProductServiceImpl implements ProductService {
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Autowired
    public ProductServiceImpl(ProductRepository productRepository, 
                          EventRepository eventRepository, 
                          CategoryRepository categoryRepository, 
                          UserRepository userRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public Product createProduct(ProductCreationRequest request) {
        Category category = categoryRepository.findDomainCategoryById(request.getCategory())
                .orElseThrow(() -> new RuntimeException("Category not found"));
    
        User user = userRepository.findDomainUserById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
    
        Product product = new Product(UUID.randomUUID(), request.getName(), category, user, new ArrayList<>());
    
        request.getEvents().forEach(eventCreationRequest -> {
            LocalDate startDate = (eventCreationRequest.getDate() != null) ? eventCreationRequest.getDate() : LocalDate.now();
    
            Event event = new Event(
                    UUID.randomUUID(),
                    eventCreationRequest.getName(),
                    eventCreationRequest.getType(),
                    eventCreationRequest.getDurationValue(),
                    eventCreationRequest.getDurationUnit(),
                    eventCreationRequest.getIsRecurring(),
                    eventCreationRequest.getRecurrenceUnit(),
                    startDate,
                    Utils.calculateEndDate(eventCreationRequest, startDate),
                    product.getId()
            );
            product.addEvent(event);
        });
    
        productRepository.save(product);
        return product;
    }

    @Override
    public List<Product> getProductsWithEvents() {
        return productRepository.findAllProducts().stream()
                .filter(Product::hasEvents)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<Product> findDomainProductById(UUID id) {
        return productRepository.findDomainProductById(id);
    }

    @Override
    public void deleteById(UUID id) {
        productRepository.deleteById(id);
    }

    @Override
    public boolean existsById(UUID id) {
        return productRepository.existsById(id);
    }
}