package com.matimeline.eventmanager.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.matimeline.eventmanager.domain.ports.services.StoragePort;
import com.matimeline.eventmanager.infrastructure.adapters.LocalStorageAdapter;

/**
 * Câble les beans de stockage LOCAL PRIVÉ, un PAR USAGE, chacun sur un répertoire DISTINCT
 * (#264). Découple sémantiquement les exports RGPD des avatars : plus de partage de
 * répertoire ni d'hypothèses (rétention, taille max, backup) héritées de l'avatar.
 *
 * <ul>
 *   <li>{@code avatarStorage} -> {@code app.storage.avatar-path} (#75) : avatars utilisateurs.</li>
 *   <li>{@code exportStorage} -> {@code app.storage.export-path} (#264, ADR-003 §5) : dumps
 *       d'export RGPD (ZIP/CSV), TTL 24h. Point d'accès dédié réutilisé par la purge (#267).</li>
 * </ul>
 *
 * <p>Chaque clé suit la convention #34 (fail-fast) : aucun default en prod -> le boot échoue
 * si {@code STORAGE_EXPORT_PATH} est absent. Les deux beans partagent la MÊME impl
 * ({@link LocalStorageAdapter}, paramétrée par base-path) ; un swap S3/MinIO d'un seul usage
 * = nouvelle impl derrière le bean concerné, sans toucher l'autre.
 *
 * <p>Deux beans du type {@link StoragePort} coexistent : chaque point d'injection DOIT être
 * désambiguïsé par {@code @Qualifier("avatarStorage")} ou {@code @Qualifier("exportStorage")}.
 */
@Configuration
public class StorageConfig {

    /** Stockage des avatars utilisateurs (#75). Injecter via {@code @Qualifier("avatarStorage")}. */
    @Bean
    StoragePort avatarStorage(@Value("${app.storage.avatar-path}") String avatarPath) {
        return new LocalStorageAdapter(avatarPath);
    }

    /**
     * Stockage DÉDIÉ des exports RGPD (#264, ADR-003 §5). Injecter via
     * {@code @Qualifier("exportStorage")}. Répertoire distinct des avatars : la purge TTL 24h
     * (#267) opère sur CE base-path via {@code StoragePort.delete(storageRef)}.
     */
    @Bean
    StoragePort exportStorage(@Value("${app.storage.export-path}") String exportPath) {
        return new LocalStorageAdapter(exportPath);
    }
}
