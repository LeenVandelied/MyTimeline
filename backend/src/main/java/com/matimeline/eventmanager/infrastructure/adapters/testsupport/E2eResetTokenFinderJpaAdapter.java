package com.matimeline.eventmanager.infrastructure.adapters.testsupport;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.infrastructure.entities.PasswordResetTokenEntity;

import jakarta.persistence.EntityManager;

/**
 * Lecture JPA du dernier token de réinitialisation exploitable (issue #283).
 *
 * <p>ACTIF UNIQUEMENT EN PROFIL {@code e2e} ({@link Profile}) : hors de ce profil le bean
 * n'existe pas, donc aucune requête de ce type n'est câblée en dev ni en production.
 *
 * <p>Requête JPQL bindée sur le MAPPING JPA ({@code PasswordResetTokenEntity}), pas sur le
 * SQL brut de la table : c'est précisément le découplage recherché par #283 — une évolution
 * du schéma des tokens est répercutée par l'entité (et attrapée à la compilation ou par
 * {@code ddl-auto=validate} au boot), au lieu de casser silencieusement un client SQL externe.
 */
@Repository
@Profile("e2e")
public class E2eResetTokenFinderJpaAdapter implements E2eResetTokenFinder {

    private final EntityManager entityManager;

    public E2eResetTokenFinderJpaAdapter(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UUID> findLatestUsableToken(UUID userId, LocalDateTime now) {
        // Projection sur la SEULE colonne token : aucune entité chargée, aucun autre champ
        // du token (expiration, version, usedAt) ne quitte le backend.
        // TRI — `expiresAt DESC` est un PROXY de « le plus récent » : la TTL étant
        // constante (15 min, BR-AUT-012), un expiresAt plus grand = un token émis plus
        // tard. La table ne porte AUCUNE colonne de création (`PasswordResetTokenEntity`
        // : « Pas d'audit created_at/updated_at, table technique éphémère ») — vérifié,
        // il n'existe donc pas de meilleur critère de récence à trier ici.
        //
        // `t.id DESC` en SECOND critère : purement DÉPARTAGEUR (revue S45). Sans lui,
        // deux tokens de même expiresAt (même seconde ; ou TTL devenue variable un jour)
        // sortent dans un ordre laissé au SGBD, non reproductible d'un run à l'autre —
        // un E2E flaky dont le diagnostic pointerait à tort vers le flux de reset.
        // ⚠ L'id est un UUID v4 aléatoire (`UUID.randomUUID()`) : il rend le résultat
        // DÉTERMINISTE, il n'ordonne PAS par récence. Si la TTL devient variable, c'est
        // une colonne de création qu'il faudra ajouter, pas ce tri qu'il faudra relire.
        String jpql = "SELECT t.token FROM " + PasswordResetTokenEntity.class.getSimpleName() + " t "
                + "WHERE t.userId = :userId "
                + "AND t.usedAt IS NULL "
                + "AND t.expiresAt > :now "
                + "ORDER BY t.expiresAt DESC, t.id DESC";

        return entityManager.createQuery(jpql, UUID.class)
                .setParameter("userId", userId)
                .setParameter("now", now)
                // setMaxResults plutôt qu'un get(0) sur la liste complète (convention projet).
                .setMaxResults(1)
                .getResultList()
                .stream()
                .findFirst();
    }
}
