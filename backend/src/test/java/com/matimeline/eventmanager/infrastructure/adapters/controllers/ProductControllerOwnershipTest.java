package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.application.dtos.ProductUpdateRequest;
import com.matimeline.eventmanager.application.services.EventServiceImpl;
import com.matimeline.eventmanager.application.services.ProductServiceImpl;
import com.matimeline.eventmanager.application.services.UserServiceImpl;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

import jakarta.servlet.http.Cookie;

@ExtendWith(MockitoExtension.class)
class ProductControllerOwnershipTest {

    @Mock
    private ProductServiceImpl productService;
    @Mock
    private EventServiceImpl eventService;
    @Mock
    private UserServiceImpl userService;
    @Mock
    private JwtService jwtService;

    private MockMvc mockMvc;

    private UUID callerId;
    private UUID otherUserId;
    private UUID productId;

    @BeforeEach
    void setUp() {
        ProductController controller = new ProductController(productService, eventService, userService, jwtService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();

        callerId = UUID.randomUUID();
        otherUserId = UUID.randomUUID();
        productId = UUID.randomUUID();
    }

    @Test
    void getProductById_productOwnedByAnotherUser_returns403() throws Exception {
        // Caller is authenticated and userId in path matches caller (passes the legacy check),
        // but the product actually belongs to another user -> IDOR must be blocked.
        User caller = new User(callerId, "Caller", "caller", "pwd", "ROLE_USER", "c@c.com");
        User realOwner = new User(otherUserId, "Other", "other", "pwd", "ROLE_USER", "o@o.com");
        Product foreignProduct = new Product(productId, "foreign", null, realOwner, List.of());

        when(jwtService.extractUsername("caller-token")).thenReturn("caller");
        when(userService.findDomainUserByUsername("caller")).thenReturn(Optional.of(caller));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(foreignProduct));

        mockMvc.perform(get("/api/users/" + callerId + "/products/" + productId)
                        .cookie(new Cookie("jwt", "caller-token")))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteProduct_productOwnedByAnotherUser_returns403_andDoesNotDelete() throws Exception {
        User caller = new User(callerId, "Caller", "caller", "pwd", "ROLE_USER", "c@c.com");
        User realOwner = new User(otherUserId, "Other", "other", "pwd", "ROLE_USER", "o@o.com");
        Product foreignProduct = new Product(productId, "foreign", null, realOwner, List.of());

        when(jwtService.extractUsername("caller-token")).thenReturn("caller");
        when(userService.findDomainUserByUsername("caller")).thenReturn(Optional.of(caller));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(foreignProduct));

        mockMvc.perform(delete("/api/users/" + callerId + "/products/" + productId)
                        .cookie(new Cookie("jwt", "caller-token")))
                .andExpect(status().isForbidden());

        verify(productService, never()).archiveById(productId);
    }

    @Test
    void getProductById_ownProduct_returns200() throws Exception {
        User caller = new User(callerId, "Caller", "caller", "pwd", "ROLE_USER", "c@c.com");
        Product ownProduct = new Product(productId, "mine", null, caller, List.of());

        when(jwtService.extractUsername("caller-token")).thenReturn("caller");
        when(userService.findDomainUserByUsername("caller")).thenReturn(Optional.of(caller));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(ownProduct));

