package com.matimeline.eventmanager.domain.ports.services;

import com.matimeline.eventmanager.domain.models.export.ExportFormat;
import com.matimeline.eventmanager.domain.models.export.RenderedExport;
import com.matimeline.eventmanager.domain.models.export.UserDataExport;

/**
 * Port de rendu d'un {@link UserDataExport} vers un format concret (#58). Une implémentation
 * par format ({@code JsonExportRenderer}, {@code MarkdownExportRenderer},
 * {@code CsvExportRenderer}, {@code ZipExportRenderer}), toutes côté infrastructure (elles
 * dépendent de bibliothèques techniques : Jackson, {@code ZipOutputStream}…). Le use case
 * sélectionne le renderer via {@link #supports(ExportFormat)}.
 */
public interface ExportRenderer {

    /** {@code true} si ce renderer gère {@code format}. */
    boolean supports(ExportFormat format);

    /** Rend le snapshot dans le format supporté. */
    RenderedExport render(UserDataExport data);
}
