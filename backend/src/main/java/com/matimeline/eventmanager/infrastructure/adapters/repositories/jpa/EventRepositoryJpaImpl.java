package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;
import org.springframework.stereotype.Repository;

import com.matimeline.eventmanager.application.mappers.EventMapper;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.ports.repositories.EventRepository;
import com.matimeline.eventmanager.infrastructure.entities.EventEntity;
import com.matimeline.eventmanager.infrastructure.entities.ProductEntity;

import jakarta.persistence.EntityManager;

@Repository
public class EventRepositoryJpaImpl
    extends SimpleJpaRepository<EventEntity, UUID>
    implements EventRepository {

    private final EntityManager entityManager;
    private final EventMapper eventMapper;
    private final ProductRepositoryJpaImpl productRepositoryJpa;

    @Autowired
    public EventRepositoryJpaImpl(
        EntityManager em,
        EventMapper eventMapper,
        ProductRepositoryJpaImpl productRepositoryJpa
    ) {
        super(EventEntity.class, em);
        this.entityManager = em;
        this.eventMapper = eventMapper;
        this.productRepositoryJpa = productRepositoryJpa;
    }
    
    @Override
    public List<Event> findDomainEventByProductId(UUID productId) {
        List<EventEntity> entities = entityManager
            .createQuery("SELECT e FROM EventEntity e WHERE e.product.id = :pid", EventEntity.class)
            .setParameter("pid", productId)
            .getResultList();

        return entities.stream()
            .map(eventMapper::toDomain)
            .toList();
    }

    @Override
    public Event save(Event domainEvent) {
        UUID productId = domainEvent.getProductId();
        ProductEntity productEntity = productRepositoryJpa
            .findById(productId)
            .orElseThrow(() -> new RuntimeException("Product not found"));

        EventEntity entity = eventMapper.toEntity(domainEvent, productEntity);
        EventEntity saved = super.save(entity);

        return eventMapper.toDomain(saved);
    }
}