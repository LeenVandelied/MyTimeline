package com.matimeline.eventmanager.application.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.matimeline.eventmanager.application.policy.PlanPolicy;
import com.matimeline.eventmanager.domain.exceptions.EventQuotaExceededException;
import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.EventCreateCommand;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.ProductCreateCommand;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.CategoryRepository;
import com.matimeline.eventmanager.domain.ports.repositories.EventRepository;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;

/**
 * #88 : quota appliqué à un lot d'événements à la création d'un produit, avec une VRAIE
 * politique (plafond gratuit 20). Le rang dans le lot s'ajoute au décompte possédé.
 */
class ProductServiceImplQuotaBatchTest {

    private ProductRepository productRepository;
    private EventRepository eventRepository;
    private ProductServiceImpl service;

    private UUID callerId;
    private UUID categoryId;
    private User caller;

    @BeforeEach
    void setUp() {
        productRepository = mock(ProductRepository.class);
        eventRepository = mock(EventRepository.class);
        CategoryRepository categoryRepository = mock(CategoryRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        service = new ProductServiceImpl(productRepository, eventRepository, categoryRepository, userRepository,
                new PlanPolicy(true, 20, 200));

        callerId = UUID.randomUUID();
        categoryId = UUID.randomUUID();
        caller = new User(callerId, "Caller", "caller", "pwd", "ROLE_USER", "c@c.com");
        Category category = new Category(categoryId, "Mienne", "#000", "desc", callerId);
        when(userRepository.findDomainUserById(callerId)).thenReturn(Optional.of(caller));
        when(categoryRepository.findDomainCategoryById(categoryId)).thenReturn(Optional.of(category));
    }

    private ProductCreateCommand requestWithEvents(int count) {
        List<EventCreateCommand> events = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            events.add(new EventCreateCommand(
                    "event-" + i, "single", 1, "days", false, null, null, null, null, null));
        }
        return new ProductCreateCommand("Produit", categoryId, callerId, null, events);
    }

    @Test
    void freeUser_18OwnedPlusBatchOf3_isRefused_andNothingSaved() {
        when(eventRepository.countActiveByUserId(callerId)).thenReturn(18L);

        assertThatThrownBy(() -> service.createProduct(requestWithEvents(3)))
                .isInstanceOf(EventQuotaExceededException.class);

        verify(productRepository, never()).save(any(Product.class));
        verify(eventRepository, never()).save(any(Event.class));
    }

    @Test
    void freeUser_17OwnedPlusBatchOf3_isAccepted() {
        when(eventRepository.countActiveByUserId(callerId)).thenReturn(17L);
        Product saved = new Product(UUID.randomUUID(), "Produit",
                new Category(categoryId, "Mienne", "#000", "desc", callerId), caller, new ArrayList<>());
        when(productRepository.save(any(Product.class))).thenReturn(saved);

        Product result = service.createProduct(requestWithEvents(3));

        assertThat(result).isNotNull();
        verify(productRepository).save(any(Product.class));
    }
}
