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
import com.matimeline.eventmanager.application.dtos.ProductUpdateRequest;
import com.matimeline.eventmanager.domain.exceptions.CategoryNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.ProductNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.UserNotFoundException;
import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.RecurrenceUnit;
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
        User user = userRepository.findDomainUserById(request.getUserId())
                .orElseThrow(() -> new UserNotFoundException(request.getUserId()));

        // #50 (faille cross-tenant) : la catégorie cible doit appartenir à l'appelant
        // OU être système (ownerId == null). Sinon -> 404 (anti-énumération).
        Category category = resolveAssignableCategory(request.getCategory(), user.getId());

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
                    RecurrenceUnit.fromString(eventCreationRequest.getRecurrenceUnit()),
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
    @Transactional
    public Product updateProduct(UUID id, ProductUpdateRequest request) {
        Product product = productRepository.findDomainProductById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));

        if (request.getName() != null) {
            product.setName(request.getName());
        }

        if (request.getCategoryId() != null) {
            // #50 (faille cross-tenant) : l'ownership du produit est déjà garanti au niveau
            // controller (path == JWT). On valide donc la catégorie cible contre le
            // propriétaire du produit chargé -> catégorie d'autrui traitée comme inexistante (404).
            Category category = resolveAssignableCategory(request.getCategoryId(), product.getUser().getId());
            product.setCategory(category);
        }

        return productRepository.save(product);
    }

    /**
     * #50 (faille cross-tenant + oracle d'énumération) : une catégorie n'est assignable
     * à un produit que si elle est possédée par l'appelant OU système (ownerId == null).
     * Une catégorie possédée par un autre utilisateur est traitée comme INEXISTANTE du
     * point de vue de l'appelant -> {@link CategoryNotFoundException} (404). Le choix du
     * 404 (et non 403) ferme l'oracle : un 403 confirmerait l'existence de l'UUID.
     */
    private Category resolveAssignableCategory(UUID categoryId, UUID callerId) {
        Category category = categoryRepository.findDomainCategoryById(categoryId)
                .orElseThrow(() -> new CategoryNotFoundException(categoryId));
        UUID owner = category.getOwnerId();
        if (owner != null && !owner.equals(callerId)) {
            throw new CategoryNotFoundException(categoryId);
        }
        return category;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Product> findDomainProductById(UUID id) {
        return productRepository.findDomainProductById(id);
    }

    @Override
    @Transactional
    public void archiveById(UUID id) {
        Product product = productRepository.findDomainProductById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));
        product.setArchived(true);
        productRepository.save(product);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(UUID id) {
        return productRepository.existsById(id);
    }
}