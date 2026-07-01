package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.matimeline.eventmanager.application.dtos.EventResponse;
import com.matimeline.eventmanager.application.dtos.ProductCreationRequest;
import com.matimeline.eventmanager.application.dtos.ProductResponse;
import com.matimeline.eventmanager.application.dtos.ProductUpdateRequest;
import com.matimeline.eventmanager.application.services.EventServiceImpl;
import com.matimeline.eventmanager.application.services.ProductServiceImpl;
import com.matimeline.eventmanager.application.services.UserServiceImpl;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

import io.jsonwebtoken.JwtException;
import jakarta.validation.Valid;

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
    public ResponseEntity<ProductResponse> createProduct(
            @PathVariable UUID userId,
            @Valid @RequestBody ProductCreationRequest request,
            @CookieValue(value = "jwt", required = false) String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
        }

        String username;
        try {
            username = jwtService.extractUsername(token);
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<User> user = userService.findDomainUserByUsername(username);

        if (user.isEmpty() || !user.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        request.setUserId(userId);
        Product product = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ProductResponse.fromDomain(product));
    }

    @GetMapping("/users/{userId}/products")
    public ResponseEntity<List<ProductResponse>> getProducts(
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

            List<ProductResponse> response = productService.getProductsWithEvents(userId).stream()
                    .map(ProductResponse::fromDomain)
                    .toList();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @GetMapping("/users/{userId}/products/{productId}")
    public ResponseEntity<ProductResponse> getProductById(
            @PathVariable UUID userId,
            @PathVariable UUID productId,
            @CookieValue(value = "jwt", required = false) String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String username;
        try {
            username = jwtService.extractUsername(token);
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<User> user = userService.findDomainUserByUsername(username);

        if (user.isEmpty() || !user.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<Product> product = productService.findDomainProductById(productId);
        if (product.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        if (!productBelongsToUser(product.get(), userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(ProductResponse.fromDomain(product.get()));
    }

    @PatchMapping("/users/{userId}/products/{productId}")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable UUID userId,
            @PathVariable UUID productId,
            @Valid @RequestBody ProductUpdateRequest request,
            @CookieValue(value = "jwt", required = false) String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String username;
        try {
            username = jwtService.extractUsername(token);
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<User> user = userService.findDomainUserByUsername(username);

        if (user.isEmpty() || !user.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<Product> product = productService.findDomainProductById(productId);
        if (product.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        if (!productBelongsToUser(product.get(), userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // BR-PRO-001/002 : validation (name bounds, category existence) enforced in the
        // service ; a missing product / unknown category surfaces via GlobalExceptionHandler (404).
        Product updated = productService.updateProduct(productId, request);
        return ResponseEntity.ok(ProductResponse.fromDomain(updated));
    }

    @DeleteMapping("/users/{userId}/products/{productId}")
    public ResponseEntity<Void> deleteProduct(
            @PathVariable UUID userId,
            @PathVariable UUID productId,
            @CookieValue(value = "jwt", required = false) String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String username;
        try {
            username = jwtService.extractUsername(token);
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<User> user = userService.findDomainUserByUsername(username);

        if (user.isEmpty() || !user.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<Product> product = productService.findDomainProductById(productId);
        if (product.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        if (!productBelongsToUser(product.get(), userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // BR-PRO-007 : soft delete (archived = true), plus de suppression physique.
        productService.archiveById(productId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users/{userId}/products/{productId}/events")
    public ResponseEntity<List<EventResponse>> getEventsByProductId(
            @PathVariable UUID userId,
            @PathVariable UUID productId,
            @CookieValue(value = "jwt", required = false) String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String username;
        try {
            username = jwtService.extractUsername(token);
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<User> user = userService.findDomainUserByUsername(username);

        if (user.isEmpty() || !user.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<Product> product = productService.findDomainProductById(productId);
        if (product.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        if (!productBelongsToUser(product.get(), userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<Event> events = eventService.findDomainEventByProductId(productId);
        if (events.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        List<EventResponse> response = events.stream()
                .map(EventResponse::fromDomain)
                .toList();
        return ResponseEntity.ok(response);
    }

    /**
     * Verifies the product is owned by the given user (product.user.id == userId).
     * Guards against IDOR where a valid userId==jwt holder accesses another user's product.
     */
    private boolean productBelongsToUser(Product product, UUID userId) {
        return product.getUser() != null
                && product.getUser().getId() != null
                && product.getUser().getId().equals(userId);
    }
}