        mockMvc.perform(get("/api/users/" + callerId + "/products/" + productId)
                        .cookie(new Cookie("jwt", "caller-token")))
                .andExpect(status().isOk());
    }

    // ---------------------------------------------------------------------
    // #50 — PATCH partiel + soft delete (archive). BR-PRO-001/004/007.
    // ---------------------------------------------------------------------

    /** BR-PRO-001/004 : PATCH d'un nom valide sur son propre produit -> 200 + produit à jour. */
    @Test
    void patchProduct_ownProduct_validName_returns200_withUpdatedProduct() throws Exception {
        User caller = new User(callerId, "Caller", "caller", "pwd", "ROLE_USER", "c@c.com");
        Product ownProduct = new Product(productId, "old", null, caller, List.of());
        Product updated = new Product(productId, "renamed", null, caller, List.of());

        when(jwtService.extractUsername("caller-token")).thenReturn("caller");
        when(userService.findDomainUserByUsername("caller")).thenReturn(Optional.of(caller));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(ownProduct));
        when(productService.updateProduct(eq(productId), any(ProductUpdateRequest.class))).thenReturn(updated);

        mockMvc.perform(patch("/api/users/" + callerId + "/products/" + productId)
                        .cookie(new Cookie("jwt", "caller-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"renamed\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("renamed"));
    }

    /**
     * BR-PRO-001 : nom vide -> 400 via @Valid (@Size min=1). La validation @RequestBody
     * échoue AVANT le corps du contrôleur : aucun stub JWT/user requis (sinon
     * UnnecessaryStubbingException). Le service n'est jamais appelé.
     */
    @Test
    void patchProduct_emptyName_returns400() throws Exception {
        mockMvc.perform(patch("/api/users/" + callerId + "/products/" + productId)
                        .cookie(new Cookie("jwt", "caller-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest());

        verify(productService, never()).updateProduct(any(), any());
    }

    /** BR-PRO-001 : nom > 100 caractères -> 400 via @Valid (@Size max=100), avant le corps. */
    @Test
    void patchProduct_nameTooLong_returns400() throws Exception {
        String longName = "a".repeat(101);

        mockMvc.perform(patch("/api/users/" + callerId + "/products/" + productId)
                        .cookie(new Cookie("jwt", "caller-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + longName + "\"}"))
                .andExpect(status().isBadRequest());

        verify(productService, never()).updateProduct(any(), any());
    }

    /** BR-PRO-007 : produit inexistant -> 404, service update jamais appelé. */
    @Test
    void patchProduct_productNotFound_returns404() throws Exception {
        User caller = new User(callerId, "Caller", "caller", "pwd", "ROLE_USER", "c@c.com");

        when(jwtService.extractUsername("caller-token")).thenReturn("caller");
        when(userService.findDomainUserByUsername("caller")).thenReturn(Optional.of(caller));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/api/users/" + callerId + "/products/" + productId)
                        .cookie(new Cookie("jwt", "caller-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"renamed\"}"))
                .andExpect(status().isNotFound());

        verify(productService, never()).updateProduct(any(), any());
    }

    /** BR-PRO-004 : PATCH d'un produit appartenant à un autre user -> 403 (anti-IDOR). */
    @Test
    void patchProduct_productOwnedByAnotherUser_returns403() throws Exception {
        User caller = new User(callerId, "Caller", "caller", "pwd", "ROLE_USER", "c@c.com");
        User realOwner = new User(otherUserId, "Other", "other", "pwd", "ROLE_USER", "o@o.com");
        Product foreignProduct = new Product(productId, "foreign", null, realOwner, List.of());

        when(jwtService.extractUsername("caller-token")).thenReturn("caller");
        when(userService.findDomainUserByUsername("caller")).thenReturn(Optional.of(caller));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(foreignProduct));

        mockMvc.perform(patch("/api/users/" + callerId + "/products/" + productId)
                        .cookie(new Cookie("jwt", "caller-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"renamed\"}"))
                .andExpect(status().isForbidden());

        verify(productService, never()).updateProduct(any(), any());
    }

    /** BR-PRO-007 : DELETE d'un produit possédé -> 204 (No Content) + soft delete (archiveById). */
    @Test
    void deleteProduct_ownProduct_returns204_andArchives() throws Exception {
        User caller = new User(callerId, "Caller", "caller", "pwd", "ROLE_USER", "c@c.com");
        Product ownProduct = new Product(productId, "mine", null, caller, List.of());

        when(jwtService.extractUsername("caller-token")).thenReturn("caller");
        when(userService.findDomainUserByUsername("caller")).thenReturn(Optional.of(caller));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(ownProduct));

        mockMvc.perform(delete("/api/users/" + callerId + "/products/" + productId)
                        .cookie(new Cookie("jwt", "caller-token")))
                .andExpect(status().isNoContent());

        verify(productService).archiveById(productId);
    }
}
