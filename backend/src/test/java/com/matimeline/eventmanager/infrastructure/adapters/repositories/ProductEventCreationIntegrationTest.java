package com.matimeline.eventmanager.infrastructure.adapters.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.application.dtos.EventCreationRequest;
import com.matimeline.eventmanager.application.dtos.ProductCreationRequest;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.EventCreateCommand;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;

/**
 * Couvre le chemin de CRÉATION domaine réel (jamais exercé jusqu'ici) contre un
 * vrai Postgres jetable (Testcontainers) :
 *   - {@code ProductServiceImpl.createProduct} -> {@code new Product(UUID.randomUUID(), ...)}
 *     -> {@code ProductMapper.toEntity} (qui recopie l'id) -> {@code super.save} (persist).
 *   - {@code EventServiceImpl.createEvent} -> {@code new Event(UUID.randomUUID(), ...)}
 *     -> {@code EventMapper.toEntity} (setId) -> {@code super.save} (persist).
 *
 * ProductEntity/EventEntity portent {@code @Version} + {@code @GeneratedValue(AUTO)}.
 * Les autres tests d'intégration seed via {@code em.persist(new XEntity())} SANS setId :
 * ce chemin (save d'une entité neuve avec id pré-assigné) n'était donc pas couvert.
 *
 * @Transactional -> rollback après chaque test.
 */
@SpringBootTest
@Transactional
class ProductEventCreationIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private EntityManager em;

    @Autowired
    private ProductService productService;

    @Autowired
    private EventService eventService;

    private UserEntity persistUser() {
        UserEntity user = new UserEntity();
        String suffix = UUID.randomUUID().toString();
        user.setName("create-user-" + suffix);
        user.setUsername("create-user-" + suffix);
        user.setEmail("create-user-" + suffix + "@example.test");
        user.setPassword("x");
        user.setRole("ROLE_USER");
        em.persist(user);
        return user;
    }

    /** Catégorie système (owner null) -> assignable à tout produit. */
    private CategoryEntity persistSystemCategory() {
        CategoryEntity category = new CategoryEntity();
        category.setName("create-cat-" + UUID.randomUUID());
        em.persist(category);
        return category;
    }

    /** Création produit SANS event imbriqué : persist d'une ProductEntity neuve à id pré-assigné. */
    @Test
    void createProduct_persistsThroughRealPostgres() {
        UserEntity user = persistUser();
        CategoryEntity category = persistSystemCategory();
        em.flush();

        ProductCreationRequest request = new ProductCreationRequest();
        request.setName("create-product-" + UUID.randomUUID());
        request.setUserId(user.getId());
        request.setCategory(category.getId());
        request.setEvents(new ArrayList<>());

        Product created = productService.createProduct(request);

        assertThat(created).isNotNull();
        assertThat(created.getId()).isNotNull();
        em.flush();
        em.clear();

        assertThat(productService.findDomainProductById(created.getId()))
                .isPresent()
                .get()
                .extracting(Product::getName)
                .isEqualTo(request.getName());
    }

    /** Création produit AVEC event imbriqué : persist en cascade (ProductEntity + EventEntity neufs). */
    @Test
    void createProduct_withNestedEvent_persistsThroughRealPostgres() {
        UserEntity user = persistUser();
        CategoryEntity category = persistSystemCategory();
        em.flush();

        EventCreationRequest eventReq = new EventCreationRequest();
        eventReq.setName("nested-event-" + UUID.randomUUID());
        eventReq.setType("single");
        eventReq.setDurationValue(1);
        eventReq.setDurationUnit("days");
        eventReq.setIsRecurring(false);
        eventReq.setDate(LocalDate.of(2026, 7, 2));
        eventReq.setIsAllDay(true);

        ProductCreationRequest request = new ProductCreationRequest();
        request.setName("create-product-nested-" + UUID.randomUUID());
        request.setUserId(user.getId());
        request.setCategory(category.getId());
        request.setEvents(List.of(eventReq));

        Product created = productService.createProduct(request);

        assertThat(created).isNotNull();
        assertThat(created.getId()).isNotNull();
        em.flush();
        em.clear();

        List<Event> events = eventService.findDomainEventByProductId(created.getId());
        assertThat(events).hasSize(1);
        assertThat(events.get(0).getTitle()).isEqualTo(eventReq.getName());
    }

    /** Création event via EventService : persist d'une EventEntity neuve à id pré-assigné. */
    @Test
    void createEvent_persistsThroughRealPostgres() {
        UserEntity user = persistUser();
        CategoryEntity category = persistSystemCategory();
        em.flush();

        ProductCreationRequest productReq = new ProductCreationRequest();
        productReq.setName("host-product-" + UUID.randomUUID());
        productReq.setUserId(user.getId());
        productReq.setCategory(category.getId());
        productReq.setEvents(new ArrayList<>());
        Product product = productService.createProduct(productReq);
        em.flush();

        String eventName = "standalone-event-" + UUID.randomUUID();
        EventCreateCommand eventReq = new EventCreateCommand(
                eventName, "single", 2, "days", false, null,
                LocalDate.of(2026, 7, 2), false, null, product.getId());

        Event created = eventService.createEvent(eventReq);

        assertThat(created).isNotNull();
        assertThat(created.getId()).isNotNull();
        em.flush();
        em.clear();

        assertThat(eventService.findEventById(created.getId()))
                .isPresent()
                .get()
                .extracting(Event::getTitle)
                .isEqualTo(eventName);
    }
}
