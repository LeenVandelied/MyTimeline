package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

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

        verify(productService, never()).deleteById(productId);
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
}
