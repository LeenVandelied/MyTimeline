package com.matimeline.eventmanager.infrastructure.adapters;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import com.matimeline.eventmanager.domain.ports.services.StoragePort;

/**
 * Adapter de stockage LOCAL PRIVÉ (#75, DÉCISION STOCKAGE ADR Sprint 21). Écrit les
 * blobs dans un répertoire HORS webroot, dont le chemin de base est PARAMÉTRÉ PAR USAGE
 * (constructeur {@code basePath}). Une instance sert les avatars (bean {@code avatarStorage},
 * {@code app.storage.avatar-path}), une autre les exports RGPD (bean {@code exportStorage},
 * {@code app.storage.export-path}, #264) — répertoires DISTINCTS, aucune hypothèse partagée
 * (rétention, taille max, backup). Les beans sont déclarés par {@code StorageConfig} ; chaque
 * clé suit la convention #34 (default dev seulement, aucun default en prod = fail-fast).
 *
 * <p>Un swap futur vers S3/MinIO = nouvelle impl de {@link StoragePort}, sans toucher au
 * service ni au contrôleur. Aucun SDK vendor n'est câblé ici.
 *
 * <p>Anti path-traversal : le nom de fichier ({@code reference}) est TOUJOURS généré
 * (UUID + extension bornée) ; à la relecture/suppression, toute référence contenant un
 * séparateur de chemin est rejetée et le chemin résolu doit rester sous le répertoire de
 * base (défense en profondeur, même si la référence vient de notre propre base).
 */
public class LocalStorageAdapter implements StoragePort {

    private final Path baseDir;

    /**
     * @param basePath répertoire de base LOCAL PRIVÉ (hors webroot) où sont écrits les blobs
     *                 de CET usage ; injecté par {@code StorageConfig} depuis la clé de config
     *                 propre à l'usage (avatar-path OU export-path).
     */
    public LocalStorageAdapter(String basePath) {
        this.baseDir = Path.of(basePath).toAbsolutePath().normalize();
    }

    @Override
    public String store(byte[] content, String extension) {
        // Nom généré : UUID + extension déjà validée par le service (jamais le filename
        // client). Anti-collision, anti path-traversal, anti fuite de métadonnée.
        String reference = UUID.randomUUID() + "." + sanitizeExtension(extension);
        try {
            Files.createDirectories(baseDir);
            Path target = resolveWithinBase(reference);
            Files.write(target, content);
        } catch (IOException e) {
            // Ne PAS fuiter le chemin/stack au client (A4) : le controller/handler renvoie
            // un message générique. On enveloppe pour propager l'échec technique (500).
            throw new UncheckedIOException("stockage indisponible", e);
        }
        return reference;
    }

    @Override
    public Optional<byte[]> load(String reference) {
        Path target = resolveWithinBase(reference);
        if (!Files.exists(target)) {
            return Optional.empty();
        }
        try {
            return Optional.of(Files.readAllBytes(target));
        } catch (IOException e) {
            throw new UncheckedIOException("lecture impossible", e);
        }
    }

    @Override
    public void delete(String reference) {
        try {
            Files.deleteIfExists(resolveWithinBase(reference)); // idempotent
        } catch (IOException e) {
            throw new UncheckedIOException("suppression impossible", e);
        }
    }

    /**
     * Résout {@code reference} en un chemin GARANTI sous {@link #baseDir}. Rejette toute
     * référence contenant un séparateur ou remontant hors du répertoire de base
     * (path-traversal). {@code reference} est censé être un simple nom de fichier généré.
     */
    private Path resolveWithinBase(String reference) {
        if (reference == null || reference.isBlank()
                || reference.contains("/") || reference.contains("\\")
                || reference.contains("..")) {
            throw new IllegalArgumentException("référence de stockage invalide");
        }
        Path resolved = baseDir.resolve(reference).normalize();
        if (!resolved.startsWith(baseDir)) {
            throw new IllegalArgumentException("référence de stockage hors périmètre");
        }
        return resolved;
    }

    /** Extension bornée à [a-z0-9], sinon rejet (le service ne passe que jpg/png/webp). */
    private String sanitizeExtension(String extension) {
        if (extension == null || !extension.matches("[a-z0-9]{1,5}")) {
            throw new IllegalArgumentException("extension de stockage invalide");
        }
        return extension;
    }
}
