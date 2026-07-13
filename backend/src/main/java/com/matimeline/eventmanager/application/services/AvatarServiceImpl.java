package com.matimeline.eventmanager.application.services;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.matimeline.eventmanager.domain.exceptions.AvatarNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.InvalidAvatarException;
import com.matimeline.eventmanager.domain.models.AvatarContent;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;
import com.matimeline.eventmanager.domain.ports.services.AvatarService;
import com.matimeline.eventmanager.domain.ports.services.StoragePort;

/**
 * Impl du port {@link AvatarService} (#75). Orchestration validation -> stockage ->
 * persistance, en couche application (A8/DIP : dépend des PORTS {@link StoragePort} et
 * {@link UserRepository}, jamais des impls infra).
 *
 * <p>CHECKLIST OWASP UPLOAD :
 * <ul>
 *   <li>Type détecté par MAGIC BYTES ({@link #detectImageType}) — le Content-Type et
 *       l'extension côté client ne sont JAMAIS consultés.</li>
 *   <li>Taille bornée applicativement ({@code app.storage.avatar-max-bytes}), en plus de
 *       la limite servlet multipart (defense in depth).</li>
 *   <li>Nom de fichier stocké = référence opaque générée par l'adapter (UUID), jamais le
 *       filename client -> anti path-traversal / collision / fuite de métadonnée.</li>
 *   <li>Remplacement / suppression : l'ancien fichier est supprimé (pas d'orphelin).</li>
 *   <li>Aucun log du contenu binaire.</li>
 * </ul>
 */
@Service
public class AvatarServiceImpl implements AvatarService {

    private final StoragePort storagePort;
    private final UserRepository userRepository;
    private final long maxBytes;

    public AvatarServiceImpl(@Qualifier("avatarStorage") StoragePort storagePort,
                             UserRepository userRepository,
                             @Value("${app.storage.avatar-max-bytes:5242880}") long maxBytes) {
        this.storagePort = storagePort;
        this.userRepository = userRepository;
        this.maxBytes = maxBytes;
    }

    /** Types image autorisés — détectés par signature binaire, pas par le header client. */
    private enum ImageType {
        JPEG("jpg", "image/jpeg"),
        PNG("png", "image/png"),
        WEBP("webp", "image/webp");

        final String extension;
        final String mimeType;

        ImageType(String extension, String mimeType) {
            this.extension = extension;
            this.mimeType = mimeType;
        }
    }

    @Override
    @Transactional
    public void uploadAvatar(User caller, byte[] content) {
        if (content == null || content.length == 0) {
            throw new InvalidAvatarException("fichier vide");
        }
        if (content.length > maxBytes) {
            throw new InvalidAvatarException("fichier trop volumineux (max 5 Mo)");
        }

        // Défense OWASP : le type réel provient EXCLUSIVEMENT des magic bytes. Un fichier
        // non-image (ou déguisé en .jpg) est rejeté ici même si le client annonce image/jpeg.
        ImageType type = detectImageType(content)
                .orElseThrow(() -> new InvalidAvatarException(
                        "type de fichier non autorisé (JPEG, PNG ou WebP attendu)"));

        // Recharger l'entité gérée : le caller vient du contrôleur (relu par username), on
        // repart de l'id pour rester cohérent avec l'état en base (et récupérer l'ancienne
        // référence à nettoyer). Cas limite (compte supprimé entre-temps -> `current` vide,
        // improbable car le contrôleur a déjà résolu un caller non-null) : on retombe sur la
        // référence portée par le caller. Ce n'est PAS un no-op — le nouvel avatar est stocké
        // et sauvegardé quand même ; seul l'ancien fichier à nettoyer peut différer.
        Optional<User> current = userRepository.findDomainUserById(caller.getId());
        String previousReference = current.map(User::getAvatar).orElse(caller.getAvatar());

        String newReference = storagePort.store(content, type.extension);

        User updated = new User(
                caller.getId(),
                caller.getName(),
                caller.getUsername(),
                caller.getPassword(),
                caller.getRole(),
                caller.getEmail(),
                newReference);
        userRepository.save(updated);

        // Nettoyage de l'ancien fichier APRÈS le save réussi (pas d'orphelin, et pas de
        // suppression prématurée si le save échoue et rollback). delete est idempotent.
        if (previousReference != null && !previousReference.equals(newReference)) {
            storagePort.delete(previousReference);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public AvatarContent getAvatar(User caller) {
        String reference = caller.getAvatar();
        if (reference == null || reference.isBlank()) {
            throw new AvatarNotFoundException();
        }
        byte[] bytes = storagePort.load(reference)
                .orElseThrow(AvatarNotFoundException::new);
        return new AvatarContent(bytes, contentTypeForReference(reference));
    }

    @Override
    @Transactional
    public void deleteAvatar(User caller) {
        String reference = caller.getAvatar();
        if (reference == null || reference.isBlank()) {
            return; // idempotent : rien à faire
        }
        User updated = new User(
                caller.getId(),
                caller.getName(),
                caller.getUsername(),
                caller.getPassword(),
                caller.getRole(),
                caller.getEmail(),
                null);
        userRepository.save(updated);
        storagePort.delete(reference);
    }

    /**
     * Détecte le type d'image par MAGIC BYTES (signature binaire de début de fichier).
     * Ne consulte JAMAIS le Content-Type ni l'extension côté client (OWASP). Renvoie
     * {@link Optional#empty()} pour tout ce qui n'est pas JPEG / PNG / WebP.
     */
    private Optional<ImageType> detectImageType(byte[] c) {
        // JPEG : FF D8 FF
        if (c.length >= 3
                && (c[0] & 0xFF) == 0xFF && (c[1] & 0xFF) == 0xD8 && (c[2] & 0xFF) == 0xFF) {
            return Optional.of(ImageType.JPEG);
        }
        // PNG : 89 50 4E 47 0D 0A 1A 0A
        if (c.length >= 8
                && (c[0] & 0xFF) == 0x89 && c[1] == 0x50 && c[2] == 0x4E && c[3] == 0x47
                && c[4] == 0x0D && c[5] == 0x0A && c[6] == 0x1A && c[7] == 0x0A) {
            return Optional.of(ImageType.PNG);
        }
        // WebP : "RIFF" (0..3) ???? "WEBP" (8..11)
        if (c.length >= 12
                && c[0] == 'R' && c[1] == 'I' && c[2] == 'F' && c[3] == 'F'
                && c[8] == 'W' && c[9] == 'E' && c[10] == 'B' && c[11] == 'P') {
            return Optional.of(ImageType.WEBP);
        }
        return Optional.empty();
    }

    /**
     * Type MIME à servir sur GET, dérivé de l'extension de la référence stockée (générée
     * par nous à l'upload, donc fiable — pas une donnée client). Fallback prudent sur
     * {@code application/octet-stream} si l'extension est inattendue.
     */
    private String contentTypeForReference(String reference) {
        int dot = reference.lastIndexOf('.');
        String ext = dot >= 0 ? reference.substring(dot + 1).toLowerCase() : "";
        for (ImageType type : ImageType.values()) {
            if (type.extension.equals(ext)) {
                return type.mimeType;
            }
        }
        return "application/octet-stream";
    }
}
