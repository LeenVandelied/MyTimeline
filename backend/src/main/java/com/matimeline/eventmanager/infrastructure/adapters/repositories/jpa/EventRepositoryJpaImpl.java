package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import java.util.List;
import java.util.Optional;
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

    @Autowired
    public EventRepositoryJpaImpl(
        EntityManager em,
        EventMapper eventMapper
    ) {
        super(EventEntity.class, em);
        this.entityManager = em;
        this.eventMapper = eventMapper;
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
        // #165 : découplage infra-infra. On dépendait de la classe concrète
        // ProductRepositoryJpaImpl pour charger la ProductEntity FK. On récupère désormais
        // une RÉFÉRENCE GÉRÉE (proxy) via l'EntityManager — même pattern que
        // ProductRepositoryJpaImpl.save (getReference pour attacher une FK sans charger la
        // ligne). L'existence du produit est déjà validée en amont (ProductNotFoundException
        // dans EventServiceImpl.createEvent / ownership dans EventController), donc pas de
        // findById redondant ici. getReference lève EntityNotFoundException à l'usage si l'id
        // n'existe pas (défense en profondeur).
        UUID productId = domainEvent.getProductId();
        ProductEntity productEntity = entityManager.getReference(ProductEntity.class, productId);

        // PIT-S10-003 / convention 4 (#54) : le domaine ne porte pas @Version. Reconstruire
        // l'EventEntity via le mapper produit une entité DÉTACHÉE (version=null) : sur un
        // UPDATE, SimpleJpaRepository.save la route vers persist() (isNew=true) -> échec
        // "uninitialized version value", ou merge() -> OptimisticLock. Pour une MISE À JOUR
        // (id existant en base) on charge donc l'entité GÉRÉE et on recopie les champs
        // mutables ; l'audit (@Version/updated_at) reste piloté par Hibernate. Aligné sur
        // ProductRepositoryJpaImpl.save. La CRÉATION garde le chemin persist du mapper.
        if (domainEvent.getId() != null) {
            EventEntity managed = super.findById(domainEvent.getId()).orElse(null);
            if (managed != null) {
                copyMutableFields(domainEvent, managed, productEntity);
                EventEntity flushed = super.save(managed);
                return eventMapper.toDomain(flushed);
            }
        }

        EventEntity entity = eventMapper.toEntity(domainEvent, productEntity);
        EventEntity saved = super.save(entity);

        return eventMapper.toDomain(saved);
    }

    private void copyMutableFields(Event source, EventEntity target, ProductEntity productEntity) {
        target.setTitle(source.getTitle());
        target.setType(source.getType());
        target.setDurationValue(source.getDurationValue());
        target.setDurationUnit(source.getDurationUnit());
        target.setIsRecurring(source.getIsRecurring());
        target.setRecurrenceUnit(source.getRecurrenceUnit());
        target.setRecurrenceEndDate(source.getRecurrenceEndDate());
        target.setStartDate(source.getStartDate());
        target.setEndDate(source.getEndDate());
        target.setIsAllDay(source.getIsAllDay());
        target.setColor(source.getColor());
        target.setArchived(source.isArchived());
        target.setProduct(productEntity);
    }
    
    // #78 — SQL NATIF volontaire. events n'a PAS de user_id : l'appartenance passe par
    // product_id -> products.user_id. Un sous-select JPQL sur ProductEntity serait filtré
    // par son @SQLRestriction("archived = false"), laissant les events des produits
    // archivés (dont le product_id resterait, bloquant ensuite le DELETE products). Le
    // natif voit TOUS les produits du user, archivés inclus.
    @Override
    public int deleteAllByUserId(UUID userId) {
        return entityManager
                .createNativeQuery(
                        "DELETE FROM events WHERE product_id IN "
                        + "(SELECT id FROM products WHERE user_id = :uid)")
                .setParameter("uid", userId)
                .executeUpdate();
    }

    @Override
    public Optional<Event> findEventById(UUID id) {
        Optional<EventEntity> optionalEntity = super.findById(id);
        if (optionalEntity.isPresent()) {
            EventEntity entity = optionalEntity.get();
            return Optional.of(eventMapper.toDomain(entity));
        }
        return Optional.empty();
    }
}