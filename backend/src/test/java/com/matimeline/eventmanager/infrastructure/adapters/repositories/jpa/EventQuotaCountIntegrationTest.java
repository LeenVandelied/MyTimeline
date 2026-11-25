package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.models.RecurrenceUnit;
import com.matimeline.eventmanager.domain.ports.repositories.EventRepository;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;

/**
 * #88 (R4) : décompte des événements actifs d'un utilisateur ({@code countActiveByUserId}).
 * Seuls les actifs comptent, un événement récurrent compte pour un.
 *
 * @Transactional -> rollback après chaque test ; données uniques par UUID.
 */
@SpringBootTest
@Transactional
class EventQuotaCountIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private EntityManager em;

    @Autowired
    private EventRepository eventRepository;

    private UserEntity persistUser() {
        UserEntity user = new UserEntity();
        String suffix = UUID.randomUUID().toString();
        user.setName("i88-user-" + suffix);
        user.setUsername("i88-user-" + suffix);
        user.setEmail("i88-user-" + suffix + "@example.test");
        user.setPassword("x");
        user.setRole("ROLE_USER");
        em.persist(user);
        return user;
    }

    private ProductEntity persistProduct(UserEntity user) {
        CategoryEntity category = new CategoryEntity();
        category.setName("i88-cat-" + UUID.randomUUID());
        em.persist(category);
        ProductEntity product = new ProductEntity();
        product.setName("i88-product-" + UUID.randomUUID());
        product.setCategory(category);
        product.setUser(user);
        em.persist(product);
        return product;
    }

    private EventEntity persistEvent(ProductEntity product, boolean archived) {
        EventEntity event = new EventEntity();
        event.setTitle("i88-event-" + UUID.randomUUID());
        event.setType("single");
        event.setArchived(archived);
        event.setProduct(product);
        em.persist(event);
        return event;
    }

    @Test
    void archivedEvents_areNotCounted() {
        UserEntity user = persistUser();
        ProductEntity product = persistProduct(user);
        persistEvent(product, false);
        persistEvent(product, false);
        persistEvent(product, false);
        persistEvent(product, true);
        persistEvent(product, true);
        em.flush();
        em.clear();

        assertThat(eventRepository.countActiveByUserId(user.getId())).isEqualTo(3L);
    }

    @Test
    void recurringEvent_countsOnce() {
        UserEntity user = persistUser();
        ProductEntity product = persistProduct(user);
        EventEntity weekly = persistEvent(product, false);
        weekly.setIsRecurring(true);
        weekly.setRecurrenceUnit(RecurrenceUnit.WEEK);
        weekly.setStartDate(LocalDate.of(2026, 1, 5));
        em.flush();
        em.clear();

        assertThat(eventRepository.countActiveByUserId(user.getId())).isEqualTo(1L);
    }
}
