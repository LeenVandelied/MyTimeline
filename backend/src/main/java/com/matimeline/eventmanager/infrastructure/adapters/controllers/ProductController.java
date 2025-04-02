package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.matimeline.eventmanager.application.dtos.ProductCreationRequest;
import com.matimeline.eventmanager.application.services.EventServiceImpl;
import com.matimeline.eventmanager.application.services.ProductServiceImpl;
import com.matimeline.eventmanager.application.services.UserServiceImpl;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ProductController {

    private final UserServiceImpl userService;
    private final EventServiceImpl eventService;
    private final ProductServiceImpl productService;
    private final JwtService jwtService;

    @Autowired
    public ProductController(ProductServiceImpl productService, 
                           EventServiceImpl eventService, 
                           UserServiceImpl userService, 
                           JwtService jwtService) {
        this.productService = productService;
        this.eventService = eventService;
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping("/users/{userId}/products")
    public ResponseEntity<Product> createProduct(
            @PathVariable UUID userId,
            @RequestBody ProductCreationRequest request, 
            @CookieValue(value = "jwt", required = false) String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
        }
    
        String username = jwtService.extractUsername(token);
        Optional<User> user = userService.findDomainUserByUsername(username);
    
        if (user.isEmpty() || !user.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    
        request.setUserId(userId);
        Product product = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(product);
    }

    @GetMapping("/users/{userId}/products")
    public ResponseEntity<List<Product>> getProducts(
            @PathVariable UUID userId,
            @CookieValue(value = "jwt", required = false) String cookieToken,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        String token = cookieToken;
        
        if ((token == null || token.isEmpty()) && authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }
        
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            String username = jwtService.extractUsername(token);
            Optional<User> user = userService.findDomainUserByUsername(username);

            if (user.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            if (!user.get().getId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            return ResponseEntity.ok(productService.getProductsWithEvents(userId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @GetMapping("/users/{userId}/products/{productId}")
    public ResponseEntity<Product> getProductById(
            @PathVariable UUID userId,
            @PathVariable UUID productId,
            @CookieValue(value = "jwt", required = false) String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String username = jwtService.extractUsername(token);
        Optional<User> user = userService.findDomainUserByUsername(username);

        if (user.isEmpty() || !user.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<Product> product = productService.findDomainProductById(productId);
        return product.map(ResponseEntity::ok)
                      .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @DeleteMapping("/users/{userId}/products/{productId}")
    public ResponseEntity<Void> deleteProduct(
            @PathVariable UUID userId,
            @PathVariable UUID productId,
            @CookieValue(value = "jwt", required = false) String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String username = jwtService.extractUsername(token);
        Optional<User> user = userService.findDomainUserByUsername(username);

        if (user.isEmpty() || !user.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        productService.deleteById(productId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/users/{userId}/products/{productId}/events")
    public ResponseEntity<List<Event>> getEventsByProductId(
            @PathVariable UUID userId,
            @PathVariable UUID productId,
            @CookieValue(value = "jwt", required = false) String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String username = jwtService.extractUsername(token);
        Optional<User> user = userService.findDomainUserByUsername(username);

        if (user.isEmpty() || !user.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<Event> events = eventService.findDomainEventByProductId(productId);
        if (events.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(events);
    }
}