package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.ports.repositories.EventRepository;
import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;

/**
 * #88 : périmètre du décompte {@code countActiveByUserId}. Un produit archivé exclut ses
 * événements non archivés, et les événements d'un autre utilisateur ne sont pas comptés.
 *
 * @Transactional -> rollback après chaque test ; données uniques par UUID.
 */
@SpringBootTest
@Transactional
class EventQuotaCountScopeIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private EntityManager em;

    @Autowired
    private EventRepository eventRepository;

    private UserEntity persistUser() {
        UserEntity user = new UserEntity();
        String suffix = UUID.randomUUID().toString();
        user.setName("i88s-user-" + suffix);
        user.setUsername("i88s-user-" + suffix);
        user.setEmail("i88s-user-" + suffix + "@example.test");
        user.setPassword("x");
        user.setRole("ROLE_USER");
        em.persist(user);
        return user;
    }

    private ProductEntity persistProduct(UserEntity user, boolean archived) {
        CategoryEntity category = new CategoryEntity();
        category.setName("i88s-cat-" + UUID.randomUUID());
        em.persist(category);
        ProductEntity product = new ProductEntity();
        product.setName("i88s-product-" + UUID.randomUUID());
        product.setCategory(category);
        product.setUser(user);
        product.setArchived(archived);
        em.persist(product);
        return product;
    }

    private void persistActiveEvent(ProductEntity product) {
        EventEntity event = new EventEntity();
        event.setTitle("i88s-event-" + UUID.randomUUID());
        event.setType("single");
        event.setArchived(false);
        event.setProduct(product);
        em.persist(event);
    }

    @Test
    void archivedProduct_withActiveEvents_countsZero() {
        UserEntity user = persistUser();
        ProductEntity archivedProduct = persistProduct(user, true);
        persistActiveEvent(archivedProduct);
        persistActiveEvent(archivedProduct);
        em.flush();
        em.clear();

        assertThat(eventRepository.countActiveByUserId(user.getId())).isZero();
    }

    @Test
    void otherUsersEvents_areNotCounted() {
        UserEntity user = persistUser();
        UserEntity other = persistUser();
        persistActiveEvent(persistProduct(user, false));
        ProductEntity otherProduct = persistProduct(other, false);
        persistActiveEvent(otherProduct);
        persistActiveEvent(otherProduct);
        em.flush();
        em.clear();

        assertThat(eventRepository.countActiveByUserId(user.getId())).isEqualTo(1L);
        assertThat(eventRepository.countActiveByUserId(other.getId())).isEqualTo(2L);
    }
}
