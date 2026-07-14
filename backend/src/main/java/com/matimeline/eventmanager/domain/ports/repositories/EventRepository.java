package com.matimeline.eventmanager.domain.ports.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Event;

public interface EventRepository {
  List<Event> findDomainEventByProductId(UUID productId);
  Event save(Event event);
  void deleteById(UUID id);
  boolean existsById(UUID id);
  Optional<Event> findEventById(UUID id);

  /**
   * BR-EVE-015 (#231) : version optimiste (@Version) COURANTE de l'event, ou vide s'il
   * n'existe pas. Le domain model {@link Event} ne porte pas la version (concept JPA
   * infrastructure) ; ce point d'accès l'expose comme simple {@link Integer} pour enrichir
   * le corps 409 d'une édition concurrente (serverVersion), sans faire remonter l'entité
   * JPA au domaine. Lecture seule.
   */
  Optional<Integer> findVersionById(UUID id);

  /**
   * #78 (RGPD) : supprime DÉFINITIVEMENT tous les événements appartenant à
   * {@code userId}. La table {@code events} n'a PAS de colonne {@code user_id} :
   * l'appartenance est TRANSITIVE via {@code product_id -> products.user_id}. La purge
   * cible donc les events dont le produit appartient au user, ARCHIVÉS INCLUS (le
   * {@code @SQLRestriction} de ProductEntity masquerait les produits archivés d'un
   * sous-select JPQL -> SQL NATIF requis). À appeler EN PREMIER, avant les produits
   * ({@code events.product_id} NOT NULL). Retourne le nombre de lignes supprimées.
   */
  int deleteAllByUserId(UUID userId);
}