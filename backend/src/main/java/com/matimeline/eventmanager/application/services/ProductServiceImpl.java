package com.matimeline.eventmanager.application.services;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.application.dtos.ProductCreationRequest;
import com.matimeline.eventmanager.domain.exceptions.CategoryNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.ProductNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.UserNotFoundException;
import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.CategoryRepository;
import com.matimeline.eventmanager.domain.ports.repositories.EventRepository;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.utils.Utils;

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
                .orElseThrow(() -> new CategoryNotFoundException(request.getCategory()));
    
        User user = userRepository.findDomainUserById(request.getUserId())
                .orElseThrow(() -> new UserNotFoundException(request.getUserId()));
    
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
                    product.getId(),
                    eventCreationRequest.getIsAllDay()
            );
            product.addEvent(event);
        });
    
        return productRepository.save(product);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Product> getProductsWithEvents(UUID userId) {
        return productRepository.findAllProducts().stream()
                .filter(product -> product.getUser().getId().equals(userId))
                .filter(Product::hasEvents)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Product> findDomainProductById(UUID id) {
        return productRepository.findDomainProductById(id);
    }

    @Override
    @Transactional
    public void deleteById(UUID id) {
        if (!productRepository.existsById(id)) {
            throw new ProductNotFoundException(id);
        }
        productRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(UUID id) {
        return productRepository.existsById(id);
    }
}