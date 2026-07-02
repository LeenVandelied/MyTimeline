package com.matimeline.eventmanager.application.services;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.application.dtos.EventCreationRequest;
import com.matimeline.eventmanager.application.dtos.EventUpdateRequest;
import com.matimeline.eventmanager.domain.exceptions.EventNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.ProductNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.RecurrenceEndDateBeforeStartException;
import com.matimeline.eventmanager.domain.exceptions.RecurrenceUnitRequiredException;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.RecurrenceUnit;
import com.matimeline.eventmanager.domain.ports.repositories.EventRepository;
import com.matimeline.eventmanager.domain.ports.repositories.ProductRepository;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.utils.Utils;

@Service
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;
    private final ProductRepository productRepository;

    @Autowired
    public EventServiceImpl(EventRepository eventRepository,
                        ProductRepository productRepository) {
        this.eventRepository = eventRepository;
        this.productRepository = productRepository;
    }

    @Override
    @Transactional
    public Event createEvent(EventCreationRequest eventCreationRequest) {
        Product product = productRepository.findDomainProductById(eventCreationRequest.getProductId())
            .orElseThrow(() -> new ProductNotFoundException(eventCreationRequest.getProductId()));
        
        LocalDate startDate = (eventCreationRequest.getDate() != null) ? eventCreationRequest.getDate() : LocalDate.now();

        // PIT-S10-003 / convention create : id NULL à la création. EventEntity porte
        // @Version + @GeneratedValue(AUTO) ; un id pré-assigné route persist() vers l'état
        // « détaché » (Hibernate 6.4 : "detached entity with generated id has an
        // uninitialized version value null") et casse l'INSERT réel Postgres. @GeneratedValue
        // attribue l'id, @Version s'initialise (aligné sur CategoryServiceImpl).
        // BR-EVE-014 (#168) : color est désormais fournissable dès la création (aligné sur
        // EventUpdateRequest). Constructeur 14-arg pour porter color ; recurrenceEndDate=null
        // (non exposé au create, seul le PATCH le règle) et archived=false (BR-EVE-013 : un
        // event ne peut pas naître archivé).
        Event event = new Event(
                null,
                eventCreationRequest.getName(),
                eventCreationRequest.getType(),
                eventCreationRequest.getDurationValue(),
                eventCreationRequest.getDurationUnit(),
                eventCreationRequest.getIsRecurring(),
                RecurrenceUnit.fromString(eventCreationRequest.getRecurrenceUnit()),
                null,
                startDate,
                Utils.calculateEndDate(eventCreationRequest, startDate),
                product.getId(),
                eventCreationRequest.getIsAllDay(),
                eventCreationRequest.getColor(),
                false
        );
        return eventRepository.save(event);
    }

    @Override
    @Transactional
    public Event updateEvent(UUID id, EventUpdateRequest updateRequest) {
        Event event = findEventById(id)
            .orElseThrow(() -> new EventNotFoundException(id));

        // Préserve le lien produit existant (le DTO ne porte pas productId).
        UUID originalProductId = event.getProductId();

        // PATCH partiel : chaque champ n'est appliqué que s'il est fourni (non null).
        if (updateRequest.getTitle() != null) {
            event.setTitle(updateRequest.getTitle());
        }
        if (updateRequest.getType() != null) {
            event.setType(updateRequest.getType());
        }
        if (updateRequest.getDurationValue() != null) {
            event.setDurationValue(updateRequest.getDurationValue());
        }
        if (updateRequest.getDurationUnit() != null) {
            event.setDurationUnit(updateRequest.getDurationUnit());
        }
        if (updateRequest.getIsRecurring() != null) {
            event.setIsRecurring(updateRequest.getIsRecurring());
        }
        if (updateRequest.getRecurrenceUnit() != null) {
            event.setRecurrenceUnit(RecurrenceUnit.fromString(updateRequest.getRecurrenceUnit()));
        }
        if (updateRequest.getRecurrenceEndDate() != null) {
            event.setRecurrenceEndDate(updateRequest.getRecurrenceEndDate());
        }
        if (updateRequest.getColor() != null) {
            event.setColor(updateRequest.getColor());
        }
        if (updateRequest.getArchived() != null) {
            event.setArchived(updateRequest.getArchived());
        }

        // BR-EVE-006 (#95fix) : garde sur l'ÉTAT FUSIONNÉ (pas le payload). Le PATCH étant
        // partiel, {"isRecurring":true} peut s'appuyer sur un recurrenceUnit déjà valide en
        // base (non renvoyé) : la validation ne peut donc pas vivre au niveau DTO. On vérifie
        // ici l'entité après application des champs partiels : isRecurring=true impose un
        // recurrenceUnit non-null (WEEK/MONTH/YEAR), sinon -> RecurrenceUnitRequiredException (400).
        // Le chemin CREATE reste couvert par EventCreationRequest.@AssertTrue (inchangé).
        if (Boolean.TRUE.equals(event.getIsRecurring()) && event.getRecurrenceUnit() == null) {
            throw new RecurrenceUnitRequiredException(id);
        }

        // BR-EVE-012 (#168) : garde sur l'ÉTAT FUSIONNÉ. recurrenceEndDate borne la fin d'une
        // récurrence ; une date de fin AVANT startDate est incohérente (auparavant acceptée en
        // silence). startDate n'est pas modifiable via EventUpdateRequest : on compare la
        // recurrenceEndDate fusionnée à la startDate persistée. -> RecurrenceEndDateBeforeStartException
        // (422, cohérent avec InvalidDurationUnitException). isBefore stricte : end == start toléré.
        if (event.getRecurrenceEndDate() != null
                && event.getStartDate() != null
                && event.getRecurrenceEndDate().isBefore(event.getStartDate())) {
            throw new RecurrenceEndDateBeforeStartException(id, event.getRecurrenceEndDate(), event.getStartDate());
        }

        // BR-EVE-002 (#54) : recalcul de endDate dès qu'un facteur de calcul change au PATCH
        // (type, durationValue, durationUnit). Avant #54, endDate restait figée à sa valeur de
        // création -> bug silencieux (une durée modifiée n'étendait jamais la fin). startDate
        // n'est pas modifiable via EventUpdateRequest : on recalcule sur la startDate persistée.
        // Le recalcul lève InvalidDurationUnitException (-> 422) si durationUnit est null/inconnu
        // pour un type 'duration', au lieu de persister une endDate silencieusement fausse.
        boolean durationFactorsChanged = updateRequest.getType() != null
                || updateRequest.getDurationValue() != null
                || updateRequest.getDurationUnit() != null;
        if (durationFactorsChanged) {
            event.setEndDate(Utils.calculateEndDate(
                    event.getType(),
                    event.getDurationValue(),
                    event.getDurationUnit(),
                    event.getStartDate()));
        }

        event.setProduct(originalProductId);

        return eventRepository.save(event);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Event> findDomainEventByProductId(UUID productId) {
        List<Event> events = eventRepository.findDomainEventByProductId(productId);
        if (events.isEmpty()) {
            throw new EventNotFoundException(productId, "No events found for this product");
        }
        return events;
    }

    @Override
    @Transactional
    public void deleteById(UUID id) {
        if (!eventRepository.existsById(id)) {
            throw new EventNotFoundException(id);
        }
        eventRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(UUID id) {
        return eventRepository.existsById(id);
    }   
    
    @Override
    @Transactional
    public Event save(Event event) {
        return eventRepository.save(event);
    }
    
    @Override
    @Transactional(readOnly = true)
    public Optional<Event> findEventById(UUID id) {
        return eventRepository.findEventById(id);
    }
} 