package com.example.eventmanager.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.eventmanager.application.services.EventService;
import com.example.eventmanager.application.services.ProductService;
import com.example.eventmanager.application.services.UserService;
import com.example.eventmanager.domain.models.Event;
import com.example.eventmanager.domain.models.Product;
import com.example.eventmanager.domain.models.User;
import com.example.eventmanager.dtos.ProductCreationRequest;
import com.example.eventmanager.security.JwtService;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private final UserService userService;
    private final EventService eventService;
    private final ProductService productService;
    private final JwtService jwtService;
    

    @Autowired
    public ProductController(ProductService productService, EventService eventService, UserService userService, JwtService jwtService) {
        this.productService = productService;
        this.eventService = eventService;
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody ProductCreationRequest request, 
                                                 @CookieValue(value = "jwt", required = false) String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
        }
    
        String username = jwtService.extractUsername(token);
        Optional<User> user = userService.findDomainUserByUsername(username);
    
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    
        request.setUserId(user.get().getId());
        Product product = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(product);
    }

    @GetMapping
    public ResponseEntity<List<Product>> getProductsWithEvents() {
        List<Product> products = productService.getProductsWithEvents();
        return ResponseEntity.ok(products);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable UUID id) {
        Optional<Product> product = productService.findDomainProductById(id);
        return product.map(ResponseEntity::ok)
                      .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable UUID id) {
        if (productService.existsById(id)) {
            productService.deleteById(id);
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @GetMapping("/{productId}/events")
    public ResponseEntity<List<Event>> getEventsByProductId(@PathVariable UUID productId) {
        List<Event> events = eventService.findDomainEventByProductId(productId);
        if (events.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(events);
    }
}