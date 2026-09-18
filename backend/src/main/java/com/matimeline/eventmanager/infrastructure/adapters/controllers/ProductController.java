package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.matimeline.eventmanager.application.dtos.ArchivedProductResponse;
import com.matimeline.eventmanager.application.dtos.EventResponse;
import com.matimeline.eventmanager.application.dtos.ProductCreationRequest;
import com.matimeline.eventmanager.application.dtos.ProductResponse;
import com.matimeline.eventmanager.application.dtos.ProductUpdateRequest;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.infrastructure.security.CallerResolver;

import jakarta.validation.Valid;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * CRUD des produits (self-service). L'identité du caller est dérivée du JWT via le
 * {@link CallerResolver} (#93/#154) — cookie {@code jwt} OU {@code Authorization: Bearer}
 * résolus uniformément depuis le SecurityContext, jamais d'un param. {@code currentUser()}
 * vide -> 401 (BR-AUT-005) ; l'ownership (path {userId} vs caller, cf. BR-PRO-004, et
 * propriété du produit ciblé anti-IDOR) reste porté par ce contrôleur (403/404).
 */
@RestController
@RequestMapping("/api")
public class ProductController {

    private final EventService eventService;
    private final ProductService productService;
    private final CallerResolver callerResolver;

    @Autowired
    public ProductController(ProductService productService,
                           EventService eventService,
                           CallerResolver callerResolver) {
        this.productService = productService;
        this.eventService = eventService;
        this.callerResolver = callerResolver;
    }

    @PostMapping("/users/{userId}/products")
    public ResponseEntity<ProductResponse> createProduct(
            @PathVariable UUID userId,
            @Valid @RequestBody ProductCreationRequest request) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!callerOpt.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // BR-PRO-004 : le {userId} du path fait autorité, il écrase l'éventuel userId du body.
        request.setUserId(userId);
        Product product = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ProductResponse.fromDomain(product));
    }

    @GetMapping("/users/{userId}/products")
    public ResponseEntity<List<ProductResponse>> getProducts(@PathVariable UUID userId) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!callerOpt.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // #92 : PAS de try/catch ici. L'auth (401) est déjà résolue en amont via currentUser().
        // L'appel service ne lève aucune JwtException ; toute erreur (NPE BR-PRO-005, DataAccess)
        // DOIT se propager au GlobalExceptionHandler (500), jamais être masquée en 401 (BR-AUT-005).
        List<ProductResponse> response = productService.getProductsWithEvents(userId).stream()
                .map(ProductResponse::fromDomain)
                .toList();
        return ResponseEntity.ok(response);
    }

    /**
     * #711 — Produits archivés du caller (surface « Archivés »). Route littérale : Spring MVC
     * la préfère à {@code /products/{productId}} (segment littéral plus spécifique qu'une
     * variable) — verrouillé par {@code ProductRestoreIntegrationTest}.
     */
    @GetMapping("/users/{userId}/products/archived")
    public ResponseEntity<List<ArchivedProductResponse>> getArchivedProducts(@PathVariable UUID userId) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!callerOpt.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<ArchivedProductResponse> response = productService.getArchivedProducts(userId).stream()
                .map(ArchivedProductResponse::fromDomain)
                .toList();
        return ResponseEntity.ok(response);
    }

    /**
     * #711 — Désarchivage (BR-PRO-007/011) : 204 comme le DELETE d'archivage (transition
     * d'état sans représentation à renvoyer ; le front rafraîchit ses listes par invalidation).
     *
     * <p>PAS de lecture préalable {@code findDomainProductById} + {@code productBelongsToUser} :
     * un archivé y est invisible (@SQLRestriction) et répondrait toujours 404. L'ownership de
     * la CIBLE est dans l'UPDATE natif ; produit inconnu / non archivé / d'autrui ->
     * {@code ProductNotFoundException} -> 404 uniforme (GlobalExceptionHandler). Le 403 reste
     * réservé au path {userId} ≠ caller, comme sur les autres routes.
     */
    @PostMapping("/users/{userId}/products/{productId}/restore")
    public ResponseEntity<Void> restoreProduct(
            @PathVariable UUID userId,
            @PathVariable UUID productId) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!callerOpt.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        productService.restoreProduct(productId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users/{userId}/products/{productId}")
    public ResponseEntity<ProductResponse> getProductById(
            @PathVariable UUID userId,
            @PathVariable UUID productId) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!callerOpt.get().getId().equals(userId)) {
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
            @Valid @RequestBody ProductUpdateRequest request) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!callerOpt.get().getId().equals(userId)) {
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
            @PathVariable UUID productId) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!callerOpt.get().getId().equals(userId)) {
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
            @PathVariable UUID productId) {
        Optional<User> callerOpt = callerResolver.currentUser();
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!callerOpt.get().getId().equals(userId)) {
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
