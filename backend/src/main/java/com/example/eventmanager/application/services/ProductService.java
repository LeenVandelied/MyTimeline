package com.example.eventmanager.application.services;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
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
import com.example.eventmanager.dtos.ProductCreationRequest;

@Service
public class ProductService {
    private final ProductRepository productRepository;
    private final EventRepository eventRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Autowired
    public ProductService(ProductRepository productRepository, 
                          EventRepository eventRepository, 
                          CategoryRepository categoryRepository, 
                          UserRepository userRepository) {
        this.productRepository = productRepository;
        this.eventRepository = eventRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    public Product createProduct(ProductCreationRequest request) {
        Category category = categoryRepository.findDomainCategoryById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        User user = userRepository.findDomainUserById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Product product = new Product(UUID.randomUUID(), request.getName(), request.getQrCode(), category, user, new ArrayList<>());
        productRepository.save(product);

        generateDefaultEvents(product);

        return product;
    }

    public List<Product> getProductsWithEvents() {
        return productRepository.findAllProducts().stream()
                .filter(Product::hasEvents)
                .collect(Collectors.toList());
    }

    private void generateDefaultEvents(Product product) {
        List<Event> events = new ArrayList<>();

        if ("Véhicules".equalsIgnoreCase(product.getCategory().getName())) {
            events.add(new Event(UUID.randomUUID(), "Garantie", new Date(), addYears(new Date(), 2), product));
            events.add(new Event(UUID.randomUUID(), "Révision annuelle", addYears(new Date(), 1), null, product));
        }

        events.forEach(eventRepository::save);
    }

    private Date addYears(Date date, int years) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(date);
        cal.add(Calendar.YEAR, years);
        return cal.getTime();
    }
}