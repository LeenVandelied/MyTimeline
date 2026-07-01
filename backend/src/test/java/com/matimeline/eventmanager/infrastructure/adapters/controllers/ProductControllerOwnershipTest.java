package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

import com.matimeline.eventmanager.application.dtos.ProductCreationRequest;
import com.matimeline.eventmanager.application.dtos.ProductUpdateRequest;
import com.matimeline.eventmanager.application.services.EventServiceImpl;
import com.matimeline.eventmanager.application.services.ProductServiceImpl;
import com.matimeline.eventmanager.application.services.UserServiceImpl;
import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.Event;
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

    /**
     * FIX review S10 (BR-PRO-001) : un nom purement blanc (" ", longueur 1) passait @Size(min=1)
     * mais viole BR-PRO-001. Le @Pattern(".*\\S.*") le rejette -> 400, avant le corps du
     * contrôleur (aucun stub requis). Le service update n'est jamais appelé.
     */
    @Test
    void patchProduct_blankName_returns400() throws Exception {
        mockMvc.perform(patch("/api/users/" + callerId + "/products/" + productId)
                        .cookie(new Cookie("jwt", "caller-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" \"}"))
                .andExpect(status().isBadRequest());

        verify(productService, never()).updateProduct(any(), any());
    }

    /**
     * FIX review S10 : patch partiel SANS name (name = null / champ absent) reste valide —
     * @Pattern et @Size ignorent null. Ici seul categoryId change ; pas de 400 sur le motif nom.
     */
    @Test
    void patchProduct_nameAbsent_categoryOnly_returns200() throws Exception {
        User caller = new User(callerId, "Caller", "caller", "pwd", "ROLE_USER", "c@c.com");
        Product ownProduct = new Product(productId, "kept", null, caller, List.of());
        Product updated = new Product(productId, "kept", null, caller, List.of());
        UUID newCategoryId = UUID.randomUUID();

        when(jwtService.extractUsername("caller-token")).thenReturn("caller");
        when(userService.findDomainUserByUsername("caller")).thenReturn(Optional.of(caller));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(ownProduct));
        when(productService.updateProduct(eq(productId), any(ProductUpdateRequest.class))).thenReturn(updated);

        mockMvc.perform(patch("/api/users/" + callerId + "/products/" + productId)
                        .cookie(new Cookie("jwt", "caller-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":\"" + newCategoryId + "\"}"))
                .andExpect(status().isOk());
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

    // ---------------------------------------------------------------------
    // Absorb S10 (AP-CAT-03) — ProductResponse DTO : forme JSON préservée
    // {id, name, category:{id,name}, events:[...]} + PAS de fuite du User/owner.
    // ---------------------------------------------------------------------

    /**
     * GET produit possédé : la réponse respecte {@code {id, name, category:{id,name},
     * events:[...]}} ET n'expose NI {@code user}/owner NI le mot de passe du propriétaire
     * (fin de la fuite du domain model produit). La catégorie est réduite à {id, name}.
     */
    @Test
    void getProductById_ownProduct_returnsResponseShape_withoutUserLeak() throws Exception {
        User caller = new User(callerId, "Caller", "caller", "s3cr3t", "ROLE_USER", "c@c.com");
        UUID categoryId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        Category category = new Category(categoryId, "Travail", "#fff", "desc", callerId);
        Event event = new Event(eventId, "Sortie", "single", null, null,
                Boolean.FALSE, null, null, null, productId, Boolean.TRUE);
        Product ownProduct = new Product(productId, "mine", category, caller, List.of(event));

        when(jwtService.extractUsername("caller-token")).thenReturn("caller");
        when(userService.findDomainUserByUsername("caller")).thenReturn(Optional.of(caller));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(ownProduct));

        mockMvc.perform(get("/api/users/" + callerId + "/products/" + productId)
                        .cookie(new Cookie("jwt", "caller-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(productId.toString()))
                .andExpect(jsonPath("$.name").value("mine"))
                .andExpect(jsonPath("$.category.id").value(categoryId.toString()))
                .andExpect(jsonPath("$.category.name").value("Travail"))
                .andExpect(jsonPath("$.events[0].id").value(eventId.toString()))
                .andExpect(jsonPath("$.events[0].title").value("Sortie"))
                // Anti-fuite : aucun objet user/owner, ni PII, ni ownerId de catégorie.
                .andExpect(jsonPath("$.user").doesNotExist())
                .andExpect(jsonPath("$.owner").doesNotExist())
                .andExpect(jsonPath("$.category.ownerId").doesNotExist())
                .andExpect(jsonPath("$.category.description").doesNotExist());
    }

    /**
     * POST création : 201 + même forme {@code {id, name, category:{id,name}, events:[...]}}
     * SANS champ {@code user}/owner exposé.
     */
    @Test
    void createProduct_returns201_withResponseShape_withoutUserLeak() throws Exception {
        User caller = new User(callerId, "Caller", "caller", "s3cr3t", "ROLE_USER", "c@c.com");
        UUID categoryId = UUID.randomUUID();
        Category category = new Category(categoryId, "Travail");
        Product created = new Product(productId, "nouveau", category, caller, List.of());

        when(jwtService.extractUsername("caller-token")).thenReturn("caller");
        when(userService.findDomainUserByUsername("caller")).thenReturn(Optional.of(caller));
        when(productService.createProduct(any(ProductCreationRequest.class))).thenReturn(created);

        mockMvc.perform(post("/api/users/" + callerId + "/products")
                        .cookie(new Cookie("jwt", "caller-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"nouveau\",\"category\":\"" + categoryId
                                + "\",\"userId\":\"" + callerId + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(productId.toString()))
                .andExpect(jsonPath("$.name").value("nouveau"))
                .andExpect(jsonPath("$.category.id").value(categoryId.toString()))
                .andExpect(jsonPath("$.category.name").value("Travail"))
                .andExpect(jsonPath("$.events").isArray())
                .andExpect(jsonPath("$.user").doesNotExist())
                .andExpect(jsonPath("$.owner").doesNotExist());
    }
}
