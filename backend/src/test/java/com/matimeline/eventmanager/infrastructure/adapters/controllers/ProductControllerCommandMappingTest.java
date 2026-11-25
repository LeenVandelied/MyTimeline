package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.EventCreateCommand;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.ProductCreateCommand;
import com.matimeline.eventmanager.domain.models.ProductUpdateCommand;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.infrastructure.security.CallerResolver;

/**
 * #185 : fixe la traduction DTO HTTP -> commandes domaine du ProductController, champ par champ,
 * en capturant la commande reçue par le port ProductService.
 */
@ExtendWith(MockitoExtension.class)
class ProductControllerCommandMappingTest {

    @Mock
    private ProductService productService;
    @Mock
    private EventService eventService;
    @Mock
    private CallerResolver callerResolver;

    private MockMvc mockMvc;
    private UUID callerId;
    private UUID productId;
    private User caller;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new ProductController(productService, eventService, callerResolver))
                .build();
        callerId = UUID.randomUUID();
        productId = UUID.randomUUID();
        caller = new User(callerId, "Caller", "caller", "pwd", "ROLE_USER", "c@c.com");
    }

    @Test
    void createProduct_fullBody_commandCarriesEveryJsonField() throws Exception {
        UUID categoryId = UUID.randomUUID();
        Product created = new Product(productId, "Voyage", new Category(categoryId, "Travail"), caller, List.of());
        when(callerResolver.currentUser()).thenReturn(Optional.of(caller));
        when(productService.createProduct(org.mockito.ArgumentMatchers.any())).thenReturn(created);

        String body = "{\"name\":\"Voyage\",\"category\":\"" + categoryId + "\",\"userId\":\"" + UUID.randomUUID() + "\",\"color\":\"#AABBCC\","
                + "\"events\":[{\"name\":\"Congés\",\"type\":\"duration\",\"durationValue\":3,"
                + "\"durationUnit\":\"days\",\"isRecurring\":true,\"recurrenceUnit\":\"YEAR\","
                + "\"date\":\"2026-08-01\",\"isAllDay\":true,\"color\":\"#112233\"}]}";

        mockMvc.perform(post("/api/users/" + callerId + "/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        ArgumentCaptor<ProductCreateCommand> captor = ArgumentCaptor.forClass(ProductCreateCommand.class);
        verify(productService).createProduct(captor.capture());
        ProductCreateCommand command = captor.getValue();
        assertThat(command.name()).isEqualTo("Voyage");
        assertThat(command.categoryId()).isEqualTo(categoryId);
        assertThat(command.userId()).isEqualTo(callerId);
        assertThat(command.color()).isEqualTo("#AABBCC");
        assertThat(command.events()).hasSize(1);

        EventCreateCommand event = command.events().get(0);
        assertThat(event.name()).isEqualTo("Congés");
        assertThat(event.type()).isEqualTo("duration");
        assertThat(event.durationValue()).isEqualTo(3);
        assertThat(event.durationUnit()).isEqualTo("days");
        assertThat(event.isRecurring()).isTrue();
        assertThat(event.recurrenceUnit()).isEqualTo("YEAR");
        assertThat(event.date()).isEqualTo(LocalDate.of(2026, 8, 1));
        assertThat(event.isAllDay()).isTrue();
        assertThat(event.color()).isEqualTo("#112233");
        assertThat(event.productId()).isNull();
    }

    @Test
    void updateProduct_colorAndClearColor_commandCarriesBoth() throws Exception {
        stubOwnedProduct();

        mockMvc.perform(patch("/api/users/" + callerId + "/products/" + productId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"color\":\"#123456\",\"clearColor\":true}"))
                .andExpect(status().isOk());

        ProductUpdateCommand command = captureUpdate();
        assertThat(command.color()).isEqualTo("#123456");
        assertThat(command.clearColor()).isTrue();
    }

    @Test
    void updateProduct_nameOnly_otherFieldsStayUnset() throws Exception {
        stubOwnedProduct();

        mockMvc.perform(patch("/api/users/" + callerId + "/products/" + productId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"x\"}"))
                .andExpect(status().isOk());

        ProductUpdateCommand command = captureUpdate();
        assertThat(command.name()).isEqualTo("x");
        assertThat(command.categoryId()).isNull();
        assertThat(command.color()).isNull();
        assertThat(command.clearColor()).isFalse();
    }

    private void stubOwnedProduct() {
        Product owned = new Product(productId, "p", null, caller, List.of());
        when(callerResolver.currentUser()).thenReturn(Optional.of(caller));
        when(productService.findDomainProductById(productId)).thenReturn(Optional.of(owned));
        when(productService.updateProduct(org.mockito.ArgumentMatchers.eq(productId), org.mockito.ArgumentMatchers.any()))
                .thenReturn(owned);
    }

    private ProductUpdateCommand captureUpdate() {
        ArgumentCaptor<ProductUpdateCommand> captor = ArgumentCaptor.forClass(ProductUpdateCommand.class);
        verify(productService).updateProduct(org.mockito.ArgumentMatchers.eq(productId), captor.capture());
        return captor.getValue();
    }
}
