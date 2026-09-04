package com.matimeline.eventmanager.domain.ports.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.Event;

public interface EventRepository {
  List<Event> findDomainEventByProductId(UUID productId);
  Event save(Event event);
  boolean existsById(UUID id);
  Optional<Event> findEventById(UUID id);

  /**
   * #175 : supprime l'événement {@code id} et retourne le NOMBRE DE LIGNES touchées
   * (1 si l'événement existait, 0 sinon). Ce retour permet à l'appelant de dériver le
   * contrat 404 ({@code EventNotFoundException} quand 0 ligne) SANS sonde d'existence
   * préalable.
   *
   * <p>Remplace l'ancien {@code void deleteById(UUID)}, hérité tel quel de
   * {@code SimpleJpaRepository} ({@code findById().ifPresent(this::delete)}). Combiné au
   * {@code existsById} qui le précédait dans le service, il coûtait TROIS instructions
   * JDBC mesurées ({@code SELECT count(*)} + {@code SELECT} de l'entité + {@code DELETE})
   * pour une suppression unitaire. Le contrat ci-dessus en exige UNE SEULE. La méthode
   * {@code void deleteById} a été RETIRÉE du port pour que ce chemin à trois requêtes ne
   * puisse pas être réintroduit par inadvertance ; la mesure est verrouillée par
   * {@code EventDeleteStatisticsIntegrationTest}.
   *
   * <p>Idempotent : un appel sur un id inexistant retourne simplement 0, sans exception.
   */
  int deleteByIdIfExists(UUID id);

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