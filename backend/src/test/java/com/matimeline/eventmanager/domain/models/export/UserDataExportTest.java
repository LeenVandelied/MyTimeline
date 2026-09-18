package com.matimeline.eventmanager.domain.models.export;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.RecordComponent;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.RecurrenceUnit;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.models.export.UserDataExport.ExportedEvent;
import com.matimeline.eventmanager.domain.models.export.UserDataExport.ExportedProduct;
import com.matimeline.eventmanager.domain.models.export.UserDataExport.ExportedProfile;

/**
 * Test PUR d'assemblage du snapshot RGPD (#58) — aucune dépendance framework. Vérifie
 * l'exhaustivité (profil + catégories + produits + événements imbriqués) ET la NON-fuite
 * (le password hash n'existe même pas dans la structure exportée — BR-AUT-002).
 */
class UserDataExportTest {

    private static final String PASSWORD_HASH = "$2a$10$SECRET-HASH-SHOULD-NEVER-LEAK";
    private static final LocalDateTime GENERATED_AT = LocalDateTime.of(2026, 7, 11, 10, 0);

    @Test
    void assemble_mapsProfileWithoutPassword() {
        UUID userId = UUID.randomUUID();
        User user = new User(userId, "Alice", "alice", PASSWORD_HASH, "ROLE_USER", "alice@example.test");

        UserDataExport export = UserDataExport.assemble(user, List.of(), List.of(), GENERATED_AT);

        ExportedProfile profile = export.profile();
        assertEquals(userId, profile.id());
        assertEquals("alice", profile.username());
        assertEquals("Alice", profile.name());
        assertEquals("alice@example.test", profile.email());
        assertEquals("ROLE_USER", profile.role());
        assertFalse(profile.avatarPresent(), "aucun avatar posé -> avatarPresent=false");
    }

    @Test
    void exportedProfile_hasNoPasswordComponentAndNeverEqualsHash() {
        // Anti-fuite structurel : le record ExportedProfile ne DOIT PAS porter de champ password.
        boolean hasPasswordComponent = Arrays.stream(ExportedProfile.class.getRecordComponents())
                .map(RecordComponent::getName)
                .anyMatch(name -> name.toLowerCase().contains("password"));
        assertFalse(hasPasswordComponent, "ExportedProfile ne doit exposer aucun champ password");

        User user = new User(UUID.randomUUID(), "Bob", "bob", PASSWORD_HASH, "ROLE_USER", "bob@example.test");
        UserDataExport export = UserDataExport.assemble(user, List.of(), List.of(), GENERATED_AT);
        // Aucune valeur du profil ne doit véhiculer le hash.
        assertFalse(export.profile().toString().contains(PASSWORD_HASH),
                "le hash ne doit apparaître nulle part dans le snapshot");
    }

    @Test
    void assemble_avatarPresentWhenAvatarSet() {
        User user = new User(UUID.randomUUID(), "Ann", "ann", PASSWORD_HASH, "ROLE_USER", "ann@example.test");
        user.setAvatar("avatar-ref.png");
        UserDataExport export = UserDataExport.assemble(user, List.of(), List.of(), GENERATED_AT);
        assertTrue(export.profile().avatarPresent());
    }

    @Test
    void assemble_mapsCategoriesProductsAndNestedEvents() {
        UUID userId = UUID.randomUUID();
        User user = new User(userId, "Carol", "carol", PASSWORD_HASH, "ROLE_USER", "carol@example.test");

        UUID categoryId = UUID.randomUUID();
        Category category = new Category(categoryId, "Travail", "#ff0000", "Catégorie pro", userId);

        UUID productId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        Event event = new Event(eventId, "Réunion", "single", 2, "days",
                true, RecurrenceUnit.WEEK, LocalDate.of(2026, 12, 31),
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 2), productId, false,
                "#00ff00", false);
        Product product = new Product(productId, "Projet X", category, user,
                new java.util.ArrayList<>(List.of(event)), false, "#0000ff");

        UserDataExport export = UserDataExport.assemble(
                user, List.of(product), List.of(category), GENERATED_AT);

        assertEquals(1, export.categories().size());
        assertEquals("Travail", export.categories().get(0).name());
        assertEquals("#ff0000", export.categories().get(0).color());

        assertEquals(1, export.products().size());
        ExportedProduct exportedProduct = export.products().get(0);
        assertEquals("Projet X", exportedProduct.name());
        assertEquals(categoryId, exportedProduct.categoryId());
        assertEquals("Travail", exportedProduct.categoryName());

        assertEquals(1, exportedProduct.events().size());
        ExportedEvent exportedEvent = exportedProduct.events().get(0);
        assertEquals("Réunion", exportedEvent.title());
        assertEquals("single", exportedEvent.type());
        assertEquals("WEEK", exportedEvent.recurrenceUnit());
        assertEquals(LocalDate.of(2026, 7, 1), exportedEvent.startDate());
        assertEquals(LocalDate.of(2026, 12, 31), exportedEvent.recurrenceEndDate());
        assertEquals(GENERATED_AT, export.generatedAt());
    }

    @Test
    void assemble_nullCategoryOnProduct_yieldsNullCategoryRefFields() {
        User user = new User(UUID.randomUUID(), "Dan", "dan", PASSWORD_HASH, "ROLE_USER", "dan@example.test");
        Product product = new Product(UUID.randomUUID(), "Sans cat", null, user,
                new java.util.ArrayList<>(), false, null);

        UserDataExport export = UserDataExport.assemble(user, List.of(product), List.of(), GENERATED_AT);

        assertNull(export.products().get(0).categoryId());
        assertNull(export.products().get(0).categoryName());
        assertTrue(export.products().get(0).events().isEmpty());
    }
}
