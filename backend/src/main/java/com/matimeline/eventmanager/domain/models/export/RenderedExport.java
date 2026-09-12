package com.matimeline.eventmanager.domain.models.export;

/**
 * Résultat d'un rendu d'export (#58) : les octets du fichier + son type MIME + un nom de
 * fichier proposé. Valeur immuable pure (domaine). Consommé tel quel en réponse HTTP inline
 * (JSON/MD) ou stocké via {@code StoragePort} pour les formats async (ZIP/CSV).
 */
public record RenderedExport(byte[] content, String contentType, String filename) {
}
