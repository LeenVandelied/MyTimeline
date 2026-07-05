package com.matimeline.eventmanager.application.services;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.matimeline.eventmanager.domain.exceptions.AvatarNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.InvalidAvatarException;
import com.matimeline.eventmanager.domain.models.AvatarContent;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.repositories.UserRepository;
import com.matimeline.eventmanager.domain.ports.services.StoragePort;

/**
 * Issue #75 — validation OWASP + orchestration de l'avatar (couche application).
 * - Type détecté par MAGIC BYTES (JPEG/PNG/WebP), pas le Content-Type client.
 * - Taille bornée applicativement (defense in depth).
 * - Ownership BR-AUT-001 : agit sur le caller uniquement ; référence stockée opaque.
 * - Remplacement : l'ancien fichier est supprimé (pas d'orphelin).
 */
@ExtendWith(MockitoExtension.class)
class AvatarServiceImplTest {

    @Mock
    private StoragePort storagePort;
    @Mock
    private UserRepository userRepository;

    private AvatarServiceImpl service;

    private static final long MAX_BYTES = 5 * 1024 * 1024;
    private static final String HASH = "$2a$10$hashThatMustNotLeak";

    private User caller;

    @BeforeEach
    void setUp() {
        service = new AvatarServiceImpl(storagePort, userRepository, MAX_BYTES);
        caller = new User(UUID.randomUUID(), "Alice", "alice", HASH, "ROLE_USER", "alice@example.com");
    }

    private static byte[] jpeg() {
        return new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x10, 0x20};
    }

    private static byte[] png() {
        return new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01};
    }

    private static byte[] webp() {
        return new byte[] {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P', 0x01};
    }

    @Test
    void upload_jpeg_storesWithJpgExtension_andPersistsReference() {
        when(userRepository.findDomainUserById(caller.getId())).thenReturn(Optional.of(caller));
        when(storagePort.store(any(), eq("jpg"))).thenReturn("ref-abc.jpg");

        service.uploadAvatar(caller, jpeg());

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertEquals("ref-abc.jpg", saved.getValue().getAvatar());
        // Ownership : c'est bien le caller qui est mis à jour (même id).
        assertEquals(caller.getId(), saved.getValue().getId());
        // Aucun ancien fichier -> pas de delete.
        verify(storagePort, never()).delete(anyString());
    }

    @Test
    void upload_png_detectedByMagicBytes() {
        when(userRepository.findDomainUserById(caller.getId())).thenReturn(Optional.of(caller));
        when(storagePort.store(any(), eq("png"))).thenReturn("ref.png");

        service.uploadAvatar(caller, png());

        verify(storagePort).store(any(), eq("png"));
    }

    @Test
    void upload_webp_detectedByMagicBytes() {
        when(userRepository.findDomainUserById(caller.getId())).thenReturn(Optional.of(caller));
        when(storagePort.store(any(), eq("webp"))).thenReturn("ref.webp");

        service.uploadAvatar(caller, webp());

        verify(storagePort).store(any(), eq("webp"));
    }

    @Test
    void upload_replacingExistingAvatar_deletesOldFile() {
        User existing = new User(caller.getId(), "Alice", "alice", HASH, "ROLE_USER",
                "alice@example.com", "old-ref.png");
        when(userRepository.findDomainUserById(caller.getId())).thenReturn(Optional.of(existing));
        when(storagePort.store(any(), eq("jpg"))).thenReturn("new-ref.jpg");

        service.uploadAvatar(existing, jpeg());

        // Nettoyage de l'ancien fichier APRÈS le save (pas d'orphelin).
        verify(storagePort).delete("old-ref.png");
    }

    @Test
    void upload_nonImage_rejectedByMagicBytes_400_noStore() {
        // "MZ.." (exécutable) — Content-Type mensonger côté client ne sauve pas le fichier.
        byte[] exe = new byte[] {0x4D, 0x5A, (byte) 0x90, 0x00};

        assertThrows(InvalidAvatarException.class, () -> service.uploadAvatar(caller, exe));

        verify(storagePort, never()).store(any(), anyString());
        verify(userRepository, never()).save(any());
    }

    @Test
    void upload_emptyFile_rejected_400() {
        assertThrows(InvalidAvatarException.class, () -> service.uploadAvatar(caller, new byte[0]));
        verify(storagePort, never()).store(any(), anyString());
    }

    @Test
    void upload_tooLarge_rejected_400_beforeMagicByteCheck() {
        byte[] tooBig = new byte[(int) MAX_BYTES + 1];
        tooBig[0] = (byte) 0xFF; tooBig[1] = (byte) 0xD8; tooBig[2] = (byte) 0xFF; // JPEG valide

        assertThrows(InvalidAvatarException.class, () -> service.uploadAvatar(caller, tooBig));

        verify(storagePort, never()).store(any(), anyString());
    }

    @Test
    void getAvatar_streamsBytes_withDerivedContentType() {
        User withAvatar = new User(caller.getId(), "Alice", "alice", HASH, "ROLE_USER",
                "alice@example.com", "ref.png");
        byte[] bytes = png();
        when(storagePort.load("ref.png")).thenReturn(Optional.of(bytes));

        AvatarContent content = service.getAvatar(withAvatar);

        assertArrayEquals(bytes, content.bytes());
        assertEquals("image/png", content.contentType());
    }

    @Test
    void getAvatar_whenNoReference_throwsNotFound() {
        assertThrows(AvatarNotFoundException.class, () -> service.getAvatar(caller));
    }

    @Test
    void getAvatar_whenFileMissing_throwsNotFound() {
        User withAvatar = new User(caller.getId(), "Alice", "alice", HASH, "ROLE_USER",
                "alice@example.com", "ref.jpg");
        when(storagePort.load("ref.jpg")).thenReturn(Optional.empty());

        assertThrows(AvatarNotFoundException.class, () -> service.getAvatar(withAvatar));
    }

    @Test
    void deleteAvatar_removesFile_andNullsReference() {
        User withAvatar = new User(caller.getId(), "Alice", "alice", HASH, "ROLE_USER",
                "alice@example.com", "ref.jpg");

        service.deleteAvatar(withAvatar);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertEquals(null, saved.getValue().getAvatar());
        verify(storagePort).delete("ref.jpg");
    }

    @Test
    void deleteAvatar_whenNoAvatar_isNoOp() {
        service.deleteAvatar(caller); // avatar null

        verify(userRepository, never()).save(any());
        verify(storagePort, never()).delete(anyString());
    }
}
