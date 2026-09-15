package com.matimeline.eventmanager.infrastructure.adapters;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Issue #75 — adapter de stockage LOCAL PRIVÉ. Round-trip store/load/delete sur un
 * répertoire temporaire réel + garde-fous anti path-traversal (référence opaque).
 */
class LocalStorageAdapterTest {

    @TempDir
    Path tempDir;

    private LocalStorageAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new LocalStorageAdapter(tempDir.toString());
    }

    @Test
    void store_thenLoad_roundTrips() {
        byte[] content = {1, 2, 3, 4, 5};

        String ref = adapter.store(content, "jpg");

        assertTrue(ref.endsWith(".jpg"), "extension conservée");
        assertFalse(ref.contains("/") || ref.contains("\\"), "référence sans séparateur");
        Optional<byte[]> loaded = adapter.load(ref);
        assertTrue(loaded.isPresent());
        assertArrayEquals(content, loaded.get());
    }

    @Test
    void load_unknownReference_returnsEmpty() {
        assertTrue(adapter.load("does-not-exist.png").isEmpty());
    }

    @Test
    void delete_removesFile_andIsIdempotent() {
        String ref = adapter.store(new byte[] {9}, "png");
        assertTrue(adapter.load(ref).isPresent());

        adapter.delete(ref);
        assertTrue(adapter.load(ref).isEmpty());
        adapter.delete(ref); // 2e appel : no-op, aucune exception
    }

    @Test
    void store_rejectsInvalidExtension() {
        // Le service ne passe que jpg/png/webp ; défense en profondeur ici.
        assertThrows(IllegalArgumentException.class,
                () -> adapter.store(new byte[] {1}, "../etc"));
    }

    @Test
    void load_rejectsPathTraversalReference() {
        assertThrows(IllegalArgumentException.class,
                () -> adapter.load("../../etc/passwd"));
    }

    @Test
    void delete_rejectsPathTraversalReference() {
        assertThrows(IllegalArgumentException.class,
                () -> adapter.delete("../secret"));
    }
}
