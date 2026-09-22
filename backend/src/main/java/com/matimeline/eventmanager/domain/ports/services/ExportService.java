package com.matimeline.eventmanager.domain.ports.services;

import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.models.export.ExportFormat;
import com.matimeline.eventmanager.domain.models.export.ExportJob;
import com.matimeline.eventmanager.domain.models.export.RenderedExport;

/**
 * Port métier de l'export RGPD des données utilisateur (#58). Orchestration : agrège les
 * données possédées par le user (profil + produits + événements + catégories), les rend dans
 * le format demandé, et gère les jobs asynchrones. Impl {@code @Service} côté application.
 *
 * <p>Toutes les méthodes prennent {@code ownerId} dérivé du JWT (jamais d'un paramètre client)
 * et n'exposent QUE les données de ce propriétaire (ownership strict). Chaque demande est
 * journalisée (audit minimal : userId masqué, timestamp, format).
 */
public interface ExportService {

    /**
     * Génère l'export INLINE (formats synchrones JSON/Markdown) et renvoie les octets prêts.
     *
     * @throws com.matimeline.eventmanager.domain.exceptions.ExportFormatNotSupportedException
     *         si {@code format} est asynchrone (ZIP/CSV) — 400.
     * @throws com.matimeline.eventmanager.domain.exceptions.UserNotFoundException
     *         si {@code ownerId} ne correspond à aucun user.
     */
    RenderedExport exportInline(UUID ownerId, ExportFormat format);

    /**
     * Soumet un job d'export ASYNCHRONE (formats ZIP/CSV) : crée la ligne {@code PENDING},
     * déclenche la génération en tâche de fond, et renvoie le job créé (avec son id).
     *
     * @throws com.matimeline.eventmanager.domain.exceptions.ExportFormatNotSupportedException
     *         si {@code format} est synchrone (JSON/Markdown) — 400.
     */
    ExportJob submitAsync(UUID ownerId, ExportFormat format);

    /**
     * Statut d'un job, SCOPÉ au propriétaire. Job inconnu ou d'autrui →
     * {@link Optional#empty()} (le contrôleur renvoie 404).
     */
    Optional<ExportJob> getJob(UUID jobId, UUID ownerId);

    /**
     * Charge le fichier d'un job TERMINÉ, non expiré et possédé par {@code ownerId}. Toute
     * autre situation (job inconnu/d'autrui, non terminé, expiré, fichier absent) →
     * {@link Optional#empty()} (404).
     */
    Optional<RenderedExport> download(UUID jobId, UUID ownerId);
}
