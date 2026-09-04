package com.matimeline.eventmanager.application.services;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.exceptions.EndDateBeforeStartException;
import com.matimeline.eventmanager.domain.exceptions.EventConflictException;
import com.matimeline.eventmanager.domain.exceptions.EventNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.ProductNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.RecurrenceEndDateBeforeStartException;
import com.matimeline.eventmanager.domain.exceptions.RecurrenceUnitRequiredException;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.EventCreateCommand;
import com.matimeline.eventmanager.domain.models.EventUpdateCommand;
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
    public Event createEvent(EventCreateCommand command) {
        Product product = productRepository.findDomainProductById(command.productId())
            .orElseThrow(() -> new ProductNotFoundException(command.productId()));

        // BR-EVE-002 : type ∈ {duration, single} validé côté appli -> 422 propre, plutôt
        // que de laisser la contrainte DB ck_events_type lever une violation masquée en 401.
        Utils.validateEventType(command.type());

        LocalDate startDate = (command.date() != null) ? command.date() : LocalDate.now();

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
                command.name(),
                command.type(),
                command.durationValue(),
                command.durationUnit(),
                command.isRecurring(),
                RecurrenceUnit.fromString(command.recurrenceUnit()),
                null,
                startDate,
                Utils.calculateEndDate(command.type(), command.durationValue(), command.durationUnit(), startDate),
                product.getId(),
                command.isAllDay(),
                command.color(),
                false
        );
        return eventRepository.save(event);
    }

    @Override
    @Transactional
    public Event updateEvent(UUID id, EventUpdateCommand command) {
        Event event = findEventById(id)
            .orElseThrow(() -> new EventNotFoundException(id));

        checkOptimisticVersion(event, command);

        // Préserve le lien produit existant (la commande ne porte pas productId).
        UUID originalProductId = event.getProductId();

        // PATCH partiel : chaque champ n'est appliqué que s'il est fourni (non null).
        if (command.title() != null) {
            event.setTitle(command.title());
        }
        if (command.type() != null) {
            // BR-EVE-002 : même garde qu'au create — un PATCH ne peut pas basculer le type
            // vers une valeur hors {duration, single} (sinon violation ck_events_type -> 401).
            Utils.validateEventType(command.type());
            event.setType(command.type());
        }
        if (command.durationValue() != null) {
            event.setDurationValue(command.durationValue());
        }
        if (command.durationUnit() != null) {
            event.setDurationUnit(command.durationUnit());
        }
        if (command.isRecurring() != null) {
            event.setIsRecurring(command.isRecurring());
        }
        if (command.recurrenceUnit() != null) {
            event.setRecurrenceUnit(RecurrenceUnit.fromString(command.recurrenceUnit()));
        }
        if (command.recurrenceEndDate() != null) {
            event.setRecurrenceEndDate(command.recurrenceEndDate());
        }
        // #201 : startDate/endDate désormais réellement consommés au PATCH (avant : ignorés,
        // le formulaire les envoyait pour rien). startDate appliquée AVANT les recalculs (elle
        // est une entrée du calcul d'endDate pour type='duration'). endDate explicite du payload
        // appliquée ici ; pour type='duration', le recalcul par la durée (bloc BR-EVE-003 plus
        // bas) reste prioritaire et écrase cette valeur (durée = source de vérité, BR-EVE-003).
        if (command.startDate() != null) {
            event.setStartDate(command.startDate());
        }
        if (command.endDate() != null) {
            event.setEndDate(command.endDate());
        }
        if (command.color() != null) {
            event.setColor(command.color());
        }
        if (command.archived() != null) {
            event.setArchived(command.archived());
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

        // BR-EVE-002/003 (#54, #201) : (re)dérivation de endDate quand un facteur de calcul change
        // au PATCH (type, durationValue, durationUnit, ET DÉSORMAIS startDate — #201). Avant #54,
        // endDate restait figée à sa valeur de création -> bug silencieux (durée modifiée jamais
        // reflétée sur la fin). #201 rend startDate modifiable et câble endDate.
        //
        // Contrat de dates #201 (documenté dans issue-201-done) :
        //   - type='duration' (état fusionné) : la DURÉE est la source de vérité de endDate
        //     (BR-EVE-003). endDate = startDate + durée. Une endDate explicite du payload est
        //     volontairement écrasée par cette dérivation (elle serait incohérente avec la durée
        //     affichée). Lève InvalidDurationUnitException (-> 422) si durationUnit null/inconnu.
        //   - type != 'duration' (single...) : endDate EXPLICITE du payload persistée telle quelle
        //     (déjà appliquée plus haut). En l'absence d'endDate explicite, endDate SUIT startDate
        //     (BR-EVE-003 : un single ne dure qu'un jour) dès qu'un facteur (type/startDate) bouge.
        boolean dateFactorsChanged = command.type() != null
                || command.durationValue() != null
                || command.durationUnit() != null
                || command.startDate() != null;
        if (dateFactorsChanged) {
            if ("duration".equals(event.getType())) {
                event.setEndDate(Utils.calculateEndDate(
                        event.getType(),
                        event.getDurationValue(),
                        event.getDurationUnit(),
                        event.getStartDate()));
            } else if (command.endDate() == null) {
                // single/autre sans endDate explicite : endDate collée à startDate.
                event.setEndDate(event.getStartDate());
            }
        }

        // BR-EVE-002 (#201 review MAJEUR-2) : garde sur l'ÉTAT FUSIONNÉ, en complément du
        // @AssertTrue DTO (fail-fast payload). Un PATCH partiel peut n'envoyer que endDate SEULE
        // (sans startDate) : pour type != 'duration' elle est persistée telle quelle et peut être
        // antérieure à la startDate DÉJÀ en base -> le @AssertTrue (qui ne voit que le payload)
        // est contourné. On revérifie donc endDate >= startDate sur l'entité fusionnée, après
        // (re)dérivation. isBefore stricte : endDate == startDate toléré (event d'un jour).
        // -> EndDateBeforeStartException (422, aligné sur RecurrenceEndDateBeforeStartException).
        if (event.getEndDate() != null
                && event.getStartDate() != null
                && event.getEndDate().isBefore(event.getStartDate())) {
            throw new EndDateBeforeStartException(id, event.getEndDate(), event.getStartDate());
        }

        event.setProduct(originalProductId);

        return eventRepository.save(event);
    }

    // #absorb (BR-EVE-015) — CHECK OPTIMISTE DÉTERMINISTE. Le repo recharge l'entité
    // MANAGÉE (findById -> version DB COURANTE) et copyMutableFields ne touche JAMAIS
    // @Version : Hibernate émettrait toujours UPDATE ... WHERE version=<courant> = match,
    // donc un PATCH SÉQUENTIEL avec une version périmée ne produit JAMAIS
    // d'ObjectOptimisticLockingFailureException (ce filet #231 ne fire que sur un vrai race
    // 2-transactions). On compare donc ici la version détenue par le client (état sur lequel
    // il a édité) à la version serveur courante : décalage -> EventConflictException, qui
    // réutilise le contrat 409 ENRICHI de #231 (handler handleEventConflict, corps
    // serverVersion + serverEvent). Le catch ObjectOptimisticLockingFailureException du
    // controller reste le filet des vrais races concurrents. Nullable = contrôle non armé
    // (PATCH partiel legacy, ex. couleur seule) -> comportement inchangé. L'OWNERSHIP est
    // déjà vérifié par EventController.checkEventOwnership AVANT cet appel (invariant #231 :
    // aucune sérialisation d'état serveur avant le contrôle de propriété).
    private void checkOptimisticVersion(Event event, EventUpdateCommand command) {
        if (command.version() != null
                && event.getVersion() != null
                && !event.getVersion().equals(command.version())) {
            throw new EventConflictException(event, event.getVersion());
        }
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
        // #175 : UNE SEULE instruction JDBC. L'ancienne séquence existsById(id) puis
        // eventRepository.deleteById(id) en émettait TROIS (mesuré) : SELECT count(*),
        // puis le SELECT + DELETE du deleteById hérité de SimpleJpaRepository
        // (findById().ifPresent(delete)) — l'issue parlait de « double-hit », la mesure
        // dit trois. Le contrat 404 est INCHANGÉ, seulement dérivé autrement : c'est
        // désormais le nombre de lignes touchées (0) qui atteste l'absence, au lieu
        // d'une sonde d'existence préalable. Verrou : EventDeleteStatisticsIntegrationTest.
        if (eventRepository.deleteByIdIfExists(id) == 0) {
            throw new EventNotFoundException(id);
        }
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

    // BR-EVE-015 (#231) : délégué au repo. Tx readOnly propre (le conflit optimiste a
    // rollbacké la tx du update) -> lit l'état serveur gagnant committé.
    @Override
    @Transactional(readOnly = true)
    public Optional<Integer> findVersionById(UUID id) {
        return eventRepository.findVersionById(id);
    }
}