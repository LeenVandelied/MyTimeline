package com.matimeline.eventmanager.infrastructure.adapters.export;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.springframework.stereotype.Component;

import com.matimeline.eventmanager.domain.models.export.ExportFormat;
import com.matimeline.eventmanager.domain.models.export.RenderedExport;
import com.matimeline.eventmanager.domain.models.export.UserDataExport;
import com.matimeline.eventmanager.domain.ports.services.ExportRenderer;

/**
 * Rendu ZIP de l'export RGPD (#58). Archive regroupant les trois représentations du même
 * snapshot — {@code data.json}, {@code data.md}, {@code data.csv} — produites par les
 * renderers dédiés (composition, pas de duplication de logique de rendu). Utilise
 * {@code java.util.zip.ZipOutputStream} (JDK, aucune dépendance externe).
 */
@Component
public class ZipExportRenderer implements ExportRenderer {

    private final JsonExportRenderer jsonRenderer;
    private final MarkdownExportRenderer markdownRenderer;
    private final CsvExportRenderer csvRenderer;

    public ZipExportRenderer(JsonExportRenderer jsonRenderer,
                             MarkdownExportRenderer markdownRenderer,
                             CsvExportRenderer csvRenderer) {
        this.jsonRenderer = jsonRenderer;
        this.markdownRenderer = markdownRenderer;
        this.csvRenderer = csvRenderer;
    }

    @Override
    public boolean supports(ExportFormat format) {
        return format == ExportFormat.ZIP;
    }

    @Override
    public RenderedExport render(UserDataExport data) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(baos)) {
            addEntry(zip, "data.json", jsonRenderer.render(data).content());
            addEntry(zip, "data.md", markdownRenderer.render(data).content());
            addEntry(zip, "data.csv", csvRenderer.render(data).content());
        } catch (IOException e) {
            throw new UncheckedIOException("zip export rendering failed", e);
        }
        return new RenderedExport(baos.toByteArray(), ExportFormat.ZIP.contentType(),
                ExportFilenames.forFormat(ExportFormat.ZIP, data.generatedAt()));
    }

    private void addEntry(ZipOutputStream zip, String name, byte[] content) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content);
        zip.closeEntry();
    }
}
