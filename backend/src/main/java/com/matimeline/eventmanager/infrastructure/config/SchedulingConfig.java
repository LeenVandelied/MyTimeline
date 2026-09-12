package com.matimeline.eventmanager.infrastructure.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Active le support Spring {@code @Scheduled} pour l'application (issue #267 — 1er usage).
 *
 * <p>Vit côté INFRASTRUCTURE : {@code @EnableScheduling} est un stéréotype d'assemblage
 * (comme {@code @EnableAsync}) au même titre que {@link AsyncConfig}, hors couche métier.
 * Les tâches planifiées elles-mêmes ({@code ExportPurgeScheduler}) restent dans
 * {@code application/services/} et ne dépendent que des ports du domaine.
 *
 * <p>Un unique scheduler mono-thread suffit (purge horaire, tâche brève) : on ne surcharge
 * pas le {@code TaskScheduler} par défaut. Réutilisable par de futures tâches de fond.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
