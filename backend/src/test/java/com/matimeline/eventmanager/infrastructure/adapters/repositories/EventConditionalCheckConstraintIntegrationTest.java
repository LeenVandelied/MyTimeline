package com.matimeline.eventmanager.infrastructure.adapters.repositories;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.infrastructure.entities.CategoryEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;
import com.matimeline.eventmanager.infrastructure.entities.UserEntity;
import com.matimeline.eventmanager.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;

/**
 * #128 — Vérifie de bout en bout (Postgres jetable + Flyway V1..V11) les DEUX
 * contraintes CHECK conditionnelles posées par V11 sur {@code events} :
 *   - ck_events_duration_unit_required   : type='duration' => duration_unit NOT NULL ;
 *   - ck_events_recurrence_unit_required : is_recurring=true => recurrence_unit NOT NULL.
 *
 * Couvre le REJET DB des lignes incohérentes ET la NON-RÉGRESSION des lignes
 * valides (dont les cas NULL tolérés : type='single', is_recurring=false/NULL).
 * Insertions en SQL natif pour court-circuiter les validations applicatives et
 * frapper directement le CHECK DB.
 *
 * @Transactional -> rollback après chaque test ; données uniques par UUID.
 */
@SpringBootTest
@Transactional
class EventConditionalCheckConstraintIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private EntityManager em;

    private UUID persistProductGraph() {
        UserEntity user = new UserEntity();
        String suffix = UUID.randomUUID().toString();
        user.setName("i128-user-" + suffix);
        user.setUsername("i128-user-" + suffix);
        user.setEmail("i128-user-" + suffix + "@example.test");
        user.setPassword("x");
        user.setRole("ROLE_USER");
        em.persist(user);

        CategoryEntity category = new CategoryEntity();
        category.setName("i128-cat-" + UUID.randomUUID());
        em.persist(category);

        ProductEntity product = new ProductEntity();
        product.setName("i128-product-" + UUID.randomUUID());
        product.setCategory(category);
        product.setUser(user);
        product.setArchived(false);
        em.persist(product);
        em.flush();
        return product.getId();
    }

    /**
     * Insertion native minimale d'un event. Les colonnes optionnelles
     * (duration_unit, recurrence_unit) sont bindées, pouvant valoir NULL.
     */
    private void insertEvent(UUID productId, String type, String durationUnit,
            Boolean isRecurring, String recurrenceUnit) {
        em.createNativeQuery(
                "INSERT INTO events "
                + "(id, created_at, updated_at, version, title, type, duration_unit, "
                + " is_recurring, recurrence_unit, start_date, archived, product_id) "
                + "VALUES (:id, now(), now(), 0, :title, :type, :durationUnit, "
                + " :isRecurring, :recurrenceUnit, :start, false, :pid)")
                .setParameter("id", UUID.randomUUID())
                .setParameter("title", "i128-event-" + UUID.randomUUID())
                .setParameter("type", type)
                .setParameter("durationUnit", durationUnit)
                .setParameter("isRecurring", isRecurring)
                .setParameter("recurrenceUnit", recurrenceUnit)
                .setParameter("start", LocalDate.of(2026, 1, 1))
                .setParameter("pid", productId)
                .executeUpdate();
        em.flush();
    }

    // ---------- REJET : ck_events_duration_unit_required ----------

    /** type='duration' + duration_unit NULL -> rejeté par le CHECK DB. */
    @Test
    void durationTypeWithoutDurationUnit_rejectedByCheckConstraint() {
        UUID productId = persistProductGraph();
        assertThatThrownBy(() ->
                insertEvent(productId, "duration", null, false, null))
                .isInstanceOf(Exception.class);
    }

    // ---------- REJET : ck_events_recurrence_unit_required ----------

    /** is_recurring=true + recurrence_unit NULL -> rejeté par le CHECK DB. */
    @Test
    void recurringWithoutRecurrenceUnit_rejectedByCheckConstraint() {
        UUID productId = persistProductGraph();
        assertThatThrownBy(() ->
                insertEvent(productId, "single", null, true, null))
                .isInstanceOf(Exception.class);
    }

    // ---------- NON-RÉGRESSION : lignes valides acceptées ----------

    /** type='duration' AVEC duration_unit -> accepté. */
    @Test
    void durationTypeWithDurationUnit_isAccepted() {
        UUID productId = persistProductGraph();
        assertThatCode(() ->
                insertEvent(productId, "duration", "days", false, null))
                .doesNotThrowAnyException();
    }

    /** type='single' sans duration_unit -> accepté (unité non requise). */
    @Test
    void singleTypeWithoutDurationUnit_isAccepted() {
        UUID productId = persistProductGraph();
        assertThatCode(() ->
                insertEvent(productId, "single", null, false, null))
                .doesNotThrowAnyException();
    }

    /** is_recurring=true AVEC recurrence_unit -> accepté. */
    @Test
    void recurringWithRecurrenceUnit_isAccepted() {
        UUID productId = persistProductGraph();
        assertThatCode(() ->
                insertEvent(productId, "single", null, true, "WEEK"))
                .doesNotThrowAnyException();
    }

    /** is_recurring NULL sans recurrence_unit -> accepté (NULL toléré, IS NOT TRUE). */
    @Test
    void nullIsRecurringWithoutRecurrenceUnit_isAccepted() {
        UUID productId = persistProductGraph();
        assertThatCode(() ->
                insertEvent(productId, "single", null, null, null))
                .doesNotThrowAnyException();
    }
}
