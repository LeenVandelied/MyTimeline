package com.matimeline.eventmanager.infrastructure.adapters.export;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.junit.jupiter.api.Test;

import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.Event;
import com.matimeline.eventmanager.domain.models.Product;
import com.matimeline.eventmanager.domain.models.RecurrenceUnit;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.models.export.ExportFormat;
import com.matimeline.eventmanager.domain.models.export.RenderedExport;
import com.matimeline.eventmanager.domain.models.export.UserDataExport;

/**
 * Tests unitaires des renderers d'export (#58). Vérifient le contenu produit et — pour JSON —
 * l'ABSENCE du password hash dans la sérialisation (non-régression fuite PII).
 */
class ExportRenderersTest {

    private static final String PASSWORD_HASH = "$2a$10$SECRET-HASH-NEVER-EXPORTED";

    private UserDataExport sampleExport() {
        UUID userId = UUID.randomUUID();
        User user = new User(userId, "Alice", "alice", PASSWORD_HASH, "ROLE_USER", "alice@example.test");
        UUID categoryId = UUID.randomUUID();
        Category category = new Category(categoryId, "Travail", "#ff0000", "Pro", userId);
        UUID productId = UUID.randomUUID();
        Event event = new Event(UUID.randomUUID(), "Réunion, importante", "single", 1, "days",
                true, RecurrenceUnit.WEEK, LocalDate.of(2026, 12, 31),
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 2), productId, false, "#00ff00", false);
        Product product = new Product(productId, "Projet X", category, user,
                new ArrayList<>(List.of(event)), false, "#0000ff");
        return UserDataExport.assemble(user, List.of(product), List.of(category),
                LocalDateTime.of(2026, 7, 11, 10, 0));
    }

    @Test
    void json_containsDataButNotPasswordHash() {
        RenderedExport rendered = new JsonExportRenderer().render(sampleExport());
        String json = new String(rendered.content(), StandardCharsets.UTF_8);

        assertEquals("application/json", rendered.contentType());
        assertTrue(json.contains("alice@example.test"), "email présent");
        assertTrue(json.contains("Projet X"), "produit présent");
        assertTrue(json.contains("Réunion, importante"), "événement présent");
        assertFalse(json.contains(PASSWORD_HASH), "le hash ne doit JAMAIS apparaître dans le JSON");
        assertFalse(json.toLowerCase().contains("password"), "aucune clé password sérialisée");
    }

    @Test
    void markdown_isStructuredDocument() {
        RenderedExport rendered = new MarkdownExportRenderer().render(sampleExport());
        String md = new String(rendered.content(), StandardCharsets.UTF_8);

        assertEquals("text/markdown", rendered.contentType());
        assertTrue(md.startsWith("# Export MyTimeline"), "titre présent");
        assertTrue(md.contains("## Profil"));
        assertTrue(md.contains("alice@example.test"));
        assertTrue(md.contains("### Projet X"), "produit en section");
        assertFalse(md.contains(PASSWORD_HASH));
    }

    @Test
    void csv_hasSectionsAndEscapesCommas() {
        RenderedExport rendered = new CsvExportRenderer().render(sampleExport());
        String csv = new String(rendered.content(), StandardCharsets.UTF_8);

        assertEquals("text/csv", rendered.contentType());
        assertTrue(csv.contains("# PROFILE"));
        assertTrue(csv.contains("# CATEGORIES"));
        assertTrue(csv.contains("# PRODUCTS"));
        assertTrue(csv.contains("# EVENTS"));
        // Le titre contient une virgule -> doit être entouré de guillemets (RFC 4180).
        assertTrue(csv.contains("\"Réunion, importante\""), "champ à virgule échappé");
        assertFalse(csv.contains(PASSWORD_HASH));
    }

    /**
     * Non-régression injection de formule (#58, MINEUR post-audit) : un champ user-controlled
     * commençant par un caractère à risque (= + - @) doit être préfixé d'une apostrophe pour
     * neutraliser l'interprétation en formule (Excel / Google Sheets), SANS casser l'échappement
     * RFC 4180 existant (virgules / guillemets).
     */
    @Test
    void csv_neutralizesFormulaInjectionOnUserControlledFields() {
        UUID userId = UUID.randomUUID();
        User user = new User(userId, "Bob", "bob", PASSWORD_HASH, "ROLE_USER", "bob@example.test");
        UUID categoryId = UUID.randomUUID();
        // Description commençant par '=' (formule) + name commençant par '@'.
        Category category = new Category(categoryId, "@cmd", "#ff0000",
                "=1+1", userId);
        UUID productId = UUID.randomUUID();
        // Titre commençant par '=' ET contenant une virgule -> apostrophe PUIS guillemets.
        Event event = new Event(UUID.randomUUID(), "=HYPERLINK(\"x\"),evil", "single", 1, "days",
                false, RecurrenceUnit.WEEK, null,
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 2), productId, false, "#00ff00", false);
        // Nom produit commençant par '-' (formule négative).
        Product product = new Product(productId, "-2+3", category, user,
                new ArrayList<>(List.of(event)), false, "#0000ff");
        UserDataExport export = UserDataExport.assemble(user, List.of(product), List.of(category),
                LocalDateTime.of(2026, 7, 11, 10, 0));

        RenderedExport rendered = new CsvExportRenderer().render(export);
        String csv = new String(rendered.content(), StandardCharsets.UTF_8);

        assertTrue(csv.contains("'@cmd"), "champ '@' neutralisé par apostrophe");
        assertTrue(csv.contains("'=1+1"), "champ '=' neutralisé par apostrophe");
        assertTrue(csv.contains("'-2+3"), "champ '-' neutralisé par apostrophe");
        // Le titre est neutralisé (apostrophe) PUIS entouré de guillemets (contient virgule/guillemet).
        assertTrue(csv.contains("\"'=HYPERLINK(\"\"x\"\"),evil\""),
                "formule + virgule : apostrophe interne, guillemets RFC 4180 conservés");
        // Aucune ligne de données ne commence par un caractère de formule brut.
        for (String line : csv.split("\n")) {
            assertFalse(line.startsWith("=") || line.startsWith("@"),
                    "aucune valeur de formule non neutralisée en tête de champ: " + line);
        }
    }

    @Test
    void zip_bundlesThreeRepresentations() throws IOException {
        ZipExportRenderer renderer = new ZipExportRenderer(
                new JsonExportRenderer(), new MarkdownExportRenderer(), new CsvExportRenderer());
        RenderedExport rendered = renderer.render(sampleExport());

        assertEquals("application/zip", rendered.contentType());
        Set<String> entries = new HashSet<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(rendered.content()))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                entries.add(entry.getName());
            }
        }
        assertTrue(entries.contains("data.json"));
        assertTrue(entries.contains("data.md"));
        assertTrue(entries.contains("data.csv"));
    }

    @Test
    void filenames_carryFormatExtensionAndNoPii() {
        assertNotNull(new JsonExportRenderer().render(sampleExport()).filename());
        assertTrue(new JsonExportRenderer().render(sampleExport()).filename().endsWith(".json"));
        assertTrue(new CsvExportRenderer().render(sampleExport()).filename().endsWith(".csv"));
        // Nom stable sans identifiant utilisateur.
        assertTrue(new JsonExportRenderer().render(sampleExport()).filename().startsWith("mytimeline-export-"));
    }

    @Test
    void supports_matchesOnlyOwnFormat() {
        assertTrue(new JsonExportRenderer().supports(ExportFormat.JSON));
        assertFalse(new JsonExportRenderer().supports(ExportFormat.CSV));
        assertTrue(new CsvExportRenderer().supports(ExportFormat.CSV));
        assertTrue(new ZipExportRenderer(new JsonExportRenderer(), new MarkdownExportRenderer(),
                new CsvExportRenderer()).supports(ExportFormat.ZIP));
    }
}
