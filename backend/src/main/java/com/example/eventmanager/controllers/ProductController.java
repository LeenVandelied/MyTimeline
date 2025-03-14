package com.example.eventmanager.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.eventmanager.application.services.ProductService;
import com.example.eventmanager.domain.models.Event;
import com.example.eventmanager.domain.models.Product;
import com.example.eventmanager.domain.models.User;
import com.example.eventmanager.domain.repositories.EventRepository;
import com.example.eventmanager.domain.repositories.ProductRepository;
import com.example.eventmanager.domain.repositories.UserRepository;
import com.example.eventmanager.dtos.ProductCreationRequest;
import com.example.eventmanager.security.JwtService;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;
    private EventRepository eventRepository;
    private UserRepository userRepository;
    private final ProductService productService;
    private final JwtService jwtService;
    

    @Autowired
    public ProductController(ProductService productService, JwtService jwtService, UserRepository userRepository) {
        this.productService = productService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody ProductCreationRequest request, 
                                                 @CookieValue(value = "jwt", required = false) String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
        }
    
        String username = jwtService.extractUsername(token);
        Optional<User> user = userRepository.findDomainUserByUsername(username);
    
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
        Optional<Product> product = productRepository.findDomainProductById(id);
        return product.map(ResponseEntity::ok)
                      .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/qr/{qrCode}")
    public ResponseEntity<Product> getProductByQrCode(@PathVariable String qrCode) {
        Optional<Product> product = productRepository.findDomainProductByQrCode(qrCode);
        return product.map(ResponseEntity::ok)
                      .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable UUID id) {
        if (productRepository.existsById(id)) {
            productRepository.deleteById(id);
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @GetMapping("/{productId}/events")
    public ResponseEntity<List<Event>> getEventsByProductId(@PathVariable UUID productId) {
        List<Event> events = eventRepository.findDomainEventByProductId(productId);
        if (events.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(events);
    }
}