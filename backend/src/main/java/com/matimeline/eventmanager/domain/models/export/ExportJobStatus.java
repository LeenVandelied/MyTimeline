package com.matimeline.eventmanager.domain.models.export;

/**
 * Cycle de vie d'un job d'export asynchrone (#58) :
 * {@code PENDING} (créé, en attente) → {@code RUNNING} (génération en cours) →
 * {@code COMPLETED} (fichier stocké, téléchargeable) | {@code FAILED} (échec technique).
 */
public enum ExportJobStatus {
    PENDING,
    RUNNING,
    COMPLETED,
    FAILED
}
