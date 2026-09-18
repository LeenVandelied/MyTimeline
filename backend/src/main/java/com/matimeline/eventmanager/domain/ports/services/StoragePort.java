package com.matimeline.eventmanager.domain.ports.services;

import java.util.Optional;

/**
 * Port de stockage de fichiers binaires privés (#75, DÉCISION STOCKAGE ADR Sprint 21).
 *
 * <p>Interface définie côté domaine ; l'adapter concret ({@code LocalStorageAdapter})
 * vit dans {@code infrastructure/adapters/}. Le domaine ne connaît NI le système de
 * fichiers, NI S3/MinIO : il exprime seulement le besoin "stocker / relire / supprimer
 * un blob et obtenir une référence opaque". Un swap futur vers un stockage objet =
 * nouvelle impl derrière ce port, sans réécriture du service/contrôleur.
 *
 * <p>La {@code reference} renvoyée par {@link #store} est OPAQUE (nom de fichier généré,
 * jamais le filename client) et sert de clé pour {@link #load} / {@link #delete}. Elle
 * ne doit contenir aucun séparateur de chemin (anti path-traversal, garanti par l'impl).
 */
public interface StoragePort {

    /**
     * Persiste {@code content} et renvoie une référence opaque permettant de le relire.
     *
     * @param content   octets bruts à stocker (déjà validés en amont : type + taille)
     * @param extension extension de fichier SANS point (ex. {@code "jpg"}, {@code "png"},
     *                  {@code "webp"}) — issue du type détecté, jamais du client
     * @return référence opaque (nom de fichier généré) à persister côté métier
     */
    String store(byte[] content, String extension);

    /**
     * Relit le contenu associé à {@code reference}, ou {@link Optional#empty()} si la
     * référence est inconnue / le fichier absent.
     */
    Optional<byte[]> load(String reference);

    /**
     * Supprime le contenu associé à {@code reference}. Idempotent : une référence
     * inconnue / déjà supprimée est un no-op (pas d'exception).
     */
    void delete(String reference);
}